import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Branch from "@/lib/models/Branch";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const { branchName, createdBy } = body;

    if (!branchName || !createdBy) {
      return NextResponse.json({
        success: false,
        message: "All fields are required",
      });
    }

    const count = await Branch.countDocuments();

    const branchId =
      "BR" + String(count + 1).padStart(4, "0");

    const branch = await Branch.create({
      branchId,
      branchName,
      createdBy,
    });

    return NextResponse.json({
      success: true,
      message: "Branch Created Successfully",
      branch,
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const branches = await Branch.find().sort({
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      branches,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}