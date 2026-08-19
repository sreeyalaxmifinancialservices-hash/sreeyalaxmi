import mongoose, { Schema, Document } from "mongoose";

export interface ICenterRequest extends Document {
  staff: mongoose.Types.ObjectId;
  requestType: "existing-center" | "new-center";
  center: mongoose.Types.ObjectId;
  branch: mongoose.Types.ObjectId;
  leaderName?: string;
  leaderPhone?: string;
  leaderEmail?: string;
  newCenterName?: string;
  newCenterCode?: string;
  newCenterMeetingDay?: string;
  newCenterMeetingTime?: string;
  newCenterLocation?: string;
  addGroup?: boolean;
  groupName?: string;
  groupCode?: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  remarks?: string;
}

const CenterRequestSchema = new Schema<ICenterRequest>(
  {
    staff: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    requestType: {
      type: String,
      enum: ["existing-center", "new-center"],
      required: true,
    },
    center: { type: Schema.Types.ObjectId, ref: "Center" },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    leaderName: { type: String },
    leaderPhone: { type: String },
    leaderEmail: { type: String },
    newCenterName: { type: String },
    newCenterCode: { type: String },
    newCenterMeetingDay: { type: String },
    newCenterMeetingTime: { type: String },
    newCenterLocation: { type: String },
    addGroup: { type: Boolean, default: false },
    groupName: { type: String },
    groupCode: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    remarks: { type: String },
  },
  { timestamps: true }
);

delete mongoose.models.CenterRequest;
export default mongoose.model("CenterRequest", CenterRequestSchema);
