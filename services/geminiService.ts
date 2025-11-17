import { GoogleGenAI } from "@google/genai";
import { OrderItem } from '../types';

let ai: GoogleGenAI | null = null;

// Lazy initialization of the AI client
function getAI() {
    if (!ai) {
        if (!process.env.API_KEY) {
            console.error("API_KEY environment variable not set.");
            throw new Error("API key not configured.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

export async function getUpsellSuggestion(orderItems: OrderItem[]): Promise<string> {
    if (orderItems.length === 0) {
        return Promise.reject(new Error('Cannot get suggestion for an empty order.'));
    }

    const ai = getAI();

    const orderDescription = orderItems
        .map(item => {
            let desc = `${item.quantity}x ${item.name}`;
            if (item.variant) {
                desc += ` (${item.variant.name})`;
            }
            return desc;
        })
        .join(', ');

    const prompt = `You are a helpful restaurant assistant. Based on the current order (${orderDescription}), suggest one item to upsell or a complementary pairing. Make the suggestion sound appealing and natural, as if a server were speaking to a customer. Keep it to one or two short sentences. For example: "Since you're enjoying the spicy pasta, you might love our refreshing homemade lemonade to go with it." or "The chocolate lava cake would be a perfect way to finish your meal."`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        const text = response.text;
        if (!text) {
          throw new Error("Received an empty response from the AI.");
        }
        return text;
    } catch (error) {
        console.error('Gemini API call failed:', error);
        throw new Error('Failed to get a suggestion from the AI.');
    }
}