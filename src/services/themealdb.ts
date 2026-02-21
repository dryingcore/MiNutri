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
 * Fetches exactly one meal and translates it (unused by MealPrepScreen currently, left for single updates)
 */
export const fetchAndTranslateRandomMeal = async (): Promise<TranslatedMeal> => {
    try {
        const response = await fetch(`${BASE_URL}/random.php`);
        if (!response.ok) throw new Error('Falha ao buscar receita do TheMealDB');
        const data = await response.json();
        const meal = data.meals[0];

        const rawIngredients: { item: string, measure: string }[] = [];
        for (let i = 1; i <= 20; i++) {
            const ing = meal[`strIngredient${i}`];
            const meas = meal[`strMeasure${i}`];
            if (ing && ing.trim() !== '') rawIngredients.push({ item: ing.trim(), measure: meas ? meas.trim() : '' });
        }

        const payloadToTranslate = { title: meal.strMeal, category: meal.strCategory, instructions: meal.strInstructions, ingredients: rawIngredients };

        const prompt = `Traduza a seguinte receita COMPLETAMENTE para o português brasileiro (PT-BR).\nReceita Original:\n${JSON.stringify(payloadToTranslate)}\nRetorne APENAS um objeto JSON válido (sem markdown \`\`\`json) com a exata estrutura original, valores em português. O formato esperado é:\n{"title": "Nome em PR-BR","category": "Categoria em PT-BR","instructions": "Instruções...","ingredients": [{ "item": "Ingrediente...", "measure": "Medida..." }]}`;

        const result = await model.generateContent(prompt);
        const translatedJson = JSON.parse((await result.response.text()).replace(/```json/g, '').replace(/```/g, '').trim());

        return { id: meal.idMeal, title: translatedJson.title, category: translatedJson.category, instructions: translatedJson.instructions, ingredients: translatedJson.ingredients, image: meal.strMealThumb };
    } catch (error) {
        console.error("TheMealDB Single Translation Error:", error);
        throw new Error("Erro de rede ao traduzir a receita. Tente novamente.");
    }
};

/**
 * Generates a mock week plan by fetching N random meals and translating them ALL AT ONCE taking only 1 Gemini Request!
 * This avoids the 'Network request failed' caused by free-tier Rate Limits hitting 429 Too Many Requests in a loop.
 */
export const generateWeeklyMeals = async (days: number = 7): Promise<TranslatedMeal[]> => {
    try {
        console.log(`Buscando ${days} receitas do TheMealDB simultaneamente...`);
        // 1. Fetch N meals from TheMealDB very fast
        const randomMealsPromises = Array.from({ length: days }).map(() => fetch(`${BASE_URL}/random.php`).then(res => res.json()));
        const responses = await Promise.all(randomMealsPromises);
        
        const rawMeals = responses.map(data => data.meals[0]);

        // 2. Prepare payload to translate as an Array
        const payloadToTranslate = rawMeals.map(meal => {
            const rawIngredients: { item: string, measure: string }[] = [];
            for (let i = 1; i <= 20; i++) {
                const ing = meal[`strIngredient${i}`];
                const meas = meal[`strMeasure${i}`];
                if (ing && ing.trim() !== '') {
                    rawIngredients.push({ item: ing.trim(), measure: meas ? meas.trim() : '' });
                }
            }
            return {
                id: meal.idMeal,
                image: meal.strMealThumb,
                title: meal.strMeal,
                category: meal.strCategory,
                instructions: meal.strInstructions,
                ingredients: rawIngredients
            };
        });

        console.log(`Traduzindo ${days} receitas em Lote com Gemini AI...`);

        // 3. Send ALL recipes in a SINGLE prompt to avoid Rate Limits (1 request instead of 7)
        const prompt = `Traduza a seguinte lista de pratos COMPLETAMENTE para o português brasileiro (PT-BR).
        
        Lista Original:
        ${JSON.stringify(payloadToTranslate)}

        Retorne APENAS um array JSON válido (sem blocos markdown visuais como \`\`\`json em volta) com a exata estrutura original, mas com os textos (title, category, instructions, ingredients) em português. Preservar as strings de "id" e "image" INTACTAS originadas da fonte. 
        
        O formato retornado DEVE SER UM ARRAY VÁLIDO contendo objetos:
        [
          {
             "id": "...",
             "image": "https://...",
             "title": "Nome em PT-BR",
             "category": "Categoria em PT-BR",
             "instructions": "Instruções... (não encurtar)",
             "ingredients": [{ "item": "Ingrediente...", "measure": "Medida..." }]
          }
        ]
        Cuidado ao traduzir medidas (ex: oz para gramas, tbsp para colheres, etc). Retorne apenas e unicamente o array JSON.`;

        const result = await model.generateContent(prompt);
        const translatedText = await result.response.text();
        
        const cleanedText = translatedText.replace(/```json/g, '').replace(/```/g, '').trim();
        const translatedArray: TranslatedMeal[] = JSON.parse(cleanedText);

        return translatedArray;

    } catch (error) {
        console.error("TheMealDB/Gemini Batch Translation Error:", error);
        throw new Error("A IA sofreu uma sobrecarga na tradução. Por favor, tente gerar novamente em alguns segundos.");
    }
};
