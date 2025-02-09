import dotenv from "dotenv";
dotenv.config();

export const config = {
    port: process.env.PORT || 5000,
    jwtSecret: process.env.JWT_SECRET || "default_secret",
    mongoURI: process.env.MONGO_URI || "mongodb://localhost:27017/auth_db",
    pgUser: process.env.pgUser || 'postgres',
    pgHost: process.env.pgHost || 'localhost',
    pgDB: process.env.pgDB || 'BotaLearn',
    pgPass: process.env.pgPass || 'admin',
    pgPort: process.env.pgPort || 5432
};