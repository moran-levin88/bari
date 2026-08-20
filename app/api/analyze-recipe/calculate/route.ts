import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { getSession } from '@/lib/session'

export const maxDuration = 60

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL = 'gemini-2.5-flash'

function clamp(v: unknown, min: number, max: number): number {
  const n = Number(v)
  if (!isFinite(n)) return 0
  return Math.max(min, Math.min(max, n))
}

function validateProduct(raw: Record<string, unknown>, isEnglish: boolean) {
  return {
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : (isEnglish ? 'Recipe' : 'מתכון'),
    servingName: typeof raw.servingName === 'string' && raw.servingName.trim() ? raw.servingName.trim() : (isEnglish ? 'serving' : 'מנה'),
    calories: clamp(raw.calories, 0, 5000),
    protein: clamp(raw.protein, 0, 500),
    carbs: clamp(raw.carbs, 0, 1000),
    fat: clamp(raw.fat, 0, 500),
    fiber: clamp(raw.fiber, 0, 200),
    sugar: clamp(raw.sugar, 0, 500),
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

const RESPONSE_SHAPE_HE = `{"name":"שם המתכון בעברית","servingName":"תיאור קצר של מנה אחת, למשל \\"1 מנה (1/8 מהמתכון)\\"","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0}`
const RESPONSE_SHAPE_EN = `{"name":"recipe name in English","servingName":"short description of one serving, e.g. \\"1 serving (1/8 of recipe)\\"","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0}`

async function calculateRecipeNutrition(
  name: string | undefined,
  ingredients: { name: string; amount: string }[],
  servings: number,
  isEnglish: boolean
): Promise<Record<string, unknown>> {
  const ingredientLines = ingredients.map((i) => `- ${i.name}: ${i.amount || '?'}`).join('\n')

  const prompt = `You are a precise nutritionist with access to Google Search. Below is a full recipe's ingredient list with quantities, and the total number of servings it makes.

Calculate the TOTAL nutritional values for the ENTIRE recipe by summing every ingredient, then DIVIDE by the number of servings to get the values for exactly ONE serving. The returned numbers must be PER SERVING, not the recipe total.

Rules:
- For branded/packaged ingredients, search for their real nutrition label values.
- For generic ingredients (flour, chicken breast, vegetables, oil, etc.), use standard reference values from a nutrition database like USDA — do not search for these.
- Scale each ingredient's contribution to its stated quantity, then sum all ingredients, then divide the sum by ${servings} (the number of servings).
- Be consistent: the same ingredient list and serving count must always produce the same output.
- Write all text fields ${isEnglish ? 'IN ENGLISH' : 'IN HEBREW'}.

${name ? `Recipe name: ${name}\n` : ''}Ingredients (whole recipe):
${ingredientLines}

Total servings this recipe makes: ${servings}

Return ONLY valid JSON with the PER-SERVING values (no markdown, no explanation, no code fences):
${isEnglish ? RESPONSE_SHAPE_EN : RESPONSE_SHAPE_HE}`

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

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const isEnglish = body.locale === 'en'
    const name = typeof body.name === 'string' ? body.name.trim() : undefined
    const servings = Number(body.servings)
    const ingredients = Array.isArray(body.ingredients)
      ? body.ingredients
          .filter((i: unknown): i is { name: string; amount: string } =>
            typeof i === 'object' && i !== null && typeof (i as { name: unknown }).name === 'string' && !!(i as { name: string }).name.trim())
          .slice(0, 40)
      : []

    if (ingredients.length === 0) {
      return Response.json({ error: 'MISSING_INGREDIENTS' }, { status: 400 })
    }
    if (!servings || servings <= 0) {
      return Response.json({ error: 'INVALID_SERVINGS' }, { status: 400 })
    }

    const raw = await calculateRecipeNutrition(name, ingredients, servings, isEnglish)
    const product = validateProduct(raw, isEnglish)

    return Response.json({ success: true, product })
  } catch (error) {
    console.error('[analyze-recipe/calculate]', error instanceof Error ? error.message : error)

    const message = error instanceof Error ? error.message : ''
    if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      return Response.json({ error: 'AI_QUOTA_EXCEEDED' }, { status: 503 })
    }
    return Response.json({ error: 'AI_UNAVAILABLE' }, { status: 503 })
  }
}
