import dotenv from "dotenv";
dotenv.config();

export const config = {
    port: process.env.PORT,
    jwtSecret: process.env.JWT_SECRET,
    mongoURI: process.env.MONGO_URI,
    pgUser: process.env.pgUser,
    pgHost: process.env.pgHost,
    pgDB: process.env.pgDB,
    pgPass: process.env.pgPass,
    pgPort: process.env.pgPort
};