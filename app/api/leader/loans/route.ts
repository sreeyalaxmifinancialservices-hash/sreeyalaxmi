import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Leader from "@/lib/models/Leader";
import Loan from "@/lib/models/Loan";
import Member from "@/lib/models/Member";
import Center from "@/lib/models/Center";
import Group from "@/lib/models/Group";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user || user.role !== "leader") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const leader = await Leader.findOne({ user: user._id }).lean();
    if (!leader) {
      return NextResponse.json(
        { success: false, error: "Leader record not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const centerId = searchParams.get("centerId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      center: leader.center,
    };

    if (status) {
      const statuses = status.split(",").map((s) => s.trim());
      filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }
    if (centerId) filter.center = centerId;

    const [loans, total] = await Promise.all([
      Loan.find(filter)
        .populate("member", "firstName lastName phone memberCode")
        .populate("center", "name code")
        .populate("group", "name code")
        .populate("loanProduct", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Loan.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: loans,
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
