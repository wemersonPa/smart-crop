import { GoogleGenAI, Type } from "@google/genai";
import { GarmentDetails } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const detectGarment = async (base64Image: string): Promise<GarmentDetails> => {
  
  const base64Data = base64Image.split(',')[1]; 
  const model = "gemini-2.5-flash";

  const prompt = `
    Analyze this image of a model. 
    1. Identify the bounding box for the entire main upper-body garment.
    2. **Crucial**: Identify a specific 'texture_roi' (Region of Interest). This must be a SQUARE box located on the flattest/most linear part of the garment (typically the center chest area). This area should represent the fabric's pattern and color best, avoiding deep folds, shadows, or logos if possible.
    3. Identify the dominant fabric texture (max 3 words).
    4. Identify the dominant color.

    Return all coordinates normalized to 0-1000 scale.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            box: {
              type: Type.OBJECT,
              properties: {
                ymin: { type: Type.NUMBER },
                xmin: { type: Type.NUMBER },
                ymax: { type: Type.NUMBER },
                xmax: { type: Type.NUMBER },
              },
              required: ["ymin", "xmin", "ymax", "xmax"]
            },
            textureBox: {
              type: Type.OBJECT,
              description: "The square texture patch on the chest",
              properties: {
                ymin: { type: Type.NUMBER },
                xmin: { type: Type.NUMBER },
                ymax: { type: Type.NUMBER },
                xmax: { type: Type.NUMBER },
              },
              required: ["ymin", "xmin", "ymax", "xmax"]
            },
            texture: { type: Type.STRING },
            color: { type: Type.STRING }
          },
          required: ["box", "textureBox", "texture", "color"],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned from Gemini");

    const result = JSON.parse(jsonText);
    return result as GarmentDetails;

  } catch (error) {
    console.error("Gemini Detection Error:", error);
    throw new Error("Failed to detect garment details. Please try a clearer image.");
  }
};
