import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Staff from "@/lib/models/Staff";
import Branch from "@/lib/models/Branch";
import User from "@/lib/models/User";
import Group from "@/lib/models/Group";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const page = parseInt(searchParams.get("page") || "1");
    const status = searchParams.get("status");
    const branch = searchParams.get("branch");
    const search = searchParams.get("search");
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (branch) filter.branches = branch;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [staff, total] = await Promise.all([
      Staff.find(filter).skip(skip).limit(limit)
        .populate("branches", "name code")
        .populate("assignedCenters", "name code")
        .populate("assignedGroups", "name code")
        .populate("user", "name email")
        .lean(),
      Staff.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: staff,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}

async function generateEmployeeId(): Promise<string> {
  const lastStaff = await Staff.findOne().sort({ createdAt: -1 }).select("employeeId").lean();
  if (lastStaff?.employeeId) {
    const num = parseInt(lastStaff.employeeId.replace("STF", ""), 10);
    if (!isNaN(num)) {
      return `STF${String(num + 1).padStart(4, "0")}`;
    }
  }
  return "STF0001";
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { firstName, lastName, phone, email, branches, designation, assignedCenters, assignedGroups, status, password, photo } = body;

    if (!firstName || !lastName || !phone || !email || !branches?.length || !designation) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const existingEmail = await Staff.findOne({ email });
    if (existingEmail) {
      return NextResponse.json({ success: false, error: "Staff with this email already exists" }, { status: 400 });
    }

    const employeeId = await generateEmployeeId();

    const bcrypt = (await import("bcryptjs")).default;
    const rawPassword = password || "staff123";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const user = await User.create({
      name: `${firstName} ${lastName}`,
      email,
      password: hashedPassword,
      role: "staff",
      isActive: true,
    });

    // Auto-derive groups from centers: all groups under selected centers are auto-assigned
    let derivedGroups: string[] = [];
    if (assignedCenters && assignedCenters.length > 0) {
      const groups = await Group.find({ center: { $in: assignedCenters } }).select("_id").lean();
      derivedGroups = groups.map((g: any) => String(g._id));
    }

    const staff = await Staff.create({
      user: user._id,
      employeeId,
      firstName,
      lastName,
      phone,
      email,
      photo: photo || undefined,
      branches,
      designation,
      assignedCenters: assignedCenters || [],
      assignedGroups: derivedGroups,
      status: status || "active",
    });

    return NextResponse.json({ success: true, message: "Staff created", data: staff });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}