import mongoose, { Schema, Document } from "mongoose";

export interface ILeader extends Document {
  user: mongoose.Types.ObjectId;
  leaderId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  center: mongoose.Types.ObjectId;
  group?: mongoose.Types.ObjectId;
  member?: mongoose.Types.ObjectId;
  status: "active" | "inactive";
}

const LeaderSchema = new Schema<ILeader>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    leaderId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    center: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    group: { type: Schema.Types.ObjectId, ref: "Group" },
    member: { type: Schema.Types.ObjectId, ref: "Member" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

delete mongoose.models.Leader;
export default mongoose.model("Leader", LeaderSchema);
