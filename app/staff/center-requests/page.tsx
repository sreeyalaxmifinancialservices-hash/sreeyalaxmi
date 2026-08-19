"use client"

import * as React from "react"
import { AppSidebar } from "@/app/staff/dashboard/components/app-sidebar"
import { SiteHeader } from "@/app/staff/dashboard/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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
import { Plus, Loader2 } from "lucide-react"

interface Branch { _id: string; name: string; code: string }
interface Center { _id: string; name: string; code: string; branch: { _id: string; name: string } }
interface CenterRequest {
  _id: string
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

export default function StaffCenterRequestsPage() {
  const [requests, setRequests] = React.useState<CenterRequest[]>([])
  const [loading, setLoading] = React.useState(true)
  const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 })
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const [branches, setBranches] = React.useState<Branch[]>([])
  const [centers, setCenters] = React.useState<Center[]>([])

  const [form, setForm] = React.useState({
    requestType: "existing-center" as "existing-center" | "new-center",
    branch: "",
    center: "",
    leaderName: "",
    leaderPhone: "",
    leaderEmail: "",
    newCenterName: "",
    newCenterCode: "",
    newCenterMeetingDay: "",
    newCenterMeetingTime: "",
    newCenterLocation: "",
    addGroup: false,
    groupName: "",
    groupCode: "",
  })

  const fetchRequests = React.useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/staff/center-requests?${params}`)
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

  React.useEffect(() => {
    if (dialogOpen) {
      Promise.all([
        fetch("/api/branches?limit=100&status=active").then((r) => r.json()),
      ]).then(([b]) => {
        if (b.success) setBranches(b.data)
      }).catch(() => {})
    }
  }, [dialogOpen])

  React.useEffect(() => {
    if (form.branch) {
      fetch(`/api/centers?limit=100&branch=${form.branch}&status=active`)
        .then((r) => r.json())
        .then((j) => { if (j.success) setCenters(j.data) })
        .catch(() => {})
    } else {
      setCenters([])
    }
  }, [form.branch])

  const handleCreate = async () => {
    if (!form.branch) {
      toast.error("Please select a branch")
      return
    }
    if (form.requestType === "existing-center" && !form.center) {
      toast.error("Please select a center")
      return
    }
    if (form.requestType === "new-center") {
      if (!form.newCenterName || !form.newCenterCode || !form.newCenterMeetingDay || !form.newCenterMeetingTime || !form.newCenterLocation) {
        toast.error("Please fill all new center fields")
        return
      }
    }
    if (form.addGroup && !form.groupName) {
      toast.error("Please enter a group name")
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch("/api/staff/center-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: form.requestType,
          branch: form.branch,
          center: form.center,
          leaderName: form.leaderName,
          leaderPhone: form.leaderPhone,
          leaderEmail: form.leaderEmail,
          newCenterName: form.newCenterName,
          newCenterCode: form.newCenterCode,
          newCenterMeetingDay: form.newCenterMeetingDay,
          newCenterMeetingTime: form.newCenterMeetingTime,
          newCenterLocation: form.newCenterLocation,
          addGroup: form.addGroup,
          groupName: form.groupName,
          groupCode: form.groupCode,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setDialogOpen(false)
        setForm({
          requestType: "existing-center",
          branch: "", center: "", leaderName: "", leaderPhone: "", leaderEmail: "",
          newCenterName: "", newCenterCode: "", newCenterMeetingDay: "", newCenterMeetingTime: "", newCenterLocation: "",
          addGroup: false, groupName: "", groupCode: "",
        })
        fetchRequests()
      } else {
        toast.error(json.error || "Failed to submit request")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    approved: "default",
    rejected: "destructive",
  }

  const getCenterDisplay = (r: CenterRequest) => {
    if (r.requestType === "new-center") return r.newCenterName || "—"
    return r.center?.name || "—"
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Center Requests</h1>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Request
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
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
              No center requests found.
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Center</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Leader</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell>
                        <Badge variant="outline">{r.requestType === "new-center" ? "New Center" : "Existing Center"}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{getCenterDisplay(r)}</TableCell>
                      <TableCell>{r.branch?.name || "—"}</TableCell>
                      <TableCell>{r.leaderName || "—"}</TableCell>
                      <TableCell>{r.addGroup && r.groupName ? r.groupName : "—"}</TableCell>
                      <TableCell><Badge variant={statusColors[r.status]}>{r.status}</Badge></TableCell>
                      <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
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

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit Center Request</DialogTitle>
                <DialogDescription>Request to add yourself to a center or create a new center.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Request Type</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                    value={form.requestType}
                    onChange={(e) => setForm({ ...form, requestType: e.target.value as "existing-center" | "new-center", branch: "", center: "", newCenterName: "", newCenterCode: "", newCenterMeetingDay: "", newCenterMeetingTime: "", newCenterLocation: "" })}
                  >
                    <option value="existing-center">Assign to Existing Center</option>
                    <option value="new-center">Create New Center</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Branch</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value, center: "" })}
                  >
                    <option value="">Select branch</option>
                    {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>

                {form.requestType === "existing-center" && (
                  <div className="space-y-2">
                    <Label>Center</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                      value={form.center}
                      onChange={(e) => setForm({ ...form, center: e.target.value })}
                    >
                      <option value="">Select center</option>
                      {centers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                {form.requestType === "new-center" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Center Name</Label>
                        <Input value={form.newCenterName} onChange={(e) => setForm({ ...form, newCenterName: e.target.value })} placeholder="Enter center name" />
                      </div>
                      <div className="space-y-2">
                        <Label>Center Code</Label>
                        <Input value={form.newCenterCode} onChange={(e) => setForm({ ...form, newCenterCode: e.target.value })} placeholder="Enter center code" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Meeting Day</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                          value={form.newCenterMeetingDay}
                          onChange={(e) => setForm({ ...form, newCenterMeetingDay: e.target.value })}
                        >
                          <option value="">Select day</option>
                          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Meeting Time</Label>
                        <Input type="time" value={form.newCenterMeetingTime} onChange={(e) => setForm({ ...form, newCenterMeetingTime: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={form.newCenterLocation} onChange={(e) => setForm({ ...form, newCenterLocation: e.target.value })} placeholder="Enter location" />
                    </div>
                  </>
                )}

                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Leader Details (Optional)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Leader Name</Label>
                      <Input value={form.leaderName} onChange={(e) => setForm({ ...form, leaderName: e.target.value })} placeholder="Leader name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Leader Phone</Label>
                      <Input value={form.leaderPhone} onChange={(e) => setForm({ ...form, leaderPhone: e.target.value })} placeholder="Leader phone" />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label>Leader Email</Label>
                    <Input value={form.leaderEmail} onChange={(e) => setForm({ ...form, leaderEmail: e.target.value })} placeholder="Leader email" />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="addGroup"
                      checked={form.addGroup}
                      onChange={(e) => setForm({ ...form, addGroup: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="addGroup" className="text-sm font-medium">Also add a Group</Label>
                  </div>
                  {form.addGroup && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Group Name *</Label>
                        <Input value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })} placeholder="Enter group name" />
                      </div>
                      <div className="space-y-2">
                        <Label>Group Code</Label>
                        <Input value={form.groupCode} onChange={(e) => setForm({ ...form, groupCode: e.target.value })} placeholder="Auto-generated if empty" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
