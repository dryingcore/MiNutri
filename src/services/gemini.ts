import { GoogleGenerativeAI } from '@google/generative-ai';

// Placeholder key per requirements
const GEMINI_API_KEY = "AIzaSyByA993E1bbeNaBcEGAB6aTfsR3ST36xTQ";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
export const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
export interface IdentifiedIngredient {
  id: string; // for UI list unique keys
  name: string;
  amount_grams: number;
}

export const identifyIngredients = async (base64Image: string): Promise<{ mealName: string, ingredients: IdentifiedIngredient[] }> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const prompt = `Analise a imagem deste prato de comida e identifique os ingredientes visíveis. Dê um nome criativo para a refeição. Estime a quantidade exata em gramas (number) para cada ingrediente de forma isolada. 
    Retorne APENAS um objeto JSON válido seguindo estritamente a seguinte estrutura:
    { 
      "mealName": "Nome do Prato",
      "ingredients": [
        { "name": "Nome do Ingrediente", "amount_grams": 150 }
      ]
    }
    Não inclua blocos markdown (como \`\`\`json), retorne puramente o JSON.`;

    const imageParts = [
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    
    const cleanedText = text.replace(/```json\n|\n```/g, '').trim();
    const parsed = JSON.parse(cleanedText);
    
    // Assign random ID for flatlist React keys
    const ingredientsWithIds = (parsed.ingredients || []).map((ing: any) => ({
      ...ing,
      id: Math.random().toString(36).substring(7)
    }));

    return {
      mealName: parsed.mealName || "Sua Refeição",
      ingredients: ingredientsWithIds
    };
  } catch (error) {
    console.error("Error identifying ingredients:", error);
    throw new Error('Falha ao identificar os ingredientes. Tente novamente.');
  }
};

export const calculateMacros = async (mealName: string, ingredients: IdentifiedIngredient[]) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    // Send only name and grams to Gemini to save tokens
    const ingredientsPayload = ingredients.map(i => ({ name: i.name, grams: i.amount_grams }));

    const prompt = `Você é um nutricionista digital. Calcule com precisão as calorias e os macronutrientes para o prato "${mealName}" que contém exatamente a seguinte lista de ingredientes e suas respectivas gramaturas: ${JSON.stringify(ingredientsPayload)}.
    
    Retorne APENAS um objeto JSON válido descrevendo o total do prato, seguindo este esquema exato:
    { 
      "calories": number, 
      "protein": number, 
      "carbs": number, 
      "fat": number, 
      "micronutrients": {
         "calcium": number, // em mg
         "iron": number, // em mg
         "vitaminA": number, // em mcg
         "vitaminC": number // em mg
      },
      "category": "Doce" | "Salgado" | "Bebida" | "Outro",
      "breakdown": [
        { "item": string, "grams": number, "calories": number }
      ] 
    }
    Seja minucioso na conversão de gramas para calorias, macros e micros baseando-se em tabelas nutricionais oficiais TACO/USDA. Retorne APENAS o JSON de forma direta (sem \`\`\`json no topo).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const cleanedText = text.replace(/```json\n|\n```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error calculating macros:", error);
    throw new Error('Falha ao calcular o valor nutricional da lista. Tente novamente.');
  }
};
