"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/app/staff/dashboard/components/app-sidebar"
import { SiteHeader } from "@/app/staff/dashboard/components/site-header"
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
import { Plus, Loader2 } from "lucide-react"

interface AssignedCollection {
  _id: string
  staffEmail: string
  staffName: string
  staffPhone: string
  status: string
  amount: number
  collectedAmount: number
  rescheduleDate?: string
  branchId: { name: string }
  centerId: { name: string }
  collectionDate?: string
}

interface Collection {
  _id: string
  collectionId: string
  center: { name: string; code: string }
  group: { name: string; code: string }
  leader: { firstName: string; lastName: string } | null
  staffName: string
  collectionDate: string
  cashAmount: number
  onlineAmount: number
  total: number
  status: string
  createdAt: string
}

interface Center {
  _id: string
  name: string
  code: string
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val)

export default function StaffCollectionsPage() {
  const [assignedCollections, setAssignedCollections] = React.useState<AssignedCollection[]>([])
  const [assignedLoading, setAssignedLoading] = React.useState(true)
  const [collections, setCollections] = React.useState<Collection[]>([])
  const [collectionsLoading, setCollectionsLoading] = React.useState(true)
  const [centers, setCenters] = React.useState<Center[]>([])
  const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 })

  const [recordDialogOpen, setRecordDialogOpen] = React.useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false)
  const [selectedAssigned, setSelectedAssigned] = React.useState<AssignedCollection | null>(null)

  const [statusForm, setStatusForm] = React.useState({
    status: "Complete",
    collectedAmount: 0,
    rescheduleDate: "",
  })

  const [form, setForm] = React.useState({
    centerId: "",
    collectionDate: "",
    cashAmount: 0,
    onlineAmount: 0,
    advanceAmount: 0,
    insuranceAmount: 0,
    savingsAmount: 0,
    remarks: "",
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [statusSubmitting, setStatusSubmitting] = React.useState(false)

  const fetchAssignedCollections = React.useCallback(async () => {
    try {
      setAssignedLoading(true)
      const res = await fetch("/api/staff/assigned-collection")
      const data = await res.json()
      if (Array.isArray(data)) {
        setAssignedCollections(data)
      } else if (data.success) {
        setAssignedCollections(data.data)
      }
    } catch {
      toast.error("Failed to fetch assigned collections")
    } finally {
      setAssignedLoading(false)
    }
  }, [])

  const fetchCollections = React.useCallback(async (page = 1) => {
    try {
      setCollectionsLoading(true)
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "10")
      const res = await fetch(`/api/staff/collections?${params}`)
      const json = await res.json()
      if (json.success) {
        setCollections(json.data)
        setPagination(json.pagination)
      } else {
        toast.error(json.error || "Failed to fetch collections")
      }
    } catch {
      toast.error("Failed to fetch collections")
    } finally {
      setCollectionsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAssignedCollections()
    fetchCollections()
  }, [fetchAssignedCollections, fetchCollections])

  React.useEffect(() => {
    if (recordDialogOpen) {
      fetch("/api/staff/centers")
        .then((r) => r.json())
        .then((j) => {
          if (j.success) setCenters(j.data)
        })
        .catch(() => {})
    }
  }, [recordDialogOpen])

  React.useEffect(() => {
    if (selectedAssigned) {
      setStatusForm({
        status: selectedAssigned.status === "Incomplete" ? "Incomplete" : "Complete",
        collectedAmount: selectedAssigned.collectedAmount || 0,
        rescheduleDate: selectedAssigned.rescheduleDate || "",
      })
    }
  }, [selectedAssigned])

  React.useEffect(() => {
    if (statusForm.status === "Complete") {
      setStatusForm((prev) => ({
        ...prev,
        collectedAmount: selectedAssigned?.amount ?? 0,
        rescheduleDate: "",
      }))
    } else if (statusForm.status === "Incomplete") {
      setStatusForm((prev) => ({ ...prev, collectedAmount: 0 }))
    }
  }, [statusForm.status, selectedAssigned])

  const handleCreate = async () => {
    try {
      setSubmitting(true)
      const res = await fetch("/api/staff/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setRecordDialogOpen(false)
        setForm({
          centerId: "",
          collectionDate: "",
          cashAmount: 0,
          onlineAmount: 0,
          advanceAmount: 0,
          insuranceAmount: 0,
          savingsAmount: 0,
          remarks: "",
        })
        fetchCollections()
      } else {
        toast.error(json.error || "Failed to record collection")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!selectedAssigned) return
    try {
      setStatusSubmitting(true)
      const res = await fetch(`/api/assigned-collection/${selectedAssigned._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusForm.status,
          collectedAmount: statusForm.status === "Incomplete" ? 0 : statusForm.collectedAmount,
          rescheduleDate: statusForm.status === "Complete" ? undefined : statusForm.rescheduleDate || undefined,
        }),
      })
      const json = await res.json()
      if (json.success || res.ok) {
        toast.success("Status updated successfully")
        setStatusDialogOpen(false)
        setSelectedAssigned(null)
        fetchAssignedCollections()
      } else {
        toast.error(json.error || "Failed to update status")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setStatusSubmitting(false)
    }
  }

  const openStatusDialog = (item: AssignedCollection) => {
    setSelectedAssigned(item)
    setStatusDialogOpen(true)
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
        <div className="flex flex-1 flex-col gap-6 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Collections</h1>
            <Button onClick={() => setRecordDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Record Collection
            </Button>
          </div>

          {/* Assigned Collections */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Assigned Collections</h2>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Center</TableHead>
                    <TableHead>Leader</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : assignedCollections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No assigned collections
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignedCollections.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.branchId?.name}</TableCell>
                        <TableCell>{item.centerId?.name}</TableCell>
                        <TableCell>{item.staffName}</TableCell>
                        <TableCell>
                          {item.collectionDate
                            ? new Date(item.collectionDate).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>{formatCurrency(item.amount)}</TableCell>
                        <TableCell>{formatCurrency(item.collectedAmount || 0)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === "Complete"
                                ? "default"
                                : item.status === "Partially Complete"
                                  ? "outline"
                                  : "secondary"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openStatusDialog(item)}
                          >
                            Status
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Regular Collections */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Collections</h2>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collection #</TableHead>
                    <TableHead>Center</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Leader</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Cash</TableHead>
                    <TableHead>Online</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectionsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : collections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No collections found
                      </TableCell>
                    </TableRow>
                  ) : (
                    collections.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell className="font-medium">{c.collectionId}</TableCell>
                        <TableCell>{c.center?.name}</TableCell>
                        <TableCell>{c.group?.name || "—"}</TableCell>
                        <TableCell>{c.leader ? `${c.leader.firstName} ${c.leader.lastName}` : "—"}</TableCell>
                        <TableCell>
                          {new Date(c.collectionDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{formatCurrency(c.cashAmount)}</TableCell>
                        <TableCell>{formatCurrency(c.onlineAmount)}</TableCell>
                        <TableCell>{formatCurrency(c.total)}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === "completed" ? "default" : "secondary"}>
                            {c.status}
                          </Badge>
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
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchCollections(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => fetchCollections(pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Record Collection Dialog */}
          <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Record Collection</DialogTitle>
                <DialogDescription>Enter the collection details for today.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Center</Label>
                  <Select
                    value={form.centerId || ""}
                    onValueChange={(v) => setForm({ ...form, centerId: v ?? "" })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select center" />
                    </SelectTrigger>
                    <SelectContent>
                      {centers.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Collection Date</Label>
                  <Input
                    type="date"
                    value={form.collectionDate}
                    onChange={(e) => setForm({ ...form, collectionDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cash Amount</Label>
                  <Input
                    type="number"
                    value={form.cashAmount}
                    onChange={(e) => setForm({ ...form, cashAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Online Amount</Label>
                  <Input
                    type="number"
                    value={form.onlineAmount}
                    onChange={(e) => setForm({ ...form, onlineAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Advance Amount</Label>
                  <Input
                    type="number"
                    value={form.advanceAmount}
                    onChange={(e) => setForm({ ...form, advanceAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Insurance Amount</Label>
                  <Input
                    type="number"
                    value={form.insuranceAmount}
                    onChange={(e) => setForm({ ...form, insuranceAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Savings Amount</Label>
                  <Input
                    type="number"
                    value={form.savingsAmount}
                    onChange={(e) => setForm({ ...form, savingsAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Remarks</Label>
                  <Input
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRecordDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Collection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Status Update Dialog */}
          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Update Collection Status</DialogTitle>
                <DialogDescription>
                  Update the status for {selectedAssigned?.centerId?.name} collection.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Collection Amount</Label>
                  <p className="text-sm font-medium">{selectedAssigned ? formatCurrency(selectedAssigned.amount) : "—"}</p>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={statusForm.status}
                    onValueChange={(v) => setStatusForm({ ...statusForm, status: v ?? "Complete" })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Complete">Complete</SelectItem>
                      <SelectItem value="Incomplete">Incomplete</SelectItem>
                      <SelectItem value="Partially Complete">Partially Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {statusForm.status === "Partially Complete" && (
                  <div className="space-y-2">
                    <Label>Collected Amount</Label>
                    <Input
                      type="number"
                      value={statusForm.collectedAmount}
                      onChange={(e) =>
                        setStatusForm({ ...statusForm, collectedAmount: Number(e.target.value) })
                      }
                    />
                  </div>
                )}

                {statusForm.status !== "Complete" && (
                  <div className="space-y-2">
                    <Label>Reschedule Date</Label>
                    <Input
                      type="date"
                      value={statusForm.rescheduleDate}
                      onChange={(e) =>
                        setStatusForm({ ...statusForm, rescheduleDate: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStatusUpdate} disabled={statusSubmitting}>
                  {statusSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
