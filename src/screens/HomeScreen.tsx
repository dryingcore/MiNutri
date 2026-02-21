import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Dimensions, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreenProps } from '../navigation/types';
import { useNutrition } from '../contexts/NutritionContext';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ProgressChart, BarChart } from 'react-native-chart-kit';

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user } = useAuth();
  const { 
      meals, todaysTotals, dailyGoal, waterCups, addWaterCup, 
      currentStreak, resetWaterCups 
  } = useNutrition();
  
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // Real app would fetch latest data here
    setTimeout(() => setRefreshing(false), 1000);
  };

  const today = new Date();
  const todaysMeals = meals.filter(
    (m) =>
      m.timestamp.getDate() === today.getDate() &&
      m.timestamp.getMonth() === today.getMonth() &&
      m.timestamp.getFullYear() === today.getFullYear()
  );

  const getDayGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Bom dia';
      if (hour < 18) return 'Boa tarde';
      return 'Boa noite';
  };

  const screenWidth = Dimensions.get('window').width;

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  const macroData = {
    labels: ['Cal', 'Carb', 'Prot', 'Fat'],
    data: [
      Math.min(todaysTotals.calories / dailyGoal.calories, 1),
      Math.min(todaysTotals.carbs / dailyGoal.carbs, 1),
      Math.min(todaysTotals.protein / dailyGoal.protein, 1),
      Math.min(todaysTotals.fat / dailyGoal.fat, 1)
    ]
  };
  
  // Basic Daily DRIs approximation
  const microGoals = {
      calcium: 1000, 
      iron: 18, 
      vitaminA: 900,
      vitaminC: 90
  };

  const microChartData = {
    labels: ['Cálcio (mg)', 'Ferro (mg)', 'Vit A (mcg)', 'Vit C (mg)'],
    datasets: [
      {
        data: [
          Math.min(todaysTotals.micronutrients.calcium, microGoals.calcium),
          Math.min(todaysTotals.micronutrients.iron, microGoals.iron),
          Math.min(todaysTotals.micronutrients.vitaminA, microGoals.vitaminA),
          Math.min(todaysTotals.micronutrients.vitaminC, microGoals.vitaminC),
        ]
      }
    ]
  };

  const renderHeader = () => (
    <View style={styles.contentPadding}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getDayGreeting()}, {user?.displayName?.split(' ')[0] || 'Nutri'} 👋</Text>
          <Text style={styles.dateText}>
            {today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <TouchableOpacity style={styles.avatarContainer}>
          {user?.photoURL ? (
              <Image source={{uri: user.photoURL}} style={styles.avatarImage} />
          ) : (
              <Ionicons name="person" size={20} color="#6366F1" />
          )}
        </TouchableOpacity>
      </View>

      {/* Gamification Row */}
      <View style={styles.gamificationRow}>
          <View style={styles.streakBadge}>
              <Ionicons name="flame" size={20} color="#EA580C" />
              <Text style={styles.streakText}>{currentStreak} Dias Seguidos</Text>
          </View>
          <View style={[styles.streakBadge, {backgroundColor: '#DBEAFE'}]}>
              <Ionicons name="water" size={20} color="#2563EB" />
              <Text style={[styles.streakText, {color: '#1E3A8A'}]}>{waterCups}/{dailyGoal.waterCups} Copos</Text>
              <TouchableOpacity onPress={addWaterCup} style={styles.waterAddBtn}>
                  <Ionicons name="add" size={14} color="#1E3A8A" />
              </TouchableOpacity>
          </View>
      </View>

      <Text style={styles.sectionTitle}>Resumo de Macros</Text>
      
      <View style={styles.summaryContainer}>
          <View style={styles.macroPillRow}>
              <View style={[styles.macroPill, {backgroundColor: '#EEF2FF'}]}>
                  <Text style={[styles.macroLabel, {color: '#4F46E5'}]}>Proteína</Text>
                  <Text style={[styles.macroValue, {color: '#312E81'}]}>{Math.round(todaysTotals.protein)}g</Text>
                  <Text style={styles.macroTarget}>/ {dailyGoal.protein}g</Text>
              </View>
              <View style={[styles.macroPill, {backgroundColor: '#FEF3C7'}]}>
                  <Text style={[styles.macroLabel, {color: '#D97706'}]}>Carbo</Text>
                  <Text style={[styles.macroValue, {color: '#92400E'}]}>{Math.round(todaysTotals.carbs)}g</Text>
                  <Text style={styles.macroTarget}>/ {dailyGoal.carbs}g</Text>
              </View>
              <View style={[styles.macroPill, {backgroundColor: '#FCE7F3'}]}>
                  <Text style={[styles.macroLabel, {color: '#DB2777'}]}>Gordura</Text>
                  <Text style={[styles.macroValue, {color: '#9D174D'}]}>{Math.round(todaysTotals.fat)}g</Text>
                  <Text style={styles.macroTarget}>/ {dailyGoal.fat}g</Text>
              </View>
          </View>
          
          <View style={styles.chartWrapper}>
              <ProgressChart
                data={macroData}
                width={screenWidth - 96}
                height={160}
                strokeWidth={14}
                radius={24}
                chartConfig={chartConfig}
                hideLegend={false}
              />
          </View>
      </View>

      <Text style={styles.sectionTitle}>Micronutrientes</Text>
      <View style={styles.microContainer}>
         <BarChart 
            data={microChartData}
            width={screenWidth - 88}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                barPercentage: 0.8
            }}
            showValuesOnTopOfBars
         />
      </View>

      <View style={styles.mealsHeader}>
        <Text style={styles.sectionTitle}>Refeições de Hoje</Text>
      </View>

    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 130 }}
            refreshControl={
               <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
            }
        >
            {renderHeader()}
            
            <View style={styles.contentPadding}>
                {todaysMeals.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="fast-food-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>Nenhuma refeição registrada hoje.</Text>
                </View>
                ) : (
                todaysMeals.map((item) => (
                    <View key={item.id} style={styles.mealCard}>
                        <View style={styles.mealHeader}>
                        <View style={styles.mealTitleRow}>
                            <View style={styles.mealIconWrapper}>
                                <Ionicons name="restaurant" size={20} color="#4F46E5" />
                            </View>
                            <Text style={styles.mealName}>{item.name}</Text>
                        </View>
                        <Text style={styles.mealTime}>
                            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        </View>
                        
                        <View style={styles.mealDetails}>
                        <Text style={styles.mealCalories}>{Math.round(item.calories)} kcal</Text>
                        <View style={styles.mealSummaryMacros}>
                            <Text style={styles.mealSummaryText}>P: {Math.round(item.protein)}g</Text>
                            <Text style={styles.mealSummaryText}>C: {Math.round(item.carbs)}g</Text>
                            <Text style={styles.mealSummaryText}>G: {Math.round(item.fat)}g</Text>
                        </View>
                        </View>
                    </View>
                ))
                )}
            </View>
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentPadding: { paddingHorizontal: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 24 },
  greeting: { fontSize: 28, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  dateText: { fontSize: 15, color: '#6B7280', marginTop: 4, textTransform: 'capitalize', fontWeight: '500' },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },

  gamificationRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  streakBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEDD5', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, gap: 8 },
  streakText: { fontSize: 13, fontWeight: '800', color: '#9A3412', flex: 1 },
  waterAddBtn: { backgroundColor: 'rgba(30, 58, 138, 0.1)', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 },
  summaryContainer: { backgroundColor: '#FFFFFF', borderRadius: 32, padding: 24, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 6 },
  
  macroPillRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  macroPill: { flex: 1, borderRadius: 20, padding: 16, marginHorizontal: 4, alignItems: 'flex-start' },
  macroLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  macroValue: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  macroTarget: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginTop: 2 },
  
  chartWrapper: { alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  
  microContainer: { backgroundColor: '#FFFFFF', borderRadius: 32, padding: 20, marginBottom: 32, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 6 },

  mealsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addMealBtn: { padding: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, backgroundColor: '#FFFFFF', borderRadius: 32, borderStyle: 'dashed', borderWidth: 2, borderColor: '#E5E7EB' },
  emptyText: { color: '#9CA3AF', marginTop: 16, fontSize: 15, fontWeight: '600' },
  mealCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  mealTitleRow: { flexDirection: 'row', alignItems: 'center' },
  mealIconWrapper: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  mealName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  mealTime: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  mealDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  mealCalories: { fontSize: 18, fontWeight: '900', color: '#4F46E5' },
  mealSummaryMacros: { flexDirection: 'row', gap: 12 },
  mealSummaryText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
});
