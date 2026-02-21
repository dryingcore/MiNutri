import { Nutrients } from '../types';

export interface OFFProduct {
    productName: string;
    brand: string;
    image: string;
    macros: Nutrients;
}

/**
 * Fetches product nutrition data from Open Food Facts using the barcode,
 * mapping their 100g standard layout directly to our Nutrients type format.
 */
export const fetchProductByBarcode = async (barcode: string): Promise<OFFProduct> => {
    try {
        const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`OpenFoodFacts Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== 1) {
             throw new Error("Produto não encontrado na base do Open Food Facts.");
        }

        const p = data.product;
        const nut = p.nutriments || {};
        
        // OpenFoodFacts returns data usually "per 100g", we will extract the 100g as the baseline
        // If the serving size is there, we could use that, but 100g is a safer fallback.
        const macros: Nutrients = {
            calories: nut['energy-kcal_100g'] || nut['energy-kcal'] || 0,
            protein: nut['proteins_100g'] || nut['proteins'] || 0,
            carbs: nut['carbohydrates_100g'] || nut['carbohydrates'] || 0,
            fat: nut['fat_100g'] || nut['fat'] || 0,
        };

        return {
            productName: p.product_name_pt || p.product_name || 'Produto Desconhecido',
            brand: p.brands ? p.brands.split(',')[0] : 'Marca Desconhecida',
            image: p.image_front_url || p.image_url || '',
            macros
        };

    } catch (error: any) {
        console.error("Error fetching barcode:", error);
        throw new Error(error.message || "Erro ao consultar código de barras.");
    }
};
