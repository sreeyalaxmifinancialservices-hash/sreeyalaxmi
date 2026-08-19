import { NextRequest, NextResponse } from "next/server";
import Inquiry from "@/lib/models/Inquiry";
import Member from "@/lib/models/Member";
import Leader from "@/lib/models/Leader";
import Center from "@/lib/models/Center";
import Group from "@/lib/models/Group";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await requireAuth();

    const { id } = await params;
    const inquiry = await Inquiry.findById(id)
      .populate("member", "firstName lastName memberCode phone")
      .populate("branch", "name code")
      .populate("assignedTo", "name email")
      .populate("submittedBy", "name email")
      .populate("editRequest.entityId", "name firstName lastName memberCode code phone email")
      .populate("memberRequest.memberId", "firstName lastName memberCode phone")
      .populate({ path: "groupRequest.groupId", select: "name code center", strictPopulate: false })
      .populate("history.performedBy", "name email")
      .lean();

    if (!inquiry) {
      return NextResponse.json(
        { success: false, error: "Inquiry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: inquiry });
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await requireAuth();

    const { id } = await params;
    const body = await req.json();
    const { status, remarks, assignedTo } = body;

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return NextResponse.json(
        { success: false, error: "Inquiry not found" },
        { status: 404 }
      );
    }

    if (status) inquiry.status = status;
    if (assignedTo) inquiry.assignedTo = assignedTo;
    if (remarks) inquiry.remarks = remarks;

    if (status === "completed" && inquiry.editRequest) {
      const { entityType, entityId, newValues } = inquiry.editRequest;

      try {
        if (entityType === "member") {
          if (newValues.group) {
            const existingMember = await Member.findById(entityId).lean();
            if (existingMember?.group?.toString() !== newValues.group.toString()) {
              await Group.findByIdAndUpdate(existingMember.group, { $inc: { memberCount: -1 } });
              await Group.findByIdAndUpdate(newValues.group, { $inc: { memberCount: 1 } });
            }
          }
          await Member.findByIdAndUpdate(entityId, newValues);
        } else if (entityType === "leader") {
          await Leader.findByIdAndUpdate(entityId, newValues);
        } else if (entityType === "center") {
          await Center.findByIdAndUpdate(entityId, newValues);
        }
      } catch (applyError) {
        console.error("Failed to apply edit:", applyError);
        return NextResponse.json(
          { success: false, error: "Failed to apply changes to the entity" },
          { status: 500 }
        );
      }
    }

    if (status === "completed" && inquiry.memberRequest) {
      const { action, memberData, memberId } = inquiry.memberRequest;

      try {
        if (action === "add" && memberData) {
          const newMember = await Member.create({
            ...memberData,
            dob: new Date(memberData.dob),
            verificationStatus: "verified",
            status: "active",
          });
          if (newMember.group) {
            await Group.findByIdAndUpdate(newMember.group, { $inc: { memberCount: 1 } });
          }
        } else if (action === "delete" && memberId) {
          const memberToDelete = await Member.findById(memberId);
          await Member.findByIdAndUpdate(memberId, { status: "inactive" });
          if (memberToDelete?.group) {
            await Group.findByIdAndUpdate(memberToDelete.group, { $inc: { memberCount: -1 } });
          }
        }
      } catch (applyError) {
        console.error("Failed to apply member request:", applyError);
        return NextResponse.json(
          { success: false, error: "Failed to apply member request" },
          { status: 500 }
        );
      }
    }

    if (status === "completed" && inquiry.groupRequest) {
      const { action, groupData, groupId, newValues } = inquiry.groupRequest;

      try {
        if (action === "add" && groupData) {
          const groupCount = await Group.countDocuments();
          const code = groupData.code || `GRP${String(groupCount + 1).padStart(5, "0")}`;

          await Group.create({
            name: groupData.name,
            code,
            center: groupData.center,
            branch: groupData.branch,
            status: "active",
          });
        } else if (action === "edit" && groupId && newValues) {
          await Group.findByIdAndUpdate(groupId, newValues);
        } else if (action === "delete" && groupId) {
          await Group.findByIdAndUpdate(groupId, { status: "inactive" });
        }
      } catch (applyError) {
        console.error("Failed to apply group request:", applyError);
        return NextResponse.json(
          { success: false, error: "Failed to apply group request" },
          { status: 500 }
        );
      }
    }

    if (status === "completed" && inquiry.leaderRequest) {
      const { action, leaderData, leaderId, newValues } = inquiry.leaderRequest;

      try {
        if (action === "add" && leaderData) {
          const leaderCount = await Leader.countDocuments();
          const leaderId = `LD${String(leaderCount + 1).padStart(6, "0")}`;

          const leader = await Leader.create({
            leaderId,
            firstName: leaderData.firstName,
            lastName: leaderData.lastName || "-",
            phone: leaderData.phone || "-",
            email: leaderData.email || "-",
            group: leaderData.group,
            status: "active",
          });

          if (leaderData.group) {
            await Group.findByIdAndUpdate(leaderData.group, { leader: leader._id });
          }
        } else if (action === "edit" && leaderId && newValues) {
          await Leader.findByIdAndUpdate(leaderId, newValues);
        } else if (action === "delete" && leaderId) {
          await Leader.findByIdAndUpdate(leaderId, { status: "inactive" });
        }
      } catch (applyError) {
        console.error("Failed to apply leader request:", applyError);
        return NextResponse.json(
          { success: false, error: "Failed to apply leader request" },
          { status: 500 }
        );
      }
    }

    inquiry.history.push({
      action: status ? `Status changed to ${status}` : "Inquiry updated",
      performedBy: user.id,
      date: new Date(),
      remarks: remarks || "",
    });

    await inquiry.save();

    return NextResponse.json({ success: true, data: inquiry, message: "Inquiry updated successfully" });
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
