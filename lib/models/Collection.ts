import mongoose, { Schema, Document } from "mongoose";

export interface ICollection {
  collectionId: string;
  staffName: string;
  staffId?: mongoose.Types.ObjectId;
  centerId: string;
  branch: mongoose.Types.ObjectId;
  center: mongoose.Types.ObjectId;
  group?: mongoose.Types.ObjectId;
  collectionDate: Date;
  repayment: number;
  savings: number;
  collection: number;
  dueAmount: number;
  previousDue: number;
  advanceAmount: number;
  insurance: number;
  loanFees: number;
  preClose: number;
  total: number;
  centerName: string;
  leader: mongoose.Types.ObjectId;
  cashAmount: number;
  advancePayment: number;
  onlineAmount: number;
  remarks?: string;
  status: "completed" | "pending" | "reconciled";
}

const CollectionSchema = new Schema<ICollection>(
  {
    collectionId: { type: String, required: true, unique: true },
    staffName: { type: String, required: true },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff" },
    centerId: { type: String, required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    center: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    group: { type: Schema.Types.ObjectId, ref: "Group" },
    collectionDate: { type: Date, required: true },
    repayment: { type: Number, default: 0 },
    savings: { type: Number, default: 0 },
    collection: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    previousDue: { type: Number, default: 0 },
    advanceAmount: { type: Number, default: 0 },
    insurance: { type: Number, default: 0 },
    loanFees: { type: Number, default: 0 },
    preClose: { type: Number, default: 0 },
    total: { type: Number, required: true },
    centerName: { type: String, required: true },
    leader: { type: Schema.Types.ObjectId, ref: "Leader" },
    cashAmount: { type: Number, default: 0 },
    advancePayment: { type: Number, default: 0 },
    onlineAmount: { type: Number, default: 0 },
    remarks: { type: String },
    status: {
      type: String,
      enum: ["completed", "pending", "reconciled"],
      default: "completed",
    },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

delete mongoose.models.Collection;
export default mongoose.model("Collection", CollectionSchema);
