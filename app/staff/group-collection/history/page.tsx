"use client";

import { useEffect, useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/app/staff/dashboard/components/app-sidebar";
import { SiteHeader } from "@/app/staff/dashboard/components/site-header";

interface MemberPayment {
  memberId: { _id: string; firstName: string; lastName: string; memberCode: string } | string;
  memberName: string;
  loanId: string;
  amountToCollect: number;
  previousRemaining: number;
  totalAmount: number;
  collectedAmount: number;
  remaining: number;
  status: string;
}

interface Assignment {
  _id: string;
  assignmentId: string;
  groupId: { _id: string; name: string; code: string } | string;
  groupName: string;
  leaderName: string;
  staffName: string;
  collectionDate: string;
  members: MemberPayment[];
  totalCollected: number;
  totalPending: number;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-blue-50 text-blue-700 ring-blue-600/20",
  "Pending Review": "bg-sky-50 text-sky-700 ring-sky-600/20",
  Complete: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Partial: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Incomplete: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

function getMemberName(ref: any): string {
  if (!ref) return "";
  if (typeof ref === "object" && ref.firstName) return `${ref.firstName} ${ref.lastName || ""}`.trim();
  return "";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status] || STATUS_STYLES["Pending"]}`}>
      {status}
    </span>
  );
}

export default function StaffCollectionHistoryPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewModal, setViewModal] = useState<Assignment | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/group-assigned-collection");
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.data || []);
      }
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Collection History
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              View all group collection submissions and their status.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
              <thead className="bg-neutral-50 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Collection ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Group</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Leader</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Staff</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Collected</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Pending</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-neutral-500">Loading...</td>
                  </tr>
                ) : assignments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-neutral-500">
                      No collection history found.
                    </td>
                  </tr>
                ) : assignments.map((a) => (
                  <tr key={a._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-neutral-700 dark:text-neutral-300">{a.assignmentId}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">{a.groupName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">{a.leaderName || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">{a.staffName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(a.totalCollected)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-rose-600 dark:text-rose-400">
                      {formatCurrency(a.totalPending)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center"><StatusBadge status={a.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <button
                        onClick={() => setViewModal(a)}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SidebarInset>

      {viewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setViewModal(null)} />
          <div className="relative z-50 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {viewModal.groupName} — Member Breakdown
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {viewModal.assignmentId} | {viewModal.staffName} | {new Date(viewModal.collectionDate).toLocaleDateString("en-IN")}
                </p>
              </div>
              <button onClick={() => setViewModal(null)} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <StatusBadge status={viewModal.status} />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Collected: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(viewModal.totalCollected)}</span>
              </span>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Pending: <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(viewModal.totalPending)}</span>
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-100 dark:bg-neutral-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">Member</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400">Amount</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400">Collected</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400">Remaining</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                  {viewModal.members.map((m, i) => (
                    <tr key={i} className="bg-white dark:bg-neutral-950">
                      <td className="px-3 py-2 font-medium text-neutral-900 dark:text-neutral-100">
                        {getMemberName(m.memberId) || m.memberName}
                        {typeof m.memberId === "object" && m.memberId.memberCode && (
                          <span className="ml-1 text-xs text-neutral-400">({m.memberId.memberCode})</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-neutral-700 dark:text-neutral-300">{formatCurrency(m.totalAmount)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${
                        m.status === "Paid" ? "text-emerald-600 dark:text-emerald-400" :
                        m.status === "Partial" ? "text-amber-600 dark:text-amber-400" :
                        "text-rose-600 dark:text-rose-400"
                      }`}>
                        {formatCurrency(m.collectedAmount)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-rose-600 dark:text-rose-400">
                        {formatCurrency(m.remaining)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.status === "Paid" ? "bg-emerald-100 text-emerald-800" :
                          m.status === "Partial" ? "bg-amber-100 text-amber-800" :
                          m.status === "Pending Review" ? "bg-sky-100 text-sky-800" :
                          "bg-rose-100 text-rose-800"
                        }`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
