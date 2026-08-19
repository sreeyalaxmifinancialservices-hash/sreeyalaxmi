import { NextRequest, NextResponse } from "next/server";
import Collection from "@/lib/models/Collection";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await requireAuth();

    const { id } = await params;
    const collection = await Collection.findById(id).lean();

    if (!collection) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: collection });
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
    await requireAuth();

    const { id } = await params;
    const body = await req.json();

    const collection = await Collection.findByIdAndUpdate(id, body, { new: true }).lean();

    if (!collection) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: collection, message: "Collection updated successfully" });
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
