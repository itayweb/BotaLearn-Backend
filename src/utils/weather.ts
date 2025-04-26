import axios from "axios";

/**
 * Calculate sun hours for a plant based on its location
 * Uses SunriseSunset.io API to fetch sunrise and sunset times
 * Converts between lux and sun hours
 */
export async function calculateSunHours(lat: number, lng: number, measuredLux: number) {
    try {
        
        if (!lat || !lng) {
            throw new Error("Missing required parameters: latitude and longitude");
        }
        
        // Use the SunriseSunset.io API to get sunrise and sunset times
        const sunDataUrl = `https://api.sunrisesunset.io/json?lat=${lat}&lng=${lng}`;
        
        const response = await axios.get(sunDataUrl);
        const sunData = response.data;
        if (sunData.status !== 'OK') {
            throw new Error("Failed to fetch sun data from API");
        }
        
        // Extract the relevant data
        const { sunrise, sunset, day_length, first_light, last_light } = sunData.results;
        
        // Parse day length to calculate sun hours
        const dayLengthParts = day_length.split(':');
        const sunHours = parseFloat(dayLengthParts[0]) + parseFloat(dayLengthParts[1]) / 60 + parseFloat(dayLengthParts[2]) / 3600;
        
        // Calculate various sun exposure metrics
        const fullSunHours = Math.round(sunHours * 10) / 10; // Round to 1 decimal place
        
        // Calculate total daylight hours (from first light to last light)
        const firstLightTime = new Date(`2000-01-01 ${first_light}`);
        const lastLightTime = new Date(`2000-01-01 ${last_light}`);
        let totalLightHours = (lastLightTime.getTime() - firstLightTime.getTime()) / (1000 * 60 * 60);
        
        // Adjust if last_light is on the next day
        if (totalLightHours < 0) {
            totalLightHours += 24;
        }
        
        totalLightHours = Math.round(totalLightHours * 10) / 10; // Round to 1 decimal place
        
        // Calculate sun intensity based on geographical location
        // Latitude affects sun intensity - stronger near equator, weaker near poles
        const latitudeAbs = Math.abs(lat);
        
        // Base calculation for max sun intensity based on latitude
        // Near equator (0°): ~100,000 lux, near poles (90°): ~60,000 lux
        let maxSunIntensity = 100000 - (latitudeAbs * 450);
        
        // Adjust for altitude (simplified approximation)
        // For precise calculation, we'd need actual altitude data
        // Assuming standard altitude for now
        
        // Adjust for season (Northern/Southern hemisphere differences)
        const currentMonth = new Date().getMonth();
        const isSummer = (lat >= 0 && (currentMonth >= 4 && currentMonth <= 9)) || 
                         (lat < 0 && (currentMonth <= 2 || currentMonth >= 10));
        
        // Summer intensifies sun in respective hemisphere
        if (isSummer) {
            maxSunIntensity *= 1.1; // 10% increase in summer
        } else {
            maxSunIntensity *= 0.9; // 10% decrease in winter
        }
        
        // Apply a reasonable lower bound
        maxSunIntensity = Math.max(maxSunIntensity, 60000);
        
        // Round to nearest 1000
        maxSunIntensity = Math.round(maxSunIntensity / 1000) * 1000;
        
        // Define sun exposure levels in lux (dynamic based on location)
        const sunExposureLevels = {
            directSunlight: { 
                min: maxSunIntensity * 0.32, 
                max: maxSunIntensity, 
                avgHoursPerDay: fullSunHours * 0.7 
            },
            indirectSunlight: { 
                min: maxSunIntensity * 0.1, 
                max: maxSunIntensity * 0.32, 
                avgHoursPerDay: fullSunHours * 0.3 
            },
            brightShade: { 
                min: 1000, 
                max: maxSunIntensity * 0.1, 
                avgHoursPerDay: totalLightHours - fullSunHours 
            },
            shade: { 
                min: 100, 
                max: 1000, 
                avgHoursPerDay: 0 
            }
        };
        
        // Average lux during full sun hours (location-specific approximation)
        const avgFullSunLux = maxSunIntensity * 0.7; // Average is typically ~70% of max intensity
        const estimatedDailyLux = avgFullSunLux * sunHours;
        
        // Convert measured lux to equivalent sun hours if provided
        let luxToSunHours = null;
        let sunCategory = null;
        
        if (measuredLux) {
            // Determine which category the measured lux falls into
            if (measuredLux >= sunExposureLevels.directSunlight.min) {
                sunCategory = "Direct sunlight";
                // Convert measured lux to equivalent sun hours (proportional to direct sunlight)
                luxToSunHours = (measuredLux / avgFullSunLux) * fullSunHours;
            } else if (measuredLux >= sunExposureLevels.indirectSunlight.min) {
                sunCategory = "Indirect/filtered sunlight";
                // For indirect sunlight, it contributes less to sun hours
                luxToSunHours = (measuredLux / sunExposureLevels.indirectSunlight.max) * sunExposureLevels.indirectSunlight.avgHoursPerDay;
            } else if (measuredLux >= sunExposureLevels.brightShade.min) {
                sunCategory = "Bright shade";
                // Minimal contribution to sun hours
                luxToSunHours = (measuredLux / sunExposureLevels.brightShade.max) * sunExposureLevels.brightShade.avgHoursPerDay;
            } else {
                sunCategory = "Shade";
                luxToSunHours = 0; // No significant contribution to sun hours
            }
            
            // Round to 1 decimal place
            luxToSunHours = Math.round(luxToSunHours * 10) / 10;
        }
        // Return the sun hours and lux data
        return {
            date: sunData.results.date,
            sunrise,
            sunset,
            first_light,
            last_light,
            day_length,
            sun_hours: fullSunHours,
            total_light_hours: totalLightHours,
            timezone: sunData.results.timezone,
            // Sun exposure in lux
            sun_exposure: {
                estimated_daily_lux: Math.round(estimatedDailyLux),
                average_full_sun_lux: avgFullSunLux,
                exposure_levels: sunExposureLevels,
                measured_lux: measuredLux || null,
                measured_lux_category: sunCategory,
                measured_lux_in_sun_hours: luxToSunHours
            }
        };
        
    } catch (error: any) {
        console.error("Error calculating sun hours:", error);
        throw new Error("Failed to calculate sun hours");
    }
}

/**
 * Get temperature for a plant based on its location
 * Uses OpenWeatherMap API to fetch temperature
 */
export async function getTemperature(lat: number, lng: number) {
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`);
    console.log(response.data.main);
    return response.data.main.temp;
}

/**
 * Get humidity for a plant based on its location
 * Uses OpenWeatherMap API to fetch humidity
 */
export async function getHumidity(lat: number, lng: number) {
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`);
    return response.data.main.humidity;
}