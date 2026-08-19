import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AssignedCollection from "../../../lib/models/AssignedCollection";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const data = await AssignedCollection.create(body);

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const data = await AssignedCollection.find()
      .populate("branchId", "name")
      .populate("centerId", "name")
      .populate("staffId", "firstName lastName email phone");

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}