import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Inquiry from "@/lib/models/Inquiry";
import Group from "@/lib/models/Group";
import Center from "@/lib/models/Center";
import Branch from "@/lib/models/Branch";

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
      type: { $in: ["group_add", "group_edit", "group_delete"] },
    };

    if (status && status !== "all") filter.status = status;
    if (action) filter["groupRequest.action"] = action;

    const [requests, total] = await Promise.all([
      Inquiry.find(filter)
        .populate("groupRequest.groupId", "name code center")
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
    const { action, groupData, groupId } = body;

    if (!action || !["add", "edit", "delete"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Action must be 'add', 'edit', or 'delete'" },
        { status: 400 }
      );
    }

    if (action === "add") {
      if (!groupData) {
        return NextResponse.json(
          { success: false, error: "Group data is required for add action" },
          { status: 400 }
        );
      }

      if (!groupData.name || !groupData.center || !groupData.branch) {
        return NextResponse.json(
          { success: false, error: "Group name, center, and branch are required" },
          { status: 400 }
        );
      }

      const [center, branch] = await Promise.all([
        Center.findById(groupData.center).lean(),
        Branch.findById(groupData.branch).lean(),
      ]);

      if (!center) return NextResponse.json({ success: false, error: "Center not found" }, { status: 404 });
      if (!branch) return NextResponse.json({ success: false, error: "Branch not found" }, { status: 404 });

      const inquiryCount = await Inquiry.countDocuments();
      const inquiryNumber = `INQ${String(inquiryCount + 1).padStart(6, "0")}`;

      const inquiry = await Inquiry.create({
        inquiryNumber,
        type: "group_add",
        branch: groupData.branch,
        submittedBy: user._id,
        status: "pending",
        groupRequest: {
          action: "add",
          groupData: {
            name: groupData.name,
            code: groupData.code || "",
            center: groupData.center,
            branch: groupData.branch,
          },
          groupName: groupData.name,
        },
        history: [
          {
            action: `Group add request submitted: ${groupData.name}`,
            performedBy: user._id,
            date: new Date(),
            remarks: `New group for ${center.name} / ${branch.name}`,
          },
        ],
      });

      return NextResponse.json(
        { success: true, data: inquiry, message: "Group add request submitted for admin approval" },
        { status: 201 }
      );
    } else if (action === "edit") {
      if (!groupId || !groupData) {
        return NextResponse.json(
          { success: false, error: "groupId and groupData are required for edit action" },
          { status: 400 }
        );
      }

      const group = await Group.findById(groupId).lean();
      if (!group) {
        return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
      }

      const oldValues: Record<string, any> = {};
      const newValues: Record<string, any> = {};
      const allowedFields = ["name"];

      for (const field of allowedFields) {
        if (groupData[field] !== undefined && groupData[field] !== group[field]) {
          oldValues[field] = group[field];
          newValues[field] = groupData[field];
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
        type: "group_edit",
        branch: group.branch,
        submittedBy: user._id,
        status: "pending",
        groupRequest: {
          action: "edit",
          groupId: group._id,
          groupName: group.name,
          oldValues,
          newValues,
        },
        history: [
          {
            action: `Group edit request submitted: ${group.name}`,
            performedBy: user._id,
            date: new Date(),
            remarks: `Requested changes: ${Object.keys(newValues).join(", ")}`,
          },
        ],
      });

      return NextResponse.json(
        { success: true, data: inquiry, message: "Group edit request submitted for admin approval" },
        { status: 201 }
      );
    } else {
      if (!groupId) {
        return NextResponse.json(
          { success: false, error: "Group ID is required for delete action" },
          { status: 400 }
        );
      }

      const group = await Group.findById(groupId).lean();
      if (!group) {
        return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
      }

      const inquiryCount = await Inquiry.countDocuments();
      const inquiryNumber = `INQ${String(inquiryCount + 1).padStart(6, "0")}`;

      const inquiry = await Inquiry.create({
        inquiryNumber,
        type: "group_delete",
        branch: group.branch,
        submittedBy: user._id,
        status: "pending",
        groupRequest: {
          action: "delete",
          groupId: group._id,
          groupName: group.name,
        },
        history: [
          {
            action: `Group delete request submitted: ${group.name}`,
            performedBy: user._id,
            date: new Date(),
            remarks: `Delete request for group ${group.code}`,
          },
        ],
      });

      return NextResponse.json(
        { success: true, data: inquiry, message: "Group delete request submitted for admin approval" },
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
