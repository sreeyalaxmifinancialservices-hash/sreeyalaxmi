"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Camera, X, Eye } from "lucide-react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface StaffRecord {
  _id: string
  employeeId: string
  firstName: string
  lastName: string
  phone: string
  email: string
  photo?: string
  branches: { _id: string; name: string; code: string }[]
  designation: string
  assignedCenters: { _id: string; name: string; code: string }[]
  assignedGroups: { _id: string; name: string; code: string }[]
  status: string
}

interface Branch { _id: string; name: string; code: string }
interface Center { _id: string; name: string; code: string; branch: { _id: string } | string }

export default function StaffPage() {
  const [staff, setStaff] = React.useState<StaffRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [branchFilter, setBranchFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [branches, setBranches] = React.useState<Branch[]>([])
  const [centers, setCenters] = React.useState<Center[]>([])
  const [groups, setGroups] = React.useState<{ _id: string; name: string; code: string }[]>([])
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [viewCenters, setViewCenters] = React.useState<{ staffName: string; centers: { _id: string; name: string; code: string }[] } | null>(null)
  const [viewGroups, setViewGroups] = React.useState<{ staffName: string; groups: { _id: string; name: string; code: string }[] } | null>(null)
  const [editItem, setEditItem] = React.useState<StaffRecord | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 })

  const [form, setForm] = React.useState({
    employeeId: "", firstName: "", lastName: "", phone: "", email: "",
    branches: [] as string[], designation: "", status: "active", password: "", photo: "",
    assignedCenters: [] as string[],
    assignedGroups: [] as string[],
  })

  const [imageFile, setImageFile] = React.useState<File | null>(null)
  const [imagePreview, setImagePreview] = React.useState("")
  const [uploadingImage, setUploadingImage] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const fetchStaff = React.useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (branchFilter !== "all") params.set("branch", branchFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (search) params.set("search", search)
      const res = await fetch(`/api/staff?${params}`)
      const json = await res.json()
      if (json.success) {
        setStaff(json.data || [])
        setPagination(json.pagination || { page: 1, pages: 1, total: 0 })
      }
    } catch { toast.error("Failed to fetch staff") }
    finally { setLoading(false) }
  }, [branchFilter, statusFilter, search])

  React.useEffect(() => { fetchStaff() }, [fetchStaff])

  React.useEffect(() => {
    fetch("/api/branches?limit=100&status=active")
      .then(r => r.json())
      .then(j => { if (j.success) setBranches(j.data) })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    if (form.branches.length > 0) {
      Promise.all(
        form.branches.map(branchId =>
          fetch(`/api/centers?branch=${branchId}&limit=100&status=active`)
            .then(r => r.json())
            .then(j => j.success ? j.data : [])
            .catch(() => [])
        )
      ).then(results => {
        const allCenters = results.flat()
        const unique = allCenters.filter((c: Center, i: number, arr: Center[]) =>
          arr.findIndex(x => x._id === c._id) === i
        )
        setCenters(unique)
      })
    } else {
      setCenters([])
    }
    setForm(f => ({ ...f, assignedCenters: f.assignedCenters.filter(cId => centers.some(c => c._id === cId)) }))
  }, [form.branches])

  React.useEffect(() => {
    if (form.assignedCenters.length > 0) {
      Promise.all(
        form.assignedCenters.map(centerId =>
          fetch(`/api/groups?center=${centerId}&limit=100&status=active`)
            .then(r => r.json())
            .then(j => j.success ? j.data : [])
            .catch(() => [])
        )
      ).then(results => {
        const allGroups = results.flat()
        const unique = allGroups.filter((g: { _id: string }, i: number, arr: { _id: string }[]) =>
          arr.findIndex(x => x._id === g._id) === i
        )
        setGroups(unique)
        // Auto-assign all groups under selected centers
        setForm(f => ({ ...f, assignedGroups: unique.map((g: { _id: string }) => g._id) }))
      })
    } else {
      setGroups([])
      setForm(f => ({ ...f, assignedGroups: [] }))
    }
  }, [form.assignedCenters])

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const json = await res.json()
      if (json.success) return json.url
      toast.error("Image upload failed")
      return null
    } catch {
      toast.error("Image upload failed")
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB")
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview("")
    setForm({ ...form, photo: "" })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleCreate = async () => {
    try {
      setSubmitting(true)

      let photoUrl = form.photo
      if (imageFile) {
        const url = await uploadImage(imageFile)
        if (url) photoUrl = url
        else { setSubmitting(false); return }
      }

      const { employeeId: _, ...payloadData } = form
      const payload = { ...payloadData, photo: photoUrl || undefined }

      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Staff created")
        setDialogOpen(false)
        setForm({ employeeId: "", firstName: "", lastName: "", phone: "", email: "", branches: [], designation: "", status: "active", password: "", photo: "", assignedCenters: [], assignedGroups: [] })
        setImageFile(null)
        setImagePreview("")
        fetchStaff()
      } else {
        toast.error(json.error || "Failed to create staff")
      }
    } catch { toast.error("Failed to create staff") }
    finally { setSubmitting(false) }
  }

  const handleUpdate = async () => {
    if (!editItem) return
    try {
      setSubmitting(true)

      let photoUrl = form.photo
      if (imageFile) {
        const url = await uploadImage(imageFile)
        if (url) photoUrl = url
        else { setSubmitting(false); return }
      }

      const payload: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email,
        branches: form.branches,
        designation: form.designation,
        status: form.status,
        photo: photoUrl || undefined,
        assignedCenters: form.assignedCenters,
        assignedGroups: form.assignedGroups,
      }
      if (form.password) payload.password = form.password

      const res = await fetch(`/api/staff/${editItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Staff updated")
        setDialogOpen(false)
        setEditItem(null)
        setForm({ employeeId: "", firstName: "", lastName: "", phone: "", email: "", branches: [], designation: "", status: "active", password: "", photo: "", assignedCenters: [], assignedGroups: [] })
        setImageFile(null)
        setImagePreview("")
        fetchStaff()
      } else {
        toast.error(json.error || "Failed to update staff")
      }
    } catch { toast.error("Failed to update staff") }
    finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/staff/${deleteId}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        toast.success("Staff deleted")
        fetchStaff()
      } else {
        toast.error(json.error || "Failed to delete staff")
      }
    } catch { toast.error("Failed to delete staff") }
    finally { setDeleteId(null) }
  }

  const openCreate = () => {
    setEditItem(null)
    setForm({ employeeId: "", firstName: "", lastName: "", phone: "", email: "", branches: [], designation: "", status: "active", password: "", photo: "", assignedCenters: [], assignedGroups: [] })
    setImageFile(null)
    setImagePreview("")
    setDialogOpen(true)
  }

  const openEdit = (item: StaffRecord) => {
    setEditItem(item)
    setForm({
      employeeId: item.employeeId, firstName: item.firstName, lastName: item.lastName,
      phone: item.phone, email: item.email,
      branches: (item.branches || []).map(b => typeof b === "string" ? b : b._id),
      designation: item.designation, status: item.status, password: "", photo: item.photo || "",
      assignedCenters: (item.assignedCenters || []).map(c => typeof c === "string" ? c : c._id),
      assignedGroups: (item.assignedGroups || []).map(g => typeof g === "string" ? g : g._id),
    })
    setImageFile(null)
    setImagePreview(item.photo || "")
    setDialogOpen(true)
  }

  const filtered = staff.filter(s =>
    `${s.firstName} ${s.lastName} ${s.employeeId} ${s.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground text-sm">Manage field officers and staff members</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 size-4" />Add Staff</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={branchFilter} onValueChange={v => setBranchFilter(v ?? "")}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Branches" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map(b => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? "")}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Photo</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Branches</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Centers</TableHead>
              <TableHead>Groups</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 10 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-[80px]" /></TableCell>
                ))}</TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No staff found</TableCell></TableRow>
            ) : filtered.map(s => (
              <TableRow key={s._id}>
                <TableCell>
                  {s.photo ? (
                    <img src={s.photo} alt={`${s.firstName} ${s.lastName}`} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-mono">{s.employeeId}</TableCell>
                <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                <TableCell>{s.phone}</TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell>
                  {s.branches && s.branches.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {s.branches.slice(0, 2).map(b => (
                        <Badge key={b._id} variant="outline" className="text-xs">{b.name}</Badge>
                      ))}
                      {s.branches.length > 2 && (
                        <Badge variant="outline" className="text-xs">+{s.branches.length - 2}</Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>{s.designation}</TableCell>
                <TableCell>
                  {s.assignedCenters && s.assignedCenters.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {s.assignedCenters.slice(0, 2).map(c => (
                        <Badge key={c._id} variant="outline" className="text-xs">{c.name}</Badge>
                      ))}
                      {s.assignedCenters.length > 2 && (
                        <Badge variant="outline" className="text-xs">+{s.assignedCenters.length - 2}</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6"
                        title="View all centers"
                        onClick={() => setViewCenters({ staffName: `${s.firstName} ${s.lastName}`, centers: s.assignedCenters })}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {s.assignedGroups && s.assignedGroups.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {s.assignedGroups.slice(0, 2).map(g => (
                        <Badge key={g._id} variant="outline" className="text-xs">{g.name}</Badge>
                      ))}
                      {s.assignedGroups.length > 2 && (
                        <Badge variant="outline" className="text-xs">+{s.assignedGroups.length - 2}</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6"
                        title="View all groups"
                        onClick={() => setViewGroups({ staffName: `${s.firstName} ${s.lastName}`, groups: s.assignedGroups })}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(s._id)}><Trash2 className="size-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchStaff(pagination.page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchStaff(pagination.page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Staff" : "Add Staff"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative h-24 w-24 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden cursor-pointer hover:border-muted-foreground/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-0 right-0 h-6 w-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                      onClick={(e) => { e.stopPropagation(); removeImage() }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground/40" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <p className="text-xs text-muted-foreground">Click to upload photo (max 5MB)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee ID</Label>
                <Input value={form.employeeId || "Auto-generated"} disabled />
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder={editItem ? "Leave blank to keep current" : "Default: staff123"}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Branches</Label>
              <p className="text-xs text-muted-foreground">Select the branches this staff member will manage</p>
              <div className="max-h-[150px] overflow-y-auto rounded-md border p-3 space-y-2">
                {branches.map(b => (
                  <label key={b._id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.branches.includes(b._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({ ...form, branches: [...form.branches, b._id] })
                        } else {
                          setForm({ ...form, branches: form.branches.filter(id => id !== b._id), assignedCenters: form.assignedCenters.filter(cId => centers.some(c => c._id === cId && (typeof c.branch === 'object' ? c.branch?._id : c.branch) === b._id)) })
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{b.name} ({b.code})</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{form.branches.length} branch(es) selected</p>
            </div>
            {form.branches.length > 0 && centers.length > 0 && (
              <div className="space-y-2">
                <Label>Assigned Centers</Label>
                <p className="text-xs text-muted-foreground">Select the centers this staff member will manage</p>
                <div className="max-h-[200px] overflow-y-auto rounded-md border p-3 space-y-2">
                  {centers.map(c => (
                    <label key={c._id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.assignedCenters.includes(c._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, assignedCenters: [...form.assignedCenters, c._id] })
                          } else {
                            setForm({ ...form, assignedCenters: form.assignedCenters.filter(id => id !== c._id) })
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{c.name} ({c.code})</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{form.assignedCenters.length} center(s) selected</p>
              </div>
            )}
            {form.assignedCenters.length > 0 && groups.length > 0 && (
              <div className="space-y-2">
                <Label>Assigned Groups (auto-assigned)</Label>
                <p className="text-xs text-muted-foreground">All groups under selected centers are automatically assigned</p>
                <div className="max-h-[200px] overflow-y-auto rounded-md border p-3 space-y-2 bg-muted/20">
                  {groups.map(g => (
                    <div key={g._id} className="flex items-center gap-2 text-sm">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {g.name} ({g.code})
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{groups.length} group(s) will be assigned automatically</p>
              </div>
            )}
            {form.assignedCenters.length > 0 && groups.length === 0 && (
              <div className="space-y-2">
                <Label>Assigned Groups (auto-assigned)</Label>
                <p className="text-sm text-muted-foreground border rounded-md p-3">No groups found under selected centers</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={editItem ? handleUpdate : handleCreate} disabled={submitting || uploadingImage}>
              {submitting || uploadingImage ? "Saving..." : editItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewCenters} onOpenChange={() => setViewCenters(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assigned Centers</DialogTitle>
            <DialogDescription>{viewCenters?.staffName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {viewCenters?.centers.map((c) => (
              <div key={c._id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.code}</p>
                </div>
              </div>
            ))}
            {viewCenters && viewCenters.centers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No centers assigned</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewCenters(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewGroups} onOpenChange={() => setViewGroups(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assigned Groups</DialogTitle>
            <DialogDescription>{viewGroups?.staffName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {viewGroups?.groups.map((g) => (
              <div key={g._id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="font-medium text-sm">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{g.code}</p>
                </div>
              </div>
            ))}
            {viewGroups && viewGroups.groups.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No groups assigned</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewGroups(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this staff member? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
