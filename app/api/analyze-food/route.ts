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

    let imageUrl: string | null = null
    let base64Image: string | null = null

    if (imageFile) {
      const bytes = await imageFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      base64Image = buffer.toString('base64')
    }

    const prompt = `You are a professional nutritionist. Analyze this food item and provide accurate nutritional information.
${mealName ? `Food name provided: "${mealName}"` : ''}
${base64Image ? 'I am providing an image of the food.' : 'No image provided, use the food name only.'}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "name": "food name in Hebrew",
  "description": "brief description in Hebrew (1 sentence)",
  "servingSize": "serving size description",
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "fiber": number (grams),
  "sugar": number (grams),
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "tips": "one healthy eating tip in Hebrew"
}`

    let response: OpenAI.Chat.ChatCompletion

    if (base64Image) {
      response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageFile!.type};base64,${base64Image}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      })
    } else {
      response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      })
    }

    const content = response.choices[0].message.content || '{}'
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const nutrition = JSON.parse(cleaned)

    return Response.json({ success: true, nutrition })
  } catch (error) {
    console.error('Food analysis error:', error)
    return Response.json(
      { error: 'שגיאה בניתוח האוכל. נסי שוב.' },
      { status: 500 }
    )
  }
}
