import express, {Application, Request, Response} from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../config";
import { authenticateToken } from "../middleware/authMiddleware";
import UserModel from "../models/UserModel";
import { AuthenticatedRequest, LoginResponse, ProtectedRequest, User } from "../types";
import { FilterQuery } from "mongoose";
import PlantsModel from "../models/PlantsModel";
import { pool } from "../db";
import { randomUUID } from "crypto";
// import { User } from "../types";

const router = express.Router();

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

router.post("/addPlant", authenticateToken, async (req: Request, res: Response) => {
    // const { plantid } = req.body;
    const { plantid, username, humidity, season, light_exposure, placement } = req.body;
    try {
        const newUserPlant = await pool.query(
            "INSERT INTO userplant (username, plantid, humidity, season, light_exposure, placement) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [username, plantid, humidity, season, light_exposure, placement]
        )
        res.json({ message: "Plant linked to user successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

router.get("/getUserPlants", authenticateToken, async (req: Request, res: Response) => {
    const { username } = req.query;
    try {
        const userPlants = await pool.query(
            "SELECT COALESCE( JSON_AGG( JSON_BUILD_OBJECT( 'plantid', USERPLANT.PLANTID, 'name', PLANTS.NAME, 'type', PLANTS.TYPE, 'humidity', USERPLANT.HUMIDITY, 'season', USERPLANT.SEASON, 'lightExposure', USERPLANT.LIGHT_EXPOSURE, 'placement', USERPLANT.PLACEMENT, 'reminders', COALESCE( ( SELECT JSON_AGG( JSON_BUILD_OBJECT( 'reminderid', UPR.REMINDERID, 'date', UPR.REMINDERDATE, 'isFinished', UPR.IS_FINISHED ) ) FROM USERPLANTREMINDERS UPR WHERE UPR.PLANTID = USERPLANT.PLANTID AND UPR.USERNAME = USERPLANT.USERNAME ), '[]' ), 'actions', COALESCE( ( SELECT JSON_AGG( JSON_BUILD_OBJECT( 'actionid', UPA.ACTIONID, 'stage', UPA.STAGE, 'isFinished', UPA.IS_FINISHED, 'startTS', UPA.STARTTS, 'endts', UPA.ENDTS ) ) FROM USERPLANTACTIONS UPA WHERE UPA.PLANTID = USERPLANT.PLANTID AND UPA.USERNAME = USERPLANT.USERNAME ), '[]' ) ) ) FILTER ( WHERE USERPLANT.PLANTID IS NOT NULL ), '[]' ) AS PLANTS FROM USERS LEFT JOIN USERPLANT ON USERPLANT.USERNAME = USERS.USERNAME LEFT JOIN PLANTS ON USERPLANT.PLANTID = PLANTS.ID LEFT JOIN USERPLANTREMINDERS UPR ON UPR.USERNAME = USERS.USERNAME LEFT JOIN USERPLANTACTIONS UPA ON UPA.USERNAME = USERS.USERNAME WHERE userplant.username = $1", [username]
        )
        if (userPlants.rowCount) {
            res.json({ data: userPlants.rows });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

router.get("/getAvailablePlants", authenticateToken, async (req: Request, res: Response) => {
    const { username } = req.query;
    try {
        const plantsNotLinked = await pool.query(
            "select plants.* from plants where id not in (select plantid from userplant where username=$1)", [username]
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
})

export default router;