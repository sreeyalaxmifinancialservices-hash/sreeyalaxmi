import { NextRequest, NextResponse } from "next/server";
import Staff from "@/lib/models/Staff";
import Branch from "@/lib/models/Branch";
import User from "@/lib/models/User";
import Center from "@/lib/models/Center";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { staffSchema } from "@/lib/validations";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await requireRole(["admin"]);

    const { id } = await params;
    const staff = await Staff.findById(id)
      .populate("user", "name email role")
      .populate("branches", "name code")
      .populate("assignedCenters", "name code")
      .populate("assignedGroups", "name code")
      .lean();

    if (!staff) {
      return NextResponse.json(
        { success: false, error: "Staff not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: staff });
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
    await requireRole(["admin"]);

    const { id } = await params;
    const body = await req.json();
    const { password, photo, ...rest } = body;
    const parsed = staffSchema.partial().safeParse(rest);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (photo !== undefined) {
      updateData.photo = photo || undefined;
    }

    const staff = await Staff.findByIdAndUpdate(id, updateData, { new: true }).lean();

    if (!staff) {
      return NextResponse.json(
        { success: false, error: "Staff not found" },
        { status: 404 }
      );
    }

    if (password) {
      const bcrypt = (await import("bcryptjs")).default;
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.findByIdAndUpdate(staff.user, { password: hashedPassword });
    }

    return NextResponse.json({ success: true, data: staff, message: "Staff updated successfully" });
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
    await requireRole(["admin"]);

    const { id } = await params;
    const staff = await Staff.findByIdAndUpdate(
      id,
      { status: "inactive" },
      { new: true }
    ).lean();

    if (!staff) {
      return NextResponse.json(
        { success: false, error: "Staff not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Staff deactivated successfully" });
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
