import { NextResponse } from "next/server";
import Member from "@/lib/models/Member";
import Loan from "@/lib/models/Loan";
import Collection from "@/lib/models/Collection";
import Branch from "@/lib/models/Branch";
import Center from "@/lib/models/Center";
import GroupAssignedCollection from "@/lib/models/GroupAssignedCollection";
import { connectDB } from "@/lib/db";

export async function GET() {
  try {
    await connectDB();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setMilliseconds(lastWeekEnd.getMilliseconds() - 1);

    const [
      totalMembers,
      activeLoans,
      todayCollectionData,
      weeklyCollectionData,
      lastWeekCollectionData,
      totalCollectionData,
      outstandingLoansData,
      branchCount,
      centerCount,
      pendingVerification,
      recentLoans,
      monthlyCollections,
      loanStatusDistribution,
      todayGroupCollectionData,
      weeklyGroupCollectionData,
      totalGroupCollectionData,
    ] = await Promise.all([
      Member.countDocuments({ status: "active" }),
      Loan.countDocuments({ status: { $in: ["disbursed", "active"] } }),
      Collection.aggregate([
        { $match: { collectionDate: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Collection.aggregate([
        { $match: { collectionDate: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Collection.aggregate([
        { $match: { collectionDate: { $gte: lastWeekStart, $lte: lastWeekEnd } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Collection.aggregate([
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Loan.aggregate([
        { $match: { status: { $in: ["disbursed", "active"] } } },
        { $group: { _id: null, total: { $sum: "$outstandingBalance" } } },
      ]),
      Branch.countDocuments({ status: "active" }),
      Center.countDocuments({ status: "active" }),
      Member.countDocuments({ verificationStatus: "pending" }),
      Loan.find()
        .populate("member", "firstName lastName")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Collection.aggregate([
        {
          $match: {
            collectionDate: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$collectionDate" },
              month: { $month: "$collectionDate" },
            },
            total: { $sum: "$total" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        { $limit: 6 },
      ]),
      Loan.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      GroupAssignedCollection.aggregate([
        { $match: { collectionDate: { $gte: todayStart, $lte: todayEnd }, status: { $in: ["Complete", "Partial"] } } },
        { $group: { _id: null, total: { $sum: "$totalCollected" } } },
      ]),
      GroupAssignedCollection.aggregate([
        { $match: { collectionDate: { $gte: weekStart }, status: { $in: ["Complete", "Partial"] } } },
        { $group: { _id: null, total: { $sum: "$totalCollected" } } },
      ]),
      GroupAssignedCollection.aggregate([
        { $match: { status: { $in: ["Complete", "Partial"] } } },
        { $group: { _id: null, total: { $sum: "$totalCollected" } } },
      ]),
    ]);

    const thisWeekTotal = weeklyCollectionData[0]?.total || 0;
    const lastWeekTotal = lastWeekCollectionData[0]?.total || 0;
    const weeklyGrowth = lastWeekTotal > 0
      ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100
      : thisWeekTotal > 0 ? 100 : 0;

    const dashboardData = {
      totalMembers,
      activeLoans,
      todayCollection: (todayCollectionData[0]?.total || 0) + (todayGroupCollectionData[0]?.total || 0),
      weeklyCollection: thisWeekTotal + (weeklyGroupCollectionData[0]?.total || 0),
      lastWeekCollection: lastWeekTotal,
      weeklyGrowth: Math.round(weeklyGrowth * 100) / 100,
      totalCollection: (totalCollectionData[0]?.total || 0) + (totalGroupCollectionData[0]?.total || 0),
      outstandingLoans: outstandingLoansData[0]?.total || 0,
      branchCount,
      centerCount,
      pendingVerification,
      recentLoans,
      monthlyCollections: monthlyCollections.map((item: any) => ({
        month: item._id.month,
        year: item._id.year,
        total: item.total,
      })),
      loanStatusDistribution: loanStatusDistribution.reduce((acc: Record<string, number>, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };

    return NextResponse.json({ success: true, data: dashboardData });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
