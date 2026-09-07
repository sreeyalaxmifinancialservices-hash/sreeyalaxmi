import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const branchSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  code: z.string().min(1, "Branch code is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  email: z.string().email("Invalid email"),
  manager: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const centerSchema = z.object({
  name: z.string().min(1, "Center name is required"),
  code: z.string().min(1, "Center code is required"),
  branch: z.string().min(1, "Branch is required"),
  meetingDay: z.string().min(1, "Meeting day is required"),
  meetingTime: z.string().min(1, "Meeting time is required"),
  location: z.string().min(1, "Location is required"),
  staff: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  leader: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const groupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  code: z.string().min(1, "Group code is required"),
  center: z.string().min(1, "Center is required"),
  branch: z.string().min(1, "Branch is required"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const memberSchema = z.object({
  memberCode: z.string().min(1, "Member ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  guardianName: z.string().min(1, "Husband/Guardian name is required"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  aadhaar: z.string().length(12, "Aadhaar must be 12 digits"),
  pan: z.string().length(10, "PAN must be 10 characters").optional().or(z.literal("")),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  address: z.object({
    street: z.string().min(1, "Street is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    pincode: z.string().min(6, "Pincode must be 6 digits"),
  }),
  branch: z.string().min(1, "Branch is required"),
  center: z.string().min(1, "Center is required"),
  group: z.string().min(1, "Group is required"),
  photo: z.string().optional(),
});

export const staffSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  email: z.string().email("Invalid email"),
  branches: z.array(z.string()).min(1, "At least one branch is required"),
  designation: z.string().min(1, "Designation is required"),
  assignedCenters: z.array(z.string()).optional(),
  assignedGroups: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const leaderSchema = z.object({
  leaderId: z.string().min(1, "Leader ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  email: z.string().email("Invalid email"),
  center: z.string().min(1, "Center is required"),
  group: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const loanSchema = z.object({
  loanType: z.enum(["group", "bank"]).default("group"),
  member: z.string().min(1, "Member is required"),
  branch: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  center: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  group: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  loanAmount: z.number().min(1, "Loan amount is required"),
  insuranceAmount: z.number().min(0).default(0),
  processingFee: z.number().min(0).default(0),
  loanFees: z.number().min(0).default(0),
  noOfWeeks: z.number().min(1, "Number of weeks is required").default(50),
  cycleNumber: z.number().min(1).default(1),
  leader: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  reason: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  remarks: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  bankName: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  bankBranchName: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
}).refine(
  (data) => {
    if (data.loanType === "group") {
      return !!data.branch && !!data.center && !!data.group;
    }
    return true;
  },
  { message: "Branch, Center, and Group are required for Group Loan" }
).refine(
  (data) => {
    if (data.loanType === "bank") {
      return !!data.bankName && !!data.bankBranchName;
    }
    return true;
  },
  { message: "Bank Name and Branch Name are required for Bank Loan" }
);

export const repaymentSchema = z.object({
  loan: z.string().min(1, "Loan is required"),
  principal: z.number().min(1, "Principal amount must be greater than 0"),
  insuranceAmount: z.number().min(0).default(0),
  sd: z.number().min(0).default(0),
  sbSavings: z.number().min(0).default(0),
  dueAmount: z.number().min(0).default(0),
  previousDue: z.number().min(0).default(0),
  advanceAmount: z.number().min(0).default(0),
  loanFees: z.number().min(0).default(0),
  preClose: z.number().min(0).default(0),
  noOfWeeksPaid: z.number().min(1, "Weeks paid is required"),
  paymentMethod: z.enum(["cash", "online", "cheque"]).default("cash"),
  paymentDate: z.string().min(1, "Payment date is required"),
  remarks: z.string().optional(),
}).refine((data) => {
  const d = new Date(data.paymentDate)
  const today = new Date(); today.setHours(23,59,59,999)
  return !isNaN(d.getTime()) && d <= today
}, { message: "Payment date cannot be in the future", path: ["paymentDate"]});

export const collectionSchema = z.object({
  staffName: z.string().min(1, "Staff name is required"),
  centerId: z.string().min(1, "Center ID is required"),
  branch: z.string().min(1, "Branch is required"),
  center: z.string().min(1, "Center is required"),
  collectionDate: z.string().min(1, "Collection date is required"),
  repayment: z.number().min(0).default(0),
  savings: z.number().min(0).default(0),
  collection: z.number().min(0).default(0),
  dueAmount: z.number().min(0).default(0),
  previousDue: z.number().min(0).default(0),
  advanceAmount: z.number().min(0).default(0),
  insurance: z.number().min(0).default(0),
  loanFees: z.number().min(0).default(0),
  preClose: z.number().min(0).default(0),
  centerName: z.string().min(1, "Center name is required"),
  cashAmount: z.number().min(0).default(0),
  advancePayment: z.number().min(0).default(0),
  onlineAmount: z.number().min(0).default(0),
  remarks: z.string().optional(),
});

export const inquirySchema = z.object({
  member: z.string().optional(),
  branch: z.string().optional(),
  type: z.enum(["kyc", "address_verification", "document_verification", "field_visit", "member_edit", "leader_edit", "center_edit", "member_add", "member_delete", "group_add", "group_edit", "group_delete"]),
  assignedTo: z.string().optional(),
  remarks: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type BranchInput = z.infer<typeof branchSchema>;
export type CenterInput = z.infer<typeof centerSchema>;
export type GroupInput = z.infer<typeof groupSchema>;
export type MemberInput = z.infer<typeof memberSchema>;
export type StaffInput = z.infer<typeof staffSchema>;
export type LeaderInput = z.infer<typeof leaderSchema>;
export type LoanInput = z.infer<typeof loanSchema>;
export type RepaymentInput = z.infer<typeof repaymentSchema>;
export type CollectionInput = z.infer<typeof collectionSchema>;
export type InquiryInput = z.infer<typeof inquirySchema>;
