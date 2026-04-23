import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getMediaRecommendations(watchlist: string[]) {
  try {
    const prompt = `Based on the following user's media library: [${watchlist.join(", ")}], suggest 4 new movies, series, or games. 
    Focus on items that are popular or highly rated. Provide title, type (movie/series/game), primary genre, and a 1-sentence reasoning for the recommendation.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING },
              genre: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ["title", "type", "genre", "reason"],
          },
        },
      },
    });

    if (!response.text) return [];
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error getting recommendations:", error);
    return [];
  }
}

export async function getDiscoverPicks() {
  try {
    const prompt = `Suggest 6 trending or classic movies, series, and games for a "Discover" section. 
    Mix different types and genres. Provide title, type (movie/series/game), primary genre, and a short catchy description.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING },
              genre: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["title", "type", "genre", "description"],
          },
        },
      },
    });

    if (!response.text) return [];
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error getting discover picks:", error);
    return [];
  }
}
