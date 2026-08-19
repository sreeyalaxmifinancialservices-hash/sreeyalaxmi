import mongoose, { Schema, Document } from "mongoose";

export interface IRepayment {
  repaymentId: string;
  loan: mongoose.Types.ObjectId;
  member: mongoose.Types.ObjectId;
  branch: mongoose.Types.ObjectId;
  center: mongoose.Types.ObjectId;
  principal: number;
  loanOutstanding: number;
  insuranceAmount: number;
  sd: number;
  sbSavings: number;
  collectionAmount: number;
  dueAmount: number;
  previousDue: number;
  advanceAmount: number;
  loanFees: number;
  preClose: number;
  total: number;
  installmentNumber: number;
  noOfWeeksPaid: number;
  paymentMethod: "cash" | "online" | "cheque";
  paidBy: mongoose.Types.ObjectId;
  collectedBy: mongoose.Types.ObjectId;
  paymentDate: Date;
  weekNumber: number;
  remarks?: string;
  status: "completed" | "pending" | "failed" | "missed";
}

const RepaymentSchema = new Schema<IRepayment>(
  {
    repaymentId: { type: String, required: true, unique: true },
    loan: { type: Schema.Types.ObjectId, ref: "Loan", required: true },
    member: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    center: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    principal: { type: Number, required: true },
    loanOutstanding: { type: Number, required: true },
    insuranceAmount: { type: Number, default: 0 },
    sd: { type: Number, default: 0 },
    sbSavings: { type: Number, default: 0 },
    collectionAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    previousDue: { type: Number, default: 0 },
    advanceAmount: { type: Number, default: 0 },
    loanFees: { type: Number, default: 0 },
    preClose: { type: Number, default: 0 },
    total: { type: Number, required: true },
    installmentNumber: { type: Number, required: true },
    noOfWeeksPaid: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "online", "cheque"],
      default: "cash",
    },
    paidBy: { type: Schema.Types.ObjectId, ref: "User" },
    collectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    paymentDate: { type: Date, required: true },
    weekNumber: { type: Number, required: true },
    remarks: { type: String },
    status: {
      type: String,
      enum: ["completed", "pending", "failed", "missed"],
      default: "completed",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Repayment ||
  mongoose.model("Repayment", RepaymentSchema);
