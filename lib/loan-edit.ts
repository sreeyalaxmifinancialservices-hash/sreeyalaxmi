import Member from "@/lib/models/Member";
import Repayment from "@/lib/models/Repayment";
import { getLoanConfig } from "@/lib/settings";
import { computeLoanBreakdown } from "@/lib/loan-calc";

export const LOAN_EDITABLE_FIELDS = [
  "member",
  "loanAmount",
  "totalReceived",
  "branch",
  "center",
  "group",
  "bankName",
  "bankBranchName",
  "remarks",
  "reason",
  "disbursementDate",
  "closedAt",
  "preCloseDate",
] as const;

export function parseLoanDate(val: unknown): Date | null {
  if (val === undefined || val === "" || val === null) return null;
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? null : d;
}

/** Pick only whitelisted loan-edit keys from a request body. */
export function pickLoanChanges(body: Record<string, any>): Record<string, any> {
  const changes: Record<string, any> = {};
  for (const key of LOAN_EDITABLE_FIELDS) {
    if (body[key] !== undefined) changes[key] = body[key];
  }
  return changes;
}

/**
 * Validate + apply loan corrections to a loaded loan document.
 * Mutates the document but does NOT save — caller saves.
 * Returns null on success, or { error, status } on validation failure.
 */
export async function applyLoanEdits(
  loan: any,
  changes: Record<string, any>
): Promise<{ error: string; status: number } | null> {
  const {
    member,
    loanAmount,
    totalReceived,
    branch,
    center,
    group,
    bankName,
    bankBranchName,
    remarks,
    reason,
    disbursementDate,
    closedAt,
    preCloseDate,
  } = changes;

  // Lock member/amounts once financial history exists
  if (member !== undefined || loanAmount !== undefined || totalReceived !== undefined) {
    const repaymentCount = await Repayment.countDocuments({ loan: loan._id });
    if (repaymentCount > 0) {
      return {
        error: "Cannot change member or loan amounts after repayments have been recorded",
        status: 400,
      };
    }
  }

  // Member (auto-fill assignment from the new member when not explicitly given)
  if (member !== undefined && String(member) !== String(loan.member)) {
    if (!member) {
      return { error: "Member is required", status: 400 };
    }
    const memberDoc = await Member.findById(member).lean();
    if (!memberDoc) {
      return { error: "Member not found", status: 404 };
    }
    loan.member = member;
    if (branch === undefined && (memberDoc as any).branch) loan.branch = (memberDoc as any).branch;
    if (center === undefined && (memberDoc as any).center) loan.center = (memberDoc as any).center;
    if (group === undefined && (memberDoc as any).group) loan.group = (memberDoc as any).group;
  }

  // Explicit assignment / bank info
  if (branch !== undefined) loan.branch = branch || undefined;
  if (center !== undefined) loan.center = center || undefined;
  if (group !== undefined) loan.group = group || undefined;
  if (bankName !== undefined) loan.bankName = bankName;
  if (bankBranchName !== undefined) loan.bankBranchName = bankBranchName;

  if (
    (loan.loanType === "group" || loan.loanType === "old") &&
    (!loan.branch || !loan.center || !loan.group)
  ) {
    return { error: "Branch, Center and Group are required", status: 400 };
  }
  if (loan.loanType === "bank" && bankName !== undefined && !(bankName as string)?.trim()) {
    return { error: "Bank Name is required for Bank Loan", status: 400 };
  }

  // Amounts (recompute breakdown so weekly/total stay consistent)
  if (loanAmount !== undefined) {
    const amt = Number(loanAmount);
    if (!amt || amt < 1) {
      return { error: "Loan amount must be greater than 0", status: 400 };
    }
    if (loan.loanType === "old") {
      const tr = totalReceived !== undefined ? Number(totalReceived) : loan.totalRepayment;
      if (totalReceived !== undefined && (isNaN(tr) || tr < 0)) {
        return { error: "Total amount received must be 0 or more", status: 400 };
      }
      loan.loanAmount = amt;
      loan.disbursementAmount = amt;
      loan.totalRepayment = tr;
      loan.weeklyRepayment = tr;
      loan.principalOutstanding = 0;
      loan.outstandingBalance = 0;
    } else {
      const config = await getLoanConfig();
      const weeks = loan.noOfWeeks || 50;
      const breakdown = computeLoanBreakdown(amt, weeks, config);
      loan.loanAmount = amt;
      loan.insuranceAmount = breakdown.insuranceAmount;
      loan.processingFee = breakdown.processingFee;
      loan.disbursementAmount = breakdown.disbursementAmount;
      loan.weeklyRepayment = breakdown.weeklyRepayment;
      loan.totalRepayment = breakdown.totalRepayment;
      loan.principalOutstanding = breakdown.principalOutstanding;
      loan.outstandingBalance = breakdown.totalRepayment;
    }
  } else if (totalReceived !== undefined && loan.loanType === "old") {
    const tr = Number(totalReceived);
    if (isNaN(tr) || tr < 0) {
      return { error: "Total amount received must be 0 or more", status: 400 };
    }
    loan.totalRepayment = tr;
    loan.weeklyRepayment = tr;
  }

  // Dates
  if (disbursementDate !== undefined && disbursementDate !== "" && disbursementDate !== null) {
    const d = parseLoanDate(disbursementDate);
    if (!d) {
      return { error: "Invalid disbursement date", status: 400 };
    }
    loan.disbursementDate = d;
    const weeks = loan.noOfWeeks || 50;
    loan.maturityDate = new Date(d.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  }
  if (closedAt !== undefined) {
    if (closedAt === "" || closedAt === null) {
      loan.closedAt = undefined;
    } else {
      const d = parseLoanDate(closedAt);
      if (!d) {
        return { error: "Invalid close date", status: 400 };
      }
      loan.closedAt = d;
    }
  }
  if (preCloseDate !== undefined) {
    if (preCloseDate === "" || preCloseDate === null) {
      loan.preCloseDate = undefined;
    } else {
      const d = parseLoanDate(preCloseDate);
      if (!d) {
        return { error: "Invalid pre-close date", status: 400 };
      }
      loan.preCloseDate = d;
    }
  }
  // Keep preCloseDate in sync when only closedAt is given
  if (closedAt && (preCloseDate === undefined || preCloseDate === "" || preCloseDate === null)) {
    loan.preCloseDate = loan.closedAt;
  }

  if (remarks !== undefined) loan.remarks = remarks as string;
  if (reason !== undefined) loan.reason = reason as string;

  return null;
}
