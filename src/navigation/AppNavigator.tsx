import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from './types';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main Screens
import HomeScreen from '../screens/HomeScreen';
import AddMealScreen from '../screens/AddMealScreen';
import MealPrepScreen from '../screens/MealPrepScreen';
import SymptomDiaryScreen from '../screens/SymptomDiaryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HydrationScreen from '../screens/HydrationScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom Floating Add Button for the Tab Bar
const CustomTabBarButton = ({ children, onPress }: any) => (
  <TouchableOpacity
    style={styles.customAddButtonWrapper}
    onPress={onPress}
  >
    <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.customAddButtonGradient}>
       {children}
    </LinearGradient>
  </TouchableOpacity>
);

function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarActiveTintColor: '#4F46E5',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    elevation: 0,
                    backgroundColor: '#FFFFFF',
                    borderTopLeftRadius: 32,
                    borderTopRightRadius: 32,
                    height: Platform.OS === 'ios' ? 90 : 70,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 16,
                    paddingTop: 8,
                    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 2,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'help';
                    if (route.name === 'Dashboard') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'MealPrep') {
                        iconName = focused ? 'calendar' : 'calendar-outline';
                    } else if (route.name === 'Sintomas') {
                        iconName = focused ? 'body' : 'body-outline';
                    } else if (route.name === 'Perfil') {
                        iconName = focused ? 'person' : 'person-outline';
                    }
                    return <Ionicons name={iconName} size={24} color={color} />;
                }
            })}
        >
            <Tab.Screen name="Dashboard" component={HomeScreen} />
            <Tab.Screen name="MealPrep" component={MealPrepScreen} options={{ tabBarLabel: 'Planos' }} />
            
            {/* The plus button opens the generic navigator "AddMeal" inside the stack, meaning it overlays. */}
            <Tab.Screen 
                name="AddScanner" 
                component={View} 
                options={{
                    tabBarIcon: () => (<Ionicons name="scan-outline" size={28} color="#FFFFFF" />),
                    tabBarLabel: () => null,
                    tabBarButton: (props) => (
                        <CustomTabBarButton {...props} />
                    )
                }}
                listeners={({ navigation }: any) => ({
                    tabPress: e => {
                        e.preventDefault();
                        navigation.navigate('AddMeal');
                    }
                })}
            />

            <Tab.Screen name="Sintomas" component={SymptomDiaryScreen} />
            <Tab.Screen name="Perfil" component={ProfileScreen} />
        </Tab.Navigator>
    )
}

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
                name="MainTabs" 
                component={TabNavigator} 
                options={{ headerShown: false }} 
            />
            {/* Overlay Stack Screens */}
            <Stack.Screen 
              name="AddMeal" 
              component={AddMealScreen} 
              options={{ 
                presentation: 'modal',
                headerShown: false
              }} 
            />
            <Stack.Screen 
              name="Hydration" 
              component={HydrationScreen} 
              options={{ 
                presentation: 'modal',
                headerShown: false
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

const styles = StyleSheet.create({
    customAddButtonWrapper: {
        top: -24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    customAddButtonGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    }
});
