import { NextRequest, NextResponse } from "next/server";
import Branch from "@/lib/models/Branch";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { branchSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
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

    if (status) {
      filter.status = status;
    }

    const [branches, total] = await Promise.all([
      Branch.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Branch.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: branches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
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
    const parsed = branchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await Branch.findOne({
      $or: [{ name: parsed.data.name }, { code: parsed.data.code }],
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Branch with this name or code already exists" },
        { status: 400 }
      );
    }

    const branch = await Branch.create(parsed.data);

    return NextResponse.json(
      { success: true, data: branch, message: "Branch created successfully" },
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
