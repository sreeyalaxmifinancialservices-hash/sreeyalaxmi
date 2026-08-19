import mongoose, { Schema, Document } from "mongoose";

export interface IStaff extends Document {
  user: mongoose.Types.ObjectId;
  employeeId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  photo?: string;
  branches: mongoose.Types.ObjectId[];
  assignedCenters: mongoose.Types.ObjectId[];
  assignedGroups: mongoose.Types.ObjectId[];
  designation: string;
  status: "active" | "inactive";
}

const StaffSchema = new Schema<IStaff>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    employeeId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    photo: { type: String },
    branches: [{ type: Schema.Types.ObjectId, ref: "Branch" }],
    assignedCenters: [{ type: Schema.Types.ObjectId, ref: "Center" }],
    assignedGroups: [{ type: Schema.Types.ObjectId, ref: "Group" }],
    designation: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

delete mongoose.models.Staff;
export default mongoose.model("Staff", StaffSchema);
