import mongoose, { Schema, Document } from "mongoose";

export interface IBranch extends Document {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  manager: string;
  status: "active" | "inactive";
}

const BranchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    manager: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.models.Branch || mongoose.model("Branch", BranchSchema);
