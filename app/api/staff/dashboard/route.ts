import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Staff from "@/lib/models/Staff";
import Center from "@/lib/models/Center";
import Loan from "@/lib/models/Loan";
import Member from "@/lib/models/Member";
import Repayment from "@/lib/models/Repayment";
import Collection from "@/lib/models/Collection";
import GroupAssignedCollection from "@/lib/models/GroupAssignedCollection";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user || user.role !== "staff") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const staff = await Staff.findOne({ user: user._id }).lean();
    if (!staff) {
      return NextResponse.json(
        { success: false, error: "Staff record not found" },
        { status: 404 }
      );
    }

    const centerIds = staff.assignedCenters;
    const staffFullName = `${staff.firstName} ${staff.lastName}`;

    const collectionFilter = {
      center: { $in: centerIds },
      $or: [{ staffId: staff._id }, { staffName: staffFullName }],
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [
      centers,
      totalMembers,
      activeLoans,
      totalLoans,
      totalDisbursed,
      totalRepayments,
      totalCollections,
      pendingGroupCollections,
      todayRepayments,
      todayCollections,
      todayGroupCollections,
      weekRepayments,
      weekCollections,
      weekGroupCollections,
      pendingGroupAssignments,
      recentRepaymentDocs,
      recentCollectionDocs,
      recentPendingGroupDocs,
    ] = await Promise.all([
      Center.find({ _id: { $in: centerIds } }).lean(),
      Member.countDocuments({ center: { $in: centerIds }, status: "active" }),
      Loan.countDocuments({
        center: { $in: centerIds },
        status: { $in: ["active", "disbursed"] },
      }),
      Loan.countDocuments({ center: { $in: centerIds } }),
      Loan.aggregate([
        { $match: { center: { $in: centerIds }, status: { $in: ["active", "disbursed", "closed"] } } },
        { $group: { _id: null, total: { $sum: "$loanAmount" } } },
      ]),
      Repayment.aggregate([
        { $match: { center: { $in: centerIds }, collectedBy: user._id, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Collection.aggregate([
        { $match: collectionFilter },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      GroupAssignedCollection.aggregate([
        { $match: { centerId: { $in: centerIds }, staffId: staff._id, status: { $in: ["Complete", "Pending Review"] } } },
        { $group: { _id: null, total: { $sum: "$totalCollected" } } },
      ]),
      Repayment.aggregate([
        { $match: { center: { $in: centerIds }, collectedBy: user._id, status: "completed", paymentDate: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Collection.aggregate([
        { $match: { ...collectionFilter, collectionDate: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      GroupAssignedCollection.aggregate([
        { $match: { centerId: { $in: centerIds }, staffId: staff._id, status: { $in: ["Complete", "Pending Review"] }, collectionDate: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: "$totalCollected" } } },
      ]),
      Repayment.aggregate([
        { $match: { center: { $in: centerIds }, collectedBy: user._id, status: "completed", paymentDate: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Collection.aggregate([
        { $match: { ...collectionFilter, collectionDate: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      GroupAssignedCollection.aggregate([
        { $match: { centerId: { $in: centerIds }, staffId: staff._id, status: { $in: ["Complete", "Pending Review"] }, collectionDate: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: "$totalCollected" } } },
      ]),
      GroupAssignedCollection.aggregate([
        { $match: { centerId: { $in: centerIds }, staffId: staff._id, status: "Pending" } },
        { $group: { _id: null, total: { $sum: "$totalPending" }, count: { $sum: 1 } } },
      ]),
      Repayment.find({ center: { $in: centerIds }, collectedBy: user._id, status: "completed" })
        .sort({ paymentDate: -1 })
        .limit(20)
        .lean(),
      Collection.find(collectionFilter)
        .sort({ collectionDate: -1 })
        .limit(20)
        .lean(),
      GroupAssignedCollection.find({ centerId: { $in: centerIds }, staffId: staff._id, status: { $in: ["Complete", "Pending Review"] } })
        .sort({ collectionDate: -1 })
        .limit(20)
        .lean(),
    ]);

    const totalCollected =
      (totalRepayments[0]?.total || 0) +
      (totalCollections[0]?.total || 0) +
      (pendingGroupCollections[0]?.total || 0);

    const todayCollected =
      (todayRepayments[0]?.total || 0) +
      (todayCollections[0]?.total || 0) +
      (todayGroupCollections[0]?.total || 0);

    const weekCollected =
      (weekRepayments[0]?.total || 0) +
      (weekCollections[0]?.total || 0) +
      (weekGroupCollections[0]?.total || 0);

    const pendingCollection = pendingGroupAssignments[0]?.total || 0;
    const pendingCount = pendingGroupAssignments[0]?.count || 0;

    const byDay = new Map<string, { date: string; total: number }>();
    const addToDay = (d: Date | undefined, amount: number) => {
      const key = d ? new Date(d).toISOString().slice(0, 10) : "unknown";
      if (!byDay.has(key)) byDay.set(key, { date: key, total: 0 });
      byDay.get(key)!.total += amount;
    };

    for (const r of recentRepaymentDocs) addToDay(r.paymentDate, r.total || 0);
    for (const c of recentCollectionDocs) addToDay(c.collectionDate, c.total || 0);
    for (const g of recentPendingGroupDocs) addToDay(g.collectionDate, g.totalCollected || 0);

    const recentCollections = Array.from(byDay.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        centersCount: centers.length,
        centers,
        totalMembers,
        activeLoans,
        totalLoans,
        totalDisbursed: totalDisbursed[0]?.total || 0,
        totalCollected,
        todayCollected,
        weekCollected,
        pendingCollection,
        pendingCount,
        recentCollections,
      },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
