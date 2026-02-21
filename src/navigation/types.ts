import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Dashboard: undefined;
  MealPrep: undefined;
  AddScanner: undefined; // Floating button
  Sintomas: undefined;
  Perfil: undefined;
};

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Register: undefined;
  
  // Main
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  AddMeal: undefined; // Opened as Modal over MainTabs
};

export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, 'Register'>;
export type AddMealScreenProps = NativeStackScreenProps<RootStackParamList, 'AddMeal'>;

// Composite props for Tabs since they can also navigate to Modals (like AddMeal) from the RootStack
export type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Dashboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
