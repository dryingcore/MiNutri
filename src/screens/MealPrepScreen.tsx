import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, KeyboardAvoidingView, UIManager, LayoutAnimation } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}
import { useMealPlan } from '../contexts/MealPlanContext';
import { generateWeeklyMeals } from '../services/themealdb';
import { useNutrition } from '../contexts/NutritionContext';
import { useProfile } from '../contexts/ProfileContext';
import { ShoppingItem } from '../types';
import Toast from 'react-native-toast-message';
import { Modal } from 'react-native';
import { fetchAlternativeMeals, TranslatedMeal } from '../services/themealdb';

export default function MealPrepScreen() {
  const { planData, setPlanData, shoppingList, setShoppingList, toggleShoppingAcquired } = useMealPlan();
  const { targets, routine } = useProfile();
  
  const [activeTab, setActiveTab] = useState<'plan' | 'shopping'>('plan');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // New States
  const [planDuration, setPlanDuration] = useState<1 | 7 | 30>(7);
  const [diet, setDiet] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMealToEdit, setSelectedMealToEdit] = useState<{dayIndex: number, mealIndex: number, mealId: string} | null>(null);
  const [alternatives, setAlternatives] = useState<TranslatedMeal[]>([]);
  const [isLoadingAlts, setIsLoadingAlts] = useState(false);
  const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});

  const handleGenerate = async () => {
      // Use TDEE directly
      const cals = Math.round(targets.tdee);
      if (cals < 500) {
          Toast.show({ type: 'error', text1: 'Atenção', text2: 'Configure seu perfil primeiro para calcular o TDEE.' });
          return;
      }
      if (planDuration === 30) {
          // 30-day plan is disabled, handled in UI but double check here
          return;
      }

      setIsGenerating(true);
      try {
          const mealsPerDaySafe = routine?.mealsPerDay || 4;
          const totalMeals = planDuration * mealsPerDaySafe;
          const generatedMeals = await generateWeeklyMeals(totalMeals);
          
          const weekPlan = Array.from({ length: planDuration }).map((_, index) => {
              const d = new Date();
              d.setDate(d.getDate() + index);
              
              const dayMeals = generatedMeals.slice(index * mealsPerDaySafe, (index + 1) * mealsPerDaySafe);

              return {
                  date: d.toISOString().split('T')[0],
                  meals: dayMeals.map(m => ({ id: m.id, title: m.title, image: m.image, instructions: m.instructions, readyInMinutes: m.readyInMinutes, difficulty: m.difficulty })),
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
                  const key = `${recipe.title}_${ing.item.toLowerCase()}`;
                  if (!consolidatedMap.has(key)) {
                      consolidatedMap.set(key, {
                          id: Math.random(),
                          name: ing.item,
                          amount: 1, 
                          unit: ing.measure || 'un',
                          acquired: false,
                          recipeName: recipe.title
                      });
                  }
              });
          });
          const list = Array.from(consolidatedMap.values());
          
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          await setPlanData(weekPlan);
          await setShoppingList(list);
          Toast.show({ type: 'success', text1: 'Plano Gerado!', text2: `Seu plano de ${planDuration} dias e lista de compras estão prontos.` });
      } catch (error: any) {
          Toast.show({ type: 'error', text1: 'Falha na Geração', text2: error.message });
      } finally {
          setIsGenerating(false);
      }
  };

  const getDayName = (isoString: string) => {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return days[new Date(isoString).getDay()];
  };

  const openAlternatives = async (dayIndex: number, mealIndex: number, mealId: string) => {
      setSelectedMealToEdit({ dayIndex, mealIndex, mealId });
      setModalVisible(true);
      setIsLoadingAlts(true);
      try {
          const alts = await fetchAlternativeMeals();
          setAlternatives(alts);
      } catch (error: any) {
          Toast.show({ type: 'error', text1: 'Erro', text2: error.message });
          setModalVisible(false);
      } finally {
          setIsLoadingAlts(false);
      }
  };

  const selectAlternative = (newMealData: TranslatedMeal) => {
      if (!selectedMealToEdit) return;
      
      const { dayIndex, mealIndex } = selectedMealToEdit;
      const newPlan = [...planData];
      
      const oldMealTitleToDel = newPlan[dayIndex].meals[mealIndex].title;
      
      newPlan[dayIndex].meals[mealIndex] = {
          id: newMealData.id,
          title: newMealData.title,
          image: newMealData.image,
          instructions: newMealData.instructions,
          readyInMinutes: newMealData.readyInMinutes,
          difficulty: newMealData.difficulty
      };
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPlanData(newPlan);
      
      const newShopList = shoppingList.filter(item => item.recipeName !== oldMealTitleToDel);
      
      // Assume "1 un" for AI generated ones without full translation accuracy mapping
      newMealData.ingredients.forEach(ing => {
          newShopList.push({
              id: Math.random(),
              name: ing.item,
              amount: 1,
              unit: ing.measure || 'un',
              acquired: false,
              recipeName: newMealData.title
          });
      });
      
      setShoppingList(newShopList);
      Toast.show({ type: 'success', text1: 'Refeição Alterada' });
      setModalVisible(false);
  };

  const groupedShopping = shoppingList.reduce((acc, item) => {
      const recipe = item.recipeName || 'Outros';
      if (!acc[recipe]) acc[recipe] = [];
      acc[recipe].push(item);
      return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const toggleRecipe = (recipe: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedRecipes(prev => ({ ...prev, [recipe]: !prev[recipe] }));
  };

  const handleClearPlan = () => {
      Alert.alert('Atenção', 'Deseja apagar o plano atual?', [
          {text: 'Cancelar', style: 'cancel'},
          {text: 'Apagar', style: 'destructive', onPress: () => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setPlanData([]);
              setShoppingList([]);
          }}
      ]);
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
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
            <ScrollView contentContainerStyle={styles.emptyContainer} showsVerticalScrollIndicator={false}>
               <Ionicons name="calendar-outline" size={80} color="#E5E7EB" style={{marginBottom: 16}} />
               <Text style={styles.emptyTitle}>Nenhum plano ativo</Text>
               <Text style={styles.emptySub}>Gere agora um plano nutricional utilizando IA inteligente.</Text>
               
               <View style={styles.form}>
                   <View style={styles.planDurationSelector}>
                       <Text style={styles.label}>Duração do Plano</Text>
                       <View style={styles.durationPills}>
                           {[1, 7, 30].map(duration => (
                               <TouchableOpacity 
                                   key={duration}
                                   activeOpacity={0.7}
                                   onPress={() => {
                                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                      setPlanDuration(duration as 1|7|30);
                                   }}
                                   style={[styles.durationPill, planDuration === duration && styles.durationPillActive]}
                               >
                                   <Text style={[styles.durationPillText, planDuration === duration && styles.durationPillTextActive]}>
                                       {duration} {duration === 1 ? 'Dia' : 'Dias'}
                                   </Text>
                               </TouchableOpacity>
                           ))}
                       </View>
                   </View>
                   
                   {planDuration === 30 ? (
                       <View style={styles.wipContainer}>
                           <Ionicons name="construct-outline" size={48} color="#6366F1" />
                           <Text style={styles.wipTitle}>Em Construção 🚧</Text>
                           <Text style={styles.wipText}>Os planos de 30 dias demandam muito poder de inteligência artificial. Estamos otimizando nossa estrutura para liberar essa funcionalidade super em breve!</Text>
                       </View>
                   ) : (
                       <View>
                           <View style={styles.caloriesAutoContainer}>
                               <View style={styles.caloriesIconBlock}>
                                   <Ionicons name="flame" size={20} color="#EF4444" />
                               </View>
                               <View style={{flex: 1}}>
                                   <Text style={styles.labelAuto}>Calorias Baseada no Perfil</Text>
                                   <Text style={styles.caloriesValueText}>{Math.round(targets.tdee)} kcal diárias</Text>
                               </View>
                               <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                           </View>
                           
                           <Text style={[styles.label, {marginTop: 16}]}>Adaptação de Dieta (Opcional)</Text>
                           <TextInput 
                               style={styles.input} 
                               placeholder="Ex: vegetariano, vegano, sem glúten"
                               autoCapitalize="none"
                               value={diet} 
                               onChangeText={setDiet} 
                           />

                           <TouchableOpacity style={styles.generateBtnWrapper} onPress={handleGenerate} disabled={isGenerating}>
                              <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.generateBtnGradient}>
                                  {isGenerating ? <ActivityIndicator color="#FFFFFF" /> : (
                                      <>
                                          <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                                          <Text style={styles.generateBtnText}>Gerar Plano de {planDuration} {planDuration === 1 ? 'Dia' : 'Dias'}</Text>
                                      </>
                                  )}
                              </LinearGradient>
                           </TouchableOpacity>
                       </View>
                   )}
               </View>
            </ScrollView>
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
                          onPress={handleClearPlan}
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
                                  {day.meals.map((m, mIndex) => (
                                      <View key={m.id} style={styles.mealRow}>
                                          <Ionicons name="restaurant-outline" size={18} color="#6B7280" />
                                          <View style={{flex: 1}}>
                                              <Text style={styles.mealTitle} numberOfLines={2}>{m.title}</Text>
                                              <Text style={{fontSize: 12, fontWeight: '600', color: m.difficulty === 'Fácil' ? '#10B981' : m.difficulty === 'Média' ? '#F59E0B' : '#EF4444'}}>
                                                  {m.difficulty || 'Fácil'} • {m.readyInMinutes || 30}m
                                              </Text>
                                          </View>
                                          <TouchableOpacity onPress={() => openAlternatives(ix, mIndex, m.id)} style={{padding: 6, backgroundColor: '#F3F4F6', borderRadius: 8}}>
                                              <Ionicons name="swap-horizontal" size={18} color="#4B5563" />
                                          </TouchableOpacity>
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

                      {Object.keys(groupedShopping).map(recipe => (
                          <View key={recipe} style={{ marginBottom: 12 }}>
                              <TouchableOpacity onPress={() => toggleRecipe(recipe)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, backgroundColor: '#F3F4F6', paddingHorizontal: 16, borderRadius: 12 }}>
                                  <Text style={{ fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 }} numberOfLines={1}>{recipe}</Text>
                                  <Ionicons name={expandedRecipes[recipe] ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
                              </TouchableOpacity>
                              {expandedRecipes[recipe] && (
                                  <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                                      {groupedShopping[recipe].map((item, index) => (
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
                          </View>
                      ))}
                  </View>
              )}
          </ScrollView>
      )}

      {/* Alternatives Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Opções Alternativas</Text>
                  <Text style={styles.modalSub}>Escolha uma receita para substituir.</Text>
                  
                  {isLoadingAlts ? (
                      <View style={{padding: 40, alignItems: 'center'}}>
                          <ActivityIndicator size="large" color="#4F46E5" />
                          <Text style={{marginTop: 12, color: '#6B7280'}}>Buscando receitas...</Text>
                      </View>
                  ) : (
                      <ScrollView showsVerticalScrollIndicator={false}>
                          {alternatives.map(alt => (
                              <TouchableOpacity key={alt.id} style={styles.altCard} onPress={() => selectAlternative(alt)}>
                                  <Text style={styles.altTitle}>{alt.title}</Text>
                                  <Text style={{fontSize: 13, color: '#6B7280'}}>Dificuldade: <Text style={{fontWeight: '700'}}>{alt.difficulty || 'Média'}</Text></Text>
                              </TouchableOpacity>
                          ))}
                      </ScrollView>
                  )}
                  
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
                      <Text style={styles.modalCloseBtnText}>Cancelar</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

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
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
  form: { width: '100%', backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  planDurationSelector: { marginBottom: 20 },
  durationPills: { flexDirection: 'row', gap: 12, marginTop: 8 },
  durationPill: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  durationPillActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  durationPillText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  durationPillTextActive: { color: '#4F46E5' },
  wipContainer: { alignItems: 'center', backgroundColor: '#F9FAFB', padding: 24, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: '#EEF2FF' },
  wipTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 12, marginBottom: 8 },
  wipText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  caloriesAutoContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, gap: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  caloriesIconBlock: { backgroundColor: '#FEE2E2', padding: 8, borderRadius: 10 },
  labelAuto: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  caloriesValueText: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 2 },
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
  shItemAmount: { fontSize: 15, fontWeight: '700', color: '#4F46E5' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: 400 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  modalSub: { fontSize: 15, color: '#6B7280', marginBottom: 20, marginTop: 4 },
  altCard: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, marginBottom: 12 },
  altTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  modalCloseBtn: { marginTop: 12, paddingVertical: 16, alignItems: 'center' },
  modalCloseBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 16 }
});
