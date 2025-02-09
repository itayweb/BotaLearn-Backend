import mongoose, { Schema, Document } from "mongoose";
import { IPlant } from "./PlantsModel";

export interface IUser extends Document {
    fullName: string;
    email: string;
    username: string;
    password: string;
    plants: IPlant[];
}

const UserSchema = new Schema<IUser>({
    fullName: {type: String, required: true},
    email: { type: String, required: true, unique: true },
    username: {type: String, required: true, unique: true},
    password: { type: String, required: true },
});

export default mongoose.model<IUser>("User", UserSchema);
