import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Inquiry from "@/lib/models/Inquiry";
import Member from "@/lib/models/Member";
import Leader from "@/lib/models/Leader";
import Center from "@/lib/models/Center";
import Staff from "@/lib/models/Staff";

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
      type: { $in: ["member_edit", "leader_edit", "center_edit", "member_delete", "group_edit", "group_delete"] },
    };

    if (status && status !== "all") filter.status = status;
    if (entityType) {
      filter["editRequest.entityType"] = entityType;
    }

    const [requests, total] = await Promise.all([
      Inquiry.find(filter)
        .populate("editRequest.entityId", "name firstName lastName memberCode code")
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
    let entityTypeLabel: "member" | "leader" | "center";
    let inquiryType: "member_edit" | "leader_edit" | "center_edit";
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
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid entityType. Must be member, leader, or center" },
        { status: 400 }
      );
    }

    const editableFields: Record<string, string[]> = {
      member: ["firstName", "lastName", "guardianName", "phone", "email", "aadhaar", "pan", "dob", "gender", "address"],
      leader: ["firstName", "lastName", "phone", "email"],
      center: ["name", "meetingDay", "meetingTime", "location"],
    };

    const allowed = editableFields[entityType];
    const oldValues: Record<string, any> = {};
    const filteredNewValues: Record<string, any> = {};

    for (const field of allowed) {
      if (newValues[field] !== undefined) {
        if (field === "address" && entityType === "member") {
          oldValues.address = entity.address || {};
          filteredNewValues.address = newValues.address;
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

    const inquiryCount = await Inquiry.countDocuments();
    const inquiryNumber = `INQ${String(inquiryCount + 1).padStart(6, "0")}`;

    const inquiry = await Inquiry.create({
      inquiryNumber,
      type: inquiryType,
      branch: entity.branch,
      submittedBy: user._id,
      status: "pending",
      editRequest: {
        entityType: entityTypeLabel,
        entityId: entity._id,
        entityName,
        oldValues,
        newValues: filteredNewValues,
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
