import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SymptomLog } from '../types';

interface SymptomContextData {
  symptoms: SymptomLog[];
  addSymptom: (symptom: SymptomLog) => Promise<void>;
  removeSymptom: (id: string) => Promise<void>;
  isLoading: boolean;
}

const SymptomContext = createContext<SymptomContextData>({} as SymptomContextData);

export const SymptomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSymptoms();
  }, []);

  const loadSymptoms = async () => {
    try {
      const stored = await AsyncStorage.getItem('@minutri_symptoms');
      if (stored) {
        const parsed = JSON.parse(stored).map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp),
        }));
        setSymptoms(parsed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const addSymptom = async (newSymptom: SymptomLog) => {
    const updated = [newSymptom, ...symptoms];
    setSymptoms(updated);
    await AsyncStorage.setItem('@minutri_symptoms', JSON.stringify(updated));
  };

  const removeSymptom = async (id: string) => {
    const updated = symptoms.filter(s => s.id !== id);
    setSymptoms(updated);
    await AsyncStorage.setItem('@minutri_symptoms', JSON.stringify(updated));
  };

  return (
    <SymptomContext.Provider value={{ symptoms, addSymptom, removeSymptom, isLoading }}>
      {children}
    </SymptomContext.Provider>
  );
};

export const useSymptoms = () => {
  const context = useContext(SymptomContext);
  if (!context) throw new Error('useSymptoms must be used within a SymptomProvider');
  return context;
};
