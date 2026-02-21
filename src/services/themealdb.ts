import { model } from './gemini';

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

export interface TranslatedMeal {
    id: string;
    title: string;
    instructions: string;
    image: string;
    category: string;
    ingredients: { item: string, measure: string }[];
}

/**
 * Fetches a random meal from TheMealDB and uses Gemini 1.5 Pro to translate it into Portuguese.
 */
export const fetchAndTranslateRandomMeal = async (): Promise<TranslatedMeal> => {
    try {
        const response = await fetch(`${BASE_URL}/random.php`);
        if (!response.ok) throw new Error('Falha ao buscar receita do TheMealDB');
        const data = await response.json();
        const meal = data.meals[0];

        // Extract ingredients
        const rawIngredients: { item: string, measure: string }[] = [];
        for (let i = 1; i <= 20; i++) {
            const ing = meal[`strIngredient${i}`];
            const meas = meal[`strMeasure${i}`];
            if (ing && ing.trim() !== '') {
                rawIngredients.push({ item: ing.trim(), measure: meas ? meas.trim() : '' });
            }
        }

        const payloadToTranslate = {
            title: meal.strMeal,
            category: meal.strCategory,
            instructions: meal.strInstructions,
            ingredients: rawIngredients
        };

        const prompt = `Traduza a seguinte receita COMPLETAMENTE para o português brasileiro (PT-BR).
        
        Receita Original:
        ${JSON.stringify(payloadToTranslate)}

        Retorne APENAS um objeto JSON válido (sem markdown \`\`\`json em volta) com a exata estrutura original, mas com os valores em português. O formato esperado é:
        {
           "title": "Nome em PR-BR",
           "category": "Categoria em PT-BR",
           "instructions": "Instruções em PT-BR",
           "ingredients": [{ "item": "Ingrediente em PT-BR", "measure": "Medida em PT-BR (ex: 1 xícara, 200g)" }]
        }
        Cuidado ao traduzir medidas (ex: 'tbsp' para 'colheres de sopa', 'oz' para gramas se possível, etc). Retorne apenas o JSON.`;

        const result = await model.generateContent(prompt);
        const translatedText = await result.response.text();
        const translatedJson = JSON.parse(translatedText.replace(/```json/g, '').replace(/```/g, '').trim());

        return {
            id: meal.idMeal,
            title: translatedJson.title,
            category: translatedJson.category,
            instructions: translatedJson.instructions,
            ingredients: translatedJson.ingredients,
            image: meal.strMealThumb
        };

    } catch (error) {
        console.error("TheMealDB/Gemini Translation Error:", error);
        throw new Error("Erro ao buscar e traduzir a receita.");
    }
};

/**
 * Generates a mock week plan by fetching N random translated meals
 */
export const generateWeeklyMeals = async (days: number = 7): Promise<TranslatedMeal[]> => {
    const meals: TranslatedMeal[] = [];
    // Promise.all can cause rate limits on free Gemini occasionally, but we'll try it and limit the prompt size.
    // For safety and better quality on a free tier app demonstration, let's fetch them sequentially or in small batches.
    for (let i = 0; i < days; i++) {
        const m = await fetchAndTranslateRandomMeal();
        meals.push(m);
    }
    return meals;
};
