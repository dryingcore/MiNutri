import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Meal, DailyGoal, Micronutrients, HydrationEntry } from '../types';

interface NutritionContextData {
  meals: Meal[];
  addMeal: (meal: Meal) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  
  dailyGoal: DailyGoal;
  setDailyGoal: (goal: DailyGoal) => Promise<void>;
  
  todaysTotals: DailyGoal & { micronutrients: Micronutrients };
  
  hydrationEntries: HydrationEntry[];
  todaysHydrationMl: number;
  addHydration: (amountMl: number) => Promise<void>;
  removeHydration: (id: string) => Promise<void>;
  
  currentStreak: number;
  
  isLoading: boolean;
}

const defaultGoal: DailyGoal = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 60,
  waterMl: 2000,
};

const NutritionContext = createContext<NutritionContextData>({} as NutritionContextData);

export const NutritionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(defaultGoal);
  const [hydrationEntries, setHydrationEntries] = useState<HydrationEntry[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storedMeals = await AsyncStorage.getItem('@minutri_meals');
      const storedGoal = await AsyncStorage.getItem('@minutri_goal');
      const storedHydration = await AsyncStorage.getItem('@minutri_hydration');
      const storedStreak = await AsyncStorage.getItem('@minutri_streak');

      if (storedMeals) {
        const parsedMeals = JSON.parse(storedMeals).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMeals(parsedMeals);
        calculateStreak(parsedMeals); // Helper to check days recorded
      }
      
      if (storedGoal) setDailyGoal(JSON.parse(storedGoal));
      
      if (storedHydration) {
        const parsedHydration = JSON.parse(storedHydration).map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp),
        }));
        setHydrationEntries(parsedHydration);
      }
      
      if (storedStreak) setCurrentStreak(parseInt(storedStreak, 10));

    } catch (e) {
      console.error('Failed to load nutrition data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStreak = (allMeals: Meal[]) => {
    if (!allMeals || allMeals.length === 0) return;
    
    // Simplistic Streak Logic:
    // Extract unique format dates
    const dates = allMeals.map(m => m.timestamp.toDateString());
    const uniqueDates = Array.from(new Set(dates)).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()); 
    // uniqueDates[0] is most recent.
    
    let streak = 0;
    let checkDate = new Date();
    
    // Check if recorded today or yesterday to continue streak
    if (uniqueDates[0] === checkDate.toDateString() || uniqueDates[0] === new Date(Date.now() - 86400000).toDateString()) {
       // iterate backwards verifying sequence
       for(let i=0; i < uniqueDates.length; i++) {
           const dateStr = checkDate.toDateString();
           if (uniqueDates.includes(dateStr)) {
               streak++;
               checkDate.setDate(checkDate.getDate() - 1);
           } else {
               break; // sequence broken
           }
       }
    }
    
    setCurrentStreak(streak);
    AsyncStorage.setItem('@minutri_streak', streak.toString()).catch(console.error);
  };

  const addMeal = async (newMeal: Meal) => {
    try {
      const updatedMeals = [newMeal, ...meals];
      setMeals(updatedMeals);
      await AsyncStorage.setItem('@minutri_meals', JSON.stringify(updatedMeals));
      calculateStreak(updatedMeals);
    } catch (e) {
      console.error('Failed to save meal', e);
    }
  };

  const removeMeal = async (id: string) => {
    try {
      const updatedMeals = meals.filter(m => m.id !== id);
      setMeals(updatedMeals);
      await AsyncStorage.setItem('@minutri_meals', JSON.stringify(updatedMeals));
      calculateStreak(updatedMeals);
    } catch (e) {
      console.error('Failed to remove meal', e);
    }
  };

  const saveDailyGoal = async (goal: DailyGoal) => {
    try {
      setDailyGoal(goal);
      await AsyncStorage.setItem('@minutri_goal', JSON.stringify(goal));
    } catch (e) {
      console.error('Failed to save goal', e);
    }
  };

  const addHydration = async (amountMl: number) => {
    try {
      const newEntry: HydrationEntry = {
        id: Date.now().toString(),
        amountMl,
        timestamp: new Date(),
      };
      const updatedEntries = [newEntry, ...hydrationEntries];
      setHydrationEntries(updatedEntries);
      await AsyncStorage.setItem('@minutri_hydration', JSON.stringify(updatedEntries));
    } catch (e) {
      console.error('Failed to add hydration', e);
    }
  };

  const removeHydration = async (id: string) => {
    try {
      const updatedEntries = hydrationEntries.filter(h => h.id !== id);
      setHydrationEntries(updatedEntries);
      await AsyncStorage.setItem('@minutri_hydration', JSON.stringify(updatedEntries));
    } catch(e) {
      console.error('Failed to remove hydration', e);
    }
  };


  // Calculate today's totals
  const today = new Date();
  const todaysMeals = meals.filter(
    (meal) =>
      meal.timestamp.getDate() === today.getDate() &&
      meal.timestamp.getMonth() === today.getMonth() &&
      meal.timestamp.getFullYear() === today.getFullYear()
  );

  const todaysTotals = todaysMeals.reduce(
    (acc, meal) => {
      const micro = meal.micronutrients || { calcium: 0, iron: 0, vitaminA: 0, vitaminC: 0 };
      return {
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
        waterMl: 0,
        micronutrients: {
          calcium: acc.micronutrients.calcium + (micro.calcium || 0),
          iron: acc.micronutrients.iron + (micro.iron || 0),
          vitaminA: acc.micronutrients.vitaminA + (micro.vitaminA || 0),
          vitaminC: acc.micronutrients.vitaminC + (micro.vitaminC || 0),
        }
      };
    },
    { 
       calories: 0, protein: 0, carbs: 0, fat: 0, waterMl: 0,
       micronutrients: { calcium: 0, iron: 0, vitaminA: 0, vitaminC: 0 }
    }
  );

  const todaysHydrationMl = hydrationEntries
    .filter(h => 
      h.timestamp.getDate() === today.getDate() &&
      h.timestamp.getMonth() === today.getMonth() &&
      h.timestamp.getFullYear() === today.getFullYear()
    )
    .reduce((acc, entry) => acc + entry.amountMl, 0);

  return (
    <NutritionContext.Provider
      value={{
        meals,
        addMeal,
        removeMeal,
        dailyGoal,
        setDailyGoal: saveDailyGoal,
        todaysTotals,
        hydrationEntries,
        todaysHydrationMl,
        addHydration,
        removeHydration,
        currentStreak,
        isLoading,
      }}
    >
      {children}
    </NutritionContext.Provider>
  );
};

export const useNutrition = () => {
  const context = useContext(NutritionContext);
  if (!context) {
    throw new Error('useNutrition must be used within a NutritionProvider');
  }
  return context;
};
