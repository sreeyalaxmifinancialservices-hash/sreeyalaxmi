import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Staff from "@/lib/models/Staff";
import Collection from "@/lib/models/Collection";
import Center from "@/lib/models/Center";

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
    const centerId = searchParams.get("centerId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      center: { $in: staff.assignedCenters },
    };

    if (centerId) filter.center = centerId;

    const [collections, total] = await Promise.all([
      Collection.find(filter)
        .populate("center", "name code")
        .populate("group", "name code")
        .populate("leader", "firstName lastName")
        .sort({ collectionDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Collection.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: collections,
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

    const body = await req.json();
    const {
      centerId,
      cashAmount,
      onlineAmount,
      advanceAmount,
      insuranceAmount,
      savingsAmount,
      remarks,
    } = body;

    if (!centerId) {
      return NextResponse.json(
        { success: false, error: "Center ID is required" },
        { status: 400 }
      );
    }

    if (!staff.assignedCenters.includes(centerId)) {
      return NextResponse.json(
        { success: false, error: "Center not in your assigned centers" },
        { status: 403 }
      );
    }

    const center = await Center.findById(centerId).lean();
    if (!center) {
      return NextResponse.json(
        { success: false, error: "Center not found" },
        { status: 404 }
      );
    }

    const totalAmount =
      (cashAmount || 0) +
      (onlineAmount || 0) +
      (advanceAmount || 0) +
      (insuranceAmount || 0) +
      (savingsAmount || 0);

    const collectionCount = await Collection.countDocuments();
    const collectionId = `CL${String(collectionCount + 1).padStart(6, "0")}`;

    const collection = await Collection.create({
      collectionId,
      branch: center.branch,
      center: centerId,
      staffName: `${staff.firstName} ${staff.lastName}`,
      staffId: staff._id,
      centerId: centerId,
      centerName: "",
      collectionDate: new Date(),
      cashAmount: cashAmount || 0,
      onlineAmount: onlineAmount || 0,
      advanceAmount: advanceAmount || 0,
      insurance: insuranceAmount || 0,
      savings: savingsAmount || 0,
      total: totalAmount,
      remarks,
      status: "completed",
    });

    return NextResponse.json(
      { success: true, data: collection },
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
