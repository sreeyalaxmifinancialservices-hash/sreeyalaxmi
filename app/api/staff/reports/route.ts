import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Loan from "@/lib/models/Loan";
import Repayment from "@/lib/models/Repayment";
import Collection from "@/lib/models/Collection";
import Center from "@/lib/models/Center";
import Staff from "@/lib/models/Staff";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user || user.role !== "staff") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const staff = await Staff.findOne({ user: user._id }).lean();
    if (!staff) {
      return NextResponse.json({ success: false, error: "Staff record not found" }, { status: 404 });
    }

    const centerIds = staff.assignedCenters;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "daily-branch";
    const center = searchParams.get("center");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const dateFilter: Record<string, any> = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom);
    if (dateTo) dateFilter.$lte = new Date(dateTo);

    const centerFilter = center ? [center] : centerIds;

    let reportData: any = {};

    switch (type) {
      case "daily-branch": {
        const [loanSummary, collectionSummary] = await Promise.all([
          Loan.aggregate([
            { $match: { center: { $in: centerFilter }, ...(dateFrom || dateTo ? { createdAt: dateFilter } : {}) } },
            { $group: { _id: "$status", count: { $sum: 1 }, totalAmount: { $sum: "$loanAmount" } } },
          ]),
          Collection.aggregate([
            { $match: { center: { $in: centerFilter }, ...(dateFrom || dateTo ? { collectionDate: dateFilter } : {}) } },
            { $group: { _id: null, totalCollected: { $sum: "$total" }, cash: { $sum: "$cashAmount" }, online: { $sum: "$onlineAmount" } } },
          ]),
        ]);

        reportData = {
          type: "daily-branch",
          loanSummary,
          collectionSummary: collectionSummary[0] || { totalCollected: 0, cash: 0, online: 0 },
        };
        break;
      }

      case "weekly-repayment": {
        const repayments = await Repayment.find({
          center: { $in: centerFilter },
          ...(dateFrom || dateTo ? { paymentDate: dateFilter } : {}),
        })
          .populate("loan", "loanId")
          .populate("member", "firstName lastName memberCode")
          .sort({ paymentDate: -1 })
          .lean();

        const totalCollected = repayments.reduce((sum, r) => sum + (r.total || 0), 0);
        const totalPrincipal = repayments.reduce((sum, r) => sum + (r.principal || 0), 0);

        reportData = {
          type: "weekly-repayment",
          repayments,
          summary: { totalCollected, totalPrincipal },
        };
        break;
      }

      case "collection": {
        const collections = await Collection.find({
          center: { $in: centerFilter },
          ...(dateFrom || dateTo ? { collectionDate: dateFilter } : {}),
        }).sort({ collectionDate: -1 }).lean();

        const totalAmount = collections.reduce((sum, c) => sum + (c.total || 0), 0);
        const totalCash = collections.reduce((sum, c) => sum + (c.cashAmount || 0), 0);
        const totalOnline = collections.reduce((sum, c) => sum + (c.onlineAmount || 0), 0);

        reportData = {
          type: "collection",
          collections,
          summary: { totalAmount, totalCash, totalOnline },
        };
        break;
      }

      case "center": {
        const centers = await Center.find({ _id: { $in: centerFilter } })
          .populate("branch", "name")
          .populate("leader", "firstName lastName")
          .lean();

        reportData = {
          type: "center",
          centers,
          summary: { total: centers.length },
        };
        break;
      }

      case "outstanding": {
        const matchFilter: Record<string, any> = {
          center: { $in: centerFilter },
          status: { $in: ["active", "disbursed"] },
          outstandingBalance: { $gt: 0 },
        };
        if (center) matchFilter.center = new mongoose.Types.ObjectId(center);

        const outstandingData = await Loan.aggregate([
          { $match: matchFilter },
          {
            $lookup: {
              from: "centers",
              localField: "center",
              foreignField: "_id",
              as: "centerDoc",
            },
          },
          { $unwind: { path: "$centerDoc", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "branches",
              localField: "branch",
              foreignField: "_id",
              as: "branchDoc",
            },
          },
          { $unwind: { path: "$branchDoc", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "groups",
              localField: "group",
              foreignField: "_id",
              as: "groupDoc",
            },
          },
          { $unwind: { path: "$groupDoc", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "leaders",
              localField: "groupDoc.leader",
              foreignField: "_id",
              as: "leaderDoc",
            },
          },
          { $unwind: { path: "$leaderDoc", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "staffs",
              localField: "centerDoc.staff",
              foreignField: "_id",
              as: "staffDoc",
            },
          },
          { $unwind: { path: "$staffDoc", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "members",
              localField: "member",
              foreignField: "_id",
              as: "memberDoc",
            },
          },
          { $unwind: { path: "$memberDoc", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: "$center",
              centerName: { $first: { $ifNull: ["$centerDoc.name", "—"] } },
              branchName: { $first: { $ifNull: ["$branchDoc.name", "—"] } },
              leaderName: {
                $first: {
                  $cond: [
                    { $ne: ["$leaderDoc", null] },
                    { $concat: ["$leaderDoc.firstName", " ", "$leaderDoc.lastName"] },
                    "—",
                  ],
                },
              },
              staffName: {
                $first: {
                  $cond: [
                    { $ne: ["$staffDoc", null] },
                    { $concat: ["$staffDoc.firstName", " ", "$staffDoc.lastName"] },
                    "—",
                  ],
                },
              },
              groupName: { $first: { $ifNull: ["$groupDoc.name", "—"] } },
              totalOutstanding: { $sum: "$outstandingBalance" },
              totalLoanAmount: { $sum: "$loanAmount" },
              loanCount: { $sum: 1 },
              loans: {
                $push: {
                  loanId: "$loanId",
                  memberName: {
                    $cond: [
                      { $ne: ["$memberDoc", null] },
                      { $concat: ["$memberDoc.firstName", " ", "$memberDoc.lastName"] },
                      "—",
                    ],
                  },
                  loanAmount: "$loanAmount",
                  outstandingBalance: "$outstandingBalance",
                  installmentsPaid: "$installmentsPaid",
                  disbursementDate: "$disbursementDate",
                },
              },
            },
          },
          { $sort: { branchName: 1, centerName: 1 } },
        ]);

        const totalOutstanding = outstandingData.reduce((s, r) => s + r.totalOutstanding, 0);
        const totalLoans = outstandingData.reduce((s, r) => s + r.loanCount, 0);

        reportData = {
          type: "outstanding",
          centerWiseData: outstandingData,
          summary: {
            totalOutstanding,
            totalLoans,
            totalCenters: outstandingData.length,
          },
        };
        break;
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid report type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: reportData });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
