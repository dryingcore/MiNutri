import { calculateMacros } from './src/services/gemini';

const go = async () => {
    try {
        const ingredients = [
            { id: "1", name: "Banana", amount_grams: 100 },
            { id: "2", name: "Maçã", amount_grams: 100 },
            { id: "3", name: "Mamão", amount_grams: 100 }
        ];
        console.log("Calling calculateMacros...");
        const result = await calculateMacros("Salada de Frutas", ingredients);
        console.log(JSON.stringify(result, null, 2));
    } catch(e) {
        console.error(e);
    }
}
go();
