import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProfile, ActivityLevel, Goal } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolate } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

// Animated Accordion Item Component
const AccordionItem = ({ title, icon, children, defaultOpen = false }: { title: string, icon: keyof typeof Ionicons.glyphMap, children: React.ReactNode, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const progress = useSharedValue(defaultOpen ? 1 : 0);

    const toggleAccordion = () => {
        setIsOpen(!isOpen);
        progress.value = withTiming(isOpen ? 0 : 1, { duration: 300 });
    };

    const bodyStyle = useAnimatedStyle(() => ({
        height: isOpen ? 'auto' : 0, 
        opacity: progress.value,
        marginTop: interpolate(progress.value, [0, 1], [0, 16]),
        overflow: 'hidden'
    }));

    const chevronStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }]
    }));

    return (
        <View style={styles.card}>
            <TouchableOpacity style={styles.cardHeader} onPress={toggleAccordion} activeOpacity={0.7}>
                <View style={styles.cardHeaderLeft}>
                    <View style={styles.iconBg}>
                        <Ionicons name={icon} size={20} color="#4F46E5" />
                    </View>
                    <Text style={styles.cardTitle}>{title}</Text>
                </View>
                <Animated.View style={chevronStyle}>
                    <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                </Animated.View>
            </TouchableOpacity>
            <Animated.View style={bodyStyle}>
                {children}
            </Animated.View>
        </View>
    );
};

export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const { anthropometry, setAnthropometry, preferences, setPreferences, routine, setRoutine, targets } = useProfile();

    const handleSaveAnthro = () => {
        setAnthropometry({ ...anthropometry }); // Trigger context update and storage
        Toast.show({ type: 'success', text1: 'Antropometria Salva', text2: 'Sua meta calórica diária foi ajustada.' });
    };

    const handleSavePrefs = () => {
        setPreferences({ ...preferences });
        Toast.show({ type: 'success', text1: 'Preferências Salvas' });
    };

    const handleLogout = async () => {
        await signOut();
        Toast.show({ type: 'info', text1: 'Desconectado', text2: 'Adeus!' });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Perfil</Text>
                <Text style={styles.subtitle}>{user?.email || 'Bem-vindo(a) ao MiNutri'}</Text>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* TDEE Summary Banner */}
                    <View style={styles.summaryBanner}>
                        <Text style={styles.bannerSubtitle}>Sua Meta Diária (TDEE Ajustado)</Text>
                        <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 4}}>
                            <Text style={styles.bannerTitle}>{targets.macros.calories}</Text>
                            <Text style={{color: '#FFFFFF', opacity: 0.8, fontWeight: '600'}}>kcal</Text>
                        </View>
                        <View style={styles.macroRowBanner}>
                            <Text style={styles.bannerMacro}>P: {targets.macros.protein}g</Text>
                            <Text style={styles.bannerMacro}>C: {targets.macros.carbs}g</Text>
                            <Text style={styles.bannerMacro}>G: {targets.macros.fat}g</Text>
                        </View>
                    </View>

                    {/* Section 1: Antropometria */}
                    <AccordionItem title="Dados Antropométricos" icon="body" defaultOpen={true}>
                        <View style={styles.inputRow}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Peso (kg)</Text>
                                <TextInput 
                                    style={styles.input} 
                                    keyboardType="numeric"
                                    value={anthropometry.weight.toString()}
                                    onChangeText={(val) => setAnthropometry({...anthropometry, weight: parseFloat(val) || 0})}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Altura (cm)</Text>
                                <TextInput 
                                    style={styles.input} 
                                    keyboardType="numeric"
                                    value={anthropometry.height.toString()}
                                    onChangeText={(val) => setAnthropometry({...anthropometry, height: parseInt(val) || 0})}
                                />
                            </View>
                        </View>
                        
                        <View style={styles.inputRow}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Idade</Text>
                                <TextInput 
                                    style={styles.input} 
                                    keyboardType="numeric"
                                    value={anthropometry.age.toString()}
                                    onChangeText={(val) => setAnthropometry({...anthropometry, age: parseInt(val) || 0})}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Sexo (M/F)</Text>
                                <TextInput 
                                    style={styles.input} 
                                    autoCapitalize="characters"
                                    maxLength={1}
                                    value={anthropometry.gender}
                                    onChangeText={(val) => setAnthropometry({...anthropometry, gender: val as 'M'|'F'})}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Nível de Atividade</Text>
                        <View style={styles.selectorRow}>
                            {(['sedentary', 'light', 'moderate', 'intense'] as ActivityLevel[]).map(level => (
                                <TouchableOpacity 
                                    key={level}
                                    style={[styles.selectorBtn, anthropometry.activityLevel === level && styles.selectorActive]}
                                    onPress={() => setAnthropometry({...anthropometry, activityLevel: level})}
                                >
                                    <Text style={[styles.selectorText, anthropometry.activityLevel === level && styles.selectorActiveText]}>
                                        {level === 'sedentary' ? 'Sed.' : level === 'light' ? 'Leve' : level === 'moderate' ? 'Mod.' : 'Intenso'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Objetivo Principal</Text>
                        <View style={styles.selectorRow}>
                            {(['lose', 'maintain', 'gain'] as Goal[]).map(goal => (
                                <TouchableOpacity 
                                    key={goal}
                                    style={[styles.selectorBtn, anthropometry.goal === goal && styles.selectorActive]}
                                    onPress={() => setAnthropometry({...anthropometry, goal})}
                                >
                                    <Text style={[styles.selectorText, anthropometry.goal === goal && styles.selectorActiveText]}>
                                        {goal === 'lose' ? 'Emagrecer' : goal === 'maintain' ? 'Manter' : 'Ganhar'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAnthro}>
                            <Text style={styles.saveBtnText}>Salvar Medidas</Text>
                        </TouchableOpacity>
                    </AccordionItem>

                    {/* Section 2: Preferências */}
                    <AccordionItem title="Preferências Alimentares" icon="restaurant">
                       <Text style={styles.label}>Dieta Principal</Text>
                       <View style={styles.inputRow}>
                           <TextInput 
                               style={[styles.input, {flex: 1}]}
                               placeholder="Ex: Vegetariana, Paleo, Sem Leite"
                               value={preferences.diet}
                               onChangeText={(val) => setPreferences({...preferences, diet: val})}
                           />
                       </View>
                       
                       <Text style={styles.label}>Aversões (Não Gosto)</Text>
                       <View style={styles.inputRow}>
                           <TextInput 
                               style={[styles.input, {flex: 1}]}
                               placeholder="Ex: Cebola, Pimentão, Fígado"
                               value={preferences.aversions.join(', ')}
                               onChangeText={(val) => setPreferences({...preferences, aversions: val.split(',').map(s => s.trim())})}
                           />
                       </View>

                       <TouchableOpacity style={styles.saveBtn} onPress={handleSavePrefs}>
                            <Text style={styles.saveBtnText}>Salvar Preferências</Text>
                        </TouchableOpacity>
                    </AccordionItem>

                    {/* Section 3: Rotina */}
                    <AccordionItem title="Configurações de Rotina" icon="alarm">
                        <View style={styles.inputRow}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Café da Manhã</Text>
                                <TextInput style={styles.input} value={routine.breakfastTime} onChangeText={(v) => setRoutine({...routine, breakfastTime: v})} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Almoço</Text>
                                <TextInput style={styles.input} value={routine.lunchTime} onChangeText={(v) => setRoutine({...routine, lunchTime: v})} />
                            </View>
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingVertical: 8}}>
                             <Text style={[styles.label, {marginBottom: 0}]}>Modo Escuro (Dark Mode)</Text>
                             <Switch 
                                value={routine.darkMode} 
                                onValueChange={(v) => setRoutine({...routine, darkMode: v})} 
                                trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
                             />
                        </View>
                    </AccordionItem>

                    {/* Section 4: Área Administrativa */}
                    <View style={styles.dangerZone}>
                        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                            <Text style={styles.logoutText}>Sair da Conta (Logout)</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 },
    title: { fontSize: 32, fontWeight: '900', color: '#111827', letterSpacing: -1 },
    subtitle: { fontSize: 16, color: '#6B7280', marginTop: 4 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 130 },
    
    summaryBanner: { backgroundColor: '#4F46E5', borderRadius: 24, padding: 24, marginBottom: 20, shadowColor: '#4F46E5', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
    bannerSubtitle: { color: '#C7D2FE', fontWeight: '600', fontSize: 13, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    bannerTitle: { color: '#FFFFFF', fontSize: 40, fontWeight: '900' },
    macroRowBanner: { flexDirection: 'row', gap: 12, marginTop: 12 },
    bannerMacro: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
    
    card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
    
    inputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    inputGroup: { flex: 1 },
    label: { fontSize: 13, fontWeight: '700', color: '#4B5563', marginBottom: 6, textTransform: 'uppercase' },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 15, color: '#111827', fontWeight: '600' },
    
    selectorRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    selectorBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
    selectorActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
    selectorText: { fontWeight: '600', color: '#6B7280', fontSize: 13 },
    selectorActiveText: { color: '#4F46E5', fontWeight: '800' },
    
    saveBtn: { backgroundColor: '#F3F4F6', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: '#4B5563', fontWeight: '700', fontSize: 15 },
    
    dangerZone: { marginTop: 10, marginBottom: 30 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', paddingVertical: 16, borderRadius: 20, borderWidth: 1, borderColor: '#FEE2E2' },
    logoutText: { color: '#EF4444', fontWeight: '800', fontSize: 16 }
});
