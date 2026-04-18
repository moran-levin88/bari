import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { getSession } from '@/lib/session'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const mealName = formData.get('name') as string | null

    let base64Image: string | null = null

    if (imageFile && imageFile.size > 0) {
      const bytes = await imageFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
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
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageFile.type};base64,${base64Image}`,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        max_tokens: 600,
      })
    } else {
      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
      })
    }

    const content = response.choices[0].message.content || '{}'

    // Extract JSON robustly — find the first { ... } block
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('התשובה לא הכילה JSON תקין')
    const nutrition = JSON.parse(jsonMatch[0])

    return Response.json({ success: true, nutrition })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Food analysis error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
