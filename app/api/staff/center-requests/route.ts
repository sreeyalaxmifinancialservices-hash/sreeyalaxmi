import { NextRequest, NextResponse } from "next/server";
import CenterRequest from "@/lib/models/CenterRequest";
import Staff from "@/lib/models/Staff";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const staff = await Staff.findOne({ user: user._id }).lean();
    if (!staff) {
      return NextResponse.json({ success: false, error: "Staff not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { staff: staff._id };
    if (status && status !== "all") filter.status = status;

    const [requests, total] = await Promise.all([
      CenterRequest.find(filter)
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
    if (error.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const staff = await Staff.findOne({ user: user._id }).lean();
    if (!staff) {
      return NextResponse.json({ success: false, error: "Staff not found" }, { status: 404 });
    }

    const body = await req.json();
    const { requestType, center, branch, leaderName, leaderPhone, leaderEmail, newCenterName, newCenterCode, newCenterMeetingDay, newCenterMeetingTime, newCenterLocation, addGroup, groupName, groupCode } = body;

    if (!requestType || !branch) {
      return NextResponse.json(
        { success: false, error: "Request type and branch are required" },
        { status: 400 }
      );
    }

    if (requestType === "existing-center" && !center) {
      return NextResponse.json(
        { success: false, error: "Center is required for existing center request" },
        { status: 400 }
      );
    }

    if (requestType === "new-center") {
      if (!newCenterName || !newCenterCode || !newCenterMeetingDay || !newCenterMeetingTime || !newCenterLocation) {
        return NextResponse.json(
          { success: false, error: "All new center fields are required" },
          { status: 400 }
        );
      }
    }

    const requestData: Record<string, any> = {
      staff: staff._id,
      requestType,
      branch,
    };

    if (requestType === "existing-center") {
      requestData.center = center;
    } else {
      requestData.newCenterName = newCenterName;
      requestData.newCenterCode = newCenterCode;
      requestData.newCenterMeetingDay = newCenterMeetingDay;
      requestData.newCenterMeetingTime = newCenterMeetingTime;
      requestData.newCenterLocation = newCenterLocation;
      requestData.center = center || undefined;
    }

    if (leaderName) requestData.leaderName = leaderName;
    if (leaderPhone) requestData.leaderPhone = leaderPhone;
    if (leaderEmail) requestData.leaderEmail = leaderEmail;

    if (addGroup && groupName) {
      requestData.addGroup = true;
      requestData.groupName = groupName;
      requestData.groupCode = groupCode || "";
    }

    const request = await CenterRequest.create(requestData);

    return NextResponse.json(
      { success: true, data: request, message: "Center request submitted successfully" },
      { status: 201 }
    );
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
