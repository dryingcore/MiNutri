import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSymptoms } from '../contexts/SymptomContext';
import { useNutrition } from '../contexts/NutritionContext';

const COMMON_SYMPTOMS = ['Inchaço', 'Fadiga', 'Dor de Cabeça', 'Gases', 'Azia', 'Enjoo'];

export default function SymptomDiaryScreen() {
  const { symptoms, addSymptom, removeSymptom } = useSymptoms();
  const { meals } = useNutrition();

  const [activeSegment, setActiveSegment] = useState<'log' | 'history'>('log');
  
  // Form State
  const [selectedSymptom, setSelectedSymptom] = useState<string>('');
  const [customSymptom, setCustomSymptom] = useState<string>('');
  const [severity, setSeverity] = useState<number>(3);
  const [notes, setNotes] = useState<string>('');

  const handleSaveSymptom = () => {
      const finalSymptom = customSymptom.trim() || selectedSymptom;
      if (!finalSymptom) {
          Alert.alert('Atenção', 'Selecione ou digite um sintoma.');
          return;
      }

      addSymptom({
          id: Math.random().toString(36).substring(7),
          symptom: finalSymptom,
          severity: severity as 1|2|3|4|5,
          timestamp: new Date(),
          notes: notes.trim()
      });
      
      // Reset Form
      setSelectedSymptom('');
      setCustomSymptom('');
      setSeverity(3);
      setNotes('');
      setActiveSegment('history');
  };

  /**
   * Helper to find meals eaten within 4 hours prior to the symptom timestamp
   */
  const findPossibleTriggers = (symptomTime: Date) => {
      const sympMs = symptomTime.getTime();
      const fourHoursMs = 14400000;
      
      return meals.filter(m => {
          const mealMs = m.timestamp.getTime();
          // Meal was before symptom but within 4 hours
          return (mealMs < sympMs) && (sympMs - mealMs <= fourHoursMs);
      });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Diário de Sintomas</Text>
        <Text style={styles.subtitle}>Registre como você se sente e descubra possíveis intolerâncias.</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeSegment === 'log' && styles.activeTab]}
          onPress={() => setActiveSegment('log')}
        >
          <Text style={[styles.tabText, activeSegment === 'log' && styles.activeTabText]}>Registrar Sintoma</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeSegment === 'history' && styles.activeTab]}
          onPress={() => setActiveSegment('history')}
        >
          <Text style={[styles.tabText, activeSegment === 'history' && styles.activeTabText]}>Histórico ({symptoms.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {activeSegment === 'log' ? (
              // LOGGING UI
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                 <View style={styles.formCard}>
                     <Text style={styles.label}>Como você está se sentindo?</Text>
                     <View style={styles.pillContainer}>
                         {COMMON_SYMPTOMS.map(sym => (
                             <TouchableOpacity 
                                 key={sym} 
                                 onPress={() => { setSelectedSymptom(sym); setCustomSymptom(''); }}
                                 style={[styles.pill, selectedSymptom === sym && styles.activePill]}
                             >
                                 <Text style={[styles.pillText, selectedSymptom === sym && styles.activePillText]}>{sym}</Text>
                             </TouchableOpacity>
                         ))}
                     </View>

                     <Text style={[styles.label, {marginTop: 20}]}>Ou digite outro sintoma:</Text>
                     <TextInput 
                         style={styles.input}
                         placeholder="Ex: Refluxo, Letargia"
                         value={customSymptom}
                         onChangeText={(t) => {
                             setCustomSymptom(t);
                             if (t.length > 0) setSelectedSymptom('');
                         }}
                         placeholderTextColor="#9CA3AF"
                     />

                     <Text style={[styles.label, {marginTop: 20}]}>Intensidade (1 a 5)</Text>
                     <View style={styles.severityRow}>
                         {[1,2,3,4,5].map(num => (
                             <TouchableOpacity 
                                key={num}
                                onPress={() => setSeverity(num)}
                                style={[
                                    styles.severityDot,
                                    severity === num && { backgroundColor: getSeverityColor(num), borderColor: getSeverityColor(num) }
                                ]}
                             >
                                 <Text style={[styles.severityNum, severity === num && {color:'#FFFFFF'}]}>{num}</Text>
                             </TouchableOpacity>
                         ))}
                     </View>

                     <Text style={[styles.label, {marginTop: 20}]}>Notas Adicionais (opcional)</Text>
                     <TextInput 
                         style={[styles.input, styles.textArea]}
                         placeholder="O que estava fazendo antes do sintoma?"
                         value={notes}
                         onChangeText={setNotes}
                         multiline
                         numberOfLines={3}
                         placeholderTextColor="#9CA3AF"
                     />

                     <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSymptom}>
                         <Text style={styles.saveBtnText}>Registrar Sintoma</Text>
                     </TouchableOpacity>
                 </View>
              </KeyboardAvoidingView>
          ) : (
              // HISTORY & TRIGGERS UI
              <View>
                  {symptoms.length === 0 ? (
                      <View style={styles.emptyContainer}>
                         <Ionicons name="body-outline" size={60} color="#E5E7EB" style={{marginBottom: 16}} />
                         <Text style={styles.emptyTitle}>Nenhum registro</Text>
                         <Text style={styles.emptySub}>Você está se sentindo ótimo! Nenhum sintoma registrado.</Text>
                      </View>
                  ) : (
                      symptoms.map(s => {
                          const triggers = findPossibleTriggers(s.timestamp);
                          return (
                              <View key={s.id} style={styles.symptomCard}>
                                  <View style={styles.symptomHeader}>
                                      <View style={[styles.symptomBadge, {backgroundColor: getSeverityColor(s.severity) + '20'}]}>
                                          <Text style={[styles.symptomBadgeText, {color: getSeverityColor(s.severity)}]}>{s.symptom}</Text>
                                      </View>
                                      <TouchableOpacity onPress={() => removeSymptom(s.id)}>
                                          <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                                      </TouchableOpacity>
                                  </View>
                                  
                                  <View style={styles.symptomMetaRow}>
                                      <Ionicons name="time-outline" size={14} color="#6B7280" />
                                      <Text style={styles.symptomMetaText}>
                                          {s.timestamp.toLocaleDateString()} às {s.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </Text>
                                  </View>
                                  
                                  <Text style={styles.symptomSeverity}>Intensidade: {s.severity}/5</Text>
                                  {s.notes ? <Text style={styles.symptomNotes}>"{s.notes}"</Text> : null}

                                  {triggers.length > 0 && (
                                     <View style={styles.triggersBox}>
                                        <Text style={styles.triggersTitle}>🔍 Possíveis Gatilhos (Últimas 4h)</Text>
                                        {triggers.map(t => (
                                           <Text key={t.id} style={styles.triggerMeal}>• {t.name}</Text>
                                        ))}
                                     </View>
                                  )}
                              </View>
                          );
                      })
                  )}
              </View>
          )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper color for severity mapping
const getSeverityColor = (svr: number) => {
    switch(svr) {
        case 1: return '#10B981'; // Green
        case 2: return '#84CC16'; // Lime
        case 3: return '#F59E0B'; // Amber
        case 4: return '#EA580C'; // Orange
        case 5: return '#EF4444'; // Red
        default: return '#6B7280';
    }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#111827', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#6B7280', marginTop: 4, lineHeight: 22 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#E5E7EB' },
  activeTab: { borderBottomColor: '#F59E0B' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#F59E0B', fontWeight: '800' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 130 },
  
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  label: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12 },
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  activePill: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  pillText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  activePillText: { color: '#D97706', fontWeight: '700' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 16, height: 50, fontSize: 16, color: '#111827' },
  textArea: { height: 100, paddingTop: 16, textAlignVertical: 'top' },
  
  severityRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  severityDot: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  severityNum: { fontSize: 16, fontWeight: '800', color: '#6B7280' },
  
  saveBtn: { backgroundColor: '#F59E0B', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 32, shadowColor: '#F59E0B', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  
  symptomCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  symptomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  symptomBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  symptomBadgeText: { fontWeight: '800', fontSize: 15 },
  symptomMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  symptomMetaText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  symptomSeverity: { fontSize: 14, color: '#374151', fontWeight: '700', marginBottom: 6 },
  symptomNotes: { fontSize: 14, color: '#6B7280', fontStyle: 'italic', marginBottom: 16 },
  
  triggersBox: { backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FEE2E2' },
  triggersTitle: { fontSize: 13, fontWeight: '700', color: '#B91C1C', marginBottom: 8 },
  triggerMeal: { fontSize: 13, color: '#991B1B', fontWeight: '500', marginLeft: 4 }
});
