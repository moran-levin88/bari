import { GoogleGenAI } from '@google/genai'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { getAgeGroupGuidelines } from '@/lib/nutrition'

export const maxDuration = 30

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

function validateInsights(raw: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  return {
    summary: str(raw.summary),
    topics: Array.isArray(raw.topics)
      ? raw.topics
          .filter((t): t is { title: string; text: string } =>
            typeof t === 'object' && t !== null &&
            typeof (t as { title: unknown }).title === 'string' &&
            typeof (t as { text: unknown }).text === 'string'
          )
          .slice(0, 6)
      : [],
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.filter((r): r is string => typeof r === 'string').slice(0, 6)
      : [],
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { age: true, gender: true, goal: true, activityLevel: true, locale: true },
  })
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.age) return Response.json({ error: 'MISSING_AGE' }, { status: 400 })

  const ageGuide = getAgeGroupGuidelines(user.age)
  const isEnglish = user.locale === 'en'
  const genderLabel = isEnglish
    ? (user.gender === 'female' ? 'female' : user.gender === 'male' ? 'male' : 'unspecified')
    : (user.gender === 'female' ? 'אישה' : user.gender === 'male' ? 'גבר' : 'לא צוין')

  const prompt = `You are a careful, knowledgeable health educator writing for a nutrition/weight-tracking app. Provide general, educational information (not a diagnosis, not personalized medical advice) about physiological and hormonal factors relevant to weight management for someone of this profile:

Age: ${user.age} (life stage: ${ageGuide.group})
Gender: ${genderLabel}
Goal: ${user.goal ?? 'maintain'}
Activity level: ${user.activityLevel ?? 'moderate'}

Explain the physiological/hormonal factors that are ACTUALLY relevant to this specific age and gender and how they interact with weight and metabolism. For example (pick only what genuinely applies — don't force irrelevant topics):
- Women roughly 45-60: perimenopause/menopause, declining estrogen, its effect on fat distribution, metabolism and muscle mass, and practical adjustments.
- Men roughly 45+: gradually declining testosterone, muscle mass changes, metabolism shifts.
- Ages 60+: sarcopenia (age-related muscle loss), bone density, protein needs, appetite changes.
- Ages under 30: growth-related metabolism, building sustainable long-term habits.
- Otherwise: general metabolic/hormonal patterns typical for this age and gender.

Write ${isEnglish ? 'IN ENGLISH' : 'IN HEBREW'}. Keep it warm, clear and practical — not clinical jargon. This must read as general education, not a diagnosis or a personal medical recommendation; where relevant, gently suggest consulting a doctor or dietitian for anything personal/medical.

Return JSON with this exact shape:
${isEnglish
  ? '{"summary":"one opening sentence summarizing this life stage in relation to weight","topics":[{"title":"short topic title","text":"2-4 explanatory sentences"}],"recommendations":["3-5 practical, actionable recommendations"]}'
  : '{"summary":"משפט פתיחה אחד המסכם את השלב הזה בחיים ביחס למשקל","topics":[{"title":"כותרת קצרה של נושא","text":"2-4 משפטי הסבר"}],"recommendations":["3-5 המלצות פרקטיות וישימות"]}'}`

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
            summary: { type: 'string' },
            topics: {
              type: 'array',
              items: {
                type: 'object',
                properties: { title: { type: 'string' }, text: { type: 'string' } },
                required: ['title', 'text'],
              },
            },
            recommendations: { type: 'array', items: { type: 'string' } },
          },
          required: ['summary', 'topics', 'recommendations'],
        },
      },
    }))

    const insights = validateInsights(extractJson(response.text || ''))
    return Response.json({ success: true, insights, ageGroup: ageGuide.group })
  } catch (error) {
    console.error('[insights]', error instanceof Error ? error.message : error)
    if (isRateLimitError(error)) {
      return Response.json({ error: 'AI_QUOTA_EXCEEDED' }, { status: 503 })
    }
    return Response.json({ error: 'AI_UNAVAILABLE' }, { status: 503 })
  }
}
