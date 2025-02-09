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

router.post("/add", authenticateToken, async (req: Request, res: Response) => {
    // const { plantid } = req.body;
    console.log(req.query);
    const { plantid, username } = req.query;
    let { humidity, season, lightExposure, placement } = req.query;
    try {
        const defaultValues = await pool.query(
            "select * from plants where id = $1", [plantid]
        );
        if (humidity == undefined) {
            humidity = defaultValues.rows[0].default_humidity;
        }
        if (season == undefined) {
            season = defaultValues.rows[0].default_season;
        }
        if (lightExposure == undefined) {
            lightExposure = defaultValues.rows[0].default_light_exposure;
        }
        if (placement == undefined) {
            placement = defaultValues.rows[0].default_placement;
        }
        const newUserPlant = await pool.query(
            "INSERT INTO userplant (username, plantid, humidity, season, light_exposure, placement) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [username, plantid, humidity, season, lightExposure, placement]
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
            "select name, type from userplant join plants on plants.id = userplant.plantid where username = $1", [username]
        )
        if (userPlants.rowCount) {
            res.json({ data: userPlants.rows });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

export default router;