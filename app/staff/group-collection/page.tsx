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

const MEMBER_STATUS_STYLES: Record<string, string> = {
  Paid: "bg-emerald-100 text-emerald-800",
  Partial: "bg-amber-100 text-amber-800",
  Unpaid: "bg-rose-100 text-rose-800",
  "Pending Review": "bg-sky-100 text-sky-800",
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

export default function StaffGroupCollectionPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [collectedAmounts, setCollectedAmounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const fetchAssignments = async () => {
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

  useEffect(() => { fetchAssignments(); }, []);

  const openAssignment = (a: Assignment) => {
    setSelected(a);
    const amounts: Record<string, number> = {};
    a.members.forEach((m) => {
      const id = m.memberId && typeof m.memberId === "object" ? m.memberId._id : m.memberId;
      amounts[id] = m.collectedAmount || 0;
    });
    setCollectedAmounts(amounts);
  };

  const handleAmountChange = (memberId: string, value: number) => {
    setCollectedAmounts((prev) => ({ ...prev, [memberId]: value }));
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const members = selected.members.map((m) => {
        const id = m.memberId && typeof m.memberId === "object" ? m.memberId._id : m.memberId;
        return {
          memberId: id,
          collectedAmount: collectedAmounts[id] || 0,
        };
      });

      const res = await fetch(`/api/staff/group-assigned-collection/${selected._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members }),
      });

      if (res.ok) {
        setSelected(null);
        fetchAssignments();
      }
    } catch (e) {
      console.error("Failed to submit:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Group Collections
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              View assigned group collections and submit payments.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
              <thead className="bg-neutral-50 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Group</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Leader</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Members</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-500">Loading...</td>
                  </tr>
                ) : assignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-500">
                      No group assignments found.
                    </td>
                  </tr>
                ) : assignments.map((a) => (
                  <tr key={a._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-neutral-700 dark:text-neutral-300">{a.assignmentId}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">{a.groupName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">{a.leaderName || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                      {new Date(a.collectionDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">{a.members.length}</td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      {a.status === "Pending" ? (
                        <button
                          onClick={() => openAssignment(a)}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Collect
                        </button>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                          {a.status === "Pending Review" || a.status === "Incomplete"
                            ? "Submitted"
                            : "Approved"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SidebarInset>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Collect from {selected.groupName}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Leader: {selected.leaderName} | Date: {new Date(selected.collectionDate).toLocaleDateString("en-IN")}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-100 dark:bg-neutral-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">Member</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400">Previous</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400">Current</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400">Total</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400">Collected</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400">Remaining</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                  {selected.members.map((m, i) => {
                    const memberId = m.memberId && typeof m.memberId === "object" ? m.memberId._id : m.memberId;
                    const collected = collectedAmounts[memberId] || 0;
                    const total = m.totalAmount;
                    const remaining = Math.max(0, total - collected);
                    let status = "Unpaid";
                    if (collected >= total) status = "Paid";
                    else if (collected > 0) status = "Partial";

                    return (
                      <tr key={i} className="bg-white dark:bg-neutral-950">
                        <td className="px-3 py-2 font-medium text-neutral-900 dark:text-neutral-100">
                          {getMemberName(m.memberId) || m.memberName}
                          {typeof m.memberId === "object" && m.memberId.memberCode && (
                            <span className="ml-1 text-xs text-neutral-400">({m.memberId.memberCode})</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-500 dark:text-neutral-400">
                          {formatCurrency(m.previousRemaining)}
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-700 dark:text-neutral-300">
                          {formatCurrency(m.amountToCollect)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                          {formatCurrency(total)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            max={total}
                            value={collectedAmounts[memberId] || ""}
                            onChange={(e) => handleAmountChange(memberId, Number(e.target.value))}
                            readOnly={selected.status !== "Pending"}
                            className="w-24 rounded border border-neutral-300 bg-white px-2 py-1 text-right text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:disabled:bg-neutral-800/50"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-rose-600 dark:text-rose-400">
                          {formatCurrency(remaining)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            selected.status !== "Pending" && m.status === "Paid" ? "bg-emerald-100 text-emerald-800" :
                            selected.status !== "Pending" && m.status === "Partial" ? "bg-amber-100 text-amber-800" :
                            selected.status !== "Pending" && m.status === "Unpaid" ? "bg-rose-100 text-rose-800" :
                            selected.status !== "Pending" ? "bg-sky-100 text-sky-800" :
                            status === "Paid" ? "bg-emerald-100 text-emerald-800" :
                            status === "Partial" ? "bg-amber-100 text-amber-800" :
                            "bg-rose-100 text-rose-800"
                          }`}>
                            {selected.status !== "Pending" ? m.status : status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300"
              >
                Cancel
              </button>
              {selected.status === "Pending" ? (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                  {saving ? "Submitting..." : "Submit for Review"}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                  Submitted — awaiting admin approval
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
