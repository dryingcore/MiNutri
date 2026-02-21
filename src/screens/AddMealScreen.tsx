import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AddMealScreenProps } from '../navigation/types';
import { useNutrition } from '../contexts/NutritionContext';
import { identifyIngredients, calculateMacros, IdentifiedIngredient } from '../services/gemini';
import { fetchProductByBarcode } from '../services/openfoodfacts';
import { Meal } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddMealScreen({ navigation }: AddMealScreenProps) {
  const { addMeal } = useNutrition();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
  // Tabs & Modes
  const [activeMode, setActiveMode] = useState<'plate' | 'barcode'>('plate');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isFetchingBarcode, setIsFetchingBarcode] = useState(false);

  // New States for Two-Step Process
  const [step, setStep] = useState<1 | 2>(1);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const [mealName, setMealName] = useState("Minha Refeição");
  const [ingredients, setIngredients] = useState<IdentifiedIngredient[]>([]);

  // ---- BARCODE LOGIC ----
  const startScanning = async () => {
      if (!permission?.granted) {
          const req = await requestPermission();
          if (!req.granted) {
            Alert.alert('Atenção', 'Precisamos da permissão de câmera para ler códigos.');
            return;
          }
      }
      setActiveMode('barcode');
      setScanned(false);
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
    if (scanned) return;
    setScanned(true);
    setIsFetchingBarcode(true);
    try {
        const product = await fetchProductByBarcode(data);
        
        const newMeal: Meal = {
            id: Math.random().toString(36).substring(7),
            timestamp: new Date(),
            imageUrl: product.image || undefined,
            name: product.productName,
            calories: product.macros.calories || 0,
            protein: product.macros.protein || 0,
            carbs: product.macros.carbs || 0,
            fat: product.macros.fat || 0,
            breakdown: [{item: product.productName, grams: 100, calories: product.macros.calories || 0}], 
        };

        await addMeal(newMeal);
        Alert.alert('✅ Produto Encontrado!', `${product.brand} - ${product.productName} registrado com base em 100g/ml.`);
        navigation.goBack();
    } catch (e: any) {
        Alert.alert('Erro no Escaneamento', e.message);
        setTimeout(() => setScanned(false), 2500); // allow scanning again after 2.5s if it fails
    } finally {
        setIsFetchingBarcode(false);
    }
  };


  // ---- PLATE LOGIC ----
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à sua câmera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
      setStep(1); 
      setIngredients([]);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
      setStep(1);
      setIngredients([]);
    }
  };

  // STEP 1: Identify
  const handleIdentify = async () => {
    if (!imageBase64) return;
    setIsIdentifying(true);
    try {
      const { mealName, ingredients } = await identifyIngredients(imageBase64);
      setMealName(mealName);
      setIngredients(ingredients);
      setStep(2);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setIsIdentifying(false);
    }
  };

  // Ingredient List Management
  const updateIngredient = (index: number, field: keyof IdentifiedIngredient, value: string | number) => {
    const newList = [...ingredients];
    newList[index] = { ...newList[index], [field]: value };
    setIngredients(newList);
  };

  const removeIngredient = (index: number) => {
    const newList = ingredients.filter((_, i) => i !== index);
    setIngredients(newList);
  };

  const addNewIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: Math.random().toString(36).substring(7), name: '', amount_grams: 100 }
    ]);
  };

  // STEP 2: Calculate Macros
  const handleCalculate = async () => {
    if (ingredients.length === 0) {
        Alert.alert('Atenção', 'Adicione pelo menos um ingrediente para calcular.');
        return;
    }
    // Validation
    if (ingredients.some(i => i.name.trim() === '')) {
       Alert.alert('Aviso', 'Existem ingredientes sem nome preenchido.');
       return;
    }

    setIsCalculating(true);
    try {
      const data = await calculateMacros(mealName, ingredients);
      
      const newMeal: Meal = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        imageUrl: imageUri || undefined,
        name: mealName,
        calories: data.calories || 0,
        protein: data.protein || 0,
        carbs: data.carbs || 0,
        fat: data.fat || 0,
        breakdown: data.breakdown || [],
      };

      await addMeal(newMeal);
      Alert.alert('✨ Sucesso!', 'Sua refeição foi registrada com os valores nutricionais ajustados.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={{flex: 1}} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
          <View style={styles.topBar}>
            <View style={styles.modeTabs}>
                <TouchableOpacity 
                   style={[styles.modeTab, activeMode === 'plate' && styles.modeTabActive]}
                   onPress={() => setActiveMode('plate')}
                >
                   <Text style={[styles.modeTabText, activeMode === 'plate' && styles.modeTabTextActive]}>Prato</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   style={[styles.modeTab, activeMode === 'barcode' && styles.modeTabActive]}
                   onPress={startScanning}
                >
                   <Text style={[styles.modeTabText, activeMode === 'barcode' && styles.modeTabTextActive]}>Código (Produto)</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {activeMode === 'barcode' ? (
              // ========= BARCODE SCANNER UI =========
              <View style={styles.stepContainer}>
                  <View style={styles.headerBlock}>
                      <Text style={styles.title}>Escanear Produto</Text>
                      <Text style={styles.subtitle}>
                          Aponte a câmera para o código de barras de um produto para extrair o rótulo diretamente do Open Food Facts.
                      </Text>
                  </View>

                  <View style={styles.scannerContainer}>
                      {permission && permission.granted ? (
                          <CameraView 
                              style={StyleSheet.absoluteFillObject}
                              barcodeScannerSettings={{
                                  barcodeTypes: ["ean13", "ean8", "upc_e", "upc_a", "qr"],
                              }}
                              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                          />
                      ) : (
                          <Text style={{padding: 20, textAlign: 'center', color: '#6B7280'}}>Permissão de Câmera Negada.</Text>
                      )}
                      
                      {isFetchingBarcode && (
                          <View style={styles.scannerOverlay}>
                              <ActivityIndicator size="large" color="#FFFFFF" />
                              <Text style={styles.scannerLoadingText}>Buscando tabela nacional...</Text>
                          </View>
                      )}
                  </View>
              </View>
          ) : step === 1 ? (
              // ========= STEP 1 (PLATE) UI =========
              <View style={styles.stepContainer}>
                <View style={styles.headerBlock}>
                    <Text style={styles.title}>Analise seu Prato</Text>
                    <Text style={styles.subtitle}>
                        Primeiro extrairemos os ingredientes do prato, para que você possa revisá-los.
                    </Text>
                </View>

                <TouchableOpacity 
                    style={[styles.imageContainer, !imageUri && styles.imageContainerEmpty]} 
                    onPress={pickImage}
                    activeOpacity={0.8}
                >
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                ) : (
                    <View style={styles.placeholderContainer}>
                    <View style={styles.cameraIconBg}>
                        <Ionicons name="images-outline" size={36} color="#4F46E5" />
                    </View>
                    <Text style={styles.placeholderText}>Toque para enviar uma foto</Text>
                    <Text style={styles.placeholderSub}>ou use os botões abaixo</Text>
                    </View>
                )}
                </TouchableOpacity>

                <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={takePhoto}>
                    <Ionicons name="camera" size={20} color="#374151" />
                    <Text style={styles.secondaryButtonText}>Câmera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={pickImage}>
                    <Ionicons name="images" size={20} color="#374151" />
                    <Text style={styles.secondaryButtonText}>Galeria</Text>
                </TouchableOpacity>
                </View>

                {imageUri && (
                <TouchableOpacity 
                    onPress={handleIdentify} 
                    disabled={isIdentifying}
                    style={styles.primaryButtonWrapper}
                >
                    <LinearGradient colors={['#6366F1', '#4F46E5']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.primaryButtonGradient}>
                        {isIdentifying ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <>
                                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                                <Text style={styles.primaryButtonText}>Avançar e Extrair</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
                )}
                {isIdentifying && <Text style={styles.loadingText}>A IA está trabalhando no seu prato...</Text>}
              </View>
          ) : (
              // ========= STEP 2 (PLATE) UI =========
              <View style={styles.stepContainer}>
                  <View style={styles.headerBlock}>
                    <Text style={styles.title}>Revise sua Refeição</Text>
                    <Text style={styles.subtitle}>
                        Confira as estimativas e ajuste as quantidades para aumentar a precisão dos cálculos.
                    </Text>
                  </View>

                  <View style={styles.nameInputContainer}>
                      <Text style={styles.label}>Nome do Prato</Text>
                      <TextInput 
                          style={styles.input}
                          value={mealName}
                          onChangeText={setMealName}
                          placeholder="Ex: Prato Feito"
                          placeholderTextColor="#9CA3AF"
                      />
                  </View>

                  <View style={styles.ingredientsHeaderWrapper}>
                      <Text style={styles.label}>Ingredientes & Pesos</Text>
                  </View>

                  {ingredients.map((ing, i) => (
                      <View key={ing.id} style={styles.ingredientRow}>
                          <TextInput 
                              style={[styles.input, styles.ingrNameInput]}
                              value={ing.name}
                              onChangeText={(val) => updateIngredient(i, 'name', val)}
                              placeholder="Alimento"
                              placeholderTextColor="#9CA3AF"
                          />
                          <View style={styles.ingrAmountWrapper}>
                              <TextInput 
                                  style={[styles.input, styles.ingrAmountInput]}
                                  value={ing.amount_grams.toString()}
                                  onChangeText={(val) => updateIngredient(i, 'amount_grams', parseInt(val) || 0)}
                                  placeholder="0"
                                  keyboardType="numeric"
                              />
                              <Text style={styles.gramText}>g</Text>
                          </View>
                          <TouchableOpacity onPress={() => removeIngredient(i)} style={styles.removeBtn}>
                              <Ionicons name="trash" size={20} color="#EF4444" />
                          </TouchableOpacity>
                      </View>
                  ))}

                  <TouchableOpacity style={styles.addIngrButton} onPress={addNewIngredient}>
                      <Ionicons name="add-circle-outline" size={20} color="#6366F1" />
                      <Text style={styles.addIngrText}>Novo ingrediente</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                      onPress={handleCalculate} 
                      disabled={isCalculating}
                      style={[styles.primaryButtonWrapper, {marginTop: 20}]}
                  >
                      <LinearGradient colors={['#10B981', '#059669']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.primaryButtonGradient}>
                          {isCalculating ? (
                              <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                              <>
                                  <Ionicons name="calculator" size={20} color="#FFFFFF" />
                                  <Text style={styles.primaryButtonText}>Calcular Macronutrientes</Text>
                              </>
                          )}
                      </LinearGradient>
                  </TouchableOpacity>
                  {isCalculating && <Text style={[styles.loadingText, {color: '#10B981'}]}>Cruzando dados de micro e macros...</Text>}
              </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40, alignItems: 'center' },
  stepContainer: { width: '100%', alignItems: 'center' },
  topBar: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  modeTabs: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 20, padding: 4 },
  modeTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  modeTabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  modeTabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  modeTabTextActive: { color: '#4F46E5', fontWeight: '800' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerBlock: { width: '100%', alignItems: 'flex-start', marginBottom: 28 },
  title: { fontSize: 28, fontWeight: '900', color: '#111827', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#6B7280', lineHeight: 24, fontWeight: '500' },
  
  scannerContainer: { width: '100%', aspectRatio: 1, borderRadius: 32, overflow: 'hidden', backgroundColor: '#000000', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 8, justifyContent: 'center', alignItems: 'center' },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  scannerLoadingText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16, marginTop: 12 },

  imageContainer: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#FFFFFF', borderRadius: 32, overflow: 'hidden', marginBottom: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 8 },
  imageContainerEmpty: { borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', shadowOpacity: 0, elevation: 0, backgroundColor: '#F9FAFB' },
  previewImage: { width: '100%', height: '100%' },
  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cameraIconBg: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  placeholderText: { color: '#4B5563', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  placeholderSub: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 28, gap: 16 },
  secondaryButton: { flex: 1, backgroundColor: '#FFFFFF', flexDirection: 'row', paddingVertical: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' },
  secondaryButtonText: { color: '#374151', fontWeight: '700', fontSize: 15 },
  primaryButtonWrapper: { width: '100%', borderRadius: 22, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10, overflow: 'hidden' },
  primaryButtonGradient: { flexDirection: 'row', paddingVertical: 20, alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 18, letterSpacing: 0.5 },
  loadingText: { marginTop: 20, color: '#6366F1', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  
  nameInputContainer: { width: '100%', marginBottom: 24 },
  label: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111827', fontWeight: '500' },
  ingredientsHeaderWrapper: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ingredientRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  ingrNameInput: { flex: 1 },
  ingrAmountWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, overflow: 'hidden', paddingRight: 14 },
  ingrAmountInput: { borderWidth: 0, width: 70, textAlign: 'right', paddingRight: 4 },
  gramText: { color: '#6B7280', fontWeight: '700', fontSize: 15 },
  removeBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  addIngrButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: 4, marginTop: 4, gap: 6, paddingVertical: 8 },
  addIngrText: { color: '#6366F1', fontWeight: '700', fontSize: 15 },
});
