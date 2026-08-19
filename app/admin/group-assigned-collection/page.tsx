"use client";

import React, { useEffect, useState } from "react";

interface Branch { _id: string; name: string; }
interface Center { _id: string; name: string; branch: { _id: string; name: string } | string; }
interface GroupItem { _id: string; name: string; code: string; branch: string | { _id: string; name: string }; center: string | { _id: string; name: string }; leader?: string; memberCount: number; }
interface Staff { _id: string; firstName: string; lastName: string; email: string; phone: string; branches: ({ _id: string; name: string } | string)[]; }
interface LeaderInfo { firstName: string; lastName: string; phone: string; }
interface MemberPayment {
  memberId: string;
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
  branchId: { _id: string; name: string } | string;
  centerId: { _id: string; name: string } | string;
  groupId: { _id: string; name: string; code: string } | string;
  groupName: string;
  leaderName: string;
  staffId: { _id: string; firstName: string; lastName: string } | string;
  staffName: string;
  collectionDate: string;
  members: MemberPayment[];
  totalCollected: number;
  totalPending: number;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Pending Review": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  Complete: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  Partial: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  Incomplete: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
};

const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black shadow-sm placeholder:text-slate-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-700 dark:bg-black dark:text-white dark:focus:border-white dark:focus:ring-white/10";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

const formatCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function getRefId(ref: any): string {
  if (!ref) return "";
  if (typeof ref === "object") return ref._id || "";
  return String(ref);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function GroupAssignedCollectionPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [filteredCenters, setFilteredCenters] = useState<Center[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<GroupItem[]>([]);
  const [filteredStaffs, setFilteredStaffs] = useState<Staff[]>([]);

  const [formBranch, setFormBranch] = useState("");
  const [formCenter, setFormCenter] = useState("");
  const [formGroup, setFormGroup] = useState("");
  const [formStaff, setFormStaff] = useState("");
  const [formDate, setFormDate] = useState(todayStr());
  const [leaderInfo, setLeaderInfo] = useState<LeaderInfo | null>(null);
  const [previewMembers, setPreviewMembers] = useState<MemberPayment[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewModal, setViewModal] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bRes, cRes, gRes, sRes, aRes] = await Promise.all([
        fetch("/api/branch"),
        fetch("/api/centers?limit=1000"),
        fetch("/api/groups?limit=1000"),
        fetch("/api/staff"),
        fetch("/api/group-assigned-collection"),
      ]);
      const [bData, cData, gData, sData, aData] = await Promise.all([
        bRes.json(),
        cRes.json(),
        gRes.json(),
        sRes.json(),
        aRes.json(),
      ]);
      setBranches(Array.isArray(bData) ? bData : bData.branches || bData.data || []);
      setCenters(Array.isArray(cData) ? cData : cData.data || []);
      setGroups(Array.isArray(gData) ? gData : gData.data || []);
      setStaffs(Array.isArray(sData) ? sData : sData.data || []);
      setAssignments(Array.isArray(aData) ? aData : aData.data || []);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    setFilteredCenters(formBranch ? centers.filter(c => getRefId(c.branch) === formBranch) : []);
  }, [formBranch, centers]);

  useEffect(() => {
    setFilteredGroups(formCenter ? groups.filter(g => {
      const centerId = typeof g.center === "object" && g.center !== null ? (g.center as any)._id : g.center;
      return centerId === formCenter;
    }) : []);
  }, [formCenter, groups]);

  useEffect(() => {
    setFilteredStaffs(formBranch ? staffs.filter(s => (s.branches || []).some(b => getRefId(b) === formBranch)) : []);
  }, [formBranch, staffs]);

  useEffect(() => {
    if (!formGroup) { setLeaderInfo(null); setPreviewMembers([]); return; }
    const loadGroupData = async () => {
      try {
        const groupObj = groups.find(g => g._id === formGroup);
        if (groupObj && (groupObj as any).leader) {
          const leader = (groupObj as any).leader;
          setLeaderInfo({
            firstName: leader.firstName || "",
            lastName: leader.lastName || "",
            phone: leader.phone || "",
          });
        } else {
          setLeaderInfo(null);
        }

        const mRes = await fetch(`/api/members?group=${formGroup}&limit=1000`);
        const mData = await mRes.json();
        const members = Array.isArray(mData) ? mData : mData.data || [];
        console.log("Members found:", members.length, members);

        const lRes = await fetch(`/api/loans?group=${formGroup}&limit=1000`);
        const lData = await lRes.json();
        const loans = Array.isArray(lData) ? lData : lData.data || [];
        console.log("Loans found:", loans.length, loans);

        const loanMap = new Map<string, any>();
        for (const loan of loans) {
          if (["disbursed", "active"].includes(loan.status)) {
            const memberId = typeof loan.member === "object" && loan.member !== null ? loan.member._id || loan.member.toString() : String(loan.member);
            loanMap.set(memberId, loan);
          }
        }

        const memberPayments: MemberPayment[] = members.map((m: any) => {
          const loan = loanMap.get(String(m._id));
          if (loan) {
            return {
              memberId: m._id,
              memberName: `${m.firstName} ${m.lastName}`,
              loanId: loan._id,
              amountToCollect: loan.weeklyRepayment,
              previousRemaining: 0,
              totalAmount: loan.weeklyRepayment,
              collectedAmount: 0,
              remaining: loan.weeklyRepayment,
              status: "Pending",
            };
          }
          return {
            memberId: m._id,
            memberName: `${m.firstName} ${m.lastName}`,
            loanId: "",
            amountToCollect: 0,
            previousRemaining: 0,
            totalAmount: 0,
            collectedAmount: 0,
            remaining: 0,
            status: "Paid",
          };
        });

        console.log("Member payments:", memberPayments.length);
        setPreviewMembers(memberPayments);
      } catch (e) {
        console.error("Failed to load group data:", e);
      }
    };
    loadGroupData();
  }, [formGroup, groups]);

  const resetForm = () => {
    setFormBranch(""); setFormCenter(""); setFormGroup(""); setFormStaff("");
    setFormDate(todayStr()); setLeaderInfo(null); setPreviewMembers([]);
  };

  const handleCreate = async () => {
    if (!formGroup || !formStaff || previewMembers.length === 0) return;
    setSaving(true);
    try {
      const staff = filteredStaffs.find(s => s._id === formStaff);
      const res = await fetch("/api/group-assigned-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: formGroup,
          staffId: formStaff,
          staffName: staff ? `${staff.firstName} ${staff.lastName}` : "",
          collectionDate: formDate,
          branchId: formBranch,
          centerId: formCenter,
        }),
      });
      if (res.ok) {
        setDrawerOpen(false);
        resetForm();
        loadData();
      }
    } catch (e) {
      console.error("Failed to create:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Approve this submission and create repayment records?")) return;
    try {
      const res = await fetch(`/api/admin/group-assigned-collection/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (res.ok) {
        loadData();
        if (viewModal && viewModal._id === id) {
          const updated = await fetch(`/api/group-assigned-collection/${id}`);
          const d = await updated.json();
          setViewModal(d.data);
        }
      }
    } catch (e) {
      console.error("Failed to approve:", e);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Reject this submission? Staff will need to resubmit.")) return;
    try {
      const res = await fetch(`/api/admin/group-assigned-collection/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (res.ok) {
        loadData();
        setViewModal(null);
      }
    } catch (e) {
      console.error("Failed to reject:", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    try {
      await fetch(`/api/group-assigned-collection/${id}`, { method: "DELETE" });
      loadData();
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Group Assigned Collections
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Assign collection tasks at group level with per-member breakdown.
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setDrawerOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Assignment
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Group</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Leader</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Staff</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Collected</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-black dark:border-slate-600 dark:border-t-white" />
                    </td>
                  </tr>
                ) : assignments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                      No group assignments yet. Click &quot;New Assignment&quot; to start.
                    </td>
                  </tr>
                ) : assignments.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-slate-700 dark:text-slate-300">{a.assignmentId}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{a.groupName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{a.leaderName || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{a.staffName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(a.collectionDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency.format(a.totalCollected)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-rose-600 dark:text-rose-400">
                      {formatCurrency.format(a.totalPending)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status] || STATUS_STYLES["Pending"]}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setViewModal(a)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                        >
                          View
                        </button>
                        {a.status === "Pending Review" && (
                          <>
                            <button
                              onClick={() => handleApprove(a._id)}
                              className="rounded-md px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(a._id)}
                              className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {a.status === "Pending" && (
                          <button
                            onClick={() => handleDelete(a._id)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-zinc-900 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Group Assignment</h2>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className={labelClass}>Branch</label>
                <select value={formBranch} onChange={(e) => { setFormBranch(e.target.value); setFormCenter(""); setFormGroup(""); }} className={inputClass} required>
                  <option value="">Select branch</option>
                  {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Center</label>
                <select value={formCenter} onChange={(e) => { setFormCenter(e.target.value); setFormGroup(""); }} className={inputClass} disabled={!formBranch} required>
                  <option value="">Select center</option>
                  {filteredCenters.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Group</label>
                <select value={formGroup} onChange={(e) => setFormGroup(e.target.value)} className={inputClass} disabled={!formCenter} required>
                  <option value="">Select group</option>
                  {filteredGroups.map(g => <option key={g._id} value={g._id}>{g.name} ({g.code})</option>)}
                </select>
              </div>

              {leaderInfo && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-zinc-800">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Group Leader</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{leaderInfo.firstName} {leaderInfo.lastName}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{leaderInfo.phone}</p>
                </div>
              )}

              <div>
                <label className={labelClass}>Staff</label>
                <select value={formStaff} onChange={(e) => setFormStaff(e.target.value)} className={inputClass} disabled={!formBranch} required>
                  <option value="">Select staff</option>
                  {filteredStaffs.map(s => <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Collection Date</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className={inputClass} required />
              </div>

              {previewMembers.length > 0 && (
                <div>
                  <p className={labelClass}>Members ({previewMembers.length})</p>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100 dark:bg-zinc-800">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Member</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Amount</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {previewMembers.map((m, i) => (
                          <tr key={i} className="bg-white dark:bg-zinc-900">
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{m.memberName}</td>
                            <td className="px-3 py-2 text-right font-medium text-slate-900 dark:text-white">
                              {m.amountToCollect > 0 ? formatCurrency.format(m.amountToCollect) : "—"}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {m.amountToCollect > 0 ? (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Due</span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Already Paid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 dark:bg-zinc-800">
                        <tr>
                          <td className="px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white">Total</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-slate-900 dark:text-white">
                            {formatCurrency.format(previewMembers.reduce((s, m) => s + m.amountToCollect, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setDrawerOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-black dark:text-slate-300">
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving || !formGroup || !formStaff || previewMembers.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-slate-200"
                >
                  {saving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                  Create Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setViewModal(null)} />
          <div className="relative z-50 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{viewModal.groupName} — Member Breakdown</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {viewModal.assignmentId} | {viewModal.staffName} | {new Date(viewModal.collectionDate).toLocaleDateString("en-IN")}
                </p>
              </div>
              <button onClick={() => setViewModal(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[viewModal.status] || ""}`}>
                {viewModal.status}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Collected: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency.format(viewModal.totalCollected)}</span>
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Pending: <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency.format(viewModal.totalPending)}</span>
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 dark:bg-zinc-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Member</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Previous</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Current</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Total</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Collected</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Remaining</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {viewModal.members.map((m, i) => (
                    <tr key={i} className="bg-white dark:bg-zinc-900">
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{m.memberName}</td>
                      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency.format(m.previousRemaining)}</td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{formatCurrency.format(m.amountToCollect)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-white">{formatCurrency.format(m.totalAmount)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${
                        m.status === "Paid" ? "text-emerald-600 dark:text-emerald-400" :
                        m.status === "Partial" ? "text-amber-600 dark:text-amber-400" :
                        m.status === "Pending" ? "text-slate-600 dark:text-slate-400" :
                        "text-rose-600 dark:text-rose-400"
                      }`}>
                        {formatCurrency.format(m.collectedAmount)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-rose-600 dark:text-rose-400">
                        {formatCurrency.format(m.remaining)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.status === "Paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" :
                          m.status === "Partial" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
                          m.status === "Pending Review" ? "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400" :
                          m.status === "Pending" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                          "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                        }`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {viewModal.status === "Pending Review" && (
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => handleReject(viewModal._id)}
                  className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:bg-black dark:text-rose-400"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(viewModal._id)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Approve & Create Repayments
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
