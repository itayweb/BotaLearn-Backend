import express, {Application, Request, Response} from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../config";
import { authenticateToken } from "../middleware/authMiddleware";
import User from "../models/User";
import { AuthenticatedRequest, LoginResponse, ProtectedRequest } from "../types";

const router = express.Router();

// Register Route
router.post("/register", async (req: Request, res: Response): Promise<void> => {
    const { fullName, email, username, password } = req.body;
    console.log(req.body)
    const existingUser = await User.exists({
    $or: [{ email: email }, { username: username }]
    });
    console.log(existingUser);
    if (existingUser) {
        res.status(400).json({ message: "User already exists" });
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ fullName, email, username, password: hashedPassword });
    await newUser.save();
    res.json({ message: "User registered successfully" });
});

// Login Route
router.post("/login", async (req: Request, res: Response<LoginResponse>) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    console.log("user found: " + user)
    if (!user || !(await bcrypt.compare(password, user.password))) {
        res.status(401).json({ message: "Invalid credentials" });
    }
    else {
        const token = jwt.sign({ email: user.email }, config.jwtSecret, { expiresIn: "1h" });
        res.status(200).json({ token });
    }
});

// Protected Route
router.get("/protected", authenticateToken, (req: AuthenticatedRequest, res: Response<ProtectedRequest>) => {
    console.log("arrived");
    res.json(req.user);
});

export default router;