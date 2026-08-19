"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { CheckCircle, XCircle, Loader2, Eye, Wrench } from "lucide-react"

interface CenterRequest {
  _id: string
  staff: { firstName: string; lastName: string; employeeId: string }
  requestType: "existing-center" | "new-center"
  center?: { name: string; code: string }
  branch: { name: string; code: string }
  leaderName?: string
  leaderPhone?: string
  leaderEmail?: string
  newCenterName?: string
  newCenterCode?: string
  newCenterMeetingDay?: string
  newCenterMeetingTime?: string
  newCenterLocation?: string
  addGroup?: boolean
  groupName?: string
  groupCode?: string
  status: "pending" | "approved" | "rejected"
  reviewedBy?: { name: string }
  reviewedAt?: string
  remarks?: string
  createdAt: string
}

export default function AdminCenterRequestsPage() {
  const [requests, setRequests] = React.useState<CenterRequest[]>([])
  const [loading, setLoading] = React.useState(true)
  const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 })
  const [statusFilter, setStatusFilter] = React.useState("pending")
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [selectedRequest, setSelectedRequest] = React.useState<CenterRequest | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
  const [rejectRemarks, setRejectRemarks] = React.useState("")
  const [rejectId, setRejectId] = React.useState<string | null>(null)
  const [fixingLeaders, setFixingLeaders] = React.useState(false)
  const [fixingGroups, setFixingGroups] = React.useState(false)

  const fetchRequests = React.useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/admin/center-requests?${params}`)
      const json = await res.json()
      if (json.success) {
        setRequests(json.data)
        setPagination(json.pagination)
      } else {
        toast.error(json.error || "Failed to fetch requests")
      }
    } catch {
      toast.error("Failed to fetch requests")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  React.useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(id)
      const res = await fetch("/api/admin/center-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: id, status: "approved" }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        fetchRequests()
      } else {
        toast.error(json.error || "Failed to approve")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectId) return
    try {
      setActionLoading(rejectId)
      const res = await fetch("/api/admin/center-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: rejectId, status: "rejected", remarks: rejectRemarks }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setRejectDialogOpen(false)
        setRejectRemarks("")
        setRejectId(null)
        fetchRequests()
      } else {
        toast.error(json.error || "Failed to reject")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setActionLoading(null)
    }
  }

  const handleFixLeaders = async () => {
    try {
      setFixingLeaders(true)
      const res = await fetch("/api/admin/center-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fix-missing-leaders" }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        fetchRequests()
      } else {
        toast.error(json.error || "Failed to fix leaders")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setFixingLeaders(false)
    }
  }

  const handleFixGroups = async () => {
    try {
      setFixingGroups(true)
      const res = await fetch("/api/admin/center-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fix-missing-groups" }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        fetchRequests()
      } else {
        toast.error(json.error || "Failed to fix groups")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setFixingGroups(false)
    }
  }

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    approved: "default",
    rejected: "destructive",
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Request</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleFixLeaders}
          disabled={fixingLeaders}
        >
          {fixingLeaders ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wrench className="mr-2 h-4 w-4" />
          )}
          Fix Missing Leaders
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleFixGroups}
          disabled={fixingGroups}
        >
          {fixingGroups ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wrench className="mr-2 h-4 w-4" />
          )}
          Fix Missing Groups
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
          No manage requests found.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Center</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Leader</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r._id}>
                  <TableCell className="font-medium">{r.staff?.firstName} {r.staff?.lastName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.requestType === "new-center" ? "New Center" : "Existing Center"}</Badge>
                  </TableCell>
                  <TableCell>{r.requestType === "new-center" ? r.newCenterName : (r.center?.name || "—")}</TableCell>
                  <TableCell>{r.branch?.name || "—"}</TableCell>
                  <TableCell>{r.leaderName || "—"}</TableCell>
                  <TableCell>{r.addGroup && r.groupName ? r.groupName : "—"}</TableCell>
                  <TableCell><Badge variant={statusColors[r.status]}>{r.status}</Badge></TableCell>
                  <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => { setSelectedRequest(r); setDetailOpen(true) }}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {r.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleApprove(r._id)}
                            disabled={actionLoading === r._id}
                            title="Approve"
                          >
                            {actionLoading === r._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => { setRejectId(r._id); setRejectDialogOpen(true) }}
                            disabled={actionLoading === r._id}
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchRequests(pagination.page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchRequests(pagination.page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>Manage assignment request information.</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Staff</p>
                <p className="font-medium">{selectedRequest.staff?.firstName} {selectedRequest.staff?.lastName} ({selectedRequest.staff?.employeeId})</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Request Type</p>
                <Badge variant="outline">{selectedRequest.requestType === "new-center" ? "New Center" : "Existing Center"}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Branch</p>
                <p className="font-medium">{selectedRequest.branch?.name || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Center</p>
                <p className="font-medium">{selectedRequest.requestType === "new-center" ? selectedRequest.newCenterName : (selectedRequest.center?.name || "—")}</p>
              </div>
              {selectedRequest.requestType === "new-center" && (
                <>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Center Code</p>
                    <p className="font-medium">{selectedRequest.newCenterCode}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Meeting Day</p>
                    <p className="font-medium">{selectedRequest.newCenterMeetingDay}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Meeting Time</p>
                    <p className="font-medium">{selectedRequest.newCenterMeetingTime}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedRequest.newCenterLocation}</p>
                  </div>
                </>
              )}
              {selectedRequest.leaderName && (
                <>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Leader Name</p>
                    <p className="font-medium">{selectedRequest.leaderName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Leader Phone</p>
                    <p className="font-medium">{selectedRequest.leaderPhone || "—"}</p>
                  </div>
                </>
              )}
              {selectedRequest.addGroup && selectedRequest.groupName && (
                <>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Group Name</p>
                    <p className="font-medium">{selectedRequest.groupName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Group Code</p>
                    <p className="font-medium">{selectedRequest.groupCode || "—"}</p>
                  </div>
                </>
              )}
              <div className="space-y-1">
                <p className="text-muted-foreground">Status</p>
                <Badge variant={statusColors[selectedRequest.status]}>{selectedRequest.status}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Submitted</p>
                <p className="font-medium">{new Date(selectedRequest.createdAt).toLocaleDateString()}</p>
              </div>
              {selectedRequest.reviewedAt && (
                <div className="space-y-1">
                  <p className="text-muted-foreground">Reviewed At</p>
                  <p className="font-medium">{new Date(selectedRequest.reviewedAt).toLocaleDateString()}</p>
                </div>
              )}
              {selectedRequest.remarks && (
                <div className="col-span-2 space-y-1">
                  <p className="text-muted-foreground">Remarks</p>
                  <p className="font-medium">{selectedRequest.remarks}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                placeholder="Enter reason for rejection"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectRemarks(""); setRejectId(null) }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectRemarks}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
