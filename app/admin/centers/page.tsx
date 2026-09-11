"use client"

import { useEffect, useState, useCallback } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { PlusIcon, SearchIcon, PencilIcon, Trash2Icon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

interface Branch { _id: string; name: string; code: string }
interface Staff { _id: string; firstName: string; lastName: string }
interface Leader { _id: string; firstName: string; lastName: string; phone?: string }
interface MemberItem { _id: string; firstName: string; lastName: string; memberCode: string }
interface Center {
  _id: string
  name: string
  code: string
  branch: Branch
  meetingDay: string
  meetingTime: string
  location: string
  staff?: Staff
  leader?: Leader
  status: "active" | "inactive"
}
interface Pagination { page: number; limit: number; total: number; pages: number }

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const emptyForm = {
  name: "", code: "", branch: "", meetingDay: "", meetingTime: "", location: "",
  staff: "", leader: "", status: "active" as "active" | "inactive",
}

export default function CentersPage() {
  const [centers, setCenters] = useState<Center[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [branchFilter, setBranchFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Center | null>(null)
  const [deleting, setDeleting] = useState<Center | null>(null)
  const [centerMembers, setCenterMembers] = useState<MemberItem[]>([])
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch("/api/branches?limit=100")
      const json = await res.json()
      if (json.success) setBranches(json.data)
    } catch {}
  }, [])

  const fetchCenterMembers = useCallback(async (centerId: string) => {
    if (!centerId) { setCenterMembers([]); return }
    try {
      const res = await fetch(`/api/members?center=${centerId}&limit=100`)
      const json = await res.json()
      if (json.success) setCenterMembers(json.data)
    } catch {}
  }, [])

  const fetchCenters = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (search) params.set("search", search)
      if (branchFilter !== "all") params.set("branch", branchFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/centers?${params}`)
      const json = await res.json()
      if (json.success) {
        setCenters(json.data)
        setPagination(json.pagination)
      } else {
        toast.error(json.error || "Failed to fetch centers")
      }
    } catch {
      toast.error("Failed to fetch centers")
    } finally {
      setLoading(false)
    }
  }, [search, branchFilter, statusFilter])

  useEffect(() => { fetchBranches() }, [fetchBranches])
  useEffect(() => { fetchCenters(1) }, [fetchCenters])

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Center name is required"
    if (!form.code.trim()) e.code = "Center code is required"
    if (!form.branch) e.branch = "Branch is required"
    if (!form.meetingDay) e.meetingDay = "Meeting day is required"
    if (!form.meetingTime.trim()) e.meetingTime = "Meeting time is required"
    if (!form.location.trim()) e.location = "Location is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload: any = {
        name: form.name, code: form.code, branch: form.branch,
        meetingDay: form.meetingDay, meetingTime: form.meetingTime,
        location: form.location, status: form.status,
      }
      if (form.staff) payload.staff = form.staff
      if (form.leader) payload.leader = form.leader
      else if (editing) payload.leader = ""
      const url = editing ? `/api/centers/${editing._id}` : "/api/centers"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (json.success) {
        toast.success(editing ? "Center updated" : "Center created")
        setDialogOpen(false)
        fetchCenters(pagination.page)
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
      const res = await fetch(`/api/centers/${deleting._id}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        toast.success("Center deleted")
        setDeleteDialogOpen(false)
        setDeleting(null)
        fetchCenters(pagination.page)
      } else {
        toast.error(json.error || "Failed to delete")
      }
    } catch {
      toast.error("Failed to delete")
    } finally {
      setSubmitting(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setCenterMembers([])
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (c: Center) => {
    setEditing(c)
    setForm({
      name: c.name, code: c.code,
      branch: typeof c.branch === "object" ? c.branch._id : c.branch,
      meetingDay: c.meetingDay, meetingTime: c.meetingTime,
      location: c.location,
      staff: c.staff?._id || "",
      leader: (c.leader as any)?._id || (c.leader as any)?.member || "",
      status: c.status,
    })
    setErrors({})
    setCenterMembers([])
    fetchCenterMembers(c._id)
    setDialogOpen(true)
  }

  return (
      <div className="flex flex-1 flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Centers</CardTitle>
              <Button size="sm" onClick={openCreate}>
                <PlusIcon className="mr-1 size-4" /> Add Center
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input placeholder="Search by name or code..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchCenters(1)} />
                  </div>
                  <Select value={branchFilter} onValueChange={(v) => { setBranchFilter(v ?? "all"); fetchCenters(1) }} items={[{ label: "All Branches", value: "all" }, ...branches.map(b => ({ label: b.name, value: b._id }))]}>
                    <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Branches" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); fetchCenters(1) }} items={[{ label: "All Statuses", value: "all" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]}>
                    <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Meeting Day</TableHead>
                        <TableHead>Meeting Time</TableHead>
                        <TableHead>Leader</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                          </TableRow>
                        ))
                      ) : centers.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No centers found</TableCell></TableRow>
                      ) : (
                        centers.map((c) => (
                          <TableRow key={c._id}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell>{c.code}</TableCell>
                            <TableCell>{c.branch?.name}</TableCell>
                            <TableCell>{c.meetingDay}</TableCell>
                            <TableCell>{c.meetingTime}</TableCell>
                            <TableCell>{c.leader ? `${c.leader.firstName} ${c.leader.lastName}` : "—"}</TableCell>
                            <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><PencilIcon className="size-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { setDeleting(c); setDeleteDialogOpen(true) }}><Trash2Icon className="size-4 text-destructive" /></Button>
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
                      <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchCenters(pagination.page - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchCenters(pagination.page + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Center" : "Create Center"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Center Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label>Center Code *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              {errors.code && <p className="text-sm text-destructive mt-1">{errors.code}</p>}
            </div>
            <div>
              <Label>Branch *</Label>
              <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v ?? "" })} items={branches.map(b => ({ label: b.name, value: b._id }))}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.branch && <p className="text-sm text-destructive mt-1">{errors.branch}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Meeting Day *</Label>
                <Select value={form.meetingDay} onValueChange={(v) => setForm({ ...form, meetingDay: v ?? "" })} items={DAYS.map(d => ({ label: d, value: d }))}>
                  <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.meetingDay && <p className="text-sm text-destructive mt-1">{errors.meetingDay}</p>}
              </div>
              <div>
                <Label>Meeting Time *</Label>
                <Input type="time" value={form.meetingTime} onChange={(e) => setForm({ ...form, meetingTime: e.target.value })} />
                {errors.meetingTime && <p className="text-sm text-destructive mt-1">{errors.meetingTime}</p>}
              </div>
            </div>
            <div>
              <Label>Location *</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              {errors.location && <p className="text-sm text-destructive mt-1">{errors.location}</p>}
            </div>
            <div>
              <Label>Leader <span className="text-muted-foreground font-normal">(optional)</span></Label>
              {editing ? (
                <Select value={form.leader} onValueChange={(v) => setForm({ ...form, leader: v === "__none__" ? "" : (v ?? "") })} items={[{ label: "No leader", value: "__none__" }, ...centerMembers.map(m => ({ label: `${m.firstName} ${m.lastName} (${m.memberCode})`, value: m._id }))]}>
                  <SelectTrigger><SelectValue placeholder="Select leader from center members" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No leader</SelectItem>
                    {centerMembers.map((m) => <SelectItem key={m._id} value={m._id}>{m.firstName} {m.lastName} ({m.memberCode})</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">Create center first, then assign a leader from its members.</p>
              )}
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => { if (v === "active" || v === "inactive") setForm({ ...form, status: v }) }} items={[{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
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
            <AlertDialogTitle>Delete Center</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete &quot;{deleting?.name}&quot;? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
