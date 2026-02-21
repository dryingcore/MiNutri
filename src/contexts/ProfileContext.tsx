import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'intense';
export type Goal = 'lose' | 'maintain' | 'gain';

export interface Anthropometry {
  weight: number; // kg
  height: number; // cm
  age: number;
  gender: 'M' | 'F';
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface Preferences {
  diet: string; // ex: 'vegan', 'paleo', 'none'
  allergies: string[]; // ex: ['gluten', 'lactose']
  aversions: string[]; // foods they hate
}

export interface Routine {
  breakfastTime: string; // '08:00'
  lunchTime: string; // '12:30'
  dinnerTime: string; // '20:00'
  hydrationGoalMs: number; // usually 2000ml to 3000ml
  darkMode: boolean;
}

export interface CalculatedTargets {
  tdee: number;
  bmr: number;
  macros: { calories: number; protein: number; carbs: number; fat: number };
}

interface ProfileContextData {
  anthropometry: Anthropometry;
  setAnthropometry: (data: Anthropometry) => Promise<void>;
  preferences: Preferences;
  setPreferences: (data: Preferences) => Promise<void>;
  routine: Routine;
  setRoutine: (data: Routine) => Promise<void>;
  targets: CalculatedTargets;
  isLoading: boolean;
}

const defaultAnthro: Anthropometry = { weight: 70, height: 170, age: 30, gender: 'M', activityLevel: 'light', goal: 'maintain' };
const defaultPrefs: Preferences = { diet: 'none', allergies: [], aversions: [] };
const defaultRoutine: Routine = { breakfastTime: '08:00', lunchTime: '12:30', dinnerTime: '19:30', hydrationGoalMs: 2000, darkMode: false };

const ProfileContext = createContext<ProfileContextData>({} as ProfileContextData);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [anthropometry, setAnthroState] = useState<Anthropometry>(defaultAnthro);
  const [preferences, setPrefsState] = useState<Preferences>(defaultPrefs);
  const [routine, setRoutineState] = useState<Routine>(defaultRoutine);
  const [targets, setTargets] = useState<CalculatedTargets>({ tdee: 0, bmr: 0, macros: { calories: 0, protein: 0, carbs: 0, fat: 0 } });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    calculateTargets(anthropometry);
  }, [anthropometry]);

  const loadProfile = async () => {
    try {
      const anthro = await AsyncStorage.getItem('@minutri_anthro');
      const prefs = await AsyncStorage.getItem('@minutri_prefs');
      const rt = await AsyncStorage.getItem('@minutri_routine');
      
      if (anthro) setAnthroState(JSON.parse(anthro));
      if (prefs) setPrefsState(JSON.parse(prefs));
      if (rt) setRoutineState(JSON.parse(rt));
    } catch (e) {
      console.error("Failed to load profile", e);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTargets = (anthro: Anthropometry) => {
    // Revised Harris-Benedict Equation for BMR 
    // Men: BMR = 88.362 + (13.397 x weight in kg) + (4.799 x height in cm) - (5.677 x age in years)
    // Women: BMR = 447.593 + (9.247 x weight in kg) + (3.098 x height in cm) - (4.330 x age in years)
    let bmr = 0;
    if (anthro.gender === 'M') {
       bmr = 88.362 + (13.397 * anthro.weight) + (4.799 * anthro.height) - (5.677 * anthro.age);
    } else {
       bmr = 447.593 + (9.247 * anthro.weight) + (3.098 * anthro.height) - (4.330 * anthro.age);
    }

    const activityMultipliers = { 'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55, 'intense': 1.725 };
    const tdee = bmr * activityMultipliers[anthro.activityLevel];

    let targetCalories = tdee;
    if (anthro.goal === 'lose') targetCalories -= 500; // Deficit
    if (anthro.goal === 'gain') targetCalories += 300; // Surplus

    // Basic Macros Logic: 2g protein/kg, 1g fat/kg, rest carbs
    const protein = anthro.weight * 2;
    const fat = anthro.weight * 1;
    const carbs = (targetCalories - (protein * 4) - (fat * 9)) / 4;

    setTargets({
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        macros: {
            calories: Math.round(targetCalories),
            protein: Math.round(protein),
            fat: Math.round(fat),
            carbs: Math.round(carbs > 0 ? carbs : 0)
        }
    });
  };

  const setAnthropometry = async (data: Anthropometry) => {
    setAnthroState(data);
    await AsyncStorage.setItem('@minutri_anthro', JSON.stringify(data));
  };

  const setPreferences = async (data: Preferences) => {
    setPrefsState(data);
    await AsyncStorage.setItem('@minutri_prefs', JSON.stringify(data));
  };

  const setRoutine = async (data: Routine) => {
    setRoutineState(data);
    await AsyncStorage.setItem('@minutri_routine', JSON.stringify(data));
  };

  return (
    <ProfileContext.Provider value={{ anthropometry, setAnthropometry, preferences, setPreferences, routine, setRoutine, targets, isLoading }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (!context) throw new Error('useProfile must be used within ProfileProvider');
    return context;
};
