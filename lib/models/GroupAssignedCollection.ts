import mongoose, { Schema, models, model } from "mongoose";

export interface IGroupMemberPayment {
  memberId: mongoose.Types.ObjectId;
  memberName: string;
  loanId: mongoose.Types.ObjectId;
  amountToCollect: number;
  previousRemaining: number;
  totalAmount: number;
  collectedAmount: number;
  remaining: number;
  status: "Paid" | "Partial" | "Unpaid" | "Pending Review" | "Pending";
}

export interface IGroupAssignedCollection extends Document {
  assignmentId: string;
  branchId: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  groupName: string;
  leaderId: mongoose.Types.ObjectId;
  leaderName: string;
  staffId: mongoose.Types.ObjectId;
  staffName: string;
  collectionDate: Date;
  members: IGroupMemberPayment[];
  totalCollected: number;
  totalPending: number;
  status: "Pending" | "Pending Review" | "Complete" | "Partial" | "Incomplete";
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
}

const GroupMemberPaymentSchema = new Schema<IGroupMemberPayment>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    memberName: { type: String, required: true },
    loanId: { type: Schema.Types.ObjectId, ref: "Loan" },
    amountToCollect: { type: Number, required: true },
    previousRemaining: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    collectedAmount: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Pending", "Pending Review", "Paid", "Partial", "Unpaid"],
      default: "Pending",
    },
  },
  { _id: false }
);

const GroupAssignedCollectionSchema = new Schema<IGroupAssignedCollection>(
  {
    assignmentId: { type: String, required: true, unique: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    groupName: { type: String, required: true },
    leaderId: { type: Schema.Types.ObjectId, ref: "Leader" },
    leaderName: { type: String, default: "" },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    staffName: { type: String, required: true },
    collectionDate: { type: Date, required: true },
    members: [GroupMemberPaymentSchema],
    totalCollected: { type: Number, default: 0 },
    totalPending: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Pending", "Pending Review", "Complete", "Partial", "Incomplete"],
      default: "Pending",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export default models.GroupAssignedCollection ||
  model<IGroupAssignedCollection>(
    "GroupAssignedCollection",
    GroupAssignedCollectionSchema
  );
