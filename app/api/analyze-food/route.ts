import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { getSession } from '@/lib/session'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY'

// USDA FoodData Central nutrient IDs (Foundation / SR Legacy data types)
const USDA_NUTRIENT_IDS = {
  calories: 1008,
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  fiber: 1079,
  sugar: 1063,
} as const

type NutrientTotals = { calories: number; protein: number; fat: number; carbs: number; fiber: number; sugar: number }
type FoodItem = { englishName: string; hebrewName: string; portionGrams: number; isBranded: boolean }

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

async function lookupUSDA(item: FoodItem): Promise<NutrientTotals | null> {
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(item.englishName)}&api_key=${USDA_API_KEY}&dataType=Foundation,SR%20Legacy&pageSize=1`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const data = await res.json()
    const food = data.foods?.[0]
    if (!food?.foodNutrients?.length) return null

    const scale = item.portionGrams / 100
    const totals: NutrientTotals = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0 }
    for (const [key, id] of Object.entries(USDA_NUTRIENT_IDS)) {
      const nutrient = food.foodNutrients.find((n: { nutrientId: number; value: number }) => n.nutrientId === id)
      totals[key as keyof NutrientTotals] = Math.round((nutrient?.value || 0) * scale)
    }
    return totals
  } catch {
    return null
  }
}

async function lookupOpenFoodFacts(item: FoodItem): Promise<NutrientTotals | null> {
  // Try Hebrew name first (better for Israeli products), fall back to English
  const queries = [item.hebrewName, item.englishName].filter(Boolean)
  for (const query of queries) {
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=1`
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) continue
      const data = await res.json()
      const product = data.products?.[0]
      const n = product?.nutriments
      if (!n) continue

      const kcal = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : null)
      if (!kcal) continue

      const scale = item.portionGrams / 100
      return {
        calories: Math.round((kcal || 0) * scale),
        protein: Math.round((n['proteins_100g'] || n['proteins'] || 0) * scale),
        fat: Math.round((n['fat_100g'] || n['fat'] || 0) * scale),
        carbs: Math.round((n['carbohydrates_100g'] || n['carbohydrates'] || 0) * scale),
        fiber: Math.round((n['fiber_100g'] || n['fiber'] || 0) * scale),
        sugar: Math.round((n['sugars_100g'] || n['sugars'] || 0) * scale),
      }
    } catch {
      continue
    }
  }
  return null
}

async function lookupFood(item: FoodItem): Promise<NutrientTotals | null> {
  if (item.isBranded) {
    // Branded/packaged product (e.g. קוטג' 5%, יוגורט דנונה): OpenFoodFacts has real label data
    const [off, usda] = await Promise.all([lookupOpenFoodFacts(item), lookupUSDA(item)])
    return off ?? usda
  } else {
    // Generic food (chicken, apple, rice): USDA is curated and reliable; OpenFoodFacts can return wrong matches
    return lookupUSDA(item)
  }
}

async function analyzeWithAI(mealName: string): Promise<Record<string, unknown>> {
  const prompt = `You are a precise nutritionist database. The user describes a meal they ate. Calculate the TOTAL nutritional values for everything described.

Rules:
- If multiple foods are listed (separated by +, ו, עם, etc.), ADD their nutritional values together to get the total.
- Use the exact quantities mentioned (e.g. "20" in a product name is the product's protein content, not grams eaten — use the full package serving).
- For branded Israeli products (e.g. "יוגורט פרו 20 דנונה", "קוטג' 5%"), use their actual known nutritional label values.
- For whole fruits/vegetables with no quantity specified, use 1 medium-sized piece.
- Never reduce protein or calories when adding more foods — totals must always increase or stay the same.
- Be consistent: the same input must always produce the same output.
- If multiple foods, populate "breakdown" with calories per individual food item.

Meal: "${mealName}"

Return ONLY valid JSON (no markdown, no explanation):
{"name":"meal name in Hebrew","description":"תיאור קצר בעברית","servingSize":"תיאור הכמות הכוללת","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"ingredients":[],"breakdown":[{"name":"food item in Hebrew","calories":0}],"tips":"טיפ תזונתי קצר בעברית"}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 600,
    temperature: 0,
  })
  return JSON.parse(response.choices[0].message.content || '{}')
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

    // Image input: AI only (databases can't process images)
    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      const base64Image = buffer.toString('base64')
      const prompt = `You are a precise nutritionist database. Analyse the food in the image and calculate its nutritional values.

Rules:
- Estimate realistic portion sizes based on what you see.
- For whole fruits/vegetables, use 1 medium-sized piece if not obvious.
- Be consistent: similar images must produce similar output.

Return ONLY valid JSON (no markdown, no explanation):
{"name":"meal name in Hebrew","description":"תיאור קצר בעברית","servingSize":"תיאור הכמות הכוללת","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"ingredients":[],"tips":"טיפ תזונתי קצר בעברית"}`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
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
      const raw = JSON.parse(response.choices[0].message.content || '{}')
      return Response.json({ success: true, nutrition: validateNutrition(raw) })
    }

    // Text input: Phase 1 — AI identifies foods with both Hebrew + English names and estimated portions
    const identifyPrompt = `Parse this meal into individual food items for a nutrition database lookup.
For each food, provide both the Hebrew name and English name, estimated portion in grams, and whether it is a branded/packaged product (isBranded: true) or a generic whole food like chicken, apple, rice (isBranded: false).

Meal: "${mealName}"

Return ONLY valid JSON:
{"foods":[{"hebrewName":"שם בעברית","englishName":"food name in English","portionGrams":150,"isBranded":false}],"hebrewName":"שם הארוחה","description":"תיאור קצר בעברית","servingSize":"תיאור הכמות הכוללת","tips":"טיפ תזונתי קצר בעברית"}`

    const identifyResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: identifyPrompt }],
      response_format: { type: 'json_object' },
      max_tokens: 400,
      temperature: 0,
    })

    const identified = JSON.parse(identifyResponse.choices[0].message.content || '{}')
    const foods: FoodItem[] = Array.isArray(identified.foods)
      ? identified.foods.filter(
          (f: unknown): f is FoodItem =>
            typeof (f as FoodItem).englishName === 'string' && Number((f as FoodItem).portionGrams) > 0
        ).map((f: FoodItem) => ({ ...f, isBranded: f.isBranded === true }))
      : []

    // Phase 2 — OpenFoodFacts + USDA lookup for each food in parallel
    let dbTotals: NutrientTotals | null = null
    let breakdown: { name: string; calories: number }[] = []
    if (foods.length > 0) {
      const results = await Promise.all(foods.map(lookupFood))
      const validResults = results.filter((r): r is NutrientTotals => r !== null)

      if (validResults.length > 0) {
        dbTotals = validResults.reduce(
          (acc, r) => ({
            calories: acc.calories + r.calories,
            protein: acc.protein + r.protein,
            fat: acc.fat + r.fat,
            carbs: acc.carbs + r.carbs,
            fiber: acc.fiber + r.fiber,
            sugar: acc.sugar + r.sugar,
          }),
          { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0 }
        )
        breakdown = foods
          .map((f, i) => results[i] ? { name: `${f.hebrewName} (${f.portionGrams}g)`, calories: results[i]!.calories } : null)
          .filter((b): b is { name: string; calories: number } => b !== null)
      }
    }

    if (dbTotals) {
      const nutrition = validateNutrition({
        name: identified.hebrewName || mealName,
        description: identified.description || '',
        servingSize: identified.servingSize || foods.map((f) => `${f.hebrewName} ${f.portionGrams}g`).join(', '),
        tips: identified.tips || '',
        ingredients: foods.map((f) => `${f.hebrewName} – ${f.portionGrams}g`),
        breakdown,
        ...dbTotals,
      })
      return Response.json({ success: true, nutrition })
    }

    // Fallback: full AI analysis
    const raw = await analyzeWithAI(mealName || '')
    return Response.json({ success: true, nutrition: validateNutrition(raw) })

  } catch (error) {
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
