export interface Micronutrients {
  calcium: number; // mg
  iron: number; // mg
  vitaminA: number; // mcg
  vitaminC: number; // mg
}

export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  micronutrients?: Micronutrients;
}

export interface Meal extends Nutrients {
  id: string;
  name: string;
  timestamp: Date;
  imageUrl?: string;
  breakdown?: Array<{ item: string; grams: number; calories: number }>;
}

export interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number; // daily goal in ml
}

export interface HydrationEntry {
  id: string;
  amountMl: number;
  timestamp: Date;
}

export interface SymptomLog {
  id: string;
  symptom: string;
  severity: 1 | 2 | 3 | 4 | 5; // 1 to 5 scale
  timestamp: Date;
  notes?: string;
}

export interface MealPlanDay {
  date: string; // YYYY-MM-DD
  meals: Array<{ id: string; title: string; image?: string; instructions?: string; readyInMinutes?: number }>;
  nutrients: { calories: number; protein: number; fat: number; carbohydrates: number };
}

export interface ShoppingItem {
  id: number;
  name: string;
  amount: number;
  unit: string;
  acquired: boolean;
}
