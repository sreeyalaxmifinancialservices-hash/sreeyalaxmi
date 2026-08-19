import mongoose, { Document, Schema, models, model } from "mongoose";

export interface IAssignedCollection extends Document {
  branchId: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;

  staffName: string;
  staffEmail: string;
  staffPhone: string;

  leaderName: string;
  leaderPhone: string;

  collectionDate: Date;
  amount: number;
  collectedAmount: number;
  rescheduleDate?: Date;

  status: "Pending" | "Complete" | "Partially Complete" | "Incomplete";
}

const AssignedCollectionSchema = new Schema<IAssignedCollection>(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },

    centerId: {
      type: Schema.Types.ObjectId,
      ref: "Center",
      required: true,
    },

    staffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    staffName: {
      type: String,
      required: true,
    },

    staffEmail: {
      type: String,
      required: true,
    },

    staffPhone: {
      type: String,
      required: true,
    },

    leaderName: {
      type: String,
      default: "",
    },

    leaderPhone: {
      type: String,
      default: "",
    },

    collectionDate: {
      type: Date,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    collectedAmount: {
      type: Number,
      default: 0,
    },

    rescheduleDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["Pending", "Complete", "Partially Complete", "Incomplete"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

export default models.AssignedCollection ||
  model<IAssignedCollection>(
    "AssignedCollection",
    AssignedCollectionSchema
  );