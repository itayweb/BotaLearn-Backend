import OpenAI from "openai";

const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1";

interface PlantWeatherData {
    plantName: string;
    currentTemp: number;
    avgTemp: number;
    currentHumidity: number;
    avgHumidity: number;
    currentSunHours: number;
    avgSunHours: number;
}

interface PlantCareTips {
    temperature: {
        status: string;
        tips: string[];
        emoji: string;
    };
    humidity: {
        status: string;
        tips: string[];
        emoji: string;
    };
    sunlight: {
        status: string;
        tips: string[];
        emoji: string;
    };
}

/**
 * Generate plant care tips based on current and average weather conditions
 * @param data Plant and weather data for comparison
 * @returns Care tips and recommendations in JSON format
 */
export async function generatePlantCareTips(data: PlantWeatherData): Promise<PlantCareTips> {
    const client = new OpenAI({ baseURL: endpoint, apiKey: token });

    // Create a detailed analysis of weather conditions
    const tempDiff = data.currentTemp - data.avgTemp;
    const humidityDiff = data.currentHumidity - data.avgHumidity;
    const sunHoursDiff = data.currentSunHours - data.avgSunHours;

    // Determine condition status for better tips
    const getTempStatus = () => {
        if (Math.abs(tempDiff) < 3) return 'near optimal';
        if (tempDiff > 0) return 'too warm';
        return 'too cool';
    };

    const getHumidityStatus = () => {
        if (Math.abs(humidityDiff) < 10) return 'near optimal';
        if (humidityDiff > 0) return 'too humid';
        return 'too dry';
    };

    const getSunlightStatus = () => {
        if (Math.abs(sunHoursDiff) < 1) return 'near optimal';
        if (sunHoursDiff > 0) return 'excessive sunlight';
        return 'insufficient sunlight';
    };

    // Get default emojis based on conditions
    const getTempEmoji = () => {
        if (Math.abs(tempDiff) < 3) return '✅';
        if (tempDiff > 0) return '🔥';
        return '❄️';
    };

    const getHumidityEmoji = () => {
        if (Math.abs(humidityDiff) < 10) return '✅';
        if (humidityDiff > 0) return '💧';
        return '🏜️';
    };

    const getSunlightEmoji = () => {
        if (Math.abs(sunHoursDiff) < 1) return '✅';
        if (sunHoursDiff > 0) return '☀️';
        return '🌥️';
    };

    // Construct a prompt for the AI
    const prompt = `
I need specific care tips for a ${data.plantName} based on these weather conditions:

TEMPERATURE:
- Current: ${data.currentTemp}°C
- Optimal: ${data.avgTemp}°C
- Difference: ${tempDiff > 0 ? '+' : ''}${tempDiff}°C (${getTempStatus()})

HUMIDITY:
- Current: ${data.currentHumidity}%
- Optimal: ${data.avgHumidity}%
- Difference: ${humidityDiff > 0 ? '+' : ''}${humidityDiff}% (${getHumidityStatus()})

SUNLIGHT:
- Current: ${data.currentSunHours} hours
- Optimal: ${data.avgSunHours} hours
- Difference: ${sunHoursDiff > 0 ? '+' : ''}${sunHoursDiff} hours (${getSunlightStatus()})

Please provide care tips for today based on these conditions. Focus on what actions should be taken to compensate for any differences from optimal conditions. If sunlight is excessive, suggest ways to provide shade or reduce exposure. If temperature or humidity is not optimal, suggest appropriate interventions.

For each condition, also provide an appropriate emoji that visually represents the current status. 

For temperature:
- If too warm: Use 🔥
- If too cool: Use ❄️ 
- If near optimal: Use ✅

For humidity:
- If too humid: Use 💧
- If too dry: Use 🏜️
- If near optimal: Use ✅

For sunlight:
- If excessive: Use ☀️
- If insufficient: Use 🌥️
- If near optimal: Use ✅

Return your response in the following JSON format with 2-3 specific tips for each condition:
{
  "temperature": {
    "status": "(too warm/too cool/near optimal)",
    "tips": ["tip 1", "tip 2", "tip 3"],
    "emoji": "🔥/❄️/✅"
  },
  "humidity": {
    "status": "(too humid/too dry/near optimal)",
    "tips": ["tip 1", "tip 2", "tip 3"],
    "emoji": "💧/🏜️/✅"
  },
  "sunlight": {
    "status": "(excessive sunlight/insufficient sunlight/near optimal)",
    "tips": ["tip 1", "tip 2", "tip 3"],
    "emoji": "☀️/🌥️/✅"
  }
}`;

    try {
        const response = await client.chat.completions.create({
            messages: [
                { role: "system", content: "You are a knowledgeable botanist specializing in plant care. Provide concise, practical advice based on weather conditions. Always respond in the requested JSON format." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            top_p: 1,
            model: model,
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content || "";
        
        try {
            return JSON.parse(content) as PlantCareTips;
        } catch (parseError) {
            console.error("Error parsing AI response to JSON:", parseError);
            // Return a fallback structure if parsing fails
            return {
                temperature: {
                    status: getTempStatus(),
                    tips: ["Maintain optimal temperature conditions for your plant."],
                    emoji: getTempEmoji()
                },
                humidity: {
                    status: getHumidityStatus(),
                    tips: ["Maintain optimal humidity conditions for your plant."],
                    emoji: getHumidityEmoji()
                },
                sunlight: {
                    status: getSunlightStatus(),
                    tips: ["Maintain optimal sunlight conditions for your plant."],
                    emoji: getSunlightEmoji()
                }
            };
        }
    } catch (error) {
        console.error("Error generating plant care tips:", error);
        // Return a fallback structure if API call fails
        return {
            temperature: {
                status: getTempStatus(),
                tips: ["Error generating temperature tips. Please try again later."],
                emoji: getTempEmoji()
            },
            humidity: {
                status: getHumidityStatus(),
                tips: ["Error generating humidity tips. Please try again later."],
                emoji: getHumidityEmoji()
            },
            sunlight: {
                status: getSunlightStatus(),
                tips: ["Error generating sunlight tips. Please try again later."],
                emoji: getSunlightEmoji()
            }
        };
    }
}

/**
 * Example usage:
 * 
 * const plantData = {
 *   plantName: "Tomato Plant",
 *   currentTemp: 28,
 *   avgTemp: 24,
 *   currentHumidity: 65,
 *   avgHumidity: 70,
 *   currentSunHours: 8,
 *   avgSunHours: 6
 * };
 * 
 * const tips = await generatePlantCareTips(plantData);
 * console.log(tips);
 */