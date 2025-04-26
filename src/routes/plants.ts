import express, {Request, Response} from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { AuthenticatedRequest } from "../types";
import { pool } from "../db";
import { randomUUID } from "crypto";
import axios from "axios";
import { calculateSunHours, getHumidity, getTemperature } from "../utils/weather";
import { generatePlantCareTips } from "../utils/ai";

export const router = express.Router();

router.post("/create", async (req: Request, res: Response) => {
    const { defaultHumidity, defaultLightExposure, name, type, defaultSeason, defaultPlacement } = req.body;

    // const newPlant = new PlantsModel({ name, type, currentStage, currentReminder, availableStages, season, humidity, lightExposure, place });
    // newPlant.save();
    const id = randomUUID();
    try {
        const newPlant = await pool.query(
            "INSERT INTO plants (id, default_humidity, default_light_exposure, name, type, default_season, default_placement) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [id, defaultHumidity, defaultLightExposure, name, type, defaultSeason, defaultPlacement]
        )
        res.json({ message: "Plant created successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

router.post("/addPlant", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user_id = req.user?.id;
    const { plant_id, planting_position } = req.body;
    console.log(req);
    try {
        const newUserPlant = await pool.query(
            "INSERT INTO userplant (user_id, pid, planting_position) VALUES ($1, $2, $3) RETURNING *",
            [user_id, plant_id, `Point (${planting_position.lat} ${planting_position.lng})`]
        )
        if (newUserPlant.rowCount != null){
            res.json({ message: "Plant linked to user successfully!" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

router.get("/getUserPlants", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user_id = req.user?.id;
    try {
        const userPlants = await pool.query(
            "SELECT COALESCE( JSON_AGG( JSON_BUILD_OBJECT( 'plant_id', USERPLANT.pid, 'name', PLANTS.display_pid, 'min_humidity', PLANTS.MIN_ENV_HUMID, 'max_humidity', PLANTS.MAX_ENV_HUMID, 'avg_humidity', cast((plants.max_env_humid+plants.min_env_humid)/2 as integer), 'min_light_exposure', PLANTS.MIN_LIGHT_LUX, 'max_light_exposure', PLANTS.MAX_LIGHT_LUX, 'avg_light_exposure', cast((plants.MIN_LIGHT_LUX+plants.MAX_LIGHT_LUX)/2 as integer), 'min_temp', PLANTS.min_temp, 'max_temp', PLANTS.max_temp, 'avg_temp', cast((plants.max_temp+plants.min_temp)/2 as integer), 'planting_position', userplant.planting_position, 'base_image', plants.image_url, 'reminders', COALESCE( ( SELECT JSON_AGG( JSON_BUILD_OBJECT( 'reminder_id', UPR.REMINDER_ID, 'ts', UPR.REMINDER_ts, 'is_finished', UPR.IS_FINISHED ) ) FROM botalearn.USERPLANTREMINDERS UPR WHERE UPR.pid = USERPLANT.pid AND UPR.user_id = USERPLANT.user_id ), '[]' ), 'actions', COALESCE( ( SELECT JSON_AGG( JSON_BUILD_OBJECT( 'action_id', UPA.ACTION_ID, 'stage', UPA.STAGE, 'is_finished', UPA.IS_FINISHED, 'start_ts', UPA.START_TS, 'end_ts', UPA.END_TS ) ) FROM botalearn.USERPLANTACTIONS UPA WHERE UPA.pid = USERPLANT.pid AND UPA.user_id = USERPLANT.user_id ), '[]' ) ) ) FILTER ( WHERE USERPLANT.pid IS NOT NULL ), '[]' ) AS PLANTS FROM botalearn.USERS LEFT JOIN botalearn.USERPLANT ON USERPLANT.user_id = USERS.id LEFT JOIN botalearn.PLANTS ON USERPLANT.pid = PLANTS.pid LEFT JOIN botalearn.USERPLANTREMINDERS UPR ON UPR.user_id = USERS.id LEFT JOIN botalearn.USERPLANTACTIONS UPA ON UPA.user_id = USERS.id WHERE USERPLANT.user_id = $1", [user_id]
        )
        if (userPlants.rowCount) {
            res.json({ data: userPlants.rows });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

router.get("/getAvailablePlants", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user_id = req.user?.id;
    try {
        const plantsNotLinked = await pool.query(
            "SELECT PLANTS.PID AS PID, PLANTS.DISPLAY_PID AS NAME, PLANTS.MIN_ENV_HUMID AS MIN_HUMIDITY, PLANTS.MAX_ENV_HUMID AS MAX_HUMIDITY, PLANTS.MIN_LIGHT_LUX AS MIN_LIGHT_EXPOSURE, PLANTS.MAX_LIGHT_LUX AS MAX_LIGHT_EXPOSURE, PLANTS.MIN_TEMP AS MIN_TEMP, PLANTS.MAX_TEMP AS MAX_TEMP, plants.image_url as image FROM BOTALEARN.PLANTS WHERE PID NOT IN ( SELECT PID FROM BOTALEARN.USERPLANT WHERE USER_ID = $1 )", [user_id]
        )
        if (plantsNotLinked.rowCount) {
            res.json(plantsNotLinked.rows);
        } else {
            res.json([])
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

router.post("/getLatestWeather", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const plant = req.body.plant;
    const { lat, lng, measuredLux } = req.body.params;
    const sunHours = await calculateSunHours(lat, lng, measuredLux);
    const temperature = await getTemperature(lat, lng);
    const humidity = await getHumidity(lat, lng);
    const weatherData = {
        sunHours,
        temperature,
        humidity
    }
    res.json({ weatherData });
});

router.post("/generatePlantCareTips", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { plantName, currentTemp, avgTemp, currentHumidity, avgHumidity, currentSunHours, avgSunHours } = req.body;
    const tips = await generatePlantCareTips({ plantName, currentTemp, avgTemp, currentHumidity, avgHumidity, currentSunHours, avgSunHours });
    res.json({ tips });
});

export default router;