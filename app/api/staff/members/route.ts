import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Staff from "@/lib/models/Staff";
import Member from "@/lib/models/Member";
import Center from "@/lib/models/Center";
import Group from "@/lib/models/Group";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user || user.role !== "staff") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const staff = await Staff.findOne({ user: user._id }).lean();
    if (!staff) {
      return NextResponse.json(
        { success: false, error: "Staff record not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const centerId = searchParams.get("centerId");
    const groupId = searchParams.get("group");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      center: { $in: staff.assignedCenters },
    };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { memberCode: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (centerId) filter.center = centerId;
    if (groupId) filter.group = groupId;
    if (status) filter.status = status;

    const [members, total] = await Promise.all([
      Member.find(filter)
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
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
