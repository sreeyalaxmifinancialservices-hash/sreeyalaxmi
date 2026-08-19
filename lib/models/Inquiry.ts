import mongoose, { Schema, Document } from "mongoose";

export interface IInquiry extends Document {
  inquiryNumber: string;
  member?: mongoose.Types.ObjectId;
  branch?: mongoose.Types.ObjectId;
  type: "kyc" | "address_verification" | "document_verification" | "field_visit" | "member_edit" | "leader_edit" | "center_edit" | "member_add" | "member_delete" | "group_add" | "group_edit" | "group_delete" | "leader_add" | "leader_delete";
  status: "pending" | "in_progress" | "completed" | "rejected";
  assignedTo?: mongoose.Types.ObjectId;
  remarks?: string;
  documents: {
    name: string;
    url: string;
    verified: boolean;
  }[];
  editRequest?: {
    entityType: "member" | "leader" | "center";
    entityId: mongoose.Types.ObjectId;
    entityName: string;
    oldValues: Record<string, any>;
    newValues: Record<string, any>;
  };
  memberRequest?: {
    action: "add" | "delete";
    memberData?: Record<string, any>;
    memberId?: mongoose.Types.ObjectId;
    memberName?: string;
  };
  groupRequest?: {
    action: "add" | "edit" | "delete";
    groupData?: Record<string, any>;
    groupId?: mongoose.Types.ObjectId;
    groupName?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
  };
  leaderRequest?: {
    action: "add" | "edit" | "delete";
    leaderData?: Record<string, any>;
    leaderId?: mongoose.Types.ObjectId;
    leaderName?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
  };
  submittedBy?: mongoose.Types.ObjectId;
  history: {
    action: string;
    performedBy?: mongoose.Types.ObjectId;
    date: Date;
    remarks?: string;
  }[];
}

const InquirySchema = new Schema<IInquiry>(
  {
    inquiryNumber: { type: String, required: true, unique: true },
    member: { type: Schema.Types.ObjectId, ref: "Member" },
    branch: { type: Schema.Types.ObjectId, ref: "Branch" },
    type: {
      type: String,
      enum: ["kyc", "address_verification", "document_verification", "field_visit", "member_edit", "leader_edit", "center_edit", "member_add", "member_delete", "group_add", "group_edit", "group_delete", "leader_add", "leader_delete"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "rejected"],
      default: "pending",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    remarks: { type: String },
    documents: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        verified: { type: Boolean, default: false },
      },
    ],
    editRequest: {
      entityType: { type: String, enum: ["member", "leader", "center"] },
      entityId: { type: Schema.Types.ObjectId },
      entityName: { type: String },
      oldValues: { type: Schema.Types.Mixed },
      newValues: { type: Schema.Types.Mixed },
    },
    memberRequest: {
      action: { type: String, enum: ["add", "delete"] },
      memberData: { type: Schema.Types.Mixed },
      memberId: { type: Schema.Types.ObjectId, ref: "Member" },
      memberName: { type: String },
    },
    groupRequest: {
      action: { type: String, enum: ["add", "edit", "delete"] },
      groupData: { type: Schema.Types.Mixed },
      groupId: { type: Schema.Types.ObjectId, ref: "Group" },
      groupName: { type: String },
      oldValues: { type: Schema.Types.Mixed },
      newValues: { type: Schema.Types.Mixed },
    },
    leaderRequest: {
      action: { type: String, enum: ["add", "edit", "delete"] },
      leaderData: { type: Schema.Types.Mixed },
      leaderId: { type: Schema.Types.ObjectId, ref: "Leader" },
      leaderName: { type: String },
      oldValues: { type: Schema.Types.Mixed },
      newValues: { type: Schema.Types.Mixed },
    },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
    history: [
      {
        action: { type: String, required: true },
        performedBy: { type: Schema.Types.ObjectId, ref: "User" },
        date: { type: Date, default: Date.now },
        remarks: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Inquiry || mongoose.model("Inquiry", InquirySchema);
