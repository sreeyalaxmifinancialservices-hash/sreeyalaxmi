import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Staff from "@/lib/models/Staff";
import Center from "@/lib/models/Center";
import Member from "@/lib/models/Member";

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      _id: { $in: staff.assignedCenters },
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const [centers, total] = await Promise.all([
      Center.find(filter)
        .populate("branch", "name code")
        .skip(skip)
        .limit(limit)
        .lean(),
      Center.countDocuments(filter),
    ]);

    const centersWithCounts = await Promise.all(
      centers.map(async (center) => {
        const memberCount = await Member.countDocuments({
          center: center._id,
          status: "active",
        });
        return { ...center, memberCount };
      })
    );

    return NextResponse.json({
      success: true,
      data: centersWithCounts,
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
