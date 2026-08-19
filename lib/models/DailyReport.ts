import mongoose, { Schema, Document } from "mongoose";

export interface IDailyReport extends Document {
  reportNumber: string;
  branch: mongoose.Types.ObjectId;
  reportDate: Date;
  generatedBy: mongoose.Types.ObjectId;
  totalDisbursed: number;
  totalCollected: number;
  totalOutstanding: number;
  totalMembers: number;
  activeLoans: number;
  newLoans: number;
  closedLoans: number;
  cashInHand: number;
  onlineBalance: number;
  discrepancies: string[];
  remarks?: string;
  status: "draft" | "final";
}

const DailyReportSchema = new Schema<IDailyReport>(
  {
    reportNumber: { type: String, required: true, unique: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    reportDate: { type: Date, required: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    totalDisbursed: { type: Number, default: 0 },
    totalCollected: { type: Number, default: 0 },
    totalOutstanding: { type: Number, default: 0 },
    totalMembers: { type: Number, default: 0 },
    activeLoans: { type: Number, default: 0 },
    newLoans: { type: Number, default: 0 },
    closedLoans: { type: Number, default: 0 },
    cashInHand: { type: Number, default: 0 },
    onlineBalance: { type: Number, default: 0 },
    discrepancies: [{ type: String }],
    remarks: { type: String },
    status: { type: String, enum: ["draft", "final"], default: "draft" },
  },
  { timestamps: true }
);

export default mongoose.models.DailyReport ||
  mongoose.model("DailyReport", DailyReportSchema);
