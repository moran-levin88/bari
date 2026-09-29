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

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const audio = formData.get('audio') as File | null

    if (!audio || audio.size === 0) return Response.json({ error: 'MISSING_INPUT' }, { status: 400 })
    if (audio.size > 10 * 1024 * 1024) return Response.json({ error: 'AUDIO_TOO_LARGE' }, { status: 400 })

    const buffer = Buffer.from(await audio.arrayBuffer())
    const mimeType = audio.type || 'audio/webm'

    const response = await withRetry(() => ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          text: 'Transcribe this audio recording of someone describing a meal they ate. Transcribe VERBATIM in the same language the person is speaking — do not translate it. Return ONLY the transcribed text — no explanation, no quotes, no markdown formatting. If the audio is silent or the speech is unintelligible, return an empty string.',
        },
        { inlineData: { mimeType, data: buffer.toString('base64') } },
      ],
      config: { temperature: 0 },
    }))

    const transcript = (response.text || '').trim()
    return Response.json({ success: true, transcript })

  } catch (error) {
    console.error('[transcribe]', error instanceof Error ? error.message : error)
    const message = error instanceof Error ? error.message : ''
    if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      return Response.json({ error: 'AI_QUOTA_EXCEEDED' }, { status: 503 })
    }
    return Response.json({ error: 'AI_UNAVAILABLE' }, { status: 503 })
  }
}
