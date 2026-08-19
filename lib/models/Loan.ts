import mongoose, { Schema, Document } from "mongoose";

export interface ILoan {
  loanId: string;
  cycleNumber: number;
  loanType: "group" | "bank";
  member: mongoose.Types.ObjectId;
  branch: mongoose.Types.ObjectId;
  center: mongoose.Types.ObjectId;
  group: mongoose.Types.ObjectId;
  loanAmount: number;
  insuranceAmount: number;
  processingFee: number;
  loanFees: number;
  disbursementAmount: number;
  noOfWeeks: number;
  weeklyRepayment: number;
  totalRepayment: number;
  principalOutstanding: number;
  outstandingBalance: number;
  installmentsPaid: number;
  disbursementDate: Date;
  maturityDate: Date;
  disbursedBy: mongoose.Types.ObjectId;
  leader: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "disbursed" | "active" | "closed" | "preclosed" | "defaulted" | "rejected";
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  remarks?: string;
  reason?: string;
  preCloseDate?: Date;
  preCloseAmount?: number;
  closureRemark?: string;
  closedBy?: mongoose.Types.ObjectId;
  closedAt?: Date;
  bankName?: string;
  bankBranchName?: string;
  createdBy?: mongoose.Types.ObjectId;
}

const LoanSchema = new Schema<ILoan>(
  {
    loanId: { type: String, required: true, unique: true },
    cycleNumber: { type: Number, required: true, default: 1 },
    loanType: { type: String, enum: ["group", "bank"], default: "group" },
    member: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch" },
    center: { type: Schema.Types.ObjectId, ref: "Center" },
    group: { type: Schema.Types.ObjectId, ref: "Group" },
    loanAmount: { type: Number, required: true },
    insuranceAmount: { type: Number, required: true, default: 0 },
    processingFee: { type: Number, required: true, default: 0 },
    loanFees: { type: Number, required: true, default: 0 },
    disbursementAmount: { type: Number, required: true },
    noOfWeeks: { type: Number, required: true, default: 50 },
    weeklyRepayment: { type: Number, required: true },
    totalRepayment: { type: Number, required: true },
    principalOutstanding: { type: Number, required: true, default: 0 },
    outstandingBalance: { type: Number, required: true },
    installmentsPaid: { type: Number, default: 0 },
    disbursementDate: { type: Date },
    maturityDate: { type: Date },
    disbursedBy: { type: Schema.Types.ObjectId, ref: "User" },
    leader: { type: Schema.Types.ObjectId, ref: "Leader" },
    status: {
      type: String,
      enum: ["pending", "approved", "disbursed", "active", "closed", "preclosed", "defaulted", "rejected"],
      default: "pending",
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    remarks: { type: String },
    reason: { type: String },
    preCloseDate: { type: Date },
    preCloseAmount: { type: Number },
    closureRemark: { type: String },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    closedAt: { type: Date },
    bankName: { type: String },
    bankBranchName: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

delete mongoose.models.Loan;
export default mongoose.model("Loan", LoanSchema);
