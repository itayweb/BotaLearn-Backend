import mongoose, { Schema, Document } from "mongoose";

export interface IPlant extends Document {
    name: string;
    type: string;
    currentStage: string;
    currentReminder: string;
    availableStages: string[];
    season: string;
    humidity: number;
    lightExposure: number;
    place: string;
}

const PlantSchema = new Schema<IPlant>({
    name: {type: String, required: true, unique: true},
    type: { type: String, required: true },
    currentStage: {type: String, required: true},
    currentReminder: {type: String, required: false},
    availableStages: [{ type: String, required: true }],
    season: {type: String, required: false},
    humidity: { type: Number, required: false },
    lightExposure: { type: Number, required: false },
    place: { type: String, required: false },
});

export default mongoose.model<IPlant>("Plant", PlantSchema);
