"use client";

import React, { useEffect, useState, useMemo } from "react";

interface Branch {
  _id: string;
  name: string;
}

interface Staff {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  branches: ({ _id: string; name: string } | string)[];
}

interface Center {
  _id: string;
  name: string;
  branch: { _id: string; name: string } | string;
  leader?: { firstName: string; lastName: string; phone: string } | null;
}

interface AssignedCollection {
  _id: string;
  branchId: { _id: string; name: string } | string;
  centerId: { _id: string; name: string } | string;
  staffId: { _id: string; firstName: string; lastName: string; email: string; phone: string } | string;
  staffName: string;
  staffEmail: string;
  staffPhone: string;
  leaderName: string;
  leaderPhone: string;
  collectionDate: string;
  amount: number;
  collectedAmount?: number;
  rescheduleDate?: string;
  status: "Pending" | "Complete" | "Partially Complete" | "Incomplete";
}

const STATUS_STYLES: Record<string, string> = {
  Pending:
    "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Complete:
    "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Partially Complete":
    "inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  Incomplete:
    "inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
};

function IconPlus({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function IconX({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function IconPencil({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
    </svg>
  );
}

function IconTrash({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function IconInbox({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black shadow-sm placeholder:text-slate-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-black dark:text-white dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/10 dark:disabled:bg-white/5";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

const formatCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function getRefName(ref: any): string {
  if (!ref) return "";
  if (typeof ref === "object" && ref !== null) {
    if (ref.name) return ref.name;
    if (ref.firstName) return `${ref.firstName} ${ref.lastName || ""}`.trim();
  }
  return "";
}

function getRefId(ref: any): string {
  if (!ref) return "";
  if (typeof ref === "object" && ref !== null) return ref._id || "";
  return String(ref);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

type FormState = {
  branchId: string;
  centerId: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  staffPhone: string;
  leaderName: string;
  leaderPhone: string;
  collectionDate: string;
  amount: number;
  status: "Pending" | "Complete" | "Partially Complete" | "Incomplete";
};

const EMPTY_FORM: FormState = {
  branchId: "",
  centerId: "",
  staffId: "",
  staffName: "",
  staffEmail: "",
  staffPhone: "",
  leaderName: "",
  leaderPhone: "",
  collectionDate: todayStr(),
  amount: 0,
  status: "Pending",
};

export default function AssignedCollectionPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [filteredCenters, setFilteredCenters] = useState<Center[]>([]);
  const [filteredStaffs, setFilteredStaffs] = useState<Staff[]>([]);
  const [collections, setCollections] = useState<AssignedCollection[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const loadData = async () => {
    try {
      setLoading(true);
      const [branchRes, staffRes, centerRes, collectionRes] = await Promise.all([
        fetch("/api/branch"),
        fetch("/api/staff"),
        fetch("/api/centers?limit=1000"),
        fetch("/api/assigned-collection"),
      ]);

      const [branchData, staffData, centerData, collectionData] = await Promise.all([
        branchRes.json(),
        staffRes.json(),
        centerRes.json(),
        collectionRes.json(),
      ]);

      setBranches(Array.isArray(branchData) ? branchData : branchData.branches || branchData.data || []);
      setStaffs(Array.isArray(staffData) ? staffData : staffData.data || []);
      setCenters(Array.isArray(centerData) ? centerData : centerData.data || []);
      setCollections(Array.isArray(collectionData) ? collectionData : collectionData.data || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (form.branchId) {
      setFilteredCenters(
        centers.filter((c) => {
          const branchId = typeof c.branch === "object" ? c.branch._id : c.branch;
          return branchId === form.branchId;
        })
      );
      setFilteredStaffs(
        staffs.filter((s) => {
          return (s.branches || []).some(b => {
            const branchId = typeof b === "object" ? b._id : b;
            return branchId === form.branchId;
          });
        })
      );
    } else {
      setFilteredCenters([]);
      setFilteredStaffs([]);
    }
  }, [form.branchId, centers, staffs]);

  const handleStaff = (staffId: string) => {
    const staff = filteredStaffs.find((s) => s._id === staffId);
    if (staff) {
      setForm((prev) => ({
        ...prev,
        staffId: staff._id,
        staffName: `${staff.firstName} ${staff.lastName}`,
        staffEmail: staff.email,
        staffPhone: staff.phone,
      }));
    }
  };

  const handleCenterSelect = async (centerId: string) => {
    setForm((prev) => ({ ...prev, centerId }));
    if (!centerId) {
      setForm((prev) => ({ ...prev, leaderName: "", leaderPhone: "" }));
      return;
    }
    try {
      const res = await fetch(`/api/centers/${centerId}`);
      const data = await res.json();
      const leader = data?.data?.leader;
      if (leader) {
        setForm((prev) => ({
          ...prev,
          leaderName: `${leader.firstName || ""} ${leader.lastName || ""}`.trim(),
          leaderPhone: leader.phone || "",
        }));
      }
    } catch (error) {
      console.error("Failed to fetch center:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const branch = branches.find((b) => b._id === form.branchId);
      const center = centers.find((c) => c._id === form.centerId);
      const payload = {
        ...form,
        branchName: branch?.name,
        centerName: center?.name,
      };

      if (editId) {
        await fetch(`/api/assigned-collection/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/assigned-collection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setDrawerOpen(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      loadData();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: AssignedCollection) => {
    setEditId(item._id);
    setForm({
      branchId: getRefId(item.branchId),
      centerId: getRefId(item.centerId),
      staffId: getRefId(item.staffId),
      staffName: item.staffName,
      staffEmail: item.staffEmail,
      staffPhone: item.staffPhone,
      leaderName: item.leaderName || "",
      leaderPhone: item.leaderPhone || "",
      collectionDate: item.collectionDate?.slice(0, 10) || "",
      amount: item.amount,
      status: item.status,
    });
    setDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    try {
      await fetch(`/api/assigned-collection/${id}`, { method: "DELETE" });
      loadData();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const openDrawer = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Assigned Collections
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage collection assignments for branches and centers.
            </p>
          </div>
          <button
            onClick={openDrawer}
            className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2 dark:bg-white dark:text-black dark:hover:bg-slate-200 dark:focus:ring-white/20 dark:focus:ring-offset-black"
          >
            <IconPlus className="h-4 w-4" />
            Add Assignment
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Branch
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Center
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Leader
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Staff
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-black dark:border-slate-600 dark:border-t-white" />
                      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading...</p>
                    </td>
                  </tr>
                ) : collections.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <IconInbox className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                      <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                        No assigned collections
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Get started by adding a new assignment.
                      </p>
                    </td>
                  </tr>
                ) : (
                  collections.map((item) => (
                    <tr
                      key={item._id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {getRefName(item.branchId) || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {getRefName(item.centerId) || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {item.leaderName || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                        {item.staffName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {item.staffPhone || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {item.collectionDate
                          ? new Date(item.collectionDate).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-white">
                        {formatCurrency.format(item.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span className={STATUS_STYLES[item.status] || STATUS_STYLES["Pending"]}>
                          {item.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                            title="Edit"
                          >
                            <IconPencil />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                            title="Delete"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={closeDrawer}
          />
          <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-white shadow-2xl transition-transform dark:bg-zinc-900 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editId ? "Edit Assignment" : "New Assignment"}
              </h2>
              <button
                onClick={closeDrawer}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-5 p-6">
                <div>
                  <label className={labelClass}>Branch</label>
                  <select
                    value={form.branchId}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        branchId: e.target.value,
                        centerId: "",
                        staffId: "",
                        staffName: "",
                        staffEmail: "",
                        staffPhone: "",
                        leaderName: "",
                        leaderPhone: "",
                      }))
                    }
                    className={inputClass}
                    required
                  >
                    <option value="">Select branch</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Center</label>
                  <select
                    value={form.centerId}
                    onChange={(e) => handleCenterSelect(e.target.value)}
                    className={inputClass}
                    disabled={!form.branchId}
                    required
                  >
                    <option value="">Select center</option>
                    {filteredCenters.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Staff</label>
                  <select
                    value={form.staffId}
                    onChange={(e) => handleStaff(e.target.value)}
                    className={inputClass}
                    disabled={!form.branchId}
                    required
                  >
                    <option value="">Select staff</option>
                    {filteredStaffs.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={form.staffEmail}
                    readOnly
                    className={inputClass}
                    placeholder="Auto-filled"
                  />
                </div>

                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="text"
                    value={form.staffPhone}
                    readOnly
                    className={inputClass}
                    placeholder="Auto-filled"
                  />
                </div>

                <div>
                  <label className={labelClass}>Leader Name</label>
                  <input
                    type="text"
                    value={form.leaderName}
                    readOnly
                    className={inputClass}
                    placeholder="Auto-filled from center"
                  />
                </div>

                <div>
                  <label className={labelClass}>Leader Phone</label>
                  <input
                    type="text"
                    value={form.leaderPhone}
                    readOnly
                    className={inputClass}
                    placeholder="Auto-filled from center"
                  />
                </div>

                <div>
                  <label className={labelClass}>Collection Date</label>
                  <input
                    type="date"
                    value={form.collectionDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, collectionDate: e.target.value }))
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Amount</label>
                  <input
                    type="number"
                    value={form.amount || ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, amount: Number(e.target.value) }))
                    }
                    className={inputClass}
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        status: e.target.value as FormState["status"],
                      }))
                    }
                    className={inputClass}
                    required
                  >
                    <option value="Pending">Pending</option>
                    <option value="Complete">Complete</option>
                    <option value="Partially Complete">Partially Complete</option>
                    <option value="Incomplete">Incomplete</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-black dark:text-slate-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-slate-200 dark:focus:ring-white/20 dark:focus:ring-offset-black"
                  >
                    {saving && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    )}
                    {editId ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
