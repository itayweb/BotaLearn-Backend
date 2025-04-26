import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { User } from "../types";

export interface AuthRequest extends Request {
    user?: User;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.header("Authorization");
    if (!token) res.status(403).json({ message: "Access denied" });
    else
        jwt.verify(token, config.jwtSecret, (err, user) => {
            if (err) res.status(403).json({ message: "Invalid token" });
            else {
                req.user = user as User;
                next();
            }
        });
};
