import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { getSession } from '@/lib/session'

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

function validateIngredients(raw: Record<string, unknown>) {
  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients
        .filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null)
        .map((i) => ({
          name: typeof i.name === 'string' ? i.name.trim() : '',
          amount: typeof i.amount === 'string' ? i.amount.trim() : '',
        }))
        .filter((i) => i.name)
        .slice(0, 40)
    : []
  return {
    name: typeof raw.name === 'string' ? raw.name.trim() : '',
    ingredients,
  }
}

const RESPONSE_SHAPE = `{"name":"recipe name if visible in the photo, else empty string","ingredients":[{"name":"ingredient name","amount":"quantity exactly as written, e.g. 2 cups / 500g / a pinch"}]}`

async function extractRecipeIngredients(buffer: Buffer, mimeType: string, isEnglish: boolean): Promise<Record<string, unknown>> {
  const prompt = `You are reading a photo of a recipe's ingredient list. Extract every ingredient with its quantity exactly as written — do not compute nutrition, just transcribe and structure the list.

Rules:
- One entry per ingredient line, in the order shown.
- Keep quantities as written (fractions, ranges, "to taste", etc. are fine as text).
- Ignore preparation steps/instructions — only the ingredients list.
- If a recipe title is visible, include it as "name".
- Write all text fields ${isEnglish ? 'IN ENGLISH' : 'IN HEBREW'}, translating if the photo is in a different language.

Return ONLY valid JSON (no markdown, no explanation, no code fences):
${RESPONSE_SHAPE}`

  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL,
    contents: [
      { text: prompt },
      { inlineData: { mimeType, data: buffer.toString('base64') } },
    ],
    config: { temperature: 0 },
  }))

  return extractJson(response.text || '')
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const isEnglish = formData.get('locale') === 'en'

    if (!imageFile || imageFile.size === 0) {
      return Response.json({ error: 'MISSING_INPUT' }, { status: 400 })
    }
    if (imageFile.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'IMAGE_TOO_LARGE' }, { status: 400 })
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer())
    const raw = await extractRecipeIngredients(buffer, imageFile.type, isEnglish)
    const result = validateIngredients(raw)

    if (result.ingredients.length === 0) {
      return Response.json({ error: 'NO_INGREDIENTS_FOUND' }, { status: 422 })
    }

    return Response.json({ success: true, ...result })
  } catch (error) {
    console.error('[analyze-recipe/photo]', error instanceof Error ? error.message : error)

    const message = error instanceof Error ? error.message : ''
    if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      return Response.json({ error: 'AI_QUOTA_EXCEEDED' }, { status: 503 })
    }
    return Response.json({ error: 'AI_UNAVAILABLE' }, { status: 503 })
  }
}
