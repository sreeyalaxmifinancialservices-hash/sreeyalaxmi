"use client";

import React, { useEffect, useState } from "react";

interface Branch { _id: string; name: string; }
interface Center { _id: string; name: string; branch: { _id: string; name: string } | string; }
interface GroupItem { _id: string; name: string; code: string; branch: string | { _id: string; name: string }; center: string | { _id: string; name: string }; leader?: any; memberCount: number; }
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
interface PreviewGroup {
  groupId: string;
  groupName: string;
  groupCode: string;
  leaderInfo: LeaderInfo | null;
  members: MemberPayment[];
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
function getRefName(ref: any): string {
  if (!ref) return "";
  if (typeof ref === "object" && ref.name) return ref.name;
  return "";
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CenterAssignedCollectionPage() {
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
  const [formStaff, setFormStaff] = useState("");
  const [formDate, setFormDate] = useState(todayStr());
  const [previewGroups, setPreviewGroups] = useState<PreviewGroup[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewModal, setViewModal] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const API_BASE = "/api/center-assigned-collection";
  const APPROVE_BASE = "/api/admin/center-assigned-collection";

  const loadData = async () => {
    try {
      setLoading(true);
      const [bRes, cRes, gRes, sRes, aRes] = await Promise.all([
        fetch("/api/branch"),
        fetch("/api/centers?limit=1000"),
        fetch("/api/groups?limit=1000"),
        fetch("/api/staff"),
        fetch(API_BASE),
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

  // When center changes, fetch all groups + members under that center
  useEffect(() => {
    if (!formCenter) { setPreviewGroups([]); return; }
    const loadCenterData = async () => {
      try {
        setPreviewLoading(true);
        const groupsForCenter = groups.filter(g => {
          const cid = typeof g.center === "object" && g.center !== null ? (g.center as any)._id : g.center;
          return cid === formCenter;
        });
        if (groupsForCenter.length === 0) { setPreviewGroups([]); return; }

        const preview: PreviewGroup[] = [];
        for (const grp of groupsForCenter) {
          const leader = (grp as any).leader;
          const leaderInfo = leader ? { firstName: leader.firstName || "", lastName: leader.lastName || "", phone: leader.phone || "" } : null;

          const mRes = await fetch(`/api/members?group=${grp._id}&limit=1000`);
          const mData = await mRes.json();
          const members = Array.isArray(mData) ? mData : mData.data || [];

          const lRes = await fetch(`/api/loans?group=${grp._id}&limit=1000`);
          const lData = await lRes.json();
          const loans = Array.isArray(lData) ? lData : lData.data || [];

          const loanMap = new Map<string, any>();
          for (const loan of loans) {
            if (["disbursed", "active"].includes(loan.status)) {
              const memberId = typeof loan.member === "object" && loan.member !== null ? loan.member._id || loan.member.toString() : String(loan.member);
              if (!loanMap.has(memberId)) loanMap.set(memberId, loan);
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

          preview.push({
            groupId: grp._id,
            groupName: grp.name,
            groupCode: grp.code,
            leaderInfo,
            members: memberPayments,
          });
        }
        setPreviewGroups(preview);
      } catch (e) {
        console.error("Failed to load center data:", e);
      } finally {
        setPreviewLoading(false);
      }
    };
    loadCenterData();
  }, [formCenter, groups]);

  const resetForm = () => {
    setFormBranch(""); setFormCenter(""); setFormStaff("");
    setFormDate(todayStr()); setPreviewGroups([]);
  };

  const handleCreate = async () => {
    if (!formCenter || !formStaff || previewGroups.length === 0) return;
    setSaving(true);
    try {
      const staff = filteredStaffs.find(s => s._id === formStaff);
      const staffName = staff ? `${staff.firstName} ${staff.lastName}` : "";
      // Bulk create: one API call with centerId, backend will create per group
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centerId: formCenter,
          staffId: formStaff,
          staffName,
          collectionDate: formDate,
          branchId: formBranch,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setDrawerOpen(false);
        resetForm();
        loadData();
      } else {
        console.error("Create failed:", json);
        alert(json.error || "Failed to create assignments");
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
      const res = await fetch(`${APPROVE_BASE}/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (res.ok) {
        loadData();
        if (viewModal && viewModal._id === id) {
          const updated = await fetch(`${API_BASE}/${id}`);
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
      const res = await fetch(`${APPROVE_BASE}/${id}/approve`, {
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
      await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      loadData();
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  };

  const totalPreviewMembers = previewGroups.reduce((s, g) => s + g.members.length, 0);
  const totalPreviewAmount = previewGroups.reduce((s, g) => s + g.members.reduce((a, m) => a + m.amountToCollect, 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Center Assigned Collections
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Assign staff to center — all groups & members under the center are auto-assigned.
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setDrawerOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Center Assignment
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Center</th>
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
                    <td colSpan={10} className="px-4 py-12 text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-black dark:border-slate-600 dark:border-t-white" />
                    </td>
                  </tr>
                ) : assignments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-500">
                      No center assignments yet. Click &quot;New Center Assignment&quot; to start.
                    </td>
                  </tr>
                ) : assignments.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-slate-700 dark:text-slate-300">{a.assignmentId}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{getRefName(a.centerId) || "—"}</td>
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
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Center Assignment</h2>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className={labelClass}>Branch</label>
                <select value={formBranch} onChange={(e) => { setFormBranch(e.target.value); setFormCenter(""); }} className={inputClass} required>
                  <option value="">Select branch</option>
                  {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Center</label>
                <select value={formCenter} onChange={(e) => setFormCenter(e.target.value)} className={inputClass} disabled={!formBranch} required>
                  <option value="">Select center</option>
                  {filteredCenters.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                {formCenter && filteredGroups.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">{filteredGroups.length} group(s) under this center will be assigned</p>
                )}
              </div>

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

              {previewLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-black" />
                  <span className="ml-2 text-sm text-slate-500">Loading groups & members...</span>
                </div>
              )}

              {!previewLoading && previewGroups.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className={labelClass}>Groups & Members ({totalPreviewMembers} members in {previewGroups.length} groups)</p>
                    <span className="text-sm font-semibold">{formatCurrency.format(totalPreviewAmount)} total</span>
                  </div>
                  {previewGroups.map((pg) => (
                    <div key={pg.groupId} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="bg-slate-100 dark:bg-zinc-800 px-3 py-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{pg.groupName} ({pg.groupCode})</span>
                        <span className="text-xs text-slate-500">{pg.members.length} members</span>
                      </div>
                      {pg.leaderInfo && (
                        <div className="px-3 py-2 text-xs text-slate-500 bg-slate-50 dark:bg-zinc-800/50">Leader: {pg.leaderInfo.firstName} {pg.leaderInfo.lastName} {pg.leaderInfo.phone ? `· ${pg.leaderInfo.phone}` : ""}</div>
                      )}
                      <table className="min-w-full text-sm">
                        <thead className="bg-white dark:bg-zinc-900">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Member</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Amount</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {pg.members.map((m, i) => (
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
                      </table>
                    </div>
                  ))}
                  <div className="rounded-lg bg-slate-900 dark:bg-white text-white dark:text-black px-4 py-3 flex justify-between text-sm font-semibold">
                    <span>Total Amount to Collect</span>
                    <span>{formatCurrency.format(totalPreviewAmount)}</span>
                  </div>
                </div>
              )}

              {!previewLoading && formCenter && previewGroups.length === 0 && (
                <p className="text-sm text-muted-foreground border rounded-md p-4 text-center">No groups / members found under this center</p>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setDrawerOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-black dark:text-slate-300">
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving || !formCenter || !formStaff || previewGroups.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-slate-200"
                >
                  {saving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                  Create Center Assignment ({previewGroups.length} groups)
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
                  {viewModal.assignmentId} | {getRefName(viewModal.centerId)} | {viewModal.staffName} | {new Date(viewModal.collectionDate).toLocaleDateString("en-IN")}
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
