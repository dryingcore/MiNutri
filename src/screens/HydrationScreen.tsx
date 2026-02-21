import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useNutrition } from '../contexts/NutritionContext';
import { useProfile } from '../contexts/ProfileContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function HydrationScreen() {
  const navigation = useNavigation();
  const { hydrationEntries, addHydration, todaysHydrationMl, removeHydration } = useNutrition();
  const { targets, routine } = useProfile();
  
  const dailyGoalMl = (targets.macros as any)?.waterMl || (Math.ceil(routine.hydrationGoalMs / 250) * 250) || 2000;
  
  const [customAmount, setCustomAmount] = useState('');

  const today = new Date();
  const todaysEntries = hydrationEntries.filter(
    (h) => 
      h.timestamp.getDate() === today.getDate() &&
      h.timestamp.getMonth() === today.getMonth() &&
      h.timestamp.getFullYear() === today.getFullYear()
  ).sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());

  const progressPercentage = Math.min((todaysHydrationMl / dailyGoalMl) * 100, 100);

  const handleAdd = (amount: number) => {
    addHydration(amount);
    setCustomAmount('');
  };

  const handleCustomAdd = () => {
    const amount = parseInt(customAmount);
    if (!isNaN(amount) && amount > 0) {
      handleAdd(amount);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hidratação</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Progress Card */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Progresso de Hoje</Text>
          <View style={styles.progressTextRow}>
            <Text style={styles.progressValue}>{todaysHydrationMl} <Text style={styles.progressUnit}>ml</Text></Text>
            <Text style={styles.progressTarget}> / {dailyGoalMl} ml</Text>
          </View>
          
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={['#60A5FA', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
            />
          </View>
          <Text style={styles.progressPercentageText}>{Math.round(progressPercentage)}% concluído</Text>
        </View>

        {/* Quick Add */}
        <Text style={styles.sectionTitle}>Atalhos Rápidos</Text>
        <View style={styles.quickAddRow}>
          {[200, 300, 500].map(amount => (
            <TouchableOpacity 
              key={amount} 
              style={styles.quickAddBtn}
              onPress={() => handleAdd(amount)}
            >
              <Ionicons name="water" size={24} color="#3B82F6" />
              <Text style={styles.quickAddText}>+{amount}ml</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Add */}
        <View style={styles.customAddContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ou digite o valor em ml..."
            keyboardType="numeric"
            value={customAmount}
            onChangeText={setCustomAmount}
          />
          <TouchableOpacity 
            style={[styles.customAddBtn, !customAmount ? styles.btnDisabled : null]}
            onPress={handleCustomAdd}
            disabled={!customAmount}
          >
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* History */}
        <Text style={styles.sectionTitle}>Histórico de Hoje</Text>
        {todaysEntries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="water-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Nenhum registro de água hoje.</Text>
          </View>
        ) : (
          todaysEntries.map((entry) => (
            <View key={entry.id} style={styles.historyCard}>
              <View style={styles.historyLeft}>
                <View style={styles.historyIcon}>
                   <Ionicons name="water" size={18} color="#2563EB" />
                </View>
                <View>
                  <Text style={styles.historyAmount}>{entry.amountMl} ml</Text>
                  <Text style={styles.historyTime}>
                    {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => removeHydration(entry.id)}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  closeButton: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  progressCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, marginTop: 8, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4 },
  progressTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  progressTextRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  progressValue: { fontSize: 32, fontWeight: '900', color: '#1E3A8A' },
  progressUnit: { fontSize: 16, fontWeight: '700', color: '#6B7280' },
  progressTarget: { fontSize: 16, fontWeight: '600', color: '#9CA3AF', marginLeft: 4 },
  progressBarBg: { height: 12, backgroundColor: '#EFF6FF', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 6 },
  progressPercentageText: { fontSize: 13, fontWeight: '600', color: '#3B82F6', textAlign: 'right' },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
  
  quickAddRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 12 },
  quickAddBtn: { flex: 1, backgroundColor: '#DBEAFE', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  quickAddText: { fontSize: 15, fontWeight: '700', color: '#1E3A8A', marginTop: 8 },
  
  customAddContainer: { flexDirection: 'row', marginBottom: 32, gap: 12 },
  input: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  customAddBtn: { width: 56, backgroundColor: '#2563EB', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { backgroundColor: '#9CA3AF' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: '#FFFFFF', borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#E5E7EB' },
  emptyText: { color: '#9CA3AF', marginTop: 12, fontSize: 15, fontWeight: '600' },
  
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  historyLeft: { flexDirection: 'row', alignItems: 'center' },
  historyIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  historyAmount: { fontSize: 16, fontWeight: '700', color: '#111827' },
  historyTime: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});
