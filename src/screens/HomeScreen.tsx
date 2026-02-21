import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Dimensions, RefreshControl, Platform } from 'react-native';
import { HomeScreenProps } from '../navigation/types';
import { useNutrition } from '../contexts/NutritionContext';
import { LineChart, ProgressChart } from 'react-native-chart-kit';
import { Meal } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { todaysTotals, dailyGoal, meals, isLoading } = useNutrition();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const today = new Date();
  const todaysMeals = meals.filter(
    (meal) =>
      meal.timestamp.getDate() === today.getDate() &&
      meal.timestamp.getMonth() === today.getMonth() &&
      meal.timestamp.getFullYear() === today.getFullYear()
  );

  const caloriesProgress = Math.min(todaysTotals.calories / dailyGoal.calories, 1);
  const proteinProgress = Math.min(todaysTotals.protein / dailyGoal.protein, 1);
  const carbsProgress = Math.min(todaysTotals.carbs / dailyGoal.carbs, 1);
  const fatProgress = Math.min(todaysTotals.fat / dailyGoal.fat, 1);

  const progressData = {
    labels: ["Calorias", "Carbs", "Proteínas", "Gorduras"],
    data: [caloriesProgress, carbsProgress, proteinProgress, fatProgress]
  };

  const getLast7DaysData = () => {
    const data = [0, 0, 0, 0, 0, 0, 0];
    const labels = ["", "", "", "", "", "", ""];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels[6 - i] = `${d.getDate()}/${d.getMonth() + 1}`;
      
      const dayMeals = meals.filter(m => 
        m.timestamp.getDate() === d.getDate() &&
        m.timestamp.getMonth() === d.getMonth() &&
        m.timestamp.getFullYear() === d.getFullYear()
      );
      
      data[6 - i] = dayMeals.reduce((acc, m) => acc + m.calories, 0);
    }
    
    if (data.every(d => d === 0)) {
       return { labels, datasets: [{ data: [0,0,0,0,0,0,0] }] };
    }
    return { labels, datasets: [{ data }] };
  };

  const renderMealItem = ({ item }: { item: Meal }) => (
    <View style={styles.mealCard}>
      <View style={styles.mealIconContainer}>
        <Ionicons name="fast-food" size={20} color="#6366F1" />
      </View>
      <View style={styles.mealInfo}>
        <Text style={styles.mealName}>{item.name}</Text>
        <Text style={styles.mealTime}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <View style={styles.mealMacros}>
        <Text style={styles.macroText}>{Math.round(item.calories)} kcal</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{color: '#6B7280'}}>Carregando seus dados...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, NutriLover! 👋</Text>
            <Text style={styles.subtitle}>Resumo do seu dia</Text>
          </View>
          <TouchableOpacity style={styles.profileAvatar}>
            <Ionicons name="person" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.macroSummaryContainer}>
            <View style={styles.macroPill}>
                 <Text style={styles.macroPillLabel}>Proteínas</Text>
                 <Text style={styles.macroPillValue}>{Math.round(todaysTotals.protein)}g</Text>
            </View>
            <View style={styles.macroPill}>
                 <Text style={styles.macroPillLabel}>Carbs</Text>
                 <Text style={styles.macroPillValue}>{Math.round(todaysTotals.carbs)}g</Text>
            </View>
            <View style={styles.macroPill}>
                 <Text style={styles.macroPillLabel}>Gorduras</Text>
                 <Text style={styles.macroPillValue}>{Math.round(todaysTotals.fat)}g</Text>
            </View>
        </View>

        <LinearGradient 
          colors={['#FFFFFF', '#F8FAFC']} 
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Metas de Anéis</Text>
          <View style={styles.progressContainer}>
            <ProgressChart
              data={progressData}
              width={screenWidth - 60}
              height={220}
              strokeWidth={14}
              radius={32}
              chartConfig={progressChartConfig}
              hideLegend={false}
              style={styles.chartStyle}
            />
          </View>
        </LinearGradient>

        <View style={[styles.card, styles.transparentCard]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Refeições de Hoje</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddMeal')} style={styles.addButtonWrapper}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addButton}>Analisar</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.mealsContainerWrapper}>
            {todaysMeals.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="restaurant-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>Nenhuma refeição registrada hoje.</Text>
                </View>
            ) : (
                <FlatList
                data={todaysMeals}
                keyExtractor={item => item.id}
                renderItem={renderMealItem}
                scrollEnabled={false}
                />
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Evolução de Calorias</Text>
          <LineChart
            data={getLast7DaysData()}
            width={screenWidth - 60}
            height={220}
            chartConfig={lineChartConfig}
            bezier
            style={styles.chartStyle}
            withInnerLines={false}
            withOuterLines={false}
            withVerticalLines={false}
          />
        </View>
        
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const progressChartConfig = {
  backgroundGradientFrom: "#ffffff",
  backgroundGradientFromOpacity: 0,
  backgroundGradientTo: "#ffffff",
  backgroundGradientToOpacity: 0,
  color: (opacity = 1, index?: number) => {
    const colors = [
      `rgba(99, 102, 241, ${opacity})`, // Indigo
      `rgba(14, 165, 233, ${opacity})`, // Light Blue
      `rgba(34, 197, 94, ${opacity})`,  // Green
      `rgba(244, 63, 94, ${opacity})`,  // Rose
    ];
    return index !== undefined && colors[index] ? colors[index] : `rgba(0, 0, 0, ${opacity})`;
  },
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false
};

const lineChartConfig = {
  backgroundColor: "transparent",
  backgroundGradientFrom: "#ffffff",
  backgroundGradientFromOpacity: 0,
  backgroundGradientTo: "#ffffff",
  backgroundGradientToOpacity: 0,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`, // Indigo
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`, // Gray-500
  style: {
    borderRadius: 16
  },
  propsForDots: {
    r: "5",
    strokeWidth: "2",
    stroke: "#4f46e5"
  }
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Soft light-gray background
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  macroSummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  macroPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  macroPillLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  macroPillValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 4,
  },
  transparentCard: {
    backgroundColor: 'transparent',
    padding: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addButton: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartStyle: {
    marginVertical: 4,
    borderRadius: 16,
    transform: [{ translateX: -10 }], // Fine-tuning chart-kit padding issue
  },
  mealsContainerWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 12,
  },
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6', // Gray-100
  },
  mealIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF', // Indigo-50
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937', 
    marginBottom: 2,
  },
  mealTime: {
    fontSize: 13,
    color: '#6B7280', 
    fontWeight: '500',
  },
  mealMacros: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  macroText: {
    color: '#4B5563',
    fontWeight: '800',
    fontSize: 13,
  }
});
