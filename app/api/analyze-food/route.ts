import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { getSession } from '@/lib/session'

export const maxDuration = 30

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL = 'gemini-2.5-flash'

function clamp(v: unknown, min: number, max: number): number {
  const n = Number(v)
  if (!isFinite(n)) return 0
  return Math.max(min, Math.min(max, n))
}

function validateNutrition(raw: Record<string, unknown>) {
  return {
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'ארוחה',
    description: typeof raw.description === 'string' ? raw.description : '',
    servingSize: typeof raw.servingSize === 'string' ? raw.servingSize : '',
    calories: clamp(raw.calories, 0, 5000),
    protein: clamp(raw.protein, 0, 500),
    carbs: clamp(raw.carbs, 0, 1000),
    fat: clamp(raw.fat, 0, 500),
    fiber: clamp(raw.fiber, 0, 200),
    sugar: clamp(raw.sugar, 0, 500),
    ingredients: Array.isArray(raw.ingredients)
      ? raw.ingredients.filter((i) => typeof i === 'string').slice(0, 20)
      : [],
    tips: typeof raw.tips === 'string' ? raw.tips : '',
    breakdown: Array.isArray(raw.breakdown)
      ? raw.breakdown
          .filter((b: unknown): b is { name: string; calories: number } =>
            typeof (b as { name: string }).name === 'string' &&
            typeof (b as { calories: number }).calories === 'number'
          )
          .slice(0, 20)
      : [],
  }
}

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

const RESPONSE_SHAPE = `{"name":"meal name in Hebrew","description":"תיאור קצר בעברית","servingSize":"תיאור הכמות הכוללת","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"ingredients":[],"breakdown":[{"name":"food item in Hebrew","calories":0}],"tips":"טיפ תזונתי קצר בעברית"}`

async function analyzeTextWithGemini(mealName: string): Promise<Record<string, unknown>> {
  const prompt = `You are a precise nutritionist with access to Google Search. The user describes a meal they ate. Use Google Search to find ACCURATE, REAL nutrition data for each food item, then calculate the TOTAL nutritional values for the whole meal.

Rules:
- If multiple foods are listed (separated by +, ו, עם, etc.), calculate each one individually and ADD their nutritional values together to get the total.
- For branded Israeli products (e.g. "יוגורט פרו 20 דנונה", "קוטג' 5% תנובה"), search for the official nutrition label (manufacturer site, שופרסל, רמי לוי, חביבי, etc.) and use the real values per the amount eaten.
- For generic, unbranded foods (fruits, vegetables, plain rice, chicken breast, bread, etc.), do NOT use Google Search — use standard reference values from a nutrition database like USDA (e.g. 1 medium peach (~150g) ≈ 50 kcal, 100g cooked rice ≈ 130 kcal). This keeps results consistent.
- Use the exact quantities mentioned (grams, units, etc.) and scale linearly — e.g. 1.5 peaches = 1.5 × the value for 1 peach. For whole fruits/vegetables with no quantity specified, assume 1 medium-sized piece.
- Never reduce protein or calories when adding more foods — totals must always increase or stay the same.
- Be consistent: the exact same input must always produce the exact same output, and quantities must scale exactly linearly (e.g. "1.5 X" must be exactly 1.5 times "1 X").
- If multiple foods, populate "breakdown" with calories per individual food item.

Meal: "${mealName}"

Return ONLY valid JSON (no markdown, no explanation, no code fences):
${RESPONSE_SHAPE}`

  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0,
    },
  }))

  return extractJson(response.text || '')
}

async function analyzeImageWithGemini(buffer: Buffer, mimeType: string): Promise<Record<string, unknown>> {
  const prompt = `You are a precise nutritionist with access to Google Search. Analyse the food in the image and calculate its nutritional values.

Rules:
- Estimate realistic portion sizes based on what you see.
- If you recognise a branded/packaged product, use Google Search to find its real nutrition label values for the visible portion.
- For whole fruits/vegetables, use 1 medium-sized piece if not obvious.
- Be consistent: similar images must produce similar output.

Return ONLY valid JSON (no markdown, no explanation, no code fences):
${RESPONSE_SHAPE.replace('"breakdown":[{"name":"food item in Hebrew","calories":0}],', '')}`

  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL,
    contents: [
      { text: prompt },
      { inlineData: { mimeType, data: buffer.toString('base64') } },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0,
    },
  }))

  return extractJson(response.text || '')
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const mealName = formData.get('name') as string | null

    if (!mealName && (!imageFile || imageFile.size === 0)) {
      return Response.json({ error: 'MISSING_INPUT' }, { status: 400 })
    }

    if (imageFile && imageFile.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'IMAGE_TOO_LARGE' }, { status: 400 })
    }

    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      const raw = await analyzeImageWithGemini(buffer, imageFile.type)
      return Response.json({ success: true, nutrition: validateNutrition(raw) })
    }

    const raw = await analyzeTextWithGemini(mealName || '')
    return Response.json({ success: true, nutrition: validateNutrition(raw) })

  } catch (error) {
    console.error('[analyze-food]', error instanceof Error ? error.message : error)

    const message = error instanceof Error ? error.message : ''
    if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      return Response.json({ error: 'AI_QUOTA_EXCEEDED' }, { status: 503 })
    }
    if (message.includes('too large') || message.includes('image')) {
      return Response.json({ error: 'IMAGE_TOO_LARGE' }, { status: 400 })
    }
    return Response.json({ error: 'AI_UNAVAILABLE' }, { status: 503 })
  }
}
