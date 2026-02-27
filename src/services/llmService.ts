import { GoogleGenAI, Type } from "@google/genai";
import { TournamentSchedule, Sport, Category, Gender } from '../types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function extractTournamentSchedule(rawText: string): Promise<TournamentSchedule | null> {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set.");
    return null;
  }

  const prompt = `Extract the tournament schedule from the following text, adhering strictly to the provided JSON schema. Ensure all dates are in YYYY-MM-DD format and times are in HH:MM format. If a date is given as a day of the week (e.g., "Miércoles 11 marzo"), assume the year is 2026. If "Por confirmar" is present for a team, omit it from the list. If a sport is "FÚTBOL 7", map it to "Fútbol 7".

Text: """
${rawText}
"""
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tournamentGroups: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sport: { type: Type.STRING, enum: Object.values(Sport) },
                  gender: { type: Type.STRING, enum: Object.values(Gender) },
                  category: { type: Type.STRING, enum: Object.values(Category) },
                  teams: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        school: { type: Type.STRING },
                        cant: { type: Type.NUMBER },
                      },
                      required: ["name", "school", "cant"],
                    },
                  },
                  grouping: { type: Type.STRING },
                  matchesPerGroup: { type: Type.NUMBER },
                  interGroupMatches: { type: Type.NUMBER },
                  locations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  dates: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        date: { type: Type.STRING, format: "date" },
                        startTime: { type: Type.STRING, format: "time" },
                        endTime: { type: Type.STRING, format: "time" },
                      },
                      required: ["date", "startTime", "endTime"],
                    },
                  },
                  durationPerMatch: { type: Type.STRING },
                  restTime: { type: Type.STRING },
                  setsToWin: { type: Type.NUMBER },
                  pointsPerSet: { type: Type.NUMBER },
                  tieBreakPoints: { type: Type.NUMBER },
                },
                required: ["sport", "gender", "category", "teams", "grouping", "matchesPerGroup", "locations", "dates"],
              },
            },
          },
          required: ["tournamentGroups"],
        },
      },
    });

    const text = response.text;
    if (text) {
      try {
        const parsed = JSON.parse(text);
        return parsed as TournamentSchedule;
      } catch (parseError) {
        console.error("Error parsing LLM response:", parseError);
        console.error("Raw LLM response:", text);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return null;
  }
}
