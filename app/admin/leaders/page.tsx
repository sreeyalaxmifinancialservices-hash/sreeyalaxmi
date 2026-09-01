"use client"

import { useEffect, useState, useCallback } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { PlusIcon, SearchIcon, PencilIcon, Trash2Icon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

interface Center { _id: string; name: string }
interface Member { _id: string; firstName: string; lastName: string; phone: string; email?: string; memberCode: string }
interface Leader {
  _id: string; leaderId: string; firstName: string; lastName: string
  phone: string; email: string; center: Center; group?: any; status: "active" | "inactive"
}
interface Pagination { page: number; limit: number; total: number; pages: number }

const emptyForm = {
  leaderId: "", firstName: "", lastName: "", phone: "", email: "",
  center: "", group: "", memberId: "", status: "active" as "active" | "inactive",
}

export default function LeadersPage() {
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [centers, setCenters] = useState<Center[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [centerFilter, setCenterFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Leader | null>(null)
  const [deleting, setDeleting] = useState<Leader | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fetchCenters = useCallback(async () => {
    try {
      const res = await fetch("/api/centers?limit=100")
      const json = await res.json()
      if (json.success) setCenters(json.data)
    } catch {}
  }, [])

  const fetchMembers = useCallback(async (centerId: string) => {
    setMembers([])
    if (!centerId) return
    try {
      const res = await fetch(`/api/members?center=${centerId}&limit=100&status=active`)
      const json = await res.json()
      if (json.success) setMembers(json.data)
    } catch {}
  }, [])

  const fetchLeaders = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (search) params.set("search", search)
      if (centerFilter !== "all") params.set("center", centerFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/leaders?${params}`)
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
  }, [search, centerFilter, statusFilter])

  useEffect(() => { fetchCenters() }, [fetchCenters])
  useEffect(() => { fetchLeaders(1) }, [fetchLeaders])

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.leaderId.trim()) e.leaderId = "Leader ID is required"
    if (!form.firstName.trim()) e.firstName = "First name is required"
    if (!form.lastName.trim()) e.lastName = "Last name is required"
    if (!form.phone.trim() || form.phone.length < 10) e.phone = "Phone must be at least 10 digits"
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email is required"
    if (!form.center) e.center = "Center is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload = { ...form }
      const url = editing ? `/api/leaders/${editing._id}` : "/api/leaders"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (json.success) {
        toast.success(editing ? "Leader updated" : "Leader created")
        setDialogOpen(false)
        fetchLeaders(pagination.page)
      } else {
        toast.error(json.error || "Operation failed")
      }
    } catch {
      toast.error("Operation failed")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/leaders/${deleting._id}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        toast.success("Leader deactivated")
        setDeleteDialogOpen(false)
        fetchLeaders(pagination.page)
      } else {
        toast.error(json.error || "Failed to deactivate")
      }
    } catch {
      toast.error("Failed to deactivate")
    } finally {
      setSubmitting(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setMembers([])
    setDialogOpen(true)
  }

  const openEdit = (l: Leader) => {
    setEditing(l)
    setForm({
      leaderId: l.leaderId, firstName: l.firstName, lastName: l.lastName,
      phone: l.phone, email: l.email,
      center: typeof l.center === "object" ? (l.center as any)._id : (l.center as any),
      group: "",
      memberId: "",
      status: l.status,
    })
    setErrors({})
    setDialogOpen(true)
  }

  return (
      <div className="flex flex-1 flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Leaders</CardTitle>
              <Button size="sm" onClick={openCreate}>
                <PlusIcon className="mr-1 size-4" /> Add Leader
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input placeholder="Search by name or leader ID..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchLeaders(1)} />
                  </div>
                  <select
                    value={centerFilter}
                    onChange={(e) => { setCenterFilter(e.target.value); fetchLeaders(1) }}
                    className="w-full sm:w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                  >
                    <option value="all">All Centers</option>
                    {centers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); fetchLeaders(1) }}
                    className="w-full sm:w-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Leader ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Center</TableHead>
                        <TableHead>Status</TableHead>
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
                      ) : leaders.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No leaders found</TableCell></TableRow>
                      ) : (
                        leaders.map((l) => (
                          <TableRow key={l._id}>
                            <TableCell className="font-medium">{l.leaderId}</TableCell>
                            <TableCell>{l.firstName} {l.lastName}</TableCell>
                            <TableCell>{l.phone}</TableCell>
                            <TableCell>{l.email}</TableCell>
                            <TableCell>{l.center?.name || (l.group as any)?.name || "—"}</TableCell>
                            <TableCell><Badge variant={l.status === "active" ? "default" : "secondary"}>{l.status}</Badge></TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(l)}><PencilIcon className="size-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { setDeleting(l); setDeleteDialogOpen(true) }}><Trash2Icon className="size-4 text-destructive" /></Button>
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
                      <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchLeaders(pagination.page - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchLeaders(pagination.page + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Leader" : "Create Leader"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Leader ID *</Label>
              <Input value={form.leaderId} onChange={(e) => setForm({ ...form, leaderId: e.target.value })} disabled={!!editing} />
              {errors.leaderId && <p className="text-sm text-destructive mt-1">{errors.leaderId}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                {errors.firstName && <p className="text-sm text-destructive mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                {errors.lastName && <p className="text-sm text-destructive mt-1">{errors.lastName}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone *</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
              </div>
            </div>
            <div>
              <Label>Center *</Label>
              <select
                value={form.center}
                onChange={(e) => {
                  setForm({ ...form, center: e.target.value, memberId: "" })
                  fetchMembers(e.target.value)
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:[&>option]:bg-background dark:[&>option]:text-foreground"
              >
                <option value="">Select center</option>
                {centers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              {errors.center && <p className="text-sm text-destructive mt-1">{errors.center}</p>}
            </div>
            {!editing && (
              <div>
                <Label>Member</Label>
                <select
                  value={form.memberId}
                  onChange={(e) => {
                    const member = members.find((m) => m._id === e.target.value)
                    setForm({
                      ...form,
                      memberId: e.target.value,
                      firstName: member?.firstName || "",
                      lastName: member?.lastName || "",
                      phone: member?.phone || "",
                      email: member?.email || "",
                    })
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                >
                  <option value="">Select member from center</option>
                  {members.map((m) => <option key={m._id} value={m._id}>{m.firstName} {m.lastName} ({m.memberCode})</option>)}
                </select>
              </div>
            )}
            <div>
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "active" || v === "inactive") setForm({ ...form, status: v });
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:[&>option]:bg-background dark:[&>option]:text-foreground"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2Icon className="mr-1 size-4 animate-spin" />}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Leader</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to deactivate &quot;{deleting?.firstName} {deleting?.lastName}&quot;?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {submitting ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
