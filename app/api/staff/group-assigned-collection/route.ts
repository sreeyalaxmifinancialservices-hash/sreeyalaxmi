import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import GroupAssignedCollection from "@/lib/models/GroupAssignedCollection";
import Staff from "@/lib/models/Staff";

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
    const status = searchParams.get("status");
    const limitParam = searchParams.get("limit");
    const hasPagination = limitParam !== null;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = hasPagination ? parseInt(limitParam!) : 0;
    const skip = hasPagination ? (page - 1) * limit : 0;

    const filter: Record<string, any> = { staffId: staff._id };
    if (status) filter.status = status;

    const query = GroupAssignedCollection.find(filter)
      .populate("branchId", "name")
      .populate("centerId", "name")
      .populate("groupId", "name code")
      .sort({ collectionDate: -1 });

    const [data, total] = await Promise.all([
      (hasPagination ? query.skip(skip).limit(limit) : query).lean(),
      GroupAssignedCollection.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: hasPagination
        ? { page, limit, total, pages: Math.ceil(total / limit) }
        : { page: 1, limit: total, total, pages: 1 },
    });
  } catch (error: any) {
    console.error("GET /api/staff/group-assigned-collection:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
