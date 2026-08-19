import mongoose, { Schema, Document } from "mongoose";

export interface IMember {
  firstName: string;
  lastName: string;
  guardianName: string;
  phone: string;
  email?: string;
  aadhaar: string;
  pan?: string;
  dob: Date;
  gender: "male" | "female" | "other";
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  photo?: string;
  branch: mongoose.Types.ObjectId;
  center: mongoose.Types.ObjectId;
  group: mongoose.Types.ObjectId;
  memberCode: string;
  verificationStatus: "pending" | "verified" | "rejected";
  verificationRemarks?: string;
  status: "active" | "inactive";
}

const MemberSchema = new Schema<IMember>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    guardianName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    aadhaar: { type: String, required: true, unique: true },
    pan: { type: String },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    photo: { type: String },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    center: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    memberCode: { type: String, required: true, unique: true },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    verificationRemarks: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.models.Member || mongoose.model("Member", MemberSchema);
