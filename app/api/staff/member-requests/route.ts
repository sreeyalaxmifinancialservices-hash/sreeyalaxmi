import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Inquiry from "@/lib/models/Inquiry";
import Member from "@/lib/models/Member";
import Branch from "@/lib/models/Branch";
import Center from "@/lib/models/Center";
import Group from "@/lib/models/Group";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, memberData, memberId } = body;

    if (!action || !["add", "delete"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Action must be 'add' or 'delete'" },
        { status: 400 }
      );
    }

    if (action === "add") {
      if (!memberData) {
        return NextResponse.json(
          { success: false, error: "Member data is required for add action" },
          { status: 400 }
        );
      }

      const requiredFields = ["memberCode", "firstName", "lastName", "phone", "aadhaar", "dob", "gender", "branch", "center", "group"];
      const missingFields = requiredFields.filter((f) => !memberData[f]);
      if (missingFields.length > 0) {
        return NextResponse.json(
          { success: false, error: `Missing required fields: ${missingFields.join(", ")}` },
          { status: 400 }
        );
      }

      if (!memberData.address || !memberData.address.street || !memberData.address.city || !memberData.address.state || !memberData.address.pincode) {
        return NextResponse.json(
          { success: false, error: "Address fields (street, city, state, pincode) are required" },
          { status: 400 }
        );
      }

      const existingAadhaar = await Member.findOne({ aadhaar: memberData.aadhaar });
      if (existingAadhaar) {
        return NextResponse.json(
          { success: false, error: "Member with this Aadhaar already exists" },
          { status: 400 }
        );
      }

      const existingCode = await Member.findOne({ memberCode: memberData.memberCode });
      if (existingCode) {
        return NextResponse.json(
          { success: false, error: "Member with this Member ID already exists" },
          { status: 400 }
        );
      }

      const [branch, center, group] = await Promise.all([
        Branch.findById(memberData.branch).lean(),
        Center.findById(memberData.center).lean(),
        Group.findById(memberData.group).lean(),
      ]);

      if (!branch) return NextResponse.json({ success: false, error: "Branch not found" }, { status: 404 });
      if (!center) return NextResponse.json({ success: false, error: "Center not found" }, { status: 404 });
      if (!group) return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });

      const inquiryCount = await Inquiry.countDocuments();
      const inquiryNumber = `INQ${String(inquiryCount + 1).padStart(6, "0")}`;

      const memberName = `${memberData.firstName} ${memberData.lastName}`;

      const inquiry = await Inquiry.create({
        inquiryNumber,
        type: "member_add",
        branch: memberData.branch,
        submittedBy: user._id,
        status: "pending",
        memberRequest: {
          action: "add",
          memberData: {
            memberCode: memberData.memberCode,
            firstName: memberData.firstName,
            lastName: memberData.lastName,
            guardianName: memberData.guardianName || "",
            phone: memberData.phone,
            email: memberData.email || "",
            aadhaar: memberData.aadhaar,
            pan: memberData.pan || "",
            dob: memberData.dob,
            gender: memberData.gender,
            address: memberData.address,
            branch: memberData.branch,
            center: memberData.center,
            group: memberData.group,
            photo: memberData.photo || "",
          },
          memberName,
        },
        history: [
          {
            action: `Member add request submitted: ${memberName}`,
            performedBy: user._id,
            date: new Date(),
            remarks: `New member request for ${branch.name} / ${center.name} / ${group.name}`,
          },
        ],
      });

      return NextResponse.json(
        { success: true, data: inquiry, message: "Member add request submitted for admin approval" },
        { status: 201 }
      );
    } else {
      if (!memberId) {
        return NextResponse.json(
          { success: false, error: "Member ID is required for delete action" },
          { status: 400 }
        );
      }

      const member = await Member.findById(memberId).lean();
      if (!member) {
        return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
      }

      const memberName = `${member.firstName} ${member.lastName}`;

      const inquiryCount = await Inquiry.countDocuments();
      const inquiryNumber = `INQ${String(inquiryCount + 1).padStart(6, "0")}`;

      const inquiry = await Inquiry.create({
        inquiryNumber,
        type: "member_delete",
        branch: member.branch,
        submittedBy: user._id,
        status: "pending",
        memberRequest: {
          action: "delete",
          memberId: member._id,
          memberName,
        },
        history: [
          {
            action: `Member delete request submitted: ${memberName}`,
            performedBy: user._id,
            date: new Date(),
            remarks: `Delete request for member ${member.memberCode}`,
          },
        ],
      });

      return NextResponse.json(
        { success: true, data: inquiry, message: "Member delete request submitted for admin approval" },
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
