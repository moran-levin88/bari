import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { getSession } from '@/lib/session'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
  }
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

    let base64Image: string | null = null
    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      base64Image = buffer.toString('base64')
    }

    const prompt = `You are a precise nutritionist database. The user describes a meal they ate. Calculate the TOTAL nutritional values for everything described.

Rules:
- If multiple foods are listed (separated by +, ו, עם, etc.), ADD their nutritional values together to get the total.
- Use the exact quantities mentioned (e.g. "20" in a product name is the product's protein content, not grams eaten — use the full package serving).
- For branded Israeli products (e.g. "יוגורט פרו 20 דנונה", "קוטג' 5%"), use their actual known nutritional label values.
- For whole fruits/vegetables with no quantity specified, use 1 medium-sized piece.
- Never reduce protein or calories when adding more foods — totals must always increase or stay the same.
- Be consistent: the same input must always produce the same output.

Meal: "${mealName || 'unknown food'}"

Return ONLY valid JSON (no markdown, no explanation):
{"name":"meal name in Hebrew","description":"תיאור קצר בעברית","servingSize":"תיאור הכמות הכוללת","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"ingredients":[],"tips":"טיפ תזונתי קצר בעברית"}`

    let response: OpenAI.Chat.ChatCompletion

    if (base64Image && imageFile) {
      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${imageFile.type};base64,${base64Image}`, detail: 'low' } },
          ],
        }],
        response_format: { type: 'json_object' },
        max_tokens: 600,
        temperature: 0,
      })
    } else {
      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 600,
        temperature: 0,
      })
    }

    const raw = JSON.parse(response.choices[0].message.content || '{}')
    const nutrition = validateNutrition(raw)

    return Response.json({ success: true, nutrition })
  } catch (error) {
    // Log full error server-side, return opaque code to client
    console.error('[analyze-food]', error instanceof Error ? error.message : error)

    const message = error instanceof Error ? error.message : ''
    if (message.includes('quota') || message.includes('billing')) {
      return Response.json({ error: 'AI_QUOTA_EXCEEDED' }, { status: 503 })
    }
    if (message.includes('too large') || message.includes('image')) {
      return Response.json({ error: 'IMAGE_TOO_LARGE' }, { status: 400 })
    }
    return Response.json({ error: 'AI_UNAVAILABLE' }, { status: 503 })
  }
}
