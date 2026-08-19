"use client"

import { useEffect, useState, useCallback } from "react"
import { AppSidebar } from "@/app/staff/dashboard/components/app-sidebar"
import { SiteHeader } from "@/app/staff/dashboard/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SearchIcon, EyeIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react"
import { toast } from "sonner"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

interface Leader { _id: string; firstName: string; lastName: string }
interface Group { _id: string; name: string; code: string; center: string; branch: string; leader?: Leader; status: "active" | "inactive" }
interface Center {
  _id: string
  name: string
  code: string
  branch: { _id: string; name: string }
  meetingDay: string
  meetingTime: string
  location: string
  status: "active" | "inactive"
  memberCount?: number
}
interface Pagination { page: number; limit: number; total: number; pages: number }

export default function StaffCentersPage() {
  const [centers, setCenters] = useState<Center[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [editCenter, setEditCenter] = useState<Center | null>(null)
  const [editForm, setEditForm] = useState({
    name: "", meetingDay: "", meetingTime: "", location: "",
  })
  const [groupDialog, setGroupDialog] = useState<{ mode: "add" | "edit"; center: Center; group?: Group } | null>(null)
  const [groupName, setGroupName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchCenters = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (search) params.set("search", search)
      const res = await fetch(`/api/staff/centers?${params}`)
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
  }, [search])

  useEffect(() => { fetchCenters(1) }, [fetchCenters])

  const viewCenterDetails = async (center: Center) => {
    setSelectedCenter(center)
    setDetailOpen(true)
    setMembersLoading(true)
    setGroupsLoading(true)
    try {
      const [membersRes, groupsRes] = await Promise.all([
        fetch(`/api/staff/members?centerId=${center._id}&limit=100`).then((r) => r.json()),
        fetch(`/api/groups?center=${center._id}&limit=100`).then((r) => r.json()),
      ])
      if (membersRes.success) setMembers(membersRes.data)
      if (groupsRes.success) setGroups(groupsRes.data)
    } catch {
      toast.error("Failed to fetch center details")
    } finally {
      setMembersLoading(false)
      setGroupsLoading(false)
    }
  }

  const openEditDialog = (center: Center) => {
    setEditCenter(center)
    setEditForm({
      name: center.name || "",
      meetingDay: center.meetingDay || "",
      meetingTime: center.meetingTime || "",
      location: center.location || "",
    })
  }

  const handleEditSubmit = async () => {
    if (!editCenter) return
    if (!editForm.name || !editForm.meetingDay || !editForm.meetingTime || !editForm.location) {
      toast.error("All fields are required")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/staff/edit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "center",
          entityId: editCenter._id,
          newValues: {
            name: editForm.name,
            meetingDay: editForm.meetingDay,
            meetingTime: editForm.meetingTime,
            location: editForm.location,
          },
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Edit request submitted for admin approval")
        setEditCenter(null)
      } else {
        toast.error(json.error || "Failed to submit edit request")
      }
    } catch {
      toast.error("Failed to submit edit request")
    } finally {
      setSubmitting(false)
    }
  }

  const openAddGroup = (center: Center) => {
    setGroupDialog({ mode: "add", center })
    setGroupName("")
  }

  const openEditGroup = (group: Group, center: Center) => {
    setGroupDialog({ mode: "edit", center, group })
    setGroupName(group.name)
  }

  const handleGroupSubmit = async () => {
    if (!groupDialog) return
    if (!groupName.trim()) {
      toast.error("Group name is required")
      return
    }
    setSubmitting(true)
    try {
      if (groupDialog.mode === "add") {
        const res = await fetch("/api/staff/group-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add",
            groupData: {
              name: groupName.trim(),
              center: groupDialog.center._id,
              branch: groupDialog.center.branch._id,
            },
          }),
        })
        const json = await res.json()
        if (json.success) {
          toast.success("Group add request submitted for admin approval")
          setGroupDialog(null)
        } else {
          toast.error(json.error || "Failed to submit request")
        }
      } else {
        const res = await fetch("/api/staff/group-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "edit",
            groupId: groupDialog.group?._id,
            groupData: { name: groupName.trim() },
          }),
        })
        const json = await res.json()
        if (json.success) {
          toast.success("Group edit request submitted for admin approval")
          setGroupDialog(null)
        } else {
          toast.error(json.error || "Failed to submit request")
        }
      }
    } catch {
      toast.error("Failed to submit request")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteGroup = async (group: Group) => {
    if (!confirm(`Request deletion of group "${group.name}"? This will be sent to admin for approval.`)) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/staff/group-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", groupId: group._id }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Group delete request submitted for admin approval")
      } else {
        toast.error(json.error || "Failed to submit request")
      }
    } catch {
      toast.error("Failed to submit request")
    } finally {
      setSubmitting(false)
    }
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
              <CardTitle>My Centers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input placeholder="Search by name or code..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchCenters(1)} />
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
                      ) : centers.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No centers assigned</TableCell></TableRow>
                      ) : (
                        centers.map((c) => (
                          <TableRow key={c._id}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell>{c.code}</TableCell>
                            <TableCell>{c.branch?.name}</TableCell>
                            <TableCell>{c.meetingDay}</TableCell>
                            <TableCell>{c.meetingTime}</TableCell>
                            <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(c)} title="Request Edit">
                                <PencilIcon className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => viewCenterDetails(c)} title="View Details">
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
                      <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchCenters(pagination.page - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchCenters(pagination.page + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      {detailOpen && selectedCenter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{selectedCenter.name}</h2>
              <Button variant="ghost" size="sm" onClick={() => { setDetailOpen(false); setSelectedCenter(null) }}>Close</Button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div><span className="text-muted-foreground">Code:</span> {selectedCenter.code}</div>
              <div><span className="text-muted-foreground">Branch:</span> {selectedCenter.branch?.name}</div>
              <div><span className="text-muted-foreground">Meeting Day:</span> {selectedCenter.meetingDay}</div>
              <div><span className="text-muted-foreground">Meeting Time:</span> {selectedCenter.meetingTime}</div>
              <div><span className="text-muted-foreground">Location:</span> {selectedCenter.location}</div>
            </div>
            <h3 className="font-medium mb-2">Groups in this Center</h3>
            {groupsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-4">No groups found</p>
            ) : (
              <div className="rounded-md border mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((g) => (
                      <TableRow key={g._id}>
                        <TableCell>{g.name}</TableCell>
                        <TableCell>{g.code}</TableCell>
                        <TableCell><Badge variant={g.status === "active" ? "default" : "secondary"}>{g.status}</Badge></TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="icon" onClick={() => openEditGroup(g, selectedCenter)} title="Request Edit">
                            <PencilIcon className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteGroup(g)} title="Request Delete" disabled={submitting}>
                            <TrashIcon className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Members in this Center</h3>
              <Button size="sm" variant="outline" onClick={() => openAddGroup(selectedCenter)}>
                <PlusIcon className="mr-1 size-3" /> Add Group
              </Button>
            </div>
            {membersLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members found</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Verification</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m: any) => (
                      <TableRow key={m._id}>
                        <TableCell>{m.firstName} {m.lastName}</TableCell>
                        <TableCell>{m.phone}</TableCell>
                        <TableCell><Badge variant={m.verificationStatus === "verified" ? "default" : m.verificationStatus === "rejected" ? "destructive" : "secondary"}>{m.verificationStatus}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={!!editCenter} onOpenChange={() => setEditCenter(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Center Edit</DialogTitle>
            <DialogDescription>
              Submit changes for {editCenter?.name}. Changes will be sent to admin for approval.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Center Name *</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Meeting Day *</Label>
              <Select value={editForm.meetingDay} onValueChange={(v) => setEditForm({ ...editForm, meetingDay: v ?? "" })} items={DAYS.map(d => ({ label: d, value: d }))}>
                <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Meeting Time *</Label>
              <Input type="time" value={editForm.meetingTime} onChange={(e) => setEditForm({ ...editForm, meetingTime: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Location *</Label>
              <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCenter(null)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!groupDialog} onOpenChange={() => setGroupDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{groupDialog?.mode === "add" ? "Add New Group" : "Request Group Edit"}</DialogTitle>
            <DialogDescription>
              {groupDialog?.mode === "add"
                ? `Submit a new group for ${groupDialog?.center?.name}. This will be sent to admin for approval.`
                : `Submit name change for ${groupDialog?.group?.name}. This will be sent to admin for approval.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Group Name *</Label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Enter group name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialog(null)}>Cancel</Button>
            <Button onClick={handleGroupSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
