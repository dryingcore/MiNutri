import { MealPlanDay, ShoppingItem } from '../types';

const SPOONACULAR_API_KEY = "d967b99a944f4f4da060d7c577f900b4";
const BASE_URL = "https://api.spoonacular.com";

/**
 * Generates a weekly meal plan
 * @param targetCalories Daily calorie target
 * @param diet Optional diet type (e.g. vegetarian, paleo)
 */
export const generateMealPlan = async (targetCalories: number, diet?: string): Promise<MealPlanDay[]> => {
  try {
    let url = `${BASE_URL}/mealplanner/generate?timeFrame=week&targetCalories=${targetCalories}&apiKey=${SPOONACULAR_API_KEY}`;
    if (diet) {
      url += `&diet=${diet}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Spoonacular Error: ${response.status}`);
    }

    const data = await response.json();
    
    // Convert object { monday: {...}, tuesday: {...} } to array
    const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    const formattedPlan: MealPlanDay[] = weekDays.map((dayName, index) => {
        const dayData = data.week[dayName];
        
        // Date math to map days to upcoming week
        const d = new Date();
        d.setDate(d.getDate() + index);

        return {
            date: d.toISOString().split('T')[0],
            meals: dayData.meals,
            nutrients: dayData.nutrients
        };
    });

    return formattedPlan;
  } catch (error) {
    console.error("Error generating meal plan:", error);
    throw new Error('Falha ao gerar o plano alimentar.');
  }
};

/**
 * Creates a consolidated shopping list from a list of recipe IDs
 * @param recipeIds Array of spoonacular recipe IDs
 */
export const generateShoppingList = async (recipeIds: number[]): Promise<ShoppingItem[]> => {
  if (recipeIds.length === 0) return [];
  
  try {
    const idsString = recipeIds.join(',');
    const url = `${BASE_URL}/recipes/informationBulk?ids=${idsString}&includeNutrition=false&apiKey=${SPOONACULAR_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Spoonacular Error: ${response.status}`);
    }
    
    const recipes = await response.json();
    
    const consolidatedMap = new Map<string, ShoppingItem>();
    
    recipes.forEach((recipe: any) => {
        recipe.extendedIngredients.forEach((ing: any) => {
            const key = `${ing.nameClean || ing.name}-${ing.unit}`;
            if (consolidatedMap.has(key)) {
                const existing = consolidatedMap.get(key)!;
                existing.amount += ing.amount;
                consolidatedMap.set(key, existing);
            } else {
                consolidatedMap.set(key, {
                    id: ing.id || Math.random(),
                    name: ing.nameClean || ing.name,
                    amount: ing.amount,
                    unit: ing.unit || 'un',
                    acquired: false
                });
            }
        });
    });

    return Array.from(consolidatedMap.values());
  } catch (error) {
    console.error("Error generating shopping list:", error);
    throw new Error('Falha ao consolidar ingredientes para a lista de compras.');
  }
};
