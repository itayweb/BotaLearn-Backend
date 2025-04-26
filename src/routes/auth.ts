import express, {Application, Request, Response} from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../config";
import { authenticateToken } from "../middleware/authMiddleware";
import UserModel from "../models/UserModel";
import { AuthenticatedRequest, LoginResponse, ProtectedRequest, User } from "../types";
import { FilterQuery } from "mongoose";
import { pool } from "../db";
import { randomUUID } from "crypto";

const router = express.Router();

// Register Route
router.post("/register", async (req: Request, res: Response): Promise<void> => {
    let { fullName, email, username, password } = req.body;
    username = String(username).toLowerCase();
    email = String(email).toLowerCase();
    const id = randomUUID();
    try {
        const existingUser = await pool.query(
            "select exists(select 1 from users where email = $1 or username = $2)", [email, username]
        )
        if (existingUser.rows[0].exists) {
            res.status(400).json({ message: "User already exists" });
            return;
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
        "INSERT INTO users (id, username, fullname, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [id, username, fullName, email, hashedPassword]
        );
        if (result.rowCount != null)
            res.json({ message: "User registered successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// Login Route
router.post("/login", async (req: Request, res: Response<LoginResponse>) => {
    let { email, password } = req.body;
    email = String(email).toLowerCase();
    const user = await pool.query(
        "select * from users where email = $1", [email]
    );
    if (!user.rows[0] || !(await bcrypt.compare(password, user.rows[0].password))) {
        res.status(401).json({ message: "Invalid credentials" });
    }
    else {
        const token = jwt.sign(user.rows[0], config.jwtSecret, { expiresIn: "1h" });
        res.status(200).json({ token });
    }
});

// Protected Route
router.get("/protected", authenticateToken, async (req: AuthenticatedRequest, res: Response<User>) => {
    if (req.user?.email) {
        const user = await pool.query(
            "SELECT USERS.USERNAME, FULLNAME, EMAIL, COALESCE( JSON_AGG( JSON_BUILD_OBJECT( 'plant_id', USERPLANT.PID, 'name', PLANTS.DISPLAY_PID, 'min_humidity', PLANTS.MIN_ENV_HUMID, 'max_humidity', PLANTS.MAX_ENV_HUMID, 'avg_humidity', cast((plants.max_env_humid+plants.min_env_humid)/2 as integer), 'min_light_exposure', PLANTS.MIN_LIGHT_LUX, 'max_light_exposure', PLANTS.MAX_LIGHT_LUX, 'avg_light_exposure', cast((plants.MIN_LIGHT_LUX+plants.MAX_LIGHT_LUX)/2 as integer), 'min_temp', PLANTS.min_temp, 'max_temp', PLANTS.max_temp, 'avg_temp', cast((plants.max_temp+plants.min_temp)/2 as integer), 'planting_position', userplant.planting_position, 'base_image', plants.image_url, 'reminders', COALESCE( ( SELECT JSON_AGG( JSON_BUILD_OBJECT( 'reminder_id', UPR.REMINDER_ID, 'ts', UPR.REMINDER_TS, 'is_finished', UPR.IS_FINISHED ) ) FROM botalearn.USERPLANTREMINDERS UPR WHERE UPR.PID = botalearn.USERPLANT.PID AND UPR.USER_ID = botalearn.USERPLANT.USER_ID ), '[]' ), 'actions', COALESCE( ( SELECT JSON_AGG( JSON_BUILD_OBJECT( 'action_id', UPA.ACTION_ID, 'stage', UPA.STAGE, 'is_finished', UPA.IS_FINISHED, 'start_ts', UPA.START_TS, 'end_ts', UPA.END_TS ) ) FROM botalearn.USERPLANTACTIONS UPA WHERE UPA.PID = botalearn.USERPLANT.PID AND UPA.USER_ID = botalearn.USERPLANT.USER_ID ), '[]' ) ) ) FILTER ( WHERE botalearn.USERPLANT.PID IS NOT NULL ), '[]' ) AS PLANTS FROM botalearn.USERS LEFT JOIN botalearn.USERPLANT ON botalearn.USERPLANT.USER_ID = botalearn.USERS.ID LEFT JOIN botalearn.PLANTS ON botalearn.USERPLANT.PID = botalearn.PLANTS.pid LEFT JOIN botalearn.USERPLANTREMINDERS UPR ON UPR.USER_ID = botalearn.USERS.ID LEFT JOIN botalearn.USERPLANTACTIONS UPA ON UPA.USER_ID = botalearn.USERS.ID WHERE EMAIL = $1 GROUP BY USERS.USERNAME, FULLNAME, EMAIL", [req.user.email]
        );
        if (user.rowCount) {
            res.json(user.rows[0]);
        } else {
            res.status(404);
        }
    }
});

router.get("/test", async (req: Request, res:Response): Promise<void> => {
    const existingUser = await pool.query(
        "select exists(select 1 from users where email = 'itay1@mail.com' or username = itay1)"
    )
})

// router.get("/validate", authenticateToken, (req: AuthenticatedRequest, res: Response<User>))

export default router;