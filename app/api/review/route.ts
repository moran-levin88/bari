import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { calculateDailyTargets, getAgeGroupGuidelines, DEFAULT_TARGETS } from '@/lib/nutrition'

export const maxDuration = 60

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL = 'gemini-2.5-flash'

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('RESOURCE_EXHAUSTED') || message.includes('429') || message.includes('quota')
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 1000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (!isRateLimitError(error) || attempt === retries) throw error
      const delay = baseDelayMs * 2 ** attempt
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw new Error('unreachable')
}

function extractJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON found in response')
  return JSON.parse(cleaned.slice(start, end + 1))
}

type DayStats = {
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
  water: number
  exerciseMin: number
  steps: number
  meals: string[]
}

function validateAnalysis(raw: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  return {
    headline: str(raw.headline),
    food: str(raw.food),
    water: str(raw.water),
    exercise: str(raw.exercise),
    steps: str(raw.steps),
    weight: str(raw.weight),
    ageInsight: str(raw.ageInsight),
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.filter((r): r is string => typeof r === 'string').slice(0, 6)
      : [],
    score: Math.max(1, Math.min(10, Math.round(Number(raw.score)) || 5)),
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const daysParam = Number(request.nextUrl.searchParams.get('days'))
  const days = Number.isFinite(daysParam) ? Math.min(30, Math.max(1, Math.round(daysParam))) : 1

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, age: true, weight: true, height: true, gender: true, goal: true, activityLevel: true },
  })
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const targets = user.age && user.weight && user.height
    ? calculateDailyTargets({ age: user.age, weight: user.weight, height: user.height, gender: user.gender ?? 'other', goal: user.goal ?? 'maintain', activityLevel: user.activityLevel ?? 'moderate' })
    : DEFAULT_TARGETS

  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (days - 1))

  const [meals, waterLogs, exerciseLogs, stepLogs, weightLogs] = await Promise.all([
    prisma.meal.findMany({
      where: { userId: session.userId, loggedAt: { gte: since } },
      select: { name: true, mealType: true, calories: true, protein: true, carbs: true, fat: true, sugar: true, fiber: true, loggedAt: true },
      orderBy: { loggedAt: 'asc' },
    }),
    prisma.waterLog.findMany({ where: { userId: session.userId, loggedAt: { gte: since } }, select: { amount: true, loggedAt: true } }),
    prisma.exerciseLog.findMany({ where: { userId: session.userId, loggedAt: { gte: since } }, select: { name: true, category: true, duration: true, loggedAt: true } }),
    prisma.stepLog.findMany({ where: { userId: session.userId, loggedAt: { gte: since } }, select: { steps: true, loggedAt: true } }),
    prisma.weightLog.findMany({
      where: { userId: session.userId },
      select: { weight: true, waist: true, hips: true, chest: true, arm: true, thigh: true, loggedAt: true },
      orderBy: { loggedAt: 'desc' },
      take: 15,
    }),
  ])

  // Per-day aggregation — keys use server-local dates, matching the local-midnight `since`
  const dayOf = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`

  const dayMap = new Map<string, DayStats>()
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    const key = dayOf(d)
    dayMap.set(key, { date: key, calories: 0, protein: 0, carbs: 0, fat: 0, water: 0, exerciseMin: 0, steps: 0, meals: [] })
  }

  for (const m of meals) {
    const d = dayMap.get(dayOf(m.loggedAt))
    if (!d) continue
    d.calories += m.calories; d.protein += m.protein; d.carbs += m.carbs; d.fat += m.fat
    d.meals.push(`${m.name} (${Math.round(m.calories)} kcal)`)
  }
  for (const w of waterLogs) { const d = dayMap.get(dayOf(w.loggedAt)); if (d) d.water += w.amount }
  for (const e of exerciseLogs) { const d = dayMap.get(dayOf(e.loggedAt)); if (d) d.exerciseMin += e.duration }
  for (const s of stepLogs) { const d = dayMap.get(dayOf(s.loggedAt)); if (d) d.steps = Math.max(d.steps, s.steps) }

  const dayStats = [...dayMap.values()]
  const loggedDays = dayStats.filter((d) => d.calories > 0 || d.water > 0 || d.exerciseMin > 0 || d.steps > 0)
  const denom = Math.max(1, loggedDays.length)

  // Weight trend — recent history (up to 15 entries), oldest first
  const weightsAsc = [...weightLogs].reverse()
  const firstW = weightsAsc[0]
  const latestW = weightsAsc[weightsAsc.length - 1]
  const weightSpanDays = weightsAsc.length >= 2
    ? Math.max(1, Math.round((latestW.loggedAt.getTime() - firstW.loggedAt.getTime()) / 86_400_000))
    : 0
  const weightChange = weightsAsc.length >= 2 ? +(latestW.weight - firstW.weight).toFixed(1) : 0
  const weightPerWeek = weightSpanDays > 0 ? +((weightChange / weightSpanDays) * 7).toFixed(2) : 0
  const currentWeight = latestW?.weight ?? user.weight
  const bmi = currentWeight && user.height
    ? +(currentWeight / ((user.height / 100) ** 2)).toFixed(1)
    : null

  // Maintenance calories (goal-independent) to estimate the actual energy balance
  const maintenanceCalories = user.age && currentWeight && user.height
    ? calculateDailyTargets({
        age: user.age, weight: currentWeight, height: user.height,
        gender: user.gender ?? 'other', goal: 'maintain', activityLevel: user.activityLevel ?? 'moderate',
      }).calories
    : null

  const stats = {
    days,
    avgCalories: Math.round(dayStats.reduce((s, d) => s + d.calories, 0) / denom),
    avgProtein: Math.round(dayStats.reduce((s, d) => s + d.protein, 0) / denom),
    avgWater: Math.round(dayStats.reduce((s, d) => s + d.water, 0) / denom),
    totalExerciseMin: dayStats.reduce((s, d) => s + d.exerciseMin, 0),
    avgSteps: Math.round(dayStats.reduce((s, d) => s + d.steps, 0) / denom),
    mealsCount: meals.length,
    targets,
    weight: latestW
      ? {
          current: latestW.weight,
          change: weightsAsc.length >= 2 ? weightChange : null,
          spanDays: weightsAsc.length >= 2 ? weightSpanDays : null,
          bmi,
        }
      : null,
  }

  if (meals.length === 0 && waterLogs.length === 0 && exerciseLogs.length === 0 && stepLogs.length === 0) {
    return Response.json({ success: true, stats, analysis: null, empty: true })
  }

  const periodLabel = days === 1 ? 'היום' : days === 2 ? 'היומיים האחרונים' : `${days} הימים האחרונים`

  const ageGuide = user.age ? getAgeGroupGuidelines(user.age) : null
  const profileBlock = [
    `User profile: age ${user.age ?? 'unknown'}, gender ${user.gender ?? 'unspecified'}, height ${user.height ?? '?'}cm, current weight ${currentWeight ?? '?'}kg${bmi ? `, BMI ${bmi}` : ''}, activity level ${user.activityLevel ?? 'moderate'}, goal "${user.goal ?? 'maintain'}".`,
    ageGuide ? `Age-group guidance (${ageGuide.group}): ${ageGuide.notes}` : '',
    maintenanceCalories
      ? `Estimated maintenance: ~${maintenanceCalories} kcal/day. Average logged intake: ${stats.avgCalories} kcal/day → estimated daily balance ~${stats.avgCalories - maintenanceCalories} kcal (food logging may be incomplete — interpret cautiously).`
      : '',
  ].filter(Boolean).join('\n')

  const weightBlock = weightsAsc.length >= 2
    ? `Weight history (oldest → newest): ${weightsAsc.map((w) => `${w.weight}kg (${dayOf(w.loggedAt)})`).join(' → ')}
Total change: ${weightChange > 0 ? '+' : ''}${weightChange}kg over ${weightSpanDays} days (~${weightPerWeek > 0 ? '+' : ''}${weightPerWeek}kg/week).`
    : weightsAsc.length === 1
      ? `Single weight entry: ${latestW.weight}kg (${dayOf(latestW.loggedAt)}) — no trend yet.`
      : 'No weight logs yet.'

  const measurementKeys = [
    ['waist', 'waist'], ['hips', 'hips'], ['chest', 'chest'], ['arm', 'arm'], ['thigh', 'thigh'],
  ] as const
  const circumferenceLines = measurementKeys.flatMap(([key, label]) => {
    const entries = weightsAsc.filter((w) => w[key] != null)
    if (entries.length === 0) return []
    const first = entries[0][key]
    const last = entries[entries.length - 1][key]
    return [`${label}: ${first}cm${entries.length > 1 && last !== first ? ` → ${last}cm` : ''}`]
  })
  const circumferenceBlock = circumferenceLines.length > 0
    ? `Body measurements (oldest → newest): ${circumferenceLines.join(', ')}`
    : ''

  const dataBlock = dayStats.map((d) => (
    `${d.date}: calories ${Math.round(d.calories)}/${targets.calories}, protein ${Math.round(d.protein)}g/${targets.protein}g, carbs ${Math.round(d.carbs)}g/${targets.carbs}g, fat ${Math.round(d.fat)}g/${targets.fat}g, water ${d.water}ml/${targets.water}ml, exercise ${d.exerciseMin}min, steps ${d.steps}/10000
  meals: ${d.meals.slice(0, 12).join('; ') || 'none logged'}`
  )).join('\n')

  const prompt = `You are a supportive, professional dietitian and weight-management coach reviewing a user's health log for ${periodLabel} (period of ${days} day(s)). Daily targets: ${targets.calories} kcal, ${targets.protein}g protein, ${targets.water}ml water, 10,000 steps.

${profileBlock}

${weightBlock}
${circumferenceBlock}

Data per day (actual/target):
${dataBlock}

Write an analysis IN HEBREW, personal (pronoun-neutral where possible), warm but honest and specific — reference actual foods and numbers from the data. Avoid generic advice that ignores the data. If something was not logged at all, gently note it might just be missing logging. In Hebrew text, write קק״ל with gershayim (״), never a straight double quote.

For the weight analysis:
- Compare the actual pace of change to a healthy, sustainable pace (about 0.5-1% of body weight per week for weight loss) and to the user's goal.
- Connect the weight trend to the energy balance estimate — does the intake explain the trend? If intake looks too low to explain the data, suggest that meals may be under-logged.
- If weight loss has stalled (plateau) despite a deficit, normalize it: plateaus, water retention and daily fluctuations are expected — look at the multi-week trend, not single weigh-ins.
- If a very aggressive deficit shows (far below maintenance), warn about muscle loss and metabolic adaptation, and recommend a moderate deficit with enough protein.
- If body measurements shrink while weight is flat, highlight it as real progress (fat loss with muscle retention).

For the age insight: give guidance specific to the user's age and gender — for example muscle preservation and higher protein needs at older ages, bone health, hormonal changes where relevant, or building sustainable habits at younger ages. Anchor it to the actual data (protein intake, strength training, etc.), not generic facts.

Return JSON with this exact shape:
{"headline":"משפט סיכום אחד קליט","food":"ניתוח האכילה: איכות המזון, קלוריות מול יעד, חלבון, סוכר — 2-4 משפטים","water":"ניתוח השתייה מול היעד — 1-2 משפטים","exercise":"ניתוח הפעילות הגופנית — 1-2 משפטים","steps":"ניתוח הצעדים מול יעד 10,000 — 1-2 משפטים","weight":"ניתוח מגמת המשקל: הקצב מול קצב בריא, מאזן האנרגיה, פלטו או התקדמות אמיתית — 2-4 משפטים. אם אין תיעוד משקל, עידוד עדין לשקילה שבועית","ageInsight":"תובנה אחת מותאמת לגיל ולמין של המשתמש, מעוגנת בנתונים — 1-2 משפטים","recommendations":["3-5 המלצות קונקרטיות וישימות להמשך, מבוססות על הנתונים והמגמה"],"score":7}
score = overall adherence 1-10.`

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            headline: { type: 'string' },
            food: { type: 'string' },
            water: { type: 'string' },
            exercise: { type: 'string' },
            steps: { type: 'string' },
            weight: { type: 'string' },
            ageInsight: { type: 'string' },
            recommendations: { type: 'array', items: { type: 'string' } },
            score: { type: 'integer' },
          },
          required: ['headline', 'food', 'water', 'exercise', 'steps', 'weight', 'ageInsight', 'recommendations', 'score'],
        },
      },
    }))

    const analysis = validateAnalysis(extractJson(response.text || ''))
    return Response.json({ success: true, stats, analysis })
  } catch (error) {
    console.error('[review]', error instanceof Error ? error.message : error)
    if (isRateLimitError(error)) {
      return Response.json({ error: 'AI_QUOTA_EXCEEDED', stats }, { status: 503 })
    }
    return Response.json({ error: 'AI_UNAVAILABLE', stats }, { status: 503 })
  }
}
