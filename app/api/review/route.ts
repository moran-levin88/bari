import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { calculateDailyTargets, DEFAULT_TARGETS } from '@/lib/nutrition'

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
    prisma.weightLog.findMany({ where: { userId: session.userId }, select: { weight: true, loggedAt: true }, orderBy: { loggedAt: 'desc' }, take: 5 }),
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

  const stats = {
    days,
    avgCalories: Math.round(dayStats.reduce((s, d) => s + d.calories, 0) / denom),
    avgProtein: Math.round(dayStats.reduce((s, d) => s + d.protein, 0) / denom),
    avgWater: Math.round(dayStats.reduce((s, d) => s + d.water, 0) / denom),
    totalExerciseMin: dayStats.reduce((s, d) => s + d.exerciseMin, 0),
    avgSteps: Math.round(dayStats.reduce((s, d) => s + d.steps, 0) / denom),
    mealsCount: meals.length,
    targets,
  }

  if (meals.length === 0 && waterLogs.length === 0 && exerciseLogs.length === 0 && stepLogs.length === 0) {
    return Response.json({ success: true, stats, analysis: null, empty: true })
  }

  const periodLabel = days === 1 ? 'היום' : days === 2 ? 'היומיים האחרונים' : `${days} הימים האחרונים`
  const weightNote = weightLogs.length >= 2
    ? `Recent weight trend: ${weightLogs.map((w) => `${w.weight}kg (${dayOf(w.loggedAt)})`).reverse().join(' → ')}`
    : ''

  const dataBlock = dayStats.map((d) => (
    `${d.date}: calories ${Math.round(d.calories)}/${targets.calories}, protein ${Math.round(d.protein)}g/${targets.protein}g, carbs ${Math.round(d.carbs)}g/${targets.carbs}g, fat ${Math.round(d.fat)}g/${targets.fat}g, water ${d.water}ml/${targets.water}ml, exercise ${d.exerciseMin}min, steps ${d.steps}/10000
  meals: ${d.meals.slice(0, 12).join('; ') || 'none logged'}`
  )).join('\n')

  const prompt = `You are a supportive, professional dietitian reviewing a user's health log for ${periodLabel} (period of ${days} day(s)). The user's goal is "${user.goal ?? 'maintain'}" and their daily targets are: ${targets.calories} kcal, ${targets.protein}g protein, ${targets.water}ml water, 10,000 steps.

Data per day (actual/target):
${dataBlock}
${weightNote}

Write an analysis IN HEBREW, personal (pronoun-neutral where possible), warm but honest and specific — reference actual foods and numbers from the data. Avoid generic advice that ignores the data. If something was not logged at all, gently note it might just be missing logging. In Hebrew text, write קק״ל with gershayim (״), never a straight double quote.

Return JSON with this exact shape:
{"headline":"משפט סיכום אחד קליט","food":"ניתוח האכילה: איכות המזון, קלוריות מול יעד, חלבון, סוכר — 2-4 משפטים","water":"ניתוח השתייה מול היעד — 1-2 משפטים","exercise":"ניתוח הפעילות הגופנית — 1-2 משפטים","steps":"ניתוח הצעדים מול יעד 10,000 — 1-2 משפטים","recommendations":["3-5 המלצות קונקרטיות וישימות להמשך, מבוססות על הנתונים"],"score":7}
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
            recommendations: { type: 'array', items: { type: 'string' } },
            score: { type: 'integer' },
          },
          required: ['headline', 'food', 'water', 'exercise', 'steps', 'recommendations', 'score'],
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
