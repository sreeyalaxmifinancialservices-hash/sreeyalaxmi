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
      .populate("leader", "firstName lastName phone email member")
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

    const updateData: Record<string, any> = { ...parsed.data };
    const newLeaderVal = updateData.leader;
    delete updateData.leader;

    const existingCenter = await Center.findById(id).lean();
    if (!existingCenter) {
      return NextResponse.json(
        { success: false, error: "Center not found" },
        { status: 404 }
      );
    }

    // Handle leader reassignment for center
    if (newLeaderVal !== undefined) {
      const Leader = (await import("@/lib/models/Leader")).default;
      const Member = (await import("@/lib/models/Member")).default;

      // Determine new leaderId (could be empty string for clearing)
      let newLeaderId: any = null;
      if (newLeaderVal) {
        const existingLeader = await Leader.findById(newLeaderVal).lean();
        if (existingLeader) {
          newLeaderId = existingLeader._id;
        } else {
          const member = await Member.findById(newLeaderVal).lean();
          if (member) {
            const existingForMember = await Leader.findOne({ member: member._id }).lean();
            if (existingForMember) {
              newLeaderId = existingForMember._id;
              await Leader.findByIdAndUpdate(newLeaderId, { center: id });
            } else {
              const leaderCount = await Leader.countDocuments();
              const newLeader = await Leader.create({
                leaderId: `LD${String(leaderCount + 1).padStart(6, "0")}`,
                firstName: member.firstName,
                lastName: member.lastName,
                phone: member.phone,
                email: member.email || `${member.memberCode}@member.local`,
                center: id,
                member: member._id,
                status: "active",
              });
              newLeaderId = newLeader._id;
            }
          }
        }
      }

      const oldLeaderId = (existingCenter as any).leader;
      if (String(oldLeaderId || "") !== String(newLeaderId || "")) {
        if (oldLeaderId && !newLeaderId) {
          // clearing leader: optionally keep leader but unset center?
          await Leader.findByIdAndUpdate(oldLeaderId, { $unset: { center: "" } });
        } else if (newLeaderId) {
          if (oldLeaderId) {
            await Leader.findByIdAndUpdate(oldLeaderId, { $unset: { center: "" } });
          }
          await Leader.findByIdAndUpdate(newLeaderId, { center: id });
        }
      }
      (updateData as any).leader = newLeaderId || null;
    }

    const center = await Center.findByIdAndUpdate(id, updateData, { new: true }).lean();

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
