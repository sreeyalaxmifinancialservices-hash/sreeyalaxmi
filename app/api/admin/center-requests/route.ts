import { NextRequest, NextResponse } from "next/server";
import CenterRequest from "@/lib/models/CenterRequest";
import Center from "@/lib/models/Center";
import Staff from "@/lib/models/Staff";
import Leader from "@/lib/models/Leader";
import Group from "@/lib/models/Group";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireRole(["admin"]);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (status && status !== "all") filter.status = status;

    const [requests, total] = await Promise.all([
      CenterRequest.find(filter)
        .populate("staff", "firstName lastName employeeId")
        .populate("center", "name code")
        .populate("branch", "name code")
        .populate("reviewedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CenterRequest.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error(error);
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
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
    const { action } = body;

    if (action === "fix-missing-leaders") {
      const approvedWithLeader = await CenterRequest.find({
        status: "approved",
        leaderName: { $exists: true, $ne: "" },
      }).lean();

      let created = 0;
      for (const req of approvedWithLeader) {
        let centerId = req.center;
        if (req.requestType === "new-center" && !centerId) {
          const newCenter = await Center.findOne({ name: req.newCenterName, branch: req.branch }).lean();
          if (newCenter) centerId = newCenter._id;
        }
        if (centerId && req.groupName) {
          const group = await Group.findOne({ center: centerId, name: req.groupName }).lean();
          if (group) {
            const existingLeader = await Leader.findOne({ group: group._id }).lean();
            if (!existingLeader) {
              const leaderCount = await Leader.countDocuments();
              const leaderId = `LD${String(leaderCount + created + 1).padStart(6, "0")}`;
              const nameParts = (req.leaderName || "").trim().split(/\s+/);
              const firstName = nameParts[0] || req.leaderName;
              const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";
              const leader = await Leader.create({
                leaderId,
                firstName,
                lastName,
                phone: req.leaderPhone || "-",
                email: req.leaderEmail || "-",
                group: group._id,
                status: "active",
              });
              await Group.findByIdAndUpdate(group._id, { leader: leader._id });
              created++;
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Fixed ${created} missing leader(s)`,
        created,
      });
    }

    if (action === "fix-missing-groups") {
      let created = 0;

      const approvedWithGroup = await CenterRequest.find({
        status: "approved",
        addGroup: true,
        groupName: { $exists: true, $ne: "" },
      }).lean();

      for (const req of approvedWithGroup) {
        let centerId = req.center;
        if (req.requestType === "new-center" && !centerId) {
          const newCenter = await Center.findOne({ name: req.newCenterName, branch: req.branch }).lean();
          if (newCenter) centerId = newCenter._id;
        }
        if (centerId) {
          const existingGroup = await Group.findOne({ center: centerId, name: req.groupName }).lean();
          if (!existingGroup) {
            const groupCount = await Group.countDocuments();
            const code = req.groupCode || `GRP${String(groupCount + created + 1).padStart(5, "0")}`;
            await Group.create({
              name: req.groupName,
              code,
              center: centerId,
              branch: req.branch,
              status: "active",
            });
            created++;
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Fixed ${created} group(s)`,
        created,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error(error);
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const user = await requireRole(["admin"]);

    const body = await req.json();
    const { requestId, status, remarks } = body;

    if (!requestId || !status) {
      return NextResponse.json(
        { success: false, error: "Request ID and status are required" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    const request = await CenterRequest.findById(requestId).lean();
    if (!request) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Request has already been reviewed" },
        { status: 400 }
      );
    }

    await CenterRequest.findByIdAndUpdate(requestId, {
      status,
      reviewedBy: user.id,
      reviewedAt: new Date(),
      remarks,
    });

    if (status === "approved") {
      if (request.requestType === "existing-center" && request.center) {
        const staffDoc = await Staff.findById(request.staff).lean();
        if (staffDoc) {
          const centerExists = staffDoc.assignedCenters.some(
            (c: any) => c.toString() === request.center.toString()
          );
          if (!centerExists) {
            await Staff.findByIdAndUpdate(request.staff, {
              $push: { assignedCenters: request.center },
            });
          }
        }

        await Center.findByIdAndUpdate(request.center, {
          staff: request.staff,
        });

        let groupId = request.center;
        if (request.addGroup && request.groupName) {
          const groupCount = await Group.countDocuments();
          const code = request.groupCode || `GRP${String(groupCount + 1).padStart(5, "0")}`;
          const group = await Group.create({
            name: request.groupName,
            code,
            center: request.center,
            branch: request.branch,
            status: "active",
          });
          groupId = group._id;
        }

        if (request.leaderName) {
          const existingLeader = await Leader.findOne({ group: groupId }).lean();
          if (!existingLeader) {
            const leaderCount = await Leader.countDocuments();
            const leaderId = `LD${String(leaderCount + 1).padStart(6, "0")}`;
            const nameParts = request.leaderName.trim().split(/\s+/);
            const firstName = nameParts[0] || request.leaderName;
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";
            const leader = await Leader.create({
              leaderId,
              firstName,
              lastName,
              phone: request.leaderPhone || "-",
              email: request.leaderEmail || "-",
              group: groupId,
              status: "active",
            });
            await Group.findByIdAndUpdate(groupId, { leader: leader._id });
          }
        }
      }

      if (request.requestType === "new-center") {
        const centerCount = await Center.countDocuments();
        const code = request.newCenterCode || `CTR${String(centerCount + 1).padStart(6, "0")}`;

        const newCenter = await Center.create({
          name: request.newCenterName,
          code,
          branch: request.branch,
          meetingDay: request.newCenterMeetingDay,
          meetingTime: request.newCenterMeetingTime,
          location: request.newCenterLocation,
          staff: request.staff,
          status: "active",
        });

        await Staff.findByIdAndUpdate(request.staff, {
          $push: { assignedCenters: newCenter._id },
        });

        let groupId = newCenter._id;
        if (request.addGroup && request.groupName) {
          const groupCount = await Group.countDocuments();
          const code = request.groupCode || `GRP${String(groupCount + 1).padStart(5, "0")}`;
          const group = await Group.create({
            name: request.groupName,
            code,
            center: newCenter._id,
            branch: request.branch,
            status: "active",
          });
          groupId = group._id;
        }

        if (request.leaderName) {
          const existingLeader = await Leader.findOne({ group: groupId }).lean();
          if (!existingLeader) {
            const leaderCount = await Leader.countDocuments();
            const leaderId = `LD${String(leaderCount + 1).padStart(6, "0")}`;
            const nameParts = request.leaderName.trim().split(/\s+/);
            const firstName = nameParts[0] || request.leaderName;
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";
            const leader = await Leader.create({
              leaderId,
              firstName,
              lastName,
              phone: request.leaderPhone || "-",
              email: request.leaderEmail || "-",
              group: groupId,
              status: "active",
            });
            await Group.findByIdAndUpdate(groupId, { leader: leader._id });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Request ${status} successfully`,
    });
  } catch (error: any) {
    console.error(error);
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
