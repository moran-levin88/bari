// Daily nutrition targets based on age, weight, height, goal, and activity level
export function calculateDailyTargets(params: {
  age: number
  weight: number // kg
  height: number // cm
  gender?: string
  goal?: string
  activityLevel?: string
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

  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }

  const tdee = bmr * (activityMultipliers[activityLevel] || 1.55)

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
  const protein = Math.round(weight * 1.6) // 1.6g per kg
  const fat = Math.round((calories * 0.3) / 9) // 30% of calories
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4) // remaining

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
