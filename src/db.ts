import mongoose from "mongoose";
import { config } from "./config";
import { Pool } from "pg";

const connectDB = async () => {
    // try {
    //     await mongoose.connect(config.mongoURI, {
    //     useNewUrlParser: true,
    //     useUnifiedTopology: true,
    //     } as mongoose.ConnectOptions);
    //     console.log("MongoDB Connected ✅");
    // } catch (error) {
    //     console.error("MongoDB Connection Error ❌", error);
    //     process.exit(1); // Exit the process on failure
    // }
};

export const pool = new Pool({
    user: config.pgUser,
    host: config.pgHost,
    database: config.pgDB,
    password: config.pgPass,
    port: Number(config.pgPort)
});

export default connectDB;
