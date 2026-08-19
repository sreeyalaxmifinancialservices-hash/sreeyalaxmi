import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import AssignedCollection from "../../../../lib/models/AssignedCollection";
import Collection from "../../../../lib/models/Collection";

async function generateCollectionId(): Promise<string> {
  const count = await Collection.countDocuments();
  return `CL${String(count + 1).padStart(6, "0")}`;
}

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  req: NextRequest,
  { params }: Params
) {
  try {
    await connectDB();

    const { id } = await params;

    const data = await AssignedCollection.findById(id)
      .populate("branchId", "name")
      .populate("centerId", "name")
      .populate("staffId", "firstName lastName email phone");

    if (!data) {
      return NextResponse.json(
        { message: "Not Found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: Params
) {
  try {
    await connectDB();

    const body = await req.json();

    const { id } = await params;

    const data = await AssignedCollection.findByIdAndUpdate(
      id,
      body,
      {
        new: true,
        runValidators: true,
      }
    ).populate("branchId", "name")
     .populate("centerId", "name code")
     .populate("staffId", "firstName lastName");

    if (!data) {
      return NextResponse.json(
        { message: "Not Found" },
        { status: 404 }
      );
    }

    const { status, collectedAmount } = body;

    if (status === "Complete" || status === "Partially Complete") {
      if (collectedAmount > 0) {
        const existingCollection = await Collection.findOne({
          collectionId: `AC-${id}`,
        });

        if (!existingCollection) {
          const branchId = data.branchId?._id || data.branchId;
          const centerDoc = data.centerId;
          const centerId = centerDoc?._id || centerDoc;
          const newCollectionId = await generateCollectionId();

          await Collection.create({
            collectionId: newCollectionId,
            staffName: data.staffName,
            centerId: centerDoc?.name || "",
            branch: branchId,
            center: centerId,
            collectionDate: data.collectionDate || new Date(),
            cashAmount: collectedAmount,
            total: collectedAmount,
            centerName: centerDoc?.name || "",
            remarks: `From assigned collection - ${status}`,
            status: "completed",
          });
        } else {
          existingCollection.cashAmount = collectedAmount;
          existingCollection.total = collectedAmount;
          existingCollection.remarks = `From assigned collection - ${status}`;
          await existingCollection.save();
        }
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  try {
    await connectDB();

    const { id } = await params;

    await Collection.deleteMany({ remarks: { $regex: id } });
    await AssignedCollection.findByIdAndDelete(id);

    return NextResponse.json({
      message: "Deleted Successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}