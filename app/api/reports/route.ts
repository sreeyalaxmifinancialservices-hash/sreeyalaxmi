import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Loan from "@/lib/models/Loan";
import Repayment from "@/lib/models/Repayment";
import Collection from "@/lib/models/Collection";
import Member from "@/lib/models/Member";
import Center from "@/lib/models/Center";
import Branch from "@/lib/models/Branch";
import Group from "@/lib/models/Group";
import Leader from "@/lib/models/Leader";
import Staff from "@/lib/models/Staff";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "daily-branch";
    const branch = searchParams.get("branch");
    const center = searchParams.get("center");
    const staff = searchParams.get("staff");
    const leader = searchParams.get("leader");
    const loan = searchParams.get("loan");
    const member = searchParams.get("member");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const dateFilter: Record<string, any> = {};
    if (dateFrom || dateTo) {
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo);
    }

    let reportData: any = {};

    switch (type) {
      case "daily-branch": {
        const matchFilter: Record<string, any> = {};
        if (branch) matchFilter.branch = branch;

        const collectionMatch: Record<string, any> = {};
        if (branch) collectionMatch.branch = branch;

        const [loanSummary, collectionSummary, branchCollections] = await Promise.all([
          Loan.aggregate([
            { $match: { ...matchFilter, ...(dateFrom || dateTo ? { createdAt: dateFilter } : {}) } },
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                totalAmount: { $sum: "$loanAmount" },
              },
            },
          ]),
          Collection.aggregate([
            { $match: { ...collectionMatch, ...(dateFrom || dateTo ? { collectionDate: dateFilter } : {}) } },
            {
              $group: {
                _id: null,
                totalCollected: { $sum: "$total" },
                cash: { $sum: "$cashAmount" },
                online: { $sum: "$onlineAmount" },
              },
            },
          ]),
          Collection.aggregate([
            { $match: { ...collectionMatch, ...(dateFrom || dateTo ? { collectionDate: dateFilter } : {}) } },
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
              $group: {
                _id: "$branch",
                branchName: { $first: "$branchDoc.name" },
                totalAmount: { $sum: "$total" },
                cashAmount: { $sum: "$cashAmount" },
                onlineAmount: { $sum: "$onlineAmount" },
                count: { $sum: 1 },
              },
            },
            { $sort: { branchName: 1 } },
          ]),
        ]);

        reportData = {
          type: "daily-branch",
          loanSummary,
          collectionSummary: collectionSummary[0] || { totalCollected: 0, cash: 0, online: 0 },
          branchCollections,
        };
        break;
      }

      case "weekly-repayment": {
        const matchFilter: Record<string, any> = {};
        if (loan) matchFilter.loan = loan;
        if (member) matchFilter.member = member;

        const repayments = await Repayment.find({
          ...matchFilter,
          ...(dateFrom || dateTo ? { paymentDate: dateFilter } : {}),
        })
          .populate("loan", "loanId loanAmount")
          .populate("member", "firstName lastName memberCode")
          .sort({ paymentDate: -1 })
          .lean();

        const totalCollected = repayments.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
        const totalPrincipal = repayments.reduce((sum, r) => sum + (Number(r.principal) || 0), 0);
        const totalInterest = repayments.reduce((sum, r) => sum + ((Number(r.total) || 0) - (Number(r.principal) || 0)), 0);

        reportData = {
          type: "weekly-repayment",
          repayments,
          summary: { totalCollected, totalPrincipal, totalInterest },
        };
        break;
      }

      case "disbursement": {
        const matchFilter: Record<string, any> = { status: { $in: ["disbursed", "active"] } };
        if (branch) matchFilter.branch = branch;
        if (center) matchFilter.center = center;

        const loans = await Loan.find({
          ...matchFilter,
          ...(dateFrom || dateTo ? { disbursementDate: dateFilter } : {}),
        })
          .populate("member", "firstName lastName memberCode")
          .populate("branch", "name")
          .sort({ disbursementDate: -1 })
          .lean();

        const totalDisbursed = loans.reduce((sum, l) => sum + l.loanAmount, 0);

        reportData = {
          type: "disbursement",
          loans,
          summary: { totalDisbursed, count: loans.length },
        };
        break;
      }

      case "collection": {
        const matchFilter: Record<string, any> = {};
        if (branch) matchFilter.branch = branch;
        if (center) matchFilter.center = center;

        const collections = await Collection.find({
          ...matchFilter,
          ...(dateFrom || dateTo ? { collectionDate: dateFilter } : {}),
        })
          .populate("branch", "name code")
          .populate("center", "name code")
          .populate("leader", "firstName lastName")
          .sort({ collectionDate: -1 })
          .lean();

        let filteredCollections = collections;
        if (staff) {
          const staffDoc = await Staff.findById(staff).lean();
          const staffName = staffDoc ? `${staffDoc.firstName} ${staffDoc.lastName}` : staff;
          filteredCollections = collections.filter((c) => c.staffName === staffName);
        }

        const totalAmount = filteredCollections.reduce((sum, c) => sum + (Number(c.total) || 0), 0);
        const totalCash = filteredCollections.reduce((sum, c) => sum + (Number(c.cashAmount) || 0), 0);
        const totalOnline = filteredCollections.reduce((sum, c) => sum + (Number(c.onlineAmount) || 0), 0);

        reportData = {
          type: "collection",
          collections: filteredCollections,
          summary: { totalAmount, totalCash, totalOnline },
        };
        break;
      }

      case "member-history": {
        const matchFilter: Record<string, any> = {};
        if (branch) matchFilter.branch = branch;
        if (center) matchFilter.center = center;

        const members = await Member.find(matchFilter)
          .populate("branch", "name")
          .populate("center", "name")
          .populate("group", "name")
          .sort({ createdAt: -1 })
          .lean();

        const totalActive = members.filter((m) => m.status === "active").length;
        const totalVerified = members.filter((m) => m.verificationStatus === "verified").length;

        reportData = {
          type: "member-history",
          members,
          summary: { total: members.length, active: totalActive, verified: totalVerified },
        };
        break;
      }

      case "center": {
        const matchFilter: Record<string, any> = {};
        if (branch) matchFilter.branch = branch;
        if (leader) matchFilter.leader = leader;

        const centers = await Center.find(matchFilter)
          .populate("branch", "name")
          .populate("leader", "firstName lastName")
          .populate("staff", "firstName lastName")
          .lean();

        reportData = {
          type: "center",
          centers,
          summary: { total: centers.length },
        };
        break;
      }

      case "branch-collection": {
        const matchFilter: Record<string, any> = {};
        if (branch) matchFilter.branch = new mongoose.Types.ObjectId(branch);
        if (dateFrom || dateTo) {
          matchFilter.collectionDate = dateFilter;
        }

        const branchCollections = await Collection.aggregate([
          { $match: matchFilter },
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
            $group: {
              _id: "$branch",
              branchName: { $first: "$branchDoc.name" },
              totalAmount: { $sum: "$total" },
              cashAmount: { $sum: "$cashAmount" },
              onlineAmount: { $sum: "$onlineAmount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { branchName: 1 } },
        ]);

        const totalAmount = branchCollections.reduce((s, r) => s + r.totalAmount, 0);
        const totalCash = branchCollections.reduce((s, r) => s + r.cashAmount, 0);
        const totalOnline = branchCollections.reduce((s, r) => s + r.onlineAmount, 0);

        reportData = {
          type: "branch-collection",
          collections: branchCollections,
          summary: { totalAmount, totalCash, totalOnline, totalBranches: branchCollections.length },
        };
        break;
      }

      case "center-collection": {
        const matchFilter: Record<string, any> = {};
        if (branch) matchFilter.branch = new mongoose.Types.ObjectId(branch);
        if (center) matchFilter.center = new mongoose.Types.ObjectId(center);
        if (dateFrom || dateTo) {
          matchFilter.collectionDate = dateFilter;
        }

        const centerCollections = await Collection.aggregate([
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
            $group: {
              _id: "$center",
              centerName: { $first: "$centerDoc.name" },
              totalAmount: { $sum: "$total" },
              cashAmount: { $sum: "$cashAmount" },
              onlineAmount: { $sum: "$onlineAmount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { centerName: 1 } },
        ]);

        const totalAmount = centerCollections.reduce((s, r) => s + r.totalAmount, 0);
        const totalCash = centerCollections.reduce((s, r) => s + r.cashAmount, 0);
        const totalOnline = centerCollections.reduce((s, r) => s + r.onlineAmount, 0);

        reportData = {
          type: "center-collection",
          collections: centerCollections,
          summary: { totalAmount, totalCash, totalOnline, totalCenters: centerCollections.length },
        };
        break;
      }

      case "group-collection": {
        const matchFilter: Record<string, any> = {};
        if (branch) matchFilter["branchDoc.branch"] = new mongoose.Types.ObjectId(branch);
        if (center) matchFilter["groupDoc.center"] = new mongoose.Types.ObjectId(center);
        if (dateFrom || dateTo) {
          matchFilter.collectionDate = dateFilter;
        }

        const groupCollections = await Collection.aggregate([
          { $match: dateFrom || dateTo ? { collectionDate: matchFilter.collectionDate } : {} },
          {
            $lookup: {
              from: "centers",
              localField: "center",
              foreignField: "_id",
              as: "centerDoc",
            },
          },
          { $unwind: { path: "$centerDoc", preserveNullAndEmptyArrays: true } },
          ...(branch ? [{ $match: { "centerDoc.branch": new mongoose.Types.ObjectId(branch) } }] : []),
          {
            $lookup: {
              from: "groups",
              localField: "center",
              foreignField: "center",
              as: "groupDoc",
            },
          },
          { $unwind: { path: "$groupDoc", preserveNullAndEmptyArrays: true } },
          ...(center ? [{ $match: { "groupDoc.center": new mongoose.Types.ObjectId(center) } }] : []),
          {
            $group: {
              _id: "$groupDoc._id",
              groupName: { $first: "$groupDoc.name" },
              centerName: { $first: "$centerDoc.name" },
              totalAmount: { $sum: "$total" },
              cashAmount: { $sum: "$cashAmount" },
              onlineAmount: { $sum: "$onlineAmount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { groupName: 1 } },
        ]);

        const totalAmount = groupCollections.reduce((s, r) => s + r.totalAmount, 0);
        const totalCash = groupCollections.reduce((s, r) => s + r.cashAmount, 0);
        const totalOnline = groupCollections.reduce((s, r) => s + r.onlineAmount, 0);

        reportData = {
          type: "group-collection",
          collections: groupCollections,
          summary: { totalAmount, totalCash, totalOnline, totalGroups: groupCollections.length },
        };
        break;
      }

      case "staff-collection": {
        const matchFilter: Record<string, any> = {};
        if (branch) matchFilter.branch = new mongoose.Types.ObjectId(branch);
        if (staff) matchFilter.staffName = staff;
        if (dateFrom || dateTo) {
          matchFilter.collectionDate = dateFilter;
        }

        const staffCollections = await Collection.aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: "$staffName",
              totalAmount: { $sum: "$total" },
              cashAmount: { $sum: "$cashAmount" },
              onlineAmount: { $sum: "$onlineAmount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]);

        const totalAmount = staffCollections.reduce((s, r) => s + r.totalAmount, 0);
        const totalCash = staffCollections.reduce((s, r) => s + r.cashAmount, 0);
        const totalOnline = staffCollections.reduce((s, r) => s + r.onlineAmount, 0);

        reportData = {
          type: "staff-collection",
          collections: staffCollections,
          summary: { totalAmount, totalCash, totalOnline, totalStaff: staffCollections.length },
        };
        break;
      }

      case "outstanding": {
        const matchFilter: Record<string, any> = {
          status: { $in: ["active", "disbursed"] },
          outstandingBalance: { $gt: 0 },
        };
        if (branch) matchFilter.branch = new mongoose.Types.ObjectId(branch);
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
              localField: "centerDoc.leader",
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
        return NextResponse.json(
          { success: false, error: "Invalid report type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data: reportData });
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
