import Setting from "@/lib/models/Setting";
import { LoanCalcConfig } from "@/lib/loan-calc";

export type SettingValue = string | number;

export const DEFAULT_SETTINGS: { key: string; value: SettingValue; description: string; category: string }[] = [
  { key: "company_name", value: "Sreeyalaxmi Financial Services Pvt. Ltd.", description: "Company name shown on reports", category: "general" },
  { key: "company_address", value: "Adarsha Pally, Gouranga Nagar, Kolkata-700059", description: "Company address shown on reports", category: "general" },
  { key: "company_phone", value: "033-26671234", description: "Company phone number", category: "general" },
  { key: "company_email", value: "info@sreeyalaxmi.in", description: "Company email", category: "general" },
  { key: "processing_fee", value: 100, description: "Flat processing fee charged per loan (INR)", category: "loan" },
  { key: "insurance_rate", value: 3, description: "Insurance fee as a percentage of the loan amount (%)", category: "loan" },
  { key: "interest_rate", value: 10, description: "Flat interest rate applied on the loan amount for the whole tenure (%)", category: "loan" },
  { key: "default_no_of_weeks", value: 50, description: "Default loan tenure in weeks", category: "loan" },
  { key: "max_loan_cycles", value: 4, description: "Maximum loan cycles allowed per member", category: "loan" },
];

export async function ensureDefaultSettings() {
  for (const s of DEFAULT_SETTINGS) {
    await Setting.updateOne({ key: s.key }, { $setOnInsert: s }, { upsert: true });
  }
}

export async function getSettings(): Promise<Record<string, SettingValue>> {
  await ensureDefaultSettings();
  const docs = await Setting.find({}).lean();
  const map: Record<string, SettingValue> = {};
  for (const d of docs) map[d.key] = d.value;
  return map;
}

export async function getLoanConfig(): Promise<LoanCalcConfig> {
  const s = await getSettings();
  return {
    processingFee: Number(s.processing_fee) || 0,
    insuranceRate: Number(s.insurance_rate) || 0,
    interestRate: Number(s.interest_rate) || 0,
    defaultNoOfWeeks: Number(s.default_no_of_weeks) || 50,
  };
}
