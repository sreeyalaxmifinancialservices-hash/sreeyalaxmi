import { NextRequest, NextResponse } from "next/server";
import Leader from "@/lib/models/Leader";
import Group from "@/lib/models/Group";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { leaderSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireRole(["admin"]);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const group = searchParams.get("group");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { leaderId: { $regex: search, $options: "i" } },
      ];
    }

    if (group) filter.group = group;
    if (status) filter.status = status;

    const [leaders, total] = await Promise.all([
      Leader.find(filter)
        .populate("group", "name code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Leader.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: leaders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error(error);
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    await requireRole(["admin"]);

    const body = await req.json();
    const parsed = leaderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await Leader.findOne({
      $or: [{ email: parsed.data.email }, { leaderId: parsed.data.leaderId }],
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Leader with this email or ID already exists" },
        { status: 400 }
      );
    }

    const leader = await Leader.create(parsed.data);

    await Group.findByIdAndUpdate(parsed.data.group, { leader: leader._id });

    return NextResponse.json(
      { success: true, data: leader, message: "Leader created successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(error);
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
