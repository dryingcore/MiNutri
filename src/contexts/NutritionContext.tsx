import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Meal, DailyGoal } from '../types';

interface NutritionContextData {
  meals: Meal[];
  addMeal: (meal: Meal) => Promise<void>;
  dailyGoal: DailyGoal;
  setDailyGoal: (goal: DailyGoal) => Promise<void>;
  todaysTotals: DailyGoal;
  isLoading: boolean;
}

const defaultGoal: DailyGoal = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 60,
};

const NutritionContext = createContext<NutritionContextData>({} as NutritionContextData);

export const NutritionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(defaultGoal);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storedMeals = await AsyncStorage.getItem('@minutri_meals');
      const storedGoal = await AsyncStorage.getItem('@minutri_goal');

      if (storedMeals) {
        // Parse dates back to Date objects
        const parsedMeals = JSON.parse(storedMeals).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMeals(parsedMeals);
      }
      
      if (storedGoal) {
        setDailyGoal(JSON.parse(storedGoal));
      }
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const addMeal = async (newMeal: Meal) => {
    try {
      const updatedMeals = [newMeal, ...meals];
      setMeals(updatedMeals);
      await AsyncStorage.setItem('@minutri_meals', JSON.stringify(updatedMeals));
    } catch (e) {
      console.error('Failed to save meal', e);
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

  // Calculate today's totals
  const today = new Date();
  const todaysMeals = meals.filter(
    (meal) =>
      meal.timestamp.getDate() === today.getDate() &&
      meal.timestamp.getMonth() === today.getMonth() &&
      meal.timestamp.getFullYear() === today.getFullYear()
  );

  const todaysTotals = todaysMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <NutritionContext.Provider
      value={{
        meals,
        addMeal,
        dailyGoal,
        setDailyGoal: saveDailyGoal,
        todaysTotals,
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
