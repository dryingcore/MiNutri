import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MealPlanDay, ShoppingItem } from '../types';

interface MealPlanContextData {
  planData: MealPlanDay[];
  setPlanData: (data: MealPlanDay[]) => Promise<void>;
  shoppingList: ShoppingItem[];
  setShoppingList: (list: ShoppingItem[]) => Promise<void>;
  toggleShoppingAcquired: (id: number) => Promise<void>;
  isLoading: boolean;
}

const MealPlanContext = createContext<MealPlanContextData>({} as MealPlanContextData);

export const MealPlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [planData, setPlanState] = useState<MealPlanDay[]>([]);
  const [shoppingList, setShoppingState] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const plan = await AsyncStorage.getItem('@minutri_mealplan');
      const shop = await AsyncStorage.getItem('@minutri_shopping');
      if (plan) setPlanState(JSON.parse(plan));
      if (shop) setShoppingState(JSON.parse(shop));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const setPlanData = async (data: MealPlanDay[]) => {
    setPlanState(data);
    await AsyncStorage.setItem('@minutri_mealplan', JSON.stringify(data));
  };

  const setShoppingList = async (list: ShoppingItem[]) => {
    setShoppingState(list);
    await AsyncStorage.setItem('@minutri_shopping', JSON.stringify(list));
  };

  const toggleShoppingAcquired = async (id: number) => {
    const updated = shoppingList.map(item => 
      item.id === id ? { ...item, acquired: !item.acquired } : item
    );
    setShoppingState(updated);
    await AsyncStorage.setItem('@minutri_shopping', JSON.stringify(updated));
  }

  return (
    <MealPlanContext.Provider value={{ planData, setPlanData, shoppingList, setShoppingList, toggleShoppingAcquired, isLoading }}>
      {children}
    </MealPlanContext.Provider>
  );
};

export const useMealPlan = () => {
  const context = useContext(MealPlanContext);
  if (!context) throw new Error('useMealPlan must be used within a MealPlanProvider');
  return context;
};
