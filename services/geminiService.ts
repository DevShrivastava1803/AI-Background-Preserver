
import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const processImageWithGemini = async (
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    // Find the image part in the response
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePart && imagePart.inlineData) {
      return imagePart.inlineData.data;
    } else {
      // Check for safety ratings or other reasons for no image output
      const safetyReason = response.candidates?.[0]?.finishReason;
      if (safetyReason && safetyReason !== 'STOP') {
        throw new Error(`Image generation failed due to safety reasons: ${safetyReason}`);
      }
      throw new Error("No image data found in the Gemini API response.");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if(error instanceof Error && error.message.includes('API_KEY')) {
         throw new Error('Failed to process image. Please ensure your API key is valid.');
    }
    throw new Error("Failed to process image with the AI model.");
  }
};
