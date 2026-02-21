import React from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { NutritionProvider } from './src/contexts/NutritionContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { SymptomProvider } from './src/contexts/SymptomContext';
import { MealPlanProvider } from './src/contexts/MealPlanContext';
import { ProfileProvider } from './src/contexts/ProfileContext';
import Toast from 'react-native-toast-message';

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <SymptomProvider>
          <MealPlanProvider>
            <NutritionProvider>
              <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
              <AppNavigator />
              <Toast />
            </NutritionProvider>
          </MealPlanProvider>
        </SymptomProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
