import express from "express";
import cors from "cors";
import { config } from "./config";
import authRoutes from "./routes/auth";
import connectDB from "./db";

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.use("/api/auth", authRoutes);

app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
});
