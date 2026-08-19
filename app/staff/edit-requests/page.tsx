"use client"

import { useEffect, useState, useCallback } from "react"
import { AppSidebar } from "@/app/staff/dashboard/components/app-sidebar"
import { SiteHeader } from "@/app/staff/dashboard/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { EyeIcon } from "lucide-react"
import { toast } from "sonner"

interface EditRequest {
  _id: string
  inquiryNumber: string
  type: string
  status: string
  editRequest?: {
    entityType: string
    entityId: string
    entityName: string
    oldValues: Record<string, any>
    newValues: Record<string, any>
  }
  memberRequest?: {
    action: string
    memberData?: Record<string, any>
    memberId?: { firstName: string; lastName: string; memberCode: string }
    memberName?: string
  }
  groupRequest?: {
    action: string
    groupData?: Record<string, any>
    groupId?: { name: string; code: string }
    groupName?: string
    oldValues?: Record<string, any>
    newValues?: Record<string, any>
  }
  history: { action: string; date: string; remarks: string }[]
  createdAt: string
}
interface Pagination { page: number; limit: number; total: number; pages: number }

const typeLabels: Record<string, string> = {
  member_edit: "Member Edit",
  leader_edit: "Leader Edit",
  center_edit: "Center Edit",
  member_delete: "Member Delete",
  group_edit: "Group Edit",
  group_delete: "Group Delete",
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  in_progress: "default",
  completed: "outline",
  rejected: "destructive",
}

const editFieldLabels: Record<string, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  guardianName: "Guardian/Husband",
  phone: "Phone",
  email: "Email",
  aadhaar: "Aadhaar",
  pan: "PAN",
  dob: "DOB",
  gender: "Gender",
  address: "Address",
  name: "Name",
  meetingDay: "Meeting Day",
  meetingTime: "Meeting Time",
  location: "Location",
  street: "Street",
  city: "City",
  state: "State",
  pincode: "Pincode",
}

export default function StaffEditRequestsPage() {
  const [requests, setRequests] = useState<EditRequest[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [detailRequest, setDetailRequest] = useState<EditRequest | null>(null)

  const fetchRequests = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/staff/edit-requests?${params}`)
      const json = await res.json()
      if (json.success) {
        setRequests(json.data)
        setPagination(json.pagination)
      } else {
        toast.error(json.error || "Failed to fetch edit requests")
      }
    } catch {
      toast.error("Failed to fetch edit requests")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchRequests(1) }, [fetchRequests])

  const renderEditDetails = (editRequest: NonNullable<EditRequest["editRequest"]>) => {
    const fields = Object.keys(editRequest.newValues)
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline">{editRequest.entityType}</Badge>
          <span className="font-medium">{editRequest.entityName}</span>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Requested Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field) => {
                const oldVal = editRequest.oldValues[field]
                const newVal = editRequest.newValues[field]
                const isAddress = field === "address"

                return (
                  <TableRow key={field}>
                    <TableCell className="font-medium">{editFieldLabels[field] || field}</TableCell>
                    <TableCell>
                      {isAddress ? (
                        <span className="text-muted-foreground text-xs">
                          {oldVal?.street}, {oldVal?.city}, {oldVal?.state} - {oldVal?.pincode}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{String(oldVal ?? "—")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isAddress ? (
                        <span className="text-green-600 font-medium text-xs">
                          {newVal?.street}, {newVal?.city}, {newVal?.state} - {newVal?.pincode}
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">{String(newVal ?? "—")}</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Edit/Delete Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request #</TableHead>
                        <TableHead>Entity Type</TableHead>
                        <TableHead>Entity Name</TableHead>
                        <TableHead>Changes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                          </TableRow>
                        ))
                      ) : requests.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No edit requests found</TableCell></TableRow>
                      ) : (
                        requests.map((r) => (
                          <TableRow key={r._id}>
                            <TableCell className="font-medium">{r.inquiryNumber}</TableCell>
                            <TableCell>{typeLabels[r.type] || r.type}</TableCell>
                            <TableCell>{r.editRequest?.entityName || r.memberRequest?.memberName || r.groupRequest?.groupName || "—"}</TableCell>
                            <TableCell>{r.editRequest ? `${Object.keys(r.editRequest.newValues || {}).length} field(s)` : r.memberRequest ? r.memberRequest.action : r.groupRequest ? r.groupRequest.action : "—"}</TableCell>
                            <TableCell>
                              <Badge variant={statusColors[r.status] || "default"}>{r.status.replace("_", " ")}</Badge>
                            </TableCell>
                            <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => setDetailRequest(r)} title="View Details">
                                <EyeIcon className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchRequests(pagination.page - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchRequests(pagination.page + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      <Dialog open={!!detailRequest} onOpenChange={() => setDetailRequest(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>{detailRequest?.inquiryNumber} - {typeLabels[detailRequest?.type || ""]}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {detailRequest?.editRequest && renderEditDetails(detailRequest.editRequest)}
            {detailRequest?.memberRequest && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={detailRequest.memberRequest.action === "delete" ? "destructive" : "default"}>
                    {detailRequest.memberRequest.action === "add" ? "Add Member" : "Delete Member"}
                  </Badge>
                  <span className="font-medium">{detailRequest.memberRequest.memberName}</span>
                </div>
                {detailRequest.memberRequest.action === "delete" && (
                  <div className="text-sm text-muted-foreground">Request to deactivate this member.</div>
                )}
              </div>
            )}
            {detailRequest?.groupRequest && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={detailRequest.groupRequest.action === "delete" ? "destructive" : "default"}>
                    {detailRequest.groupRequest.action === "add" ? "Add Group" : detailRequest.groupRequest.action === "edit" ? "Edit Group" : "Delete Group"}
                  </Badge>
                  <span className="font-medium">{detailRequest.groupRequest.groupName}</span>
                </div>
                {detailRequest.groupRequest.action === "edit" && detailRequest.groupRequest.oldValues && detailRequest.groupRequest.newValues && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Field</TableHead>
                          <TableHead>Current</TableHead>
                          <TableHead>Requested</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.keys(detailRequest.groupRequest.newValues).map((field) => (
                          <TableRow key={field}>
                            <TableCell className="font-medium">{editFieldLabels[field] || field}</TableCell>
                            <TableCell className="text-muted-foreground">{String(detailRequest.groupRequest?.oldValues?.[field] ?? "—")}</TableCell>
                            <TableCell className="text-green-600 font-medium">{String(detailRequest.groupRequest?.newValues?.[field] ?? "—")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {detailRequest.groupRequest.action === "delete" && (
                  <div className="text-sm text-muted-foreground">Request to deactivate this group.</div>
                )}
              </div>
            )}
            <div className="border-t pt-3">
              <h4 className="font-medium text-sm mb-2">History</h4>
              <div className="space-y-2">
                {detailRequest?.history?.map((h, i) => (
                  <div key={i} className="rounded-lg border p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{h.action}</span>
                      <span className="text-muted-foreground">{new Date(h.date).toLocaleString()}</span>
                    </div>
                    {h.remarks && <div className="mt-1 text-muted-foreground">Remarks: {h.remarks}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailRequest(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
