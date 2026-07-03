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

function validateProduct(raw: Record<string, unknown>) {
  return {
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : '',
    servingName: typeof raw.servingName === 'string' && raw.servingName.trim() ? raw.servingName.trim() : '100 גרם',
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

const RESPONSE_SHAPE = `{"name":"product name in Hebrew","servingName":"one serving unit in Hebrew (e.g. 100 גרם / פרוסה / כוס / יחידה / כף)","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0}`

async function analyzeProductImage(buffer: Buffer, mimeType: string): Promise<Record<string, unknown>> {
  const prompt = `You are a precise nutritionist with access to Google Search. The image shows either a food product (front of package) or a nutrition facts label (טבלת ערכים תזונתיים / סימון תזונתי).

Your job: extract the product's nutrition values PER ONE SERVING UNIT so it can be saved as a reusable food item.

Rules:
- If a nutrition facts table is visible, READ IT EXACTLY — do not estimate. Israeli labels usually show values per 100 גרם/מ"ל and sometimes per serving (מנה). Prefer per-100g/ml values, and set servingName to "100 גרם" (or "100 מ\\"ל" for drinks). If only per-serving values are shown, use them and set servingName accordingly (e.g. "פרוסה", "כוס", "יחידה", "מנה (30 גרם)").
- If only the front of the package is visible, identify the exact brand and product, then use Google Search to find its official nutrition label (manufacturer site, שופרסל, רמי לוי, etc.) and return real values per 100 גרם.
- name: the product name in Hebrew including brand if identifiable (e.g. "קוטג' 5% תנובה", "לחם דגנים אנג'ל").
- All numbers are for ONE serving unit exactly as described by servingName. protein/carbs/fat/fiber/sugar are grams.
- If a value is not shown on the label and cannot be found, use 0.
- Be consistent: the same label must always produce the same output.

Return ONLY valid JSON (no markdown, no explanation, no code fences):
${RESPONSE_SHAPE}`

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

    if (!imageFile || imageFile.size === 0) {
      return Response.json({ error: 'MISSING_INPUT' }, { status: 400 })
    }
    if (imageFile.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'IMAGE_TOO_LARGE' }, { status: 400 })
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer())
    const raw = await analyzeProductImage(buffer, imageFile.type)
    const product = validateProduct(raw)

    if (!product.name) {
      return Response.json({ error: 'PRODUCT_NOT_RECOGNIZED' }, { status: 422 })
    }

    return Response.json({ success: true, product })
  } catch (error) {
    console.error('[analyze-product]', error instanceof Error ? error.message : error)

    const message = error instanceof Error ? error.message : ''
    if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      return Response.json({ error: 'AI_QUOTA_EXCEEDED' }, { status: 503 })
    }
    return Response.json({ error: 'AI_UNAVAILABLE' }, { status: 503 })
  }
}
