import { NextRequest, NextResponse } from "next/server";
import Center from "@/lib/models/Center";
import Staff from "@/lib/models/Staff";
import Branch from "@/lib/models/Branch";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { centerSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const branch = searchParams.get("branch");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    if (branch) filter.branch = branch;
    if (status) filter.status = status;

    const [centers, total] = await Promise.all([
      Center.find(filter)
        .populate("branch", "name code")
        .populate("staff", "firstName lastName phone")
        .populate("leader", "firstName lastName phone email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Center.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: centers,
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
    await requireRole(["admin"]);

    const body = await req.json();
    const parsed = centerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await Center.findOne({ code: parsed.data.code });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Center with this code already exists" },
        { status: 400 }
      );
    }

    const createData: Record<string, any> = { ...parsed.data };
    const leaderVal = createData.leader;
    delete createData.leader;

    const center = await Center.create(createData);

    if (leaderVal) {
      const Leader = (await import("@/lib/models/Leader")).default;
      const Member = (await import("@/lib/models/Member")).default;
      let leaderId: any = null;
      const existingLeader = await Leader.findById(leaderVal).lean();
      if (existingLeader) {
        leaderId = existingLeader._id;
        await Leader.findByIdAndUpdate(leaderId, { center: center._id });
        await Center.findByIdAndUpdate(center._id, { leader: leaderId });
      } else {
        const member = await Member.findById(leaderVal).lean();
        if (member) {
          const leaderCount = await Leader.countDocuments();
          const newLeader = await Leader.create({
            leaderId: `LD${String(leaderCount + 1).padStart(6, "0")}`,
            firstName: member.firstName,
            lastName: member.lastName,
            phone: member.phone,
            email: member.email || `${member.memberCode}@member.local`,
            center: center._id,
            member: member._id,
            status: "active",
          });
          leaderId = newLeader._id;
          await Center.findByIdAndUpdate(center._id, { leader: leaderId });
        }
      }
    }

    return NextResponse.json(
      { success: true, data: center, message: "Center created successfully" },
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
