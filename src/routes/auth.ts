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
// import { User } from "../types";

const router = express.Router();

// Register Route
router.post("/register", async (req: Request, res: Response): Promise<void> => {
    const { fullName, email, username, password } = req.body;
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
        res.json({ message: "User registered successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// Login Route
router.post("/login", async (req: Request, res: Response<LoginResponse>) => {
    const { email, password } = req.body;
    const user = await pool.query(
        "select * from users where email = $1", [email]
    );
    if (!user.rows[0] || !(await bcrypt.compare(password, user.rows[0].password))) {
        res.status(401).json({ message: "Invalid credentials" });
    }
    else {
        const token = jwt.sign({ email: user.rows[0].email }, config.jwtSecret, { expiresIn: "1h" });
        res.status(200).json({ token });
    }
});

// Protected Route
router.get("/protected", authenticateToken, async (req: AuthenticatedRequest, res: Response<User>) => {
    if (req.user?.email) {
        const user = await pool.query(
            "select users.username, fullname, email, coalesce(json_agg(json_build_object( 'plantid', userplant.plantid, 'name', plants.name, 'type', plants.type, 'humidity', userplant.humidity, 'season', userplant.season, 'lightExposure', userplant.light_exposure, 'placement', userplant.placement, 'reminders', coalesce((select json_agg(json_build_object( 'reminderid', upr.reminderid, 'date', upr.reminderdate, 'isFinished', upr.is_finished )) from userplantreminders upr where upr.plantid = userplant.plantid and upr.username = userplant.username), '[]'), 'actions', coalesce((select json_agg(json_build_object( 'actionid', upa.actionid, 'stage', upa.stage, 'isFinished', upa.is_finished, 'startTS', upa.startts, 'endts', upa.endts )) from userplantactions upa where upa.plantid = userplant.plantid and upa.username = userplant.username), '[]') )) filter(where userplant.plantid is not null), '[]') as plants from users left join userplant on userplant.username = users.username left join plants on userplant.plantid = plants.id left join userplantreminders upr on upr.username = users.username left join userplantactions upa on upa.username = users.username where email = $1 group by users.username, fullname, email", [req.user.email]
        );
        if (user.rowCount) {
            res.json(user.rows[0]);
        } else {
            res.status(404);
        }
    }
});

export default router;