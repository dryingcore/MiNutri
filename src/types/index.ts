export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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
}
