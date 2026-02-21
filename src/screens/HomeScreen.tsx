import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, Dimensions, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreenProps } from '../navigation/types';
import { useNutrition } from '../contexts/NutritionContext';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-gifted-charts';

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user } = useAuth();
  const { meals, todaysTotals, todaysHydrationMl, currentStreak, removeMeal } = useNutrition();
  const { targets, routine } = useProfile();
  
  // Dynamic Goal synced from ProfileContext TDEE
  const dynamicGoal = {
      calories: targets.macros.calories > 0 ? targets.macros.calories : 2000,
      protein: targets.macros.protein > 0 ? targets.macros.protein : 150,
      carbs: targets.macros.carbs > 0 ? targets.macros.carbs : 200,
      fat: targets.macros.fat > 0 ? targets.macros.fat : 66,
      waterMl: (targets.macros as any)?.waterMl || (Math.ceil(routine.hydrationGoalMs / 250) * 250) || 2000
  };

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
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

  // Gifted Charts Data for Macros (Donut Chart)
  const remainingCals = dynamicGoal.calories - todaysTotals.calories;
  const pieData = [
    { value: todaysTotals.calories, color: '#4F46E5', shiftTextX: -10 },
    { value: remainingCals > 0 ? remainingCals : 0, color: '#EEF2FF' }
  ];

  // Gifted Charts Data for Micro Bars
  const microGoals = { calcium: 1000, iron: 18, vitaminA: 900, vitaminC: 90 };
  const barData = [
      { value: Math.min((todaysTotals.micronutrients.calcium / microGoals.calcium)*100, 100), label: 'Cálcio', frontColor: '#10B981' },
      { value: Math.min((todaysTotals.micronutrients.iron / microGoals.iron)*100, 100), label: 'Ferro', frontColor: '#F59E0B' },
      { value: Math.min((todaysTotals.micronutrients.vitaminA / microGoals.vitaminA)*100, 100), label: 'Vit A', frontColor: '#3B82F6' },
      { value: Math.min((todaysTotals.micronutrients.vitaminC / microGoals.vitaminC)*100, 100), label: 'Vit C', frontColor: '#EC4899' },
  ];

  // Wellness Score Algorithm
  const wellnessScore = Math.round(
    ((Math.min(todaysTotals.calories / dynamicGoal.calories, 1) + 
      Math.min(todaysTotals.protein / dynamicGoal.protein, 1) + 
      Math.min(todaysHydrationMl / (dynamicGoal as any).waterMl, 1)) / 3) * 100
  ) || 0;

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
          <TouchableOpacity 
              style={[styles.streakBadge, {backgroundColor: '#DBEAFE'}]}
              onPress={() => navigation.navigate('Hydration')}
          >
              <Ionicons name="water" size={20} color="#2563EB" />
              <View style={{ flex: 1 }}>
                  <Text style={[styles.streakText, {color: '#1E3A8A'}]}>
                      {Math.round(Math.min((todaysHydrationMl / dynamicGoal.waterMl)*100, 100))}% Hidratado
                  </Text>
                  <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: '600', marginTop: 2 }}>
                      {Math.max(dynamicGoal.waterMl - todaysHydrationMl, 0)} ml restantes
                  </Text>
              </View>
              <View style={styles.waterAddBtn}>
                  <Ionicons name="add" size={14} color="#1E3A8A" />
              </View>
          </TouchableOpacity>
      </View>

      {/* Wellness Score Card */}
      <View style={styles.wellnessCard}>
         <View style={styles.wellnessHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
               <Ionicons name="leaf" size={22} color="#10B981" />
               <Text style={styles.wellnessTitle}>Score de Bem-estar</Text>
            </View>
            <View style={styles.wellnessScoreBadge}>
                <Text style={styles.wellnessScoreValue}>{wellnessScore}</Text>
                <Text style={styles.wellnessScoreMax}>/100</Text>
            </View>
         </View>
         <Text style={styles.wellnessSubtitle}>
            {wellnessScore >= 80 ? 'Excelente! Você está no caminho certo hoje.' : 
             wellnessScore >= 50 ? 'Bom progresso. Continue focado nas suas metas!' : 
             'Vamos melhorar esses números hoje! Comece registrando suas refeições.'}
         </Text>
      </View>

      <Text style={styles.sectionTitle}>Resumo de Macros</Text>
      
      <View style={styles.summaryContainer}>
          <View style={styles.chartWrapper}>
             <PieChart
                donut
                innerRadius={65}
                radius={85}
                data={pieData}
                centerLabelComponent={() => {
                  return (
                    <View style={{justifyContent: 'center', alignItems: 'center'}}>
                      <Text style={{fontSize: 28, color: '#111827', fontWeight: '900'}}>{Math.round(todaysTotals.calories)}</Text>
                      <Text style={{fontSize: 14, color: '#6B7280', fontWeight: '600'}}>kcal consumidas</Text>
                    </View>
                  );
                }}
              />
          </View>

          <View style={styles.macroBarsContainer}>
              {/* Protein */}
              <View style={styles.macroBarRow}>
                  <Text style={[styles.macroBarLabel, {color: '#4F46E5'}]}>Proteína</Text>
                  <View style={styles.macroBarTrack}>
                      <View style={[styles.macroBarFill, { backgroundColor: '#4F46E5', width: `${Math.min((todaysTotals.protein / dynamicGoal.protein) * 100, 100)}%`}]} />
                  </View>
                  <Text style={styles.macroBarValue}>{Math.round(todaysTotals.protein)}/{dynamicGoal.protein}g</Text>
              </View>
              {/* Carbs */}
              <View style={styles.macroBarRow}>
                  <Text style={[styles.macroBarLabel, {color: '#D97706'}]}>Carbo</Text>
                  <View style={styles.macroBarTrack}>
                      <View style={[styles.macroBarFill, { backgroundColor: '#D97706', width: `${Math.min((todaysTotals.carbs / dynamicGoal.carbs) * 100, 100)}%`}]} />
                  </View>
                  <Text style={styles.macroBarValue}>{Math.round(todaysTotals.carbs)}/{dynamicGoal.carbs}g</Text>
              </View>
              {/* Fat */}
              <View style={styles.macroBarRow}>
                  <Text style={[styles.macroBarLabel, {color: '#DB2777'}]}>Gordura</Text>
                  <View style={styles.macroBarTrack}>
                      <View style={[styles.macroBarFill, { backgroundColor: '#DB2777', width: `${Math.min((todaysTotals.fat / dynamicGoal.fat) * 100, 100)}%`}]} />
                  </View>
                  <Text style={styles.macroBarValue}>{Math.round(todaysTotals.fat)}/{dynamicGoal.fat}g</Text>
              </View>
          </View>
      </View>

      <Text style={styles.sectionTitle}>Micronutrientes (%)</Text>
      <View style={styles.microContainer}>
          <BarChart
            data={barData}
            barWidth={32}
            spacing={24}
            roundedTop
            roundedBottom
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{color: 'transparent'}}
            noOfSections={3}
            maxValue={100}
            isAnimated
          />
      </View>

      <View style={styles.mealsHeader}>
        <Text style={styles.sectionTitle}>Registo de Hoje</Text>
      </View>

    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 130 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
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
                        <TouchableOpacity 
                            style={styles.deleteMealBtn}
                            onPress={() => removeMeal(item.id)}
                        >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
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
  
  wellnessCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 32, shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4, borderWidth: 1, borderColor: '#ECFDF5' },
  wellnessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  wellnessTitle: { fontSize: 16, fontWeight: '800', color: '#065F46', marginLeft: 8 },
  wellnessScoreBadge: { flexDirection: 'row', alignItems: 'baseline', backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  wellnessScoreValue: { fontSize: 20, fontWeight: '900', color: '#047857' },
  wellnessScoreMax: { fontSize: 12, fontWeight: '700', color: '#059669', marginLeft: 2 },
  wellnessSubtitle: { fontSize: 13, color: '#34D399', fontWeight: '600', lineHeight: 20 },

  macroBarsContainer: { marginTop: 28, gap: 16 },
  macroBarRow: { flexDirection: 'row', alignItems: 'center' },
  macroBarLabel: { width: 65, fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  macroBarTrack: { flex: 1, height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, marginHorizontal: 12, overflow: 'hidden' },
  macroBarFill: { height: '100%', borderRadius: 5 },
  macroBarValue: { width: 55, fontSize: 12, fontWeight: '700', color: '#4B5563', textAlign: 'right' },
  
  chartWrapper: { alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  
  microContainer: { backgroundColor: '#FFFFFF', borderRadius: 32, padding: 24, paddingTop: 32, marginBottom: 32, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 6 },

  mealsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  deleteMealBtn: { position: 'absolute', top: 16, right: 16, padding: 4 },
});
