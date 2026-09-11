"use client"

import { useEffect, useState, useCallback } from "react"
import { AppSidebar } from "@/app/staff/dashboard/components/app-sidebar"
import { SiteHeader } from "@/app/staff/dashboard/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { PlusIcon, PencilIcon, Trash2Icon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

interface Center { _id: string; name: string; code: string }
interface Member { _id: string; firstName: string; lastName: string; phone: string; email?: string; memberCode: string }
interface Leader {
  _id: string; firstName: string; lastName: string; phone: string; email: string
  center: Center; group?: any; status: string
}
interface Pagination { page: number; limit: number; total: number; pages: number }

export default function StaffLeadersPage() {
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [centers, setCenters] = useState<Center[]>([])
  const [members, setMembers] = useState<Member[]>([])

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "", phone: "", email: "", center: "", memberId: "" })

  const [editOpen, setEditOpen] = useState(false)
  const [editLeader, setEditLeader] = useState<Leader | null>(null)
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "", email: "" })

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLeader, setDeleteLeader] = useState<Leader | null>(null)

  const fetchCenters = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/centers?limit=100").then((r) => r.json())
      if (res.success) setCenters(res.data)
    } catch {}
  }, [])

  const fetchMembers = useCallback(async (centerId: string) => {
    setMembers([])
    if (!centerId) return
    try {
      const res = await fetch(`/api/staff/members?center=${centerId}&limit=100&status=active`).then((r) => r.json())
      if (res.success) setMembers(res.data)
    } catch {}
  }, [])

  useEffect(() => { fetchCenters() }, [fetchCenters])

  const fetchLeaders = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (search) params.set("search", search)
      const res = await fetch(`/api/staff/leaders?${params}`)
      const json = await res.json()
      if (json.success) {
        setLeaders(json.data)
        setPagination(json.pagination)
      } else {
        toast.error(json.error || "Failed to fetch leaders")
      }
    } catch {
      toast.error("Failed to fetch leaders")
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchLeaders() }, [fetchLeaders])

  const handleAdd = async () => {
    if (!addForm.firstName || !addForm.center) {
      toast.error("Leader first name and center are required")
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch("/api/staff/leader-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", leaderData: addForm }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setAddOpen(false)
        setAddForm({ firstName: "", lastName: "", phone: "", email: "", center: "", memberId: "" })
        setMembers([])
        fetchLeaders()
      } else {
        toast.error(json.error || "Failed to submit request")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editLeader) return
    try {
      setSubmitting(true)
      const res = await fetch("/api/staff/leader-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", leaderId: editLeader._id, leaderData: editForm }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setEditOpen(false)
        setEditLeader(null)
        setEditForm({ firstName: "", lastName: "", phone: "", email: "" })
        fetchLeaders()
      } else {
        toast.error(json.error || "Failed to submit request")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteLeader) return
    try {
      setSubmitting(true)
      const res = await fetch("/api/staff/leader-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", leaderId: deleteLeader._id }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setDeleteOpen(false)
        setDeleteLeader(null)
        fetchLeaders()
      } else {
        toast.error(json.error || "Failed to submit request")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">My Leaders</h1>
            <Button onClick={() => setAddOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Leader
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Input
              placeholder="Search leaders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : leaders.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
              No leaders found.
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Center</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaders.map((l) => (
                    <TableRow key={l._id}>
                      <TableCell className="font-medium">{l.firstName} {l.lastName}</TableCell>
                      <TableCell>{l.phone || "—"}</TableCell>
                      <TableCell>{l.email || "—"}</TableCell>
                      <TableCell>{l.center?.name || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Edit"
                            onClick={() => {
                              setEditLeader(l)
                              setEditForm({ firstName: l.firstName, lastName: l.lastName, phone: l.phone, email: l.email })
                              setEditOpen(true)
                            }}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Delete"
                            onClick={() => { setDeleteLeader(l); setDeleteOpen(true) }}
                          >
                            <Trash2Icon className="h-4 w-4 text-red-600" />
                          </Button>
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
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchLeaders(pagination.page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchLeaders(pagination.page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Leader</DialogTitle>
              <DialogDescription>Submit a request to add a new leader for a center. It will be active after admin approval.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Center *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                  value={addForm.center}
                  onChange={(e) => {
                    setAddForm({ ...addForm, center: e.target.value, memberId: "" })
                    fetchMembers(e.target.value)
                  }}
                >
                  <option value="">Select center</option>
                  {centers.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Member</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                  value={addForm.memberId}
                  onChange={(e) => {
                    const member = members.find((m) => m._id === e.target.value)
                    setAddForm({
                      ...addForm,
                      memberId: e.target.value,
                      firstName: member?.firstName || "",
                      lastName: member?.lastName || "",
                      phone: member?.phone || "",
                      email: member?.email || "",
                    })
                  }}
                >
                  <option value="">Select member from center</option>
                  {members.map((m) => <option key={m._id} value={m._id}>{m.firstName} {m.lastName} ({m.memberCode})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input value={addForm.firstName} onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} placeholder="First name" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={addForm.lastName} onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} placeholder="Last name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="Phone number" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="Email address" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={submitting}>
                {submitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Leader</DialogTitle>
              <DialogDescription>Submit a request to update this leader. Changes will apply after admin approval.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} placeholder="First name" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} placeholder="Last name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Phone number" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email address" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={submitting}>
                {submitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Leader</DialogTitle>
              <DialogDescription>Submit a request to remove this leader. It will be removed after admin approval.</DialogDescription>
            </DialogHeader>
            <p className="text-sm">Are you sure you want to request deletion of <strong>{deleteLeader?.firstName} {deleteLeader?.lastName}</strong>?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                {submitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
