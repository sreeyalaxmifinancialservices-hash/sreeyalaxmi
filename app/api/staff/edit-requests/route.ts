import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Inquiry from "@/lib/models/Inquiry";
import Member from "@/lib/models/Member";
import Leader from "@/lib/models/Leader";
import Center from "@/lib/models/Center";
import Branch from "@/lib/models/Branch";
import Group from "@/lib/models/Group";
import Loan from "@/lib/models/Loan";
import Staff from "@/lib/models/Staff";
import { parseLoanDate } from "@/lib/loan-edit";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const entityType = searchParams.get("entityType");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      submittedBy: user._id,
      type: { $in: ["member_edit", "leader_edit", "center_edit", "member_delete", "group_edit", "group_delete", "loan_edit"] },
    };

    if (status && status !== "all") filter.status = status;
    if (entityType) {
      filter["editRequest.entityType"] = entityType;
    }

    const [requests, total] = await Promise.all([
      Inquiry.find(filter)
        .populate("editRequest.entityId", "name firstName lastName memberCode code loanId loanAmount")
        .populate("memberRequest.memberId", "firstName lastName memberCode")
        .populate({ path: "groupRequest.groupId", select: "name code", strictPopulate: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Inquiry.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { entityType, entityId, newValues } = body;

    if (!entityType || !entityId || !newValues) {
      return NextResponse.json(
        { success: false, error: "entityType, entityId, and newValues are required" },
        { status: 400 }
      );
    }

    let entity: any;
    let entityTypeLabel: "member" | "leader" | "center" | "loan";
    let inquiryType: "member_edit" | "leader_edit" | "center_edit" | "loan_edit";
    let entityName: string;

    if (entityType === "member") {
      entity = await Member.findById(entityId).lean();
      if (!entity) {
        return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
      }
      entityTypeLabel = "member";
      inquiryType = "member_edit";
      entityName = `${entity.firstName} ${entity.lastName}`;
    } else if (entityType === "leader") {
      entity = await Leader.findById(entityId).lean();
      if (!entity) {
        return NextResponse.json({ success: false, error: "Leader not found" }, { status: 404 });
      }
      entityTypeLabel = "leader";
      inquiryType = "leader_edit";
      entityName = `${entity.firstName} ${entity.lastName}`;
    } else if (entityType === "center") {
      entity = await Center.findById(entityId).lean();
      if (!entity) {
        return NextResponse.json({ success: false, error: "Center not found" }, { status: 404 });
      }
      entityTypeLabel = "center";
      inquiryType = "center_edit";
      entityName = entity.name;
    } else if (entityType === "loan") {
      entity = await Loan.findById(entityId)
        .populate("member", "firstName lastName memberCode")
        .populate("branch", "name code")
        .populate("center", "name code")
        .populate("group", "name code")
        .lean();
      if (!entity) {
        return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
      }
      entityTypeLabel = "loan";
      inquiryType = "loan_edit";
      entityName = `${entity.loanId} - ${entity.member?.firstName || ""} ${entity.member?.lastName || ""}`.trim();
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid entityType. Must be member, leader, center, or loan" },
        { status: 400 }
      );
    }

    const editableFields: Record<string, string[]> = {
      member: ["firstName", "lastName", "guardianName", "phone", "email", "aadhaar", "pan", "dob", "gender", "address"],
      leader: ["firstName", "lastName", "phone", "email"],
      center: ["name", "meetingDay", "meetingTime", "location"],
      loan: ["member", "loanAmount", "totalReceived", "branch", "center", "group", "bankName", "bankBranchName", "remarks", "disbursementDate", "closedAt", "preCloseDate"],
    };

    const idOf = (v: any): string => (v?._id ? String(v._id) : v ? String(v) : "");

    const allowed = editableFields[entityType];
    const oldValues: Record<string, any> = {};
    const filteredNewValues: Record<string, any> = {};
    const displayNames: Record<string, { old?: string; new?: string }> = {};

    const refName = (doc: any): string => {
      if (!doc) return "";
      if (doc.firstName) return `${doc.firstName} ${doc.lastName || ""}`.trim() + (doc.memberCode ? ` (${doc.memberCode})` : "");
      return `${doc.name || ""}${doc.code ? ` (${doc.code})` : ""}`.trim();
    };

    for (const field of allowed) {
      if (newValues[field] !== undefined) {
        if (field === "address" && entityType === "member") {
          oldValues.address = entity.address || {};
          filteredNewValues.address = newValues.address;
        } else if (entityType === "loan" && ["member", "branch", "center", "group"].includes(field)) {
          oldValues[field] = idOf(entity[field]);
          filteredNewValues[field] = newValues[field];
        } else {
          oldValues[field] = entity[field];
          filteredNewValues[field] = newValues[field];
        }
      }
    }

    if (Object.keys(filteredNewValues).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Loan-specific checks: valid references/values + no duplicate pending request
    if (entityType === "loan") {
      const existing = await Inquiry.findOne({
        type: "loan_edit",
        "editRequest.entityId": entity._id,
        status: "pending",
      }).lean();
      if (existing) {
        return NextResponse.json(
          { success: false, error: "An edit request for this loan is already pending approval" },
          { status: 400 }
        );
      }
      if (filteredNewValues.member) {
        const m = await Member.findById(filteredNewValues.member).lean();
        if (!m) {
          return NextResponse.json({ success: false, error: "Selected member not found" }, { status: 404 });
        }
      }
      if (filteredNewValues.loanAmount !== undefined && Number(filteredNewValues.loanAmount) < 1) {
        return NextResponse.json({ success: false, error: "Loan amount must be greater than 0" }, { status: 400 });
      }
      if (filteredNewValues.totalReceived !== undefined && Number(filteredNewValues.totalReceived) < 0) {
        return NextResponse.json({ success: false, error: "Total amount received must be 0 or more" }, { status: 400 });
      }
      for (const df of ["disbursementDate", "closedAt", "preCloseDate"] as const) {
        if (filteredNewValues[df] !== undefined && filteredNewValues[df] !== "" && filteredNewValues[df] !== null && !parseLoanDate(filteredNewValues[df])) {
          return NextResponse.json({ success: false, error: `Invalid ${df === "disbursementDate" ? "loan date" : "close date"}` }, { status: 400 });
        }
      }
      // Human-readable names for reference fields (used by review screens)
      const refModels: Record<string, any> = { member: Member, branch: Branch, center: Center, group: Group };
      for (const field of ["member", "branch", "center", "group"]) {
        if (filteredNewValues[field] !== undefined) {
          const newDoc = filteredNewValues[field]
            ? await (refModels[field] as any).findById(filteredNewValues[field]).lean()
            : null;
          displayNames[field] = {
            old: refName(entity[field]) || "—",
            new: filteredNewValues[field] ? refName(newDoc) || String(filteredNewValues[field]) : "—",
          };
        }
      }
    }

    const inquiryCount = await Inquiry.countDocuments();
    const inquiryNumber = `INQ${String(inquiryCount + 1).padStart(6, "0")}`;

    const inquiry = await Inquiry.create({
      inquiryNumber,
      type: inquiryType,
      branch: idOf(entity.branch) || undefined,
      submittedBy: user._id,
      status: "pending",
      editRequest: {
        entityType: entityTypeLabel,
        entityId: entity._id,
        entityName,
        oldValues,
        newValues: filteredNewValues,
        ...(entityType === "loan" ? { displayNames } : {}),
      },
      history: [
        {
          action: `Edit request submitted for ${entityType}: ${entityName}`,
          performedBy: user._id,
          date: new Date(),
          remarks: `Requested changes: ${Object.keys(filteredNewValues).join(", ")}`,
        },
      ],
    });

    return NextResponse.json(
      { success: true, data: inquiry, message: "Edit request submitted for admin approval" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
