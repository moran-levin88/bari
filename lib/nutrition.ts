// Interpolates a value between anchor points [x, y], clamping to the first/last
// y outside the anchor range. Used to turn weekly workout count into a smooth
// multiplier/coefficient instead of a step function with hard jumps.
function piecewiseLinear(anchors: [x: number, y: number][], x: number): number {
  const [minX, minY] = anchors[0]
  const [maxX, maxY] = anchors[anchors.length - 1]
  if (x <= minX) return minY
  if (x >= maxX) return maxY

  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, y0] = anchors[i]
    const [x1, y1] = anchors[i + 1]
    if (x >= x0 && x <= x1) {
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
    }
  }
  return maxY
}

// Activity multiplier as a smooth function of weekly workout count, instead of
// discrete buckets — piecewise-linear interpolation between the same anchor
// points the old 5-category picker used (at each category's representative
// weekly count), so a single extra/fewer workout shifts the target gradually
// instead of jumping the whole week's calories at a bucket boundary.
const ACTIVITY_ANCHORS: [workouts: number, multiplier: number][] = [
  [0, 1.2], // sedentary
  [2, 1.375], // light: 1-3x/week
  [4, 1.55], // moderate: 3-5x/week
  [6.5, 1.725], // active: 6-7x/week
  [9, 1.9], // very active: athletes / physical work
]

// Protein target (g per kg body weight) as a smooth function of weekly
// workout count. Driven by training frequency alone, not by goal — more
// training means more protein need to support and recover muscle, regardless
// of whether the calorie target is a deficit, surplus, or maintenance.
const PROTEIN_ANCHORS: [workouts: number, gramsPerKg: number][] = [
  [0, 1.6],
  [4, 1.8],
  [6.5, 2.2],
]

// Old category picker values, kept so profiles saved before the switch to a
// numeric "workouts per week" input keep producing the same targets.
const LEGACY_ACTIVITY_WORKOUTS: Record<string, number> = {
  sedentary: 0,
  light: 2,
  moderate: 4,
  active: 6.5,
  very_active: 9,
}

// Converts a saved activityLevel value (legacy category name, or an already
// numeric "workouts per week" string) into what the numeric input expects.
export function activityLevelToWorkoutsInput(value: string): string {
  if (value in LEGACY_ACTIVITY_WORKOUTS) return String(LEGACY_ACTIVITY_WORKOUTS[value])
  return value
}

// True for a profile still holding a pre-migration category name (its target
// is only ever the category's representative midpoint, never the user's
// actual weekly count) — used to prompt them to enter the exact number.
export function isLegacyActivityLevel(value: string): boolean {
  return value in LEGACY_ACTIVITY_WORKOUTS
}

function resolveWeeklyWorkouts(activityLevel: string): number {
  if (activityLevel in LEGACY_ACTIVITY_WORKOUTS) return LEGACY_ACTIVITY_WORKOUTS[activityLevel]
  const n = Number(activityLevel)
  return Number.isFinite(n) ? n : LEGACY_ACTIVITY_WORKOUTS.moderate
}

function activityMultiplier(workouts: number): number {
  return piecewiseLinear(ACTIVITY_ANCHORS, workouts)
}

// Daily nutrition targets based on age, weight, height, goal, and activity level
export function calculateDailyTargets(params: {
  age: number
  weight: number // kg
  height: number // cm
  gender?: string
  goal?: string
  activityLevel?: string // weekly workout count (e.g. "5"), or a legacy category name
}) {
  const { age, weight, height, gender = 'other', goal = 'maintain', activityLevel = 'moderate' } = params

  // Mifflin-St Jeor BMR calculation
  let bmr: number
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5
  } else if (gender === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 78
  }

  const weeklyWorkouts = resolveWeeklyWorkouts(activityLevel)
  const tdee = bmr * activityMultiplier(weeklyWorkouts)

  let calories: number
  switch (goal) {
    case 'lose_weight':
      calories = tdee - 500
      break
    case 'gain_muscle':
      calories = tdee + 300
      break
    default:
      calories = tdee
  }

  calories = Math.round(calories)

  // Macronutrient targets
  const proteinPerKg = piecewiseLinear(PROTEIN_ANCHORS, weeklyWorkouts)
  const protein = Math.round(weight * proteinPerKg)
  const fat = Math.round((calories * 0.3) / 9) // 30% of calories
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4)) // remaining

  // Water target: ~35ml per kg body weight
  const water = Math.round(weight * 35)

  return { calories, protein, carbs, fat, water }
}

// Default targets when no profile is set (2000 kcal standard)
export const DEFAULT_TARGETS = {
  calories: 2000,
  protein: 50,
  carbs: 250,
  fat: 65,
  water: 2000,
}

export function getAgeGroupGuidelines(age: number) {
  if (age < 2) {
    return {
      group: 'תינוקות',
      notes: 'הנקה מומלצת, מינרלים ממוצרים מותאמים',
      waterMl: 700,
    }
  } else if (age < 13) {
    return {
      group: 'ילדים',
      notes: 'פירות, ירקות, דגנים מלאים, חלב, חלבון רזה. הגבל סוכר וג\'אנק פוד.',
      waterMl: 1200 + (age - 2) * 100,
    }
  } else if (age < 19) {
    return {
      group: 'מתבגרים',
      notes: 'גדילה מואצת — הגדל צריכת חלבון, ברזל, סידן. הימנע ממשקאות אנרגיה.',
      waterMl: 2000,
    }
  } else if (age < 40) {
    return {
      group: 'מבוגרים צעירים',
      notes: 'דיאטה מאוזנת עם דגש על ירקות, דגנים מלאים, שומנים בריאים ופעילות גופנית.',
      waterMl: 2500,
    }
  } else if (age < 60) {
    return {
      group: 'מבוגרים',
      notes: 'הגדל סיבים, הפחת נתרן. שמור על מסת שריר עם חלבון ואימונים.',
      waterMl: 2500,
    }
  } else {
    return {
      group: 'גיל הזהב',
      notes: 'הגדל ויטמין D, סידן, B12. ארוחות קטנות ותכופות. הישאר פעיל.',
      waterMl: 2000,
    }
  }
}
