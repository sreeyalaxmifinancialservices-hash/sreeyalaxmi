"use client";

import { useEffect, useState } from "react";
import { Plus, X, Building2, User, Hash, Calendar } from "lucide-react";

interface Branch {
  _id: string;
  branchId?: string;
  branchName: string;
  createdBy: string;
  createdAt?: string;
}

export default function BranchPage() {
  const [branchName, setBranchName] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [fetchingBranches, setFetchingBranches] = useState(true);

  useEffect(() => {
    fetchUser();
    fetchBranches();
  }, []);

  const fetchUser = async () => {
    const res = await fetch("/api/auth/me", {
      credentials: "include",
    });
    const data = await res.json();
    if (data.success) {
      setCreatedBy(data.user.email);
    }
  };

  const fetchBranches = async () => {
    setFetchingBranches(true);
    try {
      const res = await fetch("/api/branch", {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setBranches(data.branches || []);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setFetchingBranches(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/branch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branchName,
          createdBy,
        }),
      });

      const data = await res.json();
      alert(data.message);

      if (data.success) {
        setBranchName("");
        setIsDrawerOpen(false);
        fetchBranches();
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong while saving.");
    } finally {
      setLoading(false);
    }
  };

  // Highlight: branches created by the currently logged-in user
  const myBranchesCount = branches.filter((b) => b.createdBy === createdBy).length;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white text-black">
      <div className="max-w-6xl mx-auto p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black">Branches</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create and manage all branch locations.
            </p>
          </div>

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Branch
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Total Branches</p>
            <p className="text-2xl font-bold text-black">{branches.length}</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Created By You</p>
            <p className="text-2xl font-bold text-blue-600">{myBranchesCount}</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-500 mb-1">Latest Branch</p>
            <p className="text-sm font-bold text-green-600 truncate">
              {branches[branches.length - 1]?.branchName || "—"}
            </p>
          </div>
        </div>

        {/* Branch grid */}
        {fetchingBranches ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading branches...</div>
        ) : branches.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl">
            <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-4">No branches created yet.</p>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Branch
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map((branch) => (
              <div
                key={branch._id}
                className="border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-xs font-mono text-gray-400">
                    {branch.branchId || "—"}
                  </span>
                </div>

                <h3 className="font-bold text-black text-base mb-3">{branch.branchName}</h3>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span className="truncate">{branch.createdBy || "—"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(branch.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-bold text-black">Create Branch</h2>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Branch ID
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  disabled
                  value="Auto Generated"
                  className="w-full border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 rounded-lg text-sm text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Branch Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Jamshedpur Central"
                  className="w-full border border-gray-300 pl-10 pr-3 py-3 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Created By
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  disabled
                  value={createdBy || "Loading..."}
                  className="w-full border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 rounded-lg text-sm text-gray-400"
                />
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex gap-3 pt-2 border-t border-gray-100 -mx-6 px-6 pb-1">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold text-sm py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold text-sm py-3 rounded-lg shadow-sm transition-colors"
              >
                {loading ? "Saving..." : "Save Branch"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}