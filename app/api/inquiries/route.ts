import { NextRequest, NextResponse } from "next/server";
import Inquiry from "@/lib/models/Inquiry";
import Member from "@/lib/models/Member";
import Branch from "@/lib/models/Branch";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { inquirySchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const member = searchParams.get("member");
    const branch = searchParams.get("branch");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (member) filter.member = member;
    if (branch) filter.branch = branch;
    if (type) filter.type = type;
    if (status) filter.status = status;

    const [inquiries, total] = await Promise.all([
      Inquiry.find(filter)
        .populate("member", "firstName lastName memberCode")
        .populate("branch", "name code")
        .populate("assignedTo", "name email")
        .populate("submittedBy", "name email")
        .populate("editRequest.entityId", "name firstName lastName memberCode code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Inquiry.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: inquiries,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
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
    const user = await requireAuth();

    const body = await req.json();
    const parsed = inquirySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const inquiryCount = await Inquiry.countDocuments();
    const inquiryNumber = `INQ${String(inquiryCount + 1).padStart(6, "0")}`;

    const inquiry = await Inquiry.create({
      inquiryNumber,
      ...parsed.data,
      status: "pending",
      history: [
        {
          action: "Inquiry created",
          performedBy: user.id,
          date: new Date(),
          remarks: parsed.data.remarks || "Initial inquiry",
        },
      ],
    });

    return NextResponse.json(
      { success: true, data: inquiry, message: "Inquiry created successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
