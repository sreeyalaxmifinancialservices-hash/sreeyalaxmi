import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Leader from "@/lib/models/Leader";
import Center from "@/lib/models/Center";
import Loan from "@/lib/models/Loan";
import Member from "@/lib/models/Member";
import Repayment from "@/lib/models/Repayment";

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

    const centerId = leader.center;

    const [center, totalMembers, activeLoans, totalLoans, recentRepayments] =
      await Promise.all([
        Center.findById(centerId).lean(),
        Member.countDocuments({ center: centerId, status: "active" }),
        Loan.countDocuments({
          center: centerId,
          status: { $in: ["active", "disbursed"] },
        }),
        Loan.countDocuments({ center: centerId }),
        Repayment.find({ center: centerId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("member", "firstName lastName")
          .lean(),
      ]);

    const totalDisbursed = await Loan.aggregate([
      { $match: { center: centerId, status: { $in: ["active", "disbursed", "closed"] } } },
      { $group: { _id: null, total: { $sum: "$loanAmount" } } },
    ]);

    const totalCollected = await Repayment.aggregate([
      { $match: { center: centerId, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        centersCount: center ? 1 : 0,
        centers: center ? [center] : [],
        totalMembers,
        activeLoans,
        totalLoans,
        totalDisbursed: totalDisbursed[0]?.total || 0,
        totalCollected: totalCollected[0]?.total || 0,
        recentRepayments,
      },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
