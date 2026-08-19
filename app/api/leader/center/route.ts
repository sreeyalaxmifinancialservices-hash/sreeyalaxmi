import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Leader from "@/lib/models/Leader";
import Center from "@/lib/models/Center";
import Member from "@/lib/models/Member";
import Staff from "@/lib/models/Staff";
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
    const centerId = searchParams.get("centerId");

    if (centerId) {
      const center = await Center.findById(centerId)
        .populate("leader", "firstName lastName phone")
        .populate("staff", "firstName lastName phone")
        .lean();

      if (!center || String(center._id) !== String(leader.center)) {
        return NextResponse.json(
          { success: false, error: "Center not found" },
          { status: 404 }
        );
      }

      const members = await Member.find({ center: centerId, status: "active" })
        .populate("group", "name code")
        .sort({ firstName: 1 })
        .lean();

      return NextResponse.json({
        success: true,
        data: { ...center, members },
      });
    }

    const center = await Center.findById(leader.center)
      .populate("leader", "firstName lastName phone")
      .populate("staff", "firstName lastName phone")
      .lean();

    if (!center) {
      return NextResponse.json(
        { success: true, data: null },
      );
    }

    const memberCount = await Member.countDocuments({
      center: center._id,
      status: "active",
    });

    return NextResponse.json({
      success: true,
      data: { ...center, memberCount },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
