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
interface Branch { _id: string; name: string; code: string }
interface Leader { _id: string; firstName: string; lastName: string; phone: string }
interface Group {
  _id: string; name: string; code: string
  center: Center; branch: Branch; leader?: Leader
  memberCount: number; status: string
}
interface Pagination { page: number; limit: number; total: number; pages: number }

export default function StaffGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [centers, setCenters] = useState<Center[]>([])
  const [branches, setBranches] = useState<Branch[]>([])

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: "", code: "", center: "", branch: "" })

  const [editOpen, setEditOpen] = useState(false)
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [editName, setEditName] = useState("")

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteGroup, setDeleteGroup] = useState<Group | null>(null)

  const fetchCentersBranches = useCallback(async () => {
    try {
      const [centersRes, branchesRes] = await Promise.all([
        fetch("/api/staff/centers").then((r) => r.json()),
        fetch("/api/branches?limit=100&status=active").then((r) => r.json()),
      ])
      if (centersRes.success) setCenters(centersRes.data)
      if (branchesRes.success) setBranches(branchesRes.data)
    } catch {}
  }, [])

  useEffect(() => { fetchCentersBranches() }, [fetchCentersBranches])

  const fetchGroups = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (search) params.set("search", search)
      const res = await fetch(`/api/staff/groups?${params}`)
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
  }, [search])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const handleAdd = async () => {
    if (!addForm.name || !addForm.center || !addForm.branch) {
      toast.error("Group name, center, and branch are required")
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch("/api/staff/group-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", groupData: addForm }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setAddOpen(false)
        setAddForm({ name: "", code: "", center: "", branch: "" })
        fetchGroups()
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
    if (!editGroup || !editName) return
    try {
      setSubmitting(true)
      const res = await fetch("/api/staff/group-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", groupId: editGroup._id, groupData: { name: editName } }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setEditOpen(false)
        setEditGroup(null)
        setEditName("")
        fetchGroups()
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
    if (!deleteGroup) return
    try {
      setSubmitting(true)
      const res = await fetch("/api/staff/group-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", groupId: deleteGroup._id }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setDeleteOpen(false)
        setDeleteGroup(null)
        fetchGroups()
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
            <h1 className="text-2xl font-bold">My Groups</h1>
            <Button onClick={() => setAddOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Group
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Input
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
              No groups found.
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Group Name</TableHead>
                    <TableHead>Center</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Leader</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((g) => (
                    <TableRow key={g._id}>
                      <TableCell className="font-mono text-sm">{g.code}</TableCell>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell>{g.center?.name || "—"}</TableCell>
                      <TableCell>{g.branch?.name || "—"}</TableCell>
                      <TableCell>{g.leader ? `${g.leader.firstName} ${g.leader.lastName}` : "—"}</TableCell>
                      <TableCell>{g.memberCount}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Edit"
                            onClick={() => { setEditGroup(g); setEditName(g.name); setEditOpen(true) }}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Delete"
                            onClick={() => { setDeleteGroup(g); setDeleteOpen(true) }}
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
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchGroups(pagination.page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchGroups(pagination.page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Group</DialogTitle>
              <DialogDescription>Submit a request to create a new group. It will be active after admin approval.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Branch *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                    value={addForm.branch}
                    onChange={(e) => setAddForm({ ...addForm, branch: e.target.value, center: "" })}
                  >
                    <option value="">Select branch</option>
                    {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Center *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                    value={addForm.center}
                    onChange={(e) => setAddForm({ ...addForm, center: e.target.value })}
                  >
                    <option value="">Select center</option>
                    {centers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Group Name *</Label>
                  <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Enter group name" />
                </div>
                <div className="space-y-2">
                  <Label>Group Code</Label>
                  <Input value={addForm.code} onChange={(e) => setAddForm({ ...addForm, code: e.target.value })} placeholder="Auto-generated if empty" />
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Group</DialogTitle>
              <DialogDescription>Submit a request to rename this group. It will be updated after admin approval.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Name</Label>
                <p className="text-sm font-medium">{editGroup?.name}</p>
              </div>
              <div className="space-y-2">
                <Label>New Name *</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Enter new group name" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={submitting || !editName || editName === editGroup?.name}>
                {submitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Group</DialogTitle>
              <DialogDescription>Submit a request to delete this group. It will be removed after admin approval.</DialogDescription>
            </DialogHeader>
            <p className="text-sm">Are you sure you want to request deletion of <strong>{deleteGroup?.name}</strong> ({deleteGroup?.code})?</p>
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
