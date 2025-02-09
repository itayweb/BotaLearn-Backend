import express, { Application } from "express";
import cors from "cors";
import { config } from "./config";
import authRoutes from "./routes/auth";
import connectDB from "./db";
import plantsRoutes from './routes/plants';

const app: Application = express();
app.use(cors({
    origin: "http://localhost:8081", // Specify the exact origin of your React Native app
    credentials: true,  // Allow cookies & authentication headers
    methods: "GET,POST,PUT,DELETE", // Allowed methods
    allowedHeaders: "Content-Type,Authorization" // Allowed headers
}));
app.use(express.json());

connectDB();

app.use("/api/auth", authRoutes);

app.use('/api/plants', plantsRoutes);

app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
});
