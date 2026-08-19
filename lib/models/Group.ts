import mongoose, { Schema, Document } from "mongoose";

export interface IGroup extends Document {
  name: string;
  code: string;
  center: mongoose.Types.ObjectId;
  branch: mongoose.Types.ObjectId;
  leader: mongoose.Types.ObjectId;
  memberCount: number;
  status: "active" | "inactive";
}

const GroupSchema = new Schema<IGroup>(
  {
    
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    center: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    leader: { type: Schema.Types.ObjectId, ref: "Leader" },
    memberCount: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.models.Group || mongoose.model("Group", GroupSchema);
