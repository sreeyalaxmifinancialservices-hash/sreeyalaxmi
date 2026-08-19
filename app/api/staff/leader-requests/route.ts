import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Inquiry from "@/lib/models/Inquiry";
import Leader from "@/lib/models/Leader";
import Group from "@/lib/models/Group";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const action = searchParams.get("action");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      submittedBy: user._id,
      type: { $in: ["leader_add", "leader_edit", "leader_delete"] },
    };

    if (status && status !== "all") filter.status = status;
    if (action) filter["leaderRequest.action"] = action;

    const [requests, total] = await Promise.all([
      Inquiry.find(filter)
        .populate("leaderRequest.leaderId", "firstName lastName phone group")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Inquiry.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, leaderData, leaderId } = body;

    if (!action || !["add", "edit", "delete"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Action must be 'add', 'edit', or 'delete'" },
        { status: 400 }
      );
    }

    if (action === "add") {
      if (!leaderData) {
        return NextResponse.json(
          { success: false, error: "Leader data is required for add action" },
          { status: 400 }
        );
      }

      if (!leaderData.firstName || !leaderData.group) {
        return NextResponse.json(
          { success: false, error: "Leader first name and group are required" },
          { status: 400 }
        );
      }

      const group = await Group.findById(leaderData.group).lean();
      if (!group) return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });

      const inquiryCount = await Inquiry.countDocuments();
      const inquiryNumber = `INQ${String(inquiryCount + 1).padStart(6, "0")}`;

      const inquiry = await Inquiry.create({
        inquiryNumber,
        type: "leader_add",
        branch: group.branch,
        submittedBy: user._id,
        status: "pending",
        leaderRequest: {
          action: "add",
          leaderData: {
            firstName: leaderData.firstName,
            lastName: leaderData.lastName || "",
            phone: leaderData.phone || "",
            email: leaderData.email || "",
            group: leaderData.group,
          },
          leaderName: leaderData.firstName,
        },
        history: [
          {
            action: `Leader add request submitted: ${leaderData.firstName}`,
            performedBy: user._id,
            date: new Date(),
            remarks: `New leader for ${group.name}`,
          },
        ],
      });

      return NextResponse.json(
        { success: true, data: inquiry, message: "Leader add request submitted for admin approval" },
        { status: 201 }
      );
    } else if (action === "edit") {
      if (!leaderId || !leaderData) {
        return NextResponse.json(
          { success: false, error: "leaderId and leaderData are required for edit action" },
          { status: 400 }
        );
      }

      const leader = await Leader.findById(leaderId).lean();
      if (!leader) {
        return NextResponse.json({ success: false, error: "Leader not found" }, { status: 404 });
      }

      const oldValues: Record<string, any> = {};
      const newValues: Record<string, any> = {};
      const allowedFields = ["firstName", "lastName", "phone", "email"];

      for (const field of allowedFields) {
        if (leaderData[field] !== undefined && leaderData[field] !== (leader as any)[field]) {
          oldValues[field] = (leader as any)[field];
          newValues[field] = leaderData[field];
        }
      }

      if (Object.keys(newValues).length === 0) {
        return NextResponse.json(
          { success: false, error: "No changes to update" },
          { status: 400 }
        );
      }

      const inquiryCount = await Inquiry.countDocuments();
      const inquiryNumber = `INQ${String(inquiryCount + 1).padStart(6, "0")}`;

      const inquiry = await Inquiry.create({
        inquiryNumber,
        type: "leader_edit",
        branch: leader.group ? (await Group.findById(leader.group).lean())?.branch : undefined,
        submittedBy: user._id,
        status: "pending",
        leaderRequest: {
          action: "edit",
          leaderId: leader._id,
          leaderName: leader.firstName,
          oldValues,
          newValues,
        },
        history: [
          {
            action: `Leader edit request submitted: ${leader.firstName}`,
            performedBy: user._id,
            date: new Date(),
            remarks: `Requested changes: ${Object.keys(newValues).join(", ")}`,
          },
        ],
      });

      return NextResponse.json(
        { success: true, data: inquiry, message: "Leader edit request submitted for admin approval" },
        { status: 201 }
      );
    } else {
      if (!leaderId) {
        return NextResponse.json(
          { success: false, error: "Leader ID is required for delete action" },
          { status: 400 }
        );
      }

      const leader = await Leader.findById(leaderId).lean();
      if (!leader) {
        return NextResponse.json({ success: false, error: "Leader not found" }, { status: 404 });
      }

      const inquiryCount = await Inquiry.countDocuments();
      const inquiryNumber = `INQ${String(inquiryCount + 1).padStart(6, "0")}`;

      const inquiry = await Inquiry.create({
        inquiryNumber,
        type: "leader_delete",
        branch: leader.group ? (await Group.findById(leader.group).lean())?.branch : undefined,
        submittedBy: user._id,
        status: "pending",
        leaderRequest: {
          action: "delete",
          leaderId: leader._id,
          leaderName: leader.firstName,
        },
        history: [
          {
            action: `Leader delete request submitted: ${leader.firstName}`,
            performedBy: user._id,
            date: new Date(),
            remarks: `Delete request for leader ${leader.firstName} ${leader.lastName}`,
          },
        ],
      });

      return NextResponse.json(
        { success: true, data: inquiry, message: "Leader delete request submitted for admin approval" },
        { status: 201 }
      );
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
