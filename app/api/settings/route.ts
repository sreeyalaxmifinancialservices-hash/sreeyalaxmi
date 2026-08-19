import { NextRequest, NextResponse } from "next/server";
import Setting from "@/lib/models/Setting";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ensureDefaultSettings } from "@/lib/settings";

export async function GET() {
  try {
    await connectDB();
    await ensureDefaultSettings();

    const settings = await Setting.find({}).sort({ category: 1, key: 1 }).lean();

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    await requireRole(["admin"]);

    const body = await req.json();
    const { settings } = body;

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { success: false, error: "Settings must be an array" },
        { status: 400 }
      );
    }

    const operations = settings.map((item: { key: string; value: any; description?: string; category?: string }) =>
      Setting.findOneAndUpdate(
        { key: item.key },
        { $set: { value: item.value, ...(item.description && { description: item.description }), ...(item.category && { category: item.category }) } },
        { upsert: true, new: true }
      )
    );

    await Promise.all(operations);

    const updatedSettings = await Setting.find({}).sort({ category: 1, key: 1 }).lean();

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: "Settings updated successfully",
    });
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
