"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, Search, Loader2, Eye } from "lucide-react"

interface EditRequest {
  entityType: "member" | "leader" | "center"
  entityId: string
  entityName: string
  oldValues: Record<string, any>
  newValues: Record<string, any>
}

interface MemberRequest {
  action: "add" | "delete"
  memberData?: Record<string, any>
  memberId?: string
  memberName?: string
}

interface GroupRequest {
  action: "add" | "edit" | "delete"
  groupData?: Record<string, any>
  groupId?: string
  groupName?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
}

interface Inquiry {
  _id: string
  inquiryNumber: string
  member?: { firstName: string; lastName: string; memberCode: string }
  branch?: { name: string; code: string }
  type: string
  status: string
  assignedTo?: { name: string; email: string } | null
  submittedBy?: { name: string; email: string } | null
  remarks?: string
  editRequest?: EditRequest
  memberRequest?: MemberRequest
  groupRequest?: GroupRequest
  history: { action: string; performedBy?: { name: string }; date: string; remarks: string }[]
  createdAt: string
}

interface Member { _id: string; firstName: string; lastName: string; memberCode: string; branch: { _id: string } }
interface Branch { _id: string; name: string; code: string }
interface Staff { _id: string; firstName: string; lastName: string; user?: { _id: string } }

const typeLabels: Record<string, string> = {
  kyc: "KYC",
  address_verification: "Address Verification",
  document_verification: "Document Verification",
  field_visit: "Field Visit",
  member_edit: "Member Edit",
  leader_edit: "Leader Edit",
  center_edit: "Center Edit",
  member_add: "Member Add",
  member_delete: "Member Delete",
  group_add: "Group Add",
  group_edit: "Group Edit",
  group_delete: "Group Delete",
  leader_add: "Leader Add",
  leader_delete: "Leader Delete",
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

export default function InquiriesPage() {
  const [inquiries, setInquiries] = React.useState<Inquiry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [typeFilter, setTypeFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [branchFilter, setBranchFilter] = React.useState("all")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [detailDialog, setDetailDialog] = React.useState<Inquiry | null>(null)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [updateDialog, setUpdateDialog] = React.useState<Inquiry | null>(null)
  const [form, setForm] = React.useState({ member: "", branch: "", type: "kyc", assignedTo: "", remarks: "" })
  const [updateForm, setUpdateForm] = React.useState({ status: "", remarks: "" })
  const [submitting, setSubmitting] = React.useState(false)
  const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 })

  const [members, setMembers] = React.useState<Member[]>([])
  const [branches, setBranches] = React.useState<Branch[]>([])
  const [staffList, setStaffList] = React.useState<Staff[]>([])

  const fetchInquiries = React.useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "10")
      if (typeFilter !== "all") params.set("type", typeFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (branchFilter !== "all") params.set("branch", branchFilter)

      const res = await fetch(`/api/inquiries?${params}`)
      const json = await res.json()
      if (json.success) {
        setInquiries(json.data)
        setPagination(json.pagination)
      } else {
        toast.error(json.error || "Failed to fetch inquiries")
      }
    } catch {
      toast.error("Failed to fetch inquiries")
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter, branchFilter])

  React.useEffect(() => { fetchInquiries() }, [fetchInquiries])

  React.useEffect(() => {
    if (dialogOpen) {
      Promise.all([
        fetch("/api/members?limit=100&status=active").then((r) => r.json()),
        fetch("/api/branches?limit=100&status=active").then((r) => r.json()),
        fetch("/api/staff?limit=100&status=active").then((r) => r.json()),
      ]).then(([m, b, s]) => {
        if (m.success) setMembers(m.data)
        if (b.success) setBranches(b.data)
        if (s.success) setStaffList(s.data)
      }).catch(() => {})
    }
  }, [dialogOpen])

  const handleCreate = async () => {
    try {
      setSubmitting(true)
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setDialogOpen(false)
        setForm({ member: "", branch: "", type: "kyc", assignedTo: "", remarks: "" })
        fetchInquiries()
      } else {
        toast.error(json.error || "Failed to create inquiry")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!updateDialog) return
    try {
      setSubmitting(true)
      const res = await fetch(`/api/inquiries/${updateDialog._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateForm),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setUpdateDialog(null)
        setUpdateForm({ status: "", remarks: "" })
        fetchInquiries()
      } else {
        toast.error(json.error || "Failed to update inquiry")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewDetail = async (inq: Inquiry) => {
    setDetailLoading(true)
    setDetailDialog(inq)
    try {
      const res = await fetch(`/api/inquiries/${inq._id}`)
      const json = await res.json()
      if (json.success) {
        setDetailDialog(json.data)
      }
    } catch {
      toast.error("Failed to fetch inquiry details")
    } finally {
      setDetailLoading(false)
    }
  }

  const renderEditDetails = (editRequest: EditRequest) => {
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
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Inquiries</h1>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Inquiry
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "")}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="kyc">KYC</SelectItem>
              <SelectItem value="address_verification">Address Verification</SelectItem>
              <SelectItem value="document_verification">Document Verification</SelectItem>
              <SelectItem value="field_visit">Field Visit</SelectItem>
              <SelectItem value="member_edit">Member Edit</SelectItem>
              <SelectItem value="leader_edit">Leader Edit</SelectItem>
              <SelectItem value="center_edit">Center Edit</SelectItem>
              <SelectItem value="member_add">Member Add</SelectItem>
              <SelectItem value="member_delete">Member Delete</SelectItem>
              <SelectItem value="group_add">Group Add</SelectItem>
              <SelectItem value="group_edit">Group Edit</SelectItem>
              <SelectItem value="group_delete">Group Delete</SelectItem>
              <SelectItem value="leader_add">Leader Add</SelectItem>
              <SelectItem value="leader_edit">Leader Edit</SelectItem>
              <SelectItem value="leader_delete">Leader Delete</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v ?? "")}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inquiry #</TableHead>
                <TableHead>Entity / Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : inquiries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No inquiries found</TableCell>
                </TableRow>
              ) : (
                inquiries.map((inq) => (
                  <TableRow key={inq._id}>
                    <TableCell className="font-medium">{inq.inquiryNumber}</TableCell>
                    <TableCell>
                      {inq.editRequest ? (
                        <span>{inq.editRequest.entityName}</span>
                      ) : inq.memberRequest ? (
                        <span>{inq.memberRequest.memberName || "—"}</span>
                      ) : inq.groupRequest ? (
                        <span>{inq.groupRequest.groupName || "—"}</span>
                      ) : inq.member ? (
                        <span>{inq.member.firstName} {inq.member.lastName}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{typeLabels[inq.type] || inq.type}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[inq.status] || "default"}>{inq.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>{inq.submittedBy?.name || inq.assignedTo?.name || "—"}</TableCell>
                    <TableCell>{new Date(inq.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleViewDetail(inq)} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setUpdateDialog(inq)
                          setUpdateForm({ status: inq.status, remarks: "" })
                        }}>
                          Update
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchInquiries(pagination.page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchInquiries(pagination.page + 1)}>Next</Button>
            </div>
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Inquiry</DialogTitle>
              <DialogDescription>Create a new verification or field visit inquiry.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Member</Label>
                 <Select value={form.member || ""} onValueChange={(v) => {
                  const m = members.find((x) => x._id === v)
                  setForm({ ...form, member: v ?? "", branch: m?.branch?._id || form.branch })
                }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    {members.map((m) => <SelectItem key={m._id} value={m._id}>{m.firstName} {m.lastName} ({m.memberCode})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                 <Select value={form.branch || ""} onValueChange={(v) => setForm({ ...form, branch: v ?? "" })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                 <Select value={form.type || ""} onValueChange={(v) => setForm({ ...form, type: v ?? "" })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kyc">KYC</SelectItem>
                    <SelectItem value="address_verification">Address Verification</SelectItem>
                    <SelectItem value="document_verification">Document Verification</SelectItem>
                    <SelectItem value="field_visit">Field Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                 <Select value={form.assignedTo || ""} onValueChange={(v) => setForm({ ...form, assignedTo: v ?? "" })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {staffList.map((s) => <SelectItem key={s._id} value={s._id}>{s.firstName} {s.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Remarks</Label>
                <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Inquiry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail / History Dialog */}
        <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Inquiry Details</DialogTitle>
              <DialogDescription>{detailDialog?.inquiryNumber} - {typeLabels[detailDialog?.type || ""]}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {detailDialog?.editRequest && renderEditDetails(detailDialog.editRequest)}
                  {detailDialog?.memberRequest && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={detailDialog.memberRequest.action === "add" ? "default" : "destructive"}>
                          {detailDialog.memberRequest.action === "add" ? "Add Member" : "Delete Member"}
                        </Badge>
                        <span className="font-medium">{detailDialog.memberRequest.memberName}</span>
                      </div>
                      {detailDialog.memberRequest.action === "add" && detailDialog.memberRequest.memberData && (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Field</TableHead>
                                <TableHead>Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(detailDialog.memberRequest.memberData).map(([key, val]) => {
                                if (key === "address" && typeof val === "object") {
                                  return (
                                    <TableRow key={key}>
                                      <TableCell className="font-medium">Address</TableCell>
                                      <TableCell>{(val as any).street}, {(val as any).city}, {(val as any).state} - {(val as any).pincode}</TableCell>
                                    </TableRow>
                                  )
                                }
                                if (["branch", "center", "group"].includes(key)) return null
                                return (
                                  <TableRow key={key}>
                                    <TableCell className="font-medium">{editFieldLabels[key] || key}</TableCell>
                                    <TableCell>{String(val || "—")}</TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      {detailDialog.memberRequest.action === "delete" && (
                        <div className="text-sm text-muted-foreground">
                          Request to deactivate this member. The member will be set to inactive status.
                        </div>
                      )}
                    </div>
                  )}
                  {detailDialog?.groupRequest && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={detailDialog.groupRequest.action === "delete" ? "destructive" : "default"}>
                          {detailDialog.groupRequest.action === "add" ? "Add Group" : detailDialog.groupRequest.action === "edit" ? "Edit Group" : "Delete Group"}
                        </Badge>
                        <span className="font-medium">{detailDialog.groupRequest.groupName}</span>
                      </div>
                      {detailDialog.groupRequest.action === "add" && detailDialog.groupRequest.groupData && (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Field</TableHead>
                                <TableHead>Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(detailDialog.groupRequest.groupData).map(([key, val]) => (
                                <TableRow key={key}>
                                  <TableCell className="font-medium">{editFieldLabels[key] || key}</TableCell>
                                  <TableCell>{String(val || "—")}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      {detailDialog.groupRequest.action === "edit" && detailDialog.groupRequest.oldValues && detailDialog.groupRequest.newValues && (
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
                              {Object.keys(detailDialog.groupRequest?.newValues || {}).map((field) => (
                                <TableRow key={field}>
                                  <TableCell className="font-medium">{editFieldLabels[field] || field}</TableCell>
                                  <TableCell className="text-muted-foreground">{String(detailDialog.groupRequest?.oldValues?.[field] ?? "—")}</TableCell>
                                  <TableCell className="text-green-600 font-medium">{String(detailDialog.groupRequest?.newValues?.[field] ?? "—")}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      {detailDialog.groupRequest.action === "delete" && (
                        <div className="text-sm text-muted-foreground">
                          Request to deactivate this group. The group will be set to inactive status.
                        </div>
                      )}
                    </div>
                  )}
              {detailDialog?.remarks && (
                <div className="text-sm"><span className="text-muted-foreground">Remarks:</span> {detailDialog.remarks}</div>
              )}
              {detailDialog?.submittedBy && (
                <div className="text-sm"><span className="text-muted-foreground">Submitted by:</span> {detailDialog.submittedBy.name}</div>
              )}
              <div className="border-t pt-3">
                <h4 className="font-medium text-sm mb-2">History</h4>
                <div className="space-y-2">
                  {detailDialog?.history?.map((h, i) => (
                    <div key={i} className="rounded-lg border p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{h.action}</span>
                        <span className="text-muted-foreground">{new Date(h.date).toLocaleString()}</span>
                      </div>
                      {h.performedBy && <div className="text-muted-foreground mt-1">By: {h.performedBy.name}</div>}
                      {h.remarks && <div className="mt-1">Remarks: {h.remarks}</div>}
                    </div>
                  ))}
                  {(!detailDialog?.history || detailDialog.history.length === 0) && (
                    <p className="text-muted-foreground text-sm text-center py-4">No history available</p>
                  )}
                </div>
              </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialog(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Status Dialog */}
        <Dialog open={!!updateDialog} onOpenChange={() => setUpdateDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Inquiry Status</DialogTitle>
              <DialogDescription>{updateDialog?.inquiryNumber}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                 <Select value={updateForm.status || ""} onValueChange={(v) => setUpdateForm({ ...updateForm, status: v ?? "" })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Input value={updateForm.remarks} onChange={(e) => setUpdateForm({ ...updateForm, remarks: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUpdateDialog(null)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}
