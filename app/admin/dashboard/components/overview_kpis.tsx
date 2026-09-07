"use client"

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OverviewKpis() {
  const [outstandingLoans, setOutstandingLoans] = useState(0);
  const [todayCollection, setTodayCollection] = useState(0);
  const [weeklyCollection, setWeeklyCollection] = useState(0);
  const [weeklyGrowth, setWeeklyGrowth] = useState(0);
  const [activeLoans, setActiveLoans] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [totalBranches, setTotalBranches] = useState(0);
  const [totalCenters, setTotalCenters] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [closedLoansCount, setClosedLoansCount] = useState(0);
  const [closedLoansAmount, setClosedLoansAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        const d = json.data;
        setOutstandingLoans(d.outstandingLoans ?? 0);
        setTodayCollection(d.todayCollection ?? 0);
        setWeeklyCollection(d.weeklyCollection ?? 0);
        setWeeklyGrowth(d.weeklyGrowth ?? 0);
        setActiveLoans(d.activeLoans ?? 0);
        setTotalMembers(d.totalMembers ?? 0);
        setTotalBranches(d.branchCount ?? 0);
        setTotalCenters(d.centerCount ?? 0);
        setPendingVerifications(d.pendingVerification ?? 0);
        setClosedLoansCount(d.closedLoansCount ?? 0);
        setClosedLoansAmount(d.closedLoansAmount ?? 0);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const formatINR = (v: number) =>
    v >= 100000
      ? `₹${(v / 100000).toFixed(1)}L`
      : v >= 1000
        ? `₹${(v / 1000).toFixed(1)}K`
        : `₹${v.toLocaleString("en-IN")}`;

  return (
    <>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="grid grid-cols-1 xl:grid-cols-8">
        <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 border-b ring-0 xl:col-span-4 xl:border-r">
          <CardHeader>
            <CardTitle className="font-normal">Outstanding Loans</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="space-y-1">
              <div className="font-heading text-3xl leading-none tracking-tight">
                {loading ? "₹0" : `₹${outstandingLoans.toLocaleString("en-IN")}`}
              </div>
              <p className="text-muted-foreground text-xs">Total outstanding from active loans</p>
            </div>
            <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
              {formatINR(outstandingLoans)}
            </Badge>
          </CardContent>
        </Card>

        <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 border-b ring-0 xl:col-span-4">
          <CardHeader>
            <CardTitle className="font-normal">Todays Collections</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <div className="font-heading text-3xl leading-none tracking-tight">
                {loading ? "₹0" : formatINR(todayCollection)}
              </div>
              <p className="text-muted-foreground text-xs">Collected today</p>
            </div>
            <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
              {formatINR(todayCollection)}
            </Badge>
          </CardContent>
        </Card>

        <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 ring-0 xl:col-span-4 xl:border-r">
          <CardHeader>
            <CardTitle className="font-normal">Weekly Collections</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <div className="font-heading text-3xl leading-none tracking-tight">
                {loading ? "₹0" : formatINR(weeklyCollection)}
              </div>
              <p className="text-muted-foreground text-xs">
                {weeklyGrowth >= 0 ? "+" : ""}
                {weeklyGrowth.toFixed(1)}% vs last week
              </p>
            </div>
            {weeklyGrowth >= 0 ? (
              <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
                +{weeklyGrowth.toFixed(1)}%
              </Badge>
            ) : (
              <Badge variant="destructive" className="bg-destructive/10 text-destructive">
                {weeklyGrowth.toFixed(1)}%
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="gap-5 overflow-hidden rounded-none border-0 ring-0 xl:col-span-4">
          <CardHeader>
            <CardTitle className="font-normal">Active Loans</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <div className="font-heading text-3xl leading-none tracking-tight">
                {loading ? "0" : activeLoans}
              </div>
              <p className="text-muted-foreground text-xs">Currently active loans</p>
            </div>
            <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
              Active
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
     <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="grid grid-cols-1 xl:grid-cols-8">
        <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 border-b ring-0 xl:col-span-4 xl:border-r">
          <CardHeader>
            <CardTitle className="font-normal">Total Members</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="space-y-1">
              <div className="font-heading text-3xl leading-none tracking-tight">
                {loading ? "0" : totalMembers}
              </div>
              <p className="text-muted-foreground text-xs">All registered members</p>
            </div>
            <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
              {totalMembers}
            </Badge>
          </CardContent>
        </Card>

        <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 border-b ring-0 xl:col-span-4">
          <CardHeader>
            <CardTitle className="font-normal">Centers</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <div className="font-heading text-3xl leading-none tracking-tight">
                {loading ? "0" : totalCenters}
              </div>
              <p className="text-muted-foreground text-xs">Active centers</p>
            </div>
            <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
              {totalCenters}
            </Badge>
          </CardContent>
        </Card>

        <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 ring-0 xl:col-span-4 xl:border-r">
          <CardHeader>
            <CardTitle className="font-normal">Branches</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <div className="font-heading text-3xl leading-none tracking-tight">
                {loading ? "0" : totalBranches}
              </div>
              <p className="text-muted-foreground text-xs">Active branches</p>
            </div>
            <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
              {totalBranches}
            </Badge>
          </CardContent>
        </Card>

        <Card className="gap-5 overflow-hidden rounded-none border-0 ring-0 xl:col-span-4">
          <CardHeader>
            <CardTitle className="font-normal">Pending Verification</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <div className="font-heading text-3xl leading-none tracking-tight">
                {loading ? "0" : pendingVerifications}
              </div>
              <p className="text-muted-foreground text-xs">Awaiting verification</p>
            </div>
            <Badge className="bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              Pending
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card className="gap-5 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <CardHeader>
          <CardTitle className="font-normal">Closed Loans</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <div className="font-heading text-3xl leading-none tracking-tight">
              {loading ? "0" : closedLoansCount.toLocaleString("en-IN")}
            </div>
            <p className="text-muted-foreground text-xs">Total loans closed</p>
          </div>
          <Badge className="bg-slate-500/10 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 border border-slate-500/20">
            Closed
          </Badge>
        </CardContent>
      </Card>

      <Card className="gap-5 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <CardHeader>
          <CardTitle className="font-normal">Closed Loans Amount</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <div className="font-heading text-3xl leading-none tracking-tight">
              {loading ? "₹0" : `₹${closedLoansAmount.toLocaleString("en-IN")}`}
            </div>
            <p className="text-muted-foreground text-xs">Total amount of closed loans</p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-500/20">
            {formatINR(closedLoansAmount)}
          </Badge>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
