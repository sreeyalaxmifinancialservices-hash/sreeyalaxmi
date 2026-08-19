import { NextRequest, NextResponse } from "next/server";
import Leader from "@/lib/models/Leader";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { leaderSchema } from "@/lib/validations";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await requireRole(["admin"]);

    const { id } = await params;
    const leader = await Leader.findById(id)
      .populate("group", "name code")
      .lean();

    if (!leader) {
      return NextResponse.json(
        { success: false, error: "Leader not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: leader });
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
    const parsed = leaderSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const leader = await Leader.findByIdAndUpdate(id, parsed.data, { new: true }).lean();

    if (!leader) {
      return NextResponse.json(
        { success: false, error: "Leader not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: leader, message: "Leader updated successfully" });
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
    const leader = await Leader.findByIdAndUpdate(
      id,
      { status: "inactive" },
      { new: true }
    ).lean();

    if (!leader) {
      return NextResponse.json(
        { success: false, error: "Leader not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Leader deactivated successfully" });
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
