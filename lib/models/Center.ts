import mongoose, { Schema, Document } from "mongoose";

export interface ICenter extends Document {
  name: string;
  code: string;
  branch: mongoose.Types.ObjectId;
  meetingDay: string;
  meetingTime: string;
  location: string;
  staff: mongoose.Types.ObjectId;
  leader: mongoose.Types.ObjectId;
  status: "active" | "inactive";
}

const CenterSchema = new Schema<ICenter>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    meetingDay: { type: String, required: true },
    meetingTime: { type: String, required: true },
    location: { type: String, required: true },
    staff: { type: Schema.Types.ObjectId, ref: "Staff" },
    leader: { type: Schema.Types.ObjectId, ref: "Leader" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.models.Center || mongoose.model("Center", CenterSchema);
