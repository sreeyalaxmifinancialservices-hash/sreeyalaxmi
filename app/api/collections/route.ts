import { NextRequest, NextResponse } from "next/server";
import Collection from "@/lib/models/Collection";
import Center from "@/lib/models/Center";
import Group from "@/lib/models/Group";
import Staff from "@/lib/models/Staff";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch");
    const center = searchParams.get("center");
    const group = searchParams.get("group");
    const staff = searchParams.get("staff");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (branch) filter.branch = branch;
    if (center) filter.center = center;
    if (group) filter.group = group;
    if (staff) filter.staffName = staff;

    if (dateFrom || dateTo) {
      filter.collectionDate = {};
      if (dateFrom) filter.collectionDate.$gte = new Date(dateFrom);
      if (dateTo) filter.collectionDate.$lte = new Date(dateTo);
    }

    const [collections, total] = await Promise.all([
      Collection.find(filter)
        .populate("branch", "name code")
        .populate("center", "name code")
        .populate("group", "name code")
        .populate("leader", "firstName lastName")
        .sort({ createdAt: -1 })
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

    const { branch, center, group, staff, collectionDate, cashAmount, onlineAmount, advanceAmount, insuranceAmount, savingsAmount, remarks, leader } = body;

    if (!branch || !center || !staff || !collectionDate) {
      return NextResponse.json(
        { success: false, error: "Branch, Center, Staff, and Collection Date are required" },
        { status: 400 }
      );
    }

    const total = (cashAmount || 0) + (onlineAmount || 0);

    const collectionCount = await Collection.countDocuments();
    const collectionId = `CL${String(collectionCount + 1).padStart(6, "0")}`;

    const centerDoc = await Center.findById(center).lean();
    const staffDoc = await Staff.findById(staff).lean();

    let leaderId = leader || undefined;
    if (!leaderId && group) {
      const groupDoc = await Group.findById(group).lean();
      leaderId = groupDoc?.leader || undefined;
    }

    const collection = await Collection.create({
      collectionId,
      staffName: staffDoc ? `${staffDoc.firstName} ${staffDoc.lastName}` : staff,
      staffId: staff,
      centerId: center,
      branch,
      center,
      group: group || undefined,
      leader: leaderId,
      collectionDate: new Date(collectionDate),
      cashAmount: cashAmount || 0,
      onlineAmount: onlineAmount || 0,
      advanceAmount: advanceAmount || 0,
      insurance: insuranceAmount || 0,
      savings: savingsAmount || 0,
      total,
      centerName: centerDoc?.name || "",
      remarks,
      status: "completed",
    });

    return NextResponse.json(
      { success: true, data: collection, message: "Collection recorded successfully" },
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
