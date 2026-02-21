const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

export interface TranslatedMeal {
    id: string;
    title: string;
    instructions: string;
    image: string;
    category: string;
    ingredients: { item: string, measure: string }[];
    difficulty?: 'Fácil' | 'Média' | 'Difícil';
    readyInMinutes?: number;
}

/**
 * Fetches exactly one meal (without Gemini translation)
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

        const difficulties: ('Fácil' | 'Média' | 'Difícil')[] = ['Fácil', 'Média', 'Difícil'];
        const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
        const randomMinutes = 15 + Math.floor(Math.random() * 45);

        return { 
            id: meal.idMeal, 
            title: meal.strMeal, 
            category: meal.strCategory, 
            instructions: meal.strInstructions, 
            ingredients: rawIngredients, 
            image: meal.strMealThumb,
            difficulty: randomDifficulty,
            readyInMinutes: randomMinutes
        };
    } catch (error) {
        console.error("TheMealDB Single Fetch Error:", error);
        throw new Error("Erro de rede ao buscar a receita. Tente novamente.");
    }
};

/**
 * Generates a mock week plan by fetching N random meals.
 */
export const generateWeeklyMeals = async (totalMeals: number = 21): Promise<TranslatedMeal[]> => {
    try {
        console.log(`Buscando ${totalMeals} receitas do TheMealDB simultaneamente...`);
        // 1. Fetch N meals from TheMealDB very fast
        const randomMealsPromises = Array.from({ length: totalMeals }).map(() => fetch(`${BASE_URL}/random.php`).then(res => res.json()));
        const responses = await Promise.all(randomMealsPromises);
        
        const rawMeals = responses.map(data => data.meals[0]);

        // 2. Prepare payload without translation
        const translatedArray: TranslatedMeal[] = rawMeals.map(meal => {
            const rawIngredients: { item: string, measure: string }[] = [];
            for (let i = 1; i <= 20; i++) {
                const ing = meal[`strIngredient${i}`];
                const meas = meal[`strMeasure${i}`];
                if (ing && ing.trim() !== '') {
                    rawIngredients.push({ item: ing.trim(), measure: meas ? meas.trim() : '' });
                }
            }
            
            const difficulties: ('Fácil' | 'Média' | 'Difícil')[] = ['Fácil', 'Média', 'Difícil'];
            const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
            const randomMinutes = 15 + Math.floor(Math.random() * 45); // 15 to 60 mins

            return {
                id: meal.idMeal,
                image: meal.strMealThumb,
                title: meal.strMeal,
                category: meal.strCategory,
                instructions: meal.strInstructions,
                ingredients: rawIngredients,
                difficulty: randomDifficulty,
                readyInMinutes: randomMinutes
            };
        });

        return translatedArray;

    } catch (error) {
        console.error("TheMealDB Fetch Error:", error);
        throw new Error("Erro ao buscar receitas. Tente novamente.");
    }
};

export const fetchAlternativeMeals = async (): Promise<TranslatedMeal[]> => {
    // Fetch 3 alternatives
    return generateWeeklyMeals(3);
};
