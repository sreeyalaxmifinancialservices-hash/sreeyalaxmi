import { NextRequest, NextResponse } from "next/server";
import Leader from "@/lib/models/Leader";
import Center from "@/lib/models/Center";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { leaderSchema } from "@/lib/validations";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await requireRole(["admin"]);

    const { id } = await params;
    const leader = await Leader.findById(id)
      .populate("center", "name code")
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

    const existingLeader = await Leader.findById(id).lean();
    if (!existingLeader) {
      return NextResponse.json(
        { success: false, error: "Leader not found" },
        { status: 404 }
      );
    }

    // Sanitize empty-string ObjectId fields (e.g. `group: ""` from edit form) -
    // Zod preprocess handles most cases, but defensively strip any remaining "" before Mongoose cast
    const updateData: Record<string, any> = { ...parsed.data };
    for (const key of Object.keys(updateData)) {
      if (updateData[key] === "") delete updateData[key];
    }

    // Handle center reassignment: clear old center's leader, set new center's leader
    if (updateData.center && String(updateData.center) !== String(existingLeader.center)) {
      if (existingLeader.center) {
        await Center.findByIdAndUpdate(existingLeader.center, { $unset: { leader: "" } });
      }
      await Center.findByIdAndUpdate(updateData.center, { leader: id });
    }

    const leader = await Leader.findByIdAndUpdate(id, updateData, { returnDocument: "after", runValidators: true }).lean();

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
    const leaderDoc = await Leader.findById(id).lean();
    if (leaderDoc?.center) {
      await Center.findByIdAndUpdate(leaderDoc.center, { $unset: { leader: "" } });
    }
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
