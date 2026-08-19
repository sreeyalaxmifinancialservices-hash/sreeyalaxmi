"use client";

import { useEffect, useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/app/staff/dashboard/components/app-sidebar";
import { SiteHeader } from "@/app/staff/dashboard/components/site-header";

type Status = "Pending" | "Complete" | "Partially Complete" | "Incomplete";

interface AssignedCollection {
  _id: string;
  staffEmail: string;
  staffName: string;
  staffPhone: string;
  leaderName: string;
  leaderPhone: string;
  collectionDate: string;
  amount: number;
  collectedAmount: number;
  rescheduleDate?: string;
  status: Status;
  branchId: { name: string };
  centerId: { name: string };
}

const STATUS_STYLES: Record<Status, string> = {
  Pending:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/20",
  Complete:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20",
  "Partially Complete":
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/20",
  Incomplete:
    "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-400 dark:ring-slate-400/20",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function StatusModal({
  collection,
  open,
  onClose,
  onSaved,
}: {
  collection: AssignedCollection;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [newStatus, setNewStatus] = useState<Status>(collection.status);
  const [collectedAmount, setCollectedAmount] = useState<number>(
    collection.collectedAmount
  );
  const [rescheduleDate, setRescheduleDate] = useState<string>(
    collection.rescheduleDate ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setNewStatus(collection.status);
      setCollectedAmount(collection.collectedAmount);
      setRescheduleDate(collection.rescheduleDate ?? "");
      setSaving(false);
      setSaved(false);
    }
  }, [open, collection]);

  const handleStatusChange = (s: Status) => {
    setNewStatus(s);
    if (s === "Complete") {
      setCollectedAmount(collection.amount);
      setRescheduleDate("");
    } else if (s === "Incomplete") {
      setCollectedAmount(0);
    } else {
      setCollectedAmount(collection.collectedAmount);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/assigned-collection/${collection._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          collectedAmount,
          rescheduleDate: rescheduleDate || undefined,
        }),
      });
      if (res.ok) {
        setSaved(true);
        onSaved();
        setTimeout(() => onClose(), 800);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900">
        {saved ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <svg
              className="h-10 w-10 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Status updated successfully
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Update Status
              </h3>
              <button
                onClick={onClose}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Current Status
              </p>
              <StatusBadge status={collection.status} />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                New Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => handleStatusChange(e.target.value as Status)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <option value="Complete">Complete</option>
                <option value="Incomplete">Incomplete</option>
                <option value="Partially Complete">Partially Complete</option>
              </select>
            </div>

            {newStatus === "Complete" && (
              <div className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Full amount collected ({formatCurrency(collection.amount)})
              </div>
            )}

            {newStatus === "Partially Complete" && (
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Collected Amount
                </label>
                <input
                  type="number"
                  min={0}
                  max={collection.amount}
                  value={collectedAmount}
                  onChange={(e) => setCollectedAmount(Number(e.target.value))}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Total due: {formatCurrency(collection.amount)}
                </p>
              </div>
            )}

            {(newStatus === "Incomplete" || newStatus === "Partially Complete") && (
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Reschedule Date
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MyCollectionPage() {
  const [collections, setCollections] = useState<AssignedCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCollection, setModalCollection] =
    useState<AssignedCollection | null>(null);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/assigned-collection");
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections ?? data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              My Assigned Collections
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              View and update the status of collections assigned to you.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
              <thead className="bg-neutral-50 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Branch
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Center
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Leader
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : collections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <svg
                        className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25M12 13.875V7.5"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                        No collections assigned to you.
                      </p>
                    </td>
                  </tr>
                ) : (
                  collections.map((c) => (
                    <tr
                      key={c._id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                        {c.branchId.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                        {c.centerId.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                        {c.leaderName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                        {new Date(c.collectionDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(c.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <button
                          onClick={() => setModalCollection(c)}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Status
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SidebarInset>

      {modalCollection && (
        <StatusModal
          collection={modalCollection}
          open
          onClose={() => setModalCollection(null)}
          onSaved={fetchCollections}
        />
      )}
    </SidebarProvider>
  );
}
