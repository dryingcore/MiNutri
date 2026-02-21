import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMealPlan } from '../contexts/MealPlanContext';
import { generateWeeklyMeals } from '../services/themealdb';
import { useNutrition } from '../contexts/NutritionContext';
import { ShoppingItem } from '../types';

export default function MealPrepScreen() {
  const { planData, setPlanData, shoppingList, setShoppingList, toggleShoppingAcquired } = useMealPlan();
  const { dailyGoal } = useNutrition();
  
  const [activeTab, setActiveTab] = useState<'plan' | 'shopping'>('plan');
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetCalories, setTargetCalories] = useState(dailyGoal.calories.toString());
  const [diet, setDiet] = useState('');

  const handleGenerate = async () => {
      const cals = parseInt(targetCalories);
      if (isNaN(cals) || cals < 500) {
          Alert.alert('Atenção', 'Insira uma meta calórica válida.');
          return;
      }
      setIsGenerating(true);
      try {
          // 1. Generate the plan translating from TheMealDB natively
          const generatedMeals = await generateWeeklyMeals(7);
          
          const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const weekPlan = weekDays.map((dayName, index) => {
              const d = new Date();
              d.setDate(d.getDate() + index);
              const dayMeal = generatedMeals[index];

              return {
                  date: d.toISOString().split('T')[0],
                  meals: dayMeal ? [{ id: dayMeal.id, title: dayMeal.title, image: dayMeal.image }] : [],
                  nutrients: {
                      calories: cals,
                      protein: cals * 0.3 / 4,
                      carbohydrates: cals * 0.4 / 4,
                      fat: cals * 0.3 / 9
                  }
              };
          });

          // 2. Generate shopping list based on recipes
          const consolidatedMap = new Map<string, ShoppingItem>();
          generatedMeals.forEach((recipe) => {
              recipe.ingredients.forEach((ing) => {
                  const key = `${ing.item.toLowerCase()}`;
                  if (!consolidatedMap.has(key)) {
                      consolidatedMap.set(key, {
                          id: Math.random(),
                          name: ing.item,
                          amount: 1, 
                          unit: ing.measure || 'un',
                          acquired: false
                      });
                  }
              });
          });
          const list = Array.from(consolidatedMap.values());
          
          await setPlanData(weekPlan);
          await setShoppingList(list);
          Alert.alert('Plano Gerado!', 'Seu plano semanal tranduzido e lista de compras estão prontos.');
      } catch (error: any) {
          Alert.alert('Erro', error.message);
      } finally {
          setIsGenerating(false);
      }
  };

  const getDayName = (isoString: string) => {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return days[new Date(isoString).getDay()];
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Meal Prep</Text>
        <Text style={styles.subtitle}>Automatize seu planejamento semanal e evite desperdícios.</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'plan' && styles.activeTab]}
          onPress={() => setActiveTab('plan')}
        >
          <Text style={[styles.tabText, activeTab === 'plan' && styles.activeTabText]}>Plano Semanal</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'shopping' && styles.activeTab]}
          onPress={() => setActiveTab('shopping')}
        >
          <Text style={[styles.tabText, activeTab === 'shopping' && styles.activeTabText]}>Lista de Compras</Text>
        </TouchableOpacity>
      </View>

      {planData.length === 0 ? (
          // NO PLAN UI
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.emptyContainer}>
             <Ionicons name="calendar-outline" size={80} color="#E5E7EB" style={{marginBottom: 16}} />
             <Text style={styles.emptyTitle}>Nenhum plano ativo</Text>
             <Text style={styles.emptySub}>Gere agora um plano nutricional utilizando IA inteligente.</Text>
             
             <View style={styles.form}>
                 <Text style={styles.label}>Meta de Calorias Diária</Text>
                 <TextInput 
                     style={styles.input} 
                     keyboardType="numeric" 
                     value={targetCalories} 
                     onChangeText={setTargetCalories} 
                 />
                 
                 <Text style={[styles.label, {marginTop: 16}]}>Dieta (Opcional)</Text>
                 <TextInput 
                     style={styles.input} 
                     placeholder="Ex: vegetarian, paleo, vegan"
                     autoCapitalize="none"
                     value={diet} 
                     onChangeText={setDiet} 
                 />

                 <TouchableOpacity style={styles.generateBtnWrapper} onPress={handleGenerate} disabled={isGenerating}>
                    <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.generateBtnGradient}>
                        {isGenerating ? <ActivityIndicator color="#FFFFFF" /> : (
                            <>
                                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                                <Text style={styles.generateBtnText}>Gerar Plano de Refeições</Text>
                            </>
                        )}
                    </LinearGradient>
                 </TouchableOpacity>
             </View>
          </KeyboardAvoidingView>
      ) : (
          // PLAN LOADED UI
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
              {activeTab === 'plan' && (
                  <View>
                      <TouchableOpacity 
                          style={styles.resetBtn} 
                          onPress={() => Alert.alert('Atenção', 'Deseja apagar o plano atual?', [
                              {text: 'Cancelar', style: 'cancel'},
                              {text: 'Apagar', style: 'destructive', onPress: () => {
                                  setPlanData([]);
                                  setShoppingList([]);
                              }}
                          ])}
                      >
                          <Ionicons name="refresh" size={16} color="#4B5563" />
                          <Text style={styles.resetText}>Novo Plano</Text>
                      </TouchableOpacity>

                      {planData.map((day, ix) => (
                          <View key={ix} style={styles.dayCard}>
                              <View style={styles.dayHeader}>
                                  <View style={styles.dayBadge}>
                                      <Text style={styles.dayBadgeText}>{getDayName(day.date)}</Text>
                                  </View>
                                  <Text style={styles.dayDateTitle}>{new Date(day.date).toLocaleDateString()}</Text>
                              </View>
                              <View style={styles.dayMacros}>
                                  <Text style={styles.macroText}>🔥 {Math.round(day.nutrients.calories)} kcal</Text>
                                  <Text style={styles.macroText}>🥩 {Math.round(day.nutrients.protein)}g Prot</Text>
                                  <Text style={styles.macroText}>🍞 {Math.round(day.nutrients.carbohydrates)}g Carb</Text>
                              </View>
                              
                              <View style={styles.mealsContainer}>
                                  {day.meals.map(m => (
                                      <View key={m.id} style={styles.mealRow}>
                                          <Ionicons name="restaurant-outline" size={18} color="#6B7280" />
                                          <Text style={styles.mealTitle} numberOfLines={2}>{m.title}</Text>
                                          <View style={styles.mealMeta}>
                                             <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                                             <Text style={styles.mealMetaText}>{m.readyInMinutes}m</Text>
                                          </View>
                                      </View>
                                  ))}
                              </View>
                          </View>
                      ))}
                  </View>
              )}

              {activeTab === 'shopping' && (
                  <View style={styles.shoppingListContainer}>
                      <View style={styles.shoppingHeader}>
                          <Text style={styles.shoppingTitle}>Sua Lista de Compras</Text>
                          <Text style={styles.shoppingSub}>Ingredientes consolidados da sua semana.</Text>
                      </View>

                      {shoppingList.map((item, index) => (
                          <TouchableOpacity 
                             key={index}
                             style={styles.shoppingItem} 
                             activeOpacity={0.7}
                             onPress={() => toggleShoppingAcquired(item.id)}
                          >
                              <View style={[styles.checkbox, item.acquired && styles.checkboxAcquired]}>
                                  {item.acquired && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                              </View>
                              <Text style={[styles.shItemName, item.acquired && styles.shItemAcquired]}>{item.name}</Text>
                              <Text style={styles.shItemAmount}>{Math.round(item.amount)} {item.unit}</Text>
                          </TouchableOpacity>
                      ))}
                  </View>
              )}
          </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#111827', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#6B7280', marginTop: 4, lineHeight: 22 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#E5E7EB' },
  activeTab: { borderBottomColor: '#4F46E5' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#4F46E5', fontWeight: '800' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
  form: { width: '100%', backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 16, color: '#111827' },
  generateBtnWrapper: { marginTop: 24, borderRadius: 16, overflow: 'hidden', shadowColor: '#4F46E5', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  generateBtnGradient: { flexDirection: 'row', height: 56, alignItems: 'center', justifyContent: 'center', gap: 8 },
  generateBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 130 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', padding: 8, gap: 4, marginBottom: 8 },
  resetText: { fontWeight: '600', color: '#4B5563', fontSize: 14 },
  dayCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dayBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  dayBadgeText: { color: '#4F46E5', fontWeight: '800', fontSize: 14 },
  dayDateTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  dayMacros: { flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  macroText: { fontSize: 13, fontWeight: '600', color: '#4B5563', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  mealsContainer: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16, gap: 12 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealTitle: { flex: 1, fontSize: 15, fontWeight: '500', color: '#374151' },
  mealMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F9FAFB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  mealMetaText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  shoppingListContainer: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  shoppingHeader: { marginBottom: 20 },
  shoppingTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  shoppingSub: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  shoppingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  checkboxAcquired: { backgroundColor: '#10B981', borderColor: '#10B981' },
  shItemName: { flex: 1, fontSize: 16, fontWeight: '500', color: '#374151', textTransform: 'capitalize' },
  shItemAcquired: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  shItemAmount: { fontSize: 15, fontWeight: '700', color: '#4F46E5' }
});
