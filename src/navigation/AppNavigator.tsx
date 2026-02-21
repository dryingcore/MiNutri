import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuth } from '../contexts/AuthContext';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main Screens
import HomeScreen from '../screens/HomeScreen';
import AddMealScreen from '../screens/AddMealScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a sleek splash screen here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{
          headerStyle: { backgroundColor: '#F3F4F6' },
          headerTintColor: '#111827',
          headerTitleStyle: { fontWeight: '800', fontSize: 20 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#F3F4F6' },
        }}
      >
        {user ? (
          // Authenticated Root
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="AddMeal" 
              component={AddMealScreen} 
              options={{ 
                title: 'Nova Refeição', 
                presentation: 'modal',
                headerTransparent: true,
                headerTintColor: '#1F2937',
                headerTitle: '',
                headerLeft: () => null, 
              }} 
            />
          </>
        ) : (
          // Unauthenticated Root
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen} 
              options={{ headerShown: false }} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
