import { NextRequest, NextResponse } from "next/server";
import Member from "@/lib/models/Member";
import Branch from "@/lib/models/Branch";
import Center from "@/lib/models/Center";
import Group from "@/lib/models/Group";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { memberSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const branch = searchParams.get("branch");
    const center = searchParams.get("center");
    const group = searchParams.get("group");
    const verificationStatus = searchParams.get("verificationStatus");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { memberCode: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (branch) filter.branch = branch;
    if (center) filter.center = center;
    if (group) filter.group = group;
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    if (status) filter.status = status;

    const [members, total] = await Promise.all([
      Member.find(filter)
        .populate("branch", "name code")
        .populate("center", "name code")
        .populate("group", "name code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Member.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: members,
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
    await requireAuth();

    const body = await req.json();
    const parsed = memberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existingAadhaar = await Member.findOne({ aadhaar: parsed.data.aadhaar });
    if (existingAadhaar) {
      return NextResponse.json(
        { success: false, error: "Member with this Aadhaar already exists" },
        { status: 400 }
      );
    }

    const existingCode = await Member.findOne({ memberCode: parsed.data.memberCode });
    if (existingCode) {
      return NextResponse.json(
        { success: false, error: "Member with this Member ID already exists" },
        { status: 400 }
      );
    }

    const member = await Member.create({
      ...parsed.data,
      dob: new Date(parsed.data.dob),
    });

    if (parsed.data.group) {
      await Group.findByIdAndUpdate(parsed.data.group, { $inc: { memberCount: 1 } });
    }

    return NextResponse.json(
      { success: true, data: member, message: "Member created successfully" },
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
