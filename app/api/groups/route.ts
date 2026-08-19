import { NextRequest, NextResponse } from "next/server";
import Group from "@/lib/models/Group";
import Center from "@/lib/models/Center";
import Branch from "@/lib/models/Branch";
import Leader from "@/lib/models/Leader";
import Member from "@/lib/models/Member";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { groupSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const center = searchParams.get("center");
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

    if (center) filter.center = center;
    if (branch) filter.branch = branch;
    if (status) filter.status = status;

    const [groups, total] = await Promise.all([
      Group.find(filter)
        .populate("center", "name code")
        .populate("branch", "name code")
        .populate("leader", "firstName lastName phone member")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Group.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: groups,
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
    const parsed = groupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await Group.findOne({ code: parsed.data.code });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Group with this code already exists" },
        { status: 400 }
      );
    }

    const createData: Record<string, any> = { ...parsed.data };
    delete createData.leader;

    const group = await Group.create(createData);

    if (parsed.data.leader) {
      const existingLeader = await Leader.findById(parsed.data.leader).lean();
      let leaderId = existingLeader?._id;

      if (!leaderId) {
        const member = await Member.findById(parsed.data.leader).lean();
        if (member) {
          const leaderCount = await Leader.countDocuments();
          const leader = await Leader.create({
            leaderId: `LD${String(leaderCount + 1).padStart(6, "0")}`,
            firstName: member.firstName,
            lastName: member.lastName,
            phone: member.phone,
            email: member.email || `${member.memberCode}@member.local`,
            group: group._id,
            member: member._id,
            status: "active",
          });
          leaderId = leader._id;
        }
      }

      if (leaderId) {
        await Group.findByIdAndUpdate(group._id, { leader: leaderId });
      }
    }

    return NextResponse.json(
      { success: true, data: group, message: "Group created successfully" },
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
