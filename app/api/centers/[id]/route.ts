import { NextRequest, NextResponse } from "next/server";
import Center from "@/lib/models/Center";
import Branch from "@/lib/models/Branch";
import Staff from "@/lib/models/Staff";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { centerSchema } from "@/lib/validations";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await requireRole(["admin", "staff"]);

    const { id } = await params;
    const center = await Center.findById(id)
      .populate("branch", "name code")
      .populate("staff", "firstName lastName phone")
      .lean();

    if (!center) {
      return NextResponse.json(
        { success: false, error: "Center not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: center });
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await requireRole(["admin", "staff"]);

    const { id } = await params;
    const body = await req.json();
    const parsed = centerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const center = await Center.findByIdAndUpdate(id, parsed.data, { new: true }).lean();

    if (!center) {
      return NextResponse.json(
        { success: false, error: "Center not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: center, message: "Center updated successfully" });
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await requireRole(["admin", "staff"]);

    const { id } = await params;
    const center = await Center.findByIdAndUpdate(
      id,
      { status: "inactive" },
      { new: true }
    ).lean();

    if (!center) {
      return NextResponse.json(
        { success: false, error: "Center not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Center deactivated successfully" });
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
