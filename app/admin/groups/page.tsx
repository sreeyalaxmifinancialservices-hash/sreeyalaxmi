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
interface Center { _id: string; name: string; code: string }
interface Leader { _id: string; firstName: string; lastName: string }
interface MemberItem { _id: string; firstName: string; lastName: string; memberCode: string }
interface Group {
  _id: string; name: string; code: string
  center: Center; branch: Branch; leader?: Leader
  memberCount: number; status: "active" | "inactive"
}
interface Pagination { page: number; limit: number; total: number; pages: number }

const emptyForm = {
  name: "", code: "", center: "", branch: "", leader: "", status: "active" as "active" | "inactive",
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [centers, setCenters] = useState<Center[]>([])
  const [groupMembers, setGroupMembers] = useState<MemberItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [branchFilter, setBranchFilter] = useState("all")
  const [centerFilter, setCenterFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Group | null>(null)
  const [deleting, setDeleting] = useState<Group | null>(null)
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

  const fetchCenters = useCallback(async (branchId?: string) => {
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (branchId) params.set("branch", branchId)
      const res = await fetch(`/api/centers?${params}`)
      const json = await res.json()
      if (json.success) setCenters(json.data)
    } catch {}
  }, [])

  const fetchGroupMembers = useCallback(async (groupId?: string) => {
    if (!groupId) { setGroupMembers([]); return }
    try {
      const res = await fetch(`/api/members?group=${groupId}&limit=100`)
      const json = await res.json()
      if (json.success) setGroupMembers(json.data)
    } catch {}
  }, [])

  const fetchGroups = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (search) params.set("search", search)
      if (branchFilter !== "all") params.set("branch", branchFilter)
      if (centerFilter !== "all") params.set("center", centerFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/groups?${params}`)
      const json = await res.json()
      if (json.success) {
        setGroups(json.data)
        setPagination(json.pagination)
      } else {
        toast.error(json.error || "Failed to fetch groups")
      }
    } catch {
      toast.error("Failed to fetch groups")
    } finally {
      setLoading(false)
    }
  }, [search, branchFilter, centerFilter, statusFilter])

  useEffect(() => { fetchBranches() }, [fetchBranches])
  useEffect(() => { fetchCenters(branchFilter !== "all" ? branchFilter : undefined) }, [branchFilter, fetchCenters])
  useEffect(() => { fetchGroups(1) }, [fetchGroups])

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Group name is required"
    if (!form.code.trim()) e.code = "Group code is required"
    if (!form.center) e.center = "Center is required"
    if (!form.branch) e.branch = "Branch is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload: any = {
        name: form.name, code: form.code, center: form.center,
        branch: form.branch, status: form.status,
      }
      if (form.leader) payload.leader = form.leader
      const url = editing ? `/api/groups/${editing._id}` : "/api/groups"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (json.success) {
        toast.success(editing ? "Group updated" : "Group created")
        setDialogOpen(false)
        fetchGroups(pagination.page)
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
      const res = await fetch(`/api/groups/${deleting._id}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        toast.success("Group deactivated")
        setDeleteDialogOpen(false)
        fetchGroups(pagination.page)
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
    setGroupMembers([])
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (g: Group) => {
    setEditing(g)
    setForm({
      name: g.name, code: g.code,
      center: typeof g.center === "object" ? g.center._id : g.center,
      branch: typeof g.branch === "object" ? g.branch._id : g.branch,
      leader: (g.leader as any)?.member || g.leader?._id || "",
      status: g.status,
    })
    setErrors({})
    setGroupMembers([])
    fetchGroupMembers(g._id)
    setDialogOpen(true)
  }

  return (
      <div className="flex flex-1 flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Groups</CardTitle>
              <Button size="sm" onClick={openCreate}>
                <PlusIcon className="mr-1 size-4" /> Add Group
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input placeholder="Search by name or code..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchGroups(1)} />
                  </div>
                  <Select value={branchFilter} onValueChange={(v) => { setBranchFilter(v ?? "all"); setCenterFilter("all") }} items={[{ label: "All Branches", value: "all" }, ...branches.map(b => ({ label: b.name, value: b._id }))]}>
                    <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Branches" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={centerFilter} onValueChange={(v) => { setCenterFilter(v ?? "all"); fetchGroups(1) }} items={[{ label: "All Centers", value: "all" }, ...centers.map(c => ({ label: c.name, value: c._id }))]}>
                    <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Centers" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Centers</SelectItem>
                      {centers.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); fetchGroups(1) }} items={[{ label: "All Statuses", value: "all" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]}>
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
                        <TableHead>Center</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Leader</TableHead>
                        <TableHead>Members</TableHead>
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
                      ) : groups.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No groups found</TableCell></TableRow>
                      ) : (
                        groups.map((g) => (
                          <TableRow key={g._id}>
                            <TableCell className="font-medium">{g.name}</TableCell>
                            <TableCell>{g.code}</TableCell>
                            <TableCell>{g.center?.name}</TableCell>
                            <TableCell>{g.branch?.name}</TableCell>
                            <TableCell>{g.leader ? `${g.leader.firstName} ${g.leader.lastName}` : "-"}</TableCell>
                            <TableCell>{g.memberCount}</TableCell>
                            <TableCell><Badge variant={g.status === "active" ? "default" : "secondary"}>{g.status}</Badge></TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(g)}><PencilIcon className="size-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { setDeleting(g); setDeleteDialogOpen(true) }}><Trash2Icon className="size-4 text-destructive" /></Button>
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
                      <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchGroups(pagination.page - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchGroups(pagination.page + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Group" : "Create Group"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Group Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label>Group Code *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              {errors.code && <p className="text-sm text-destructive mt-1">{errors.code}</p>}
            </div>
            <div>
              <Label>Branch *</Label>
              <Select value={form.branch} onValueChange={(v) => { setForm({ ...form, branch: v ?? "", center: "" }); fetchCenters(v ?? undefined) }} items={branches.map(b => ({ label: b.name, value: b._id }))}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.branch && <p className="text-sm text-destructive mt-1">{errors.branch}</p>}
            </div>
            <div>
              <Label>Center *</Label>
              <Select value={form.center} onValueChange={(v) => setForm({ ...form, center: v ?? "" })} items={centers.map(c => ({ label: c.name, value: c._id }))}>
                <SelectTrigger><SelectValue placeholder="Select center" /></SelectTrigger>
                <SelectContent>
                  {centers.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.center && <p className="text-sm text-destructive mt-1">{errors.center}</p>}
            </div>
            <div>
              <Label>Leader <span className="text-muted-foreground font-normal">(optional)</span></Label>
              {editing ? (
                <Select value={form.leader} onValueChange={(v) => setForm({ ...form, leader: v === "__none__" ? "" : (v ?? "") })} items={[{ label: "No leader", value: "__none__" }, ...groupMembers.map(m => ({ label: `${m.firstName} ${m.lastName}`, value: m._id }))]}>
                  <SelectTrigger><SelectValue placeholder="Select leader from group members" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No leader</SelectItem>
                    {groupMembers.map((m) => <SelectItem key={m._id} value={m._id}>{m.firstName} {m.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value="Add members to the group first, then assign a leader from them later." readOnly disabled />
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
            <AlertDialogTitle>Deactivate Group</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to deactivate &quot;{deleting?.name}&quot;?</AlertDialogDescription>
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
