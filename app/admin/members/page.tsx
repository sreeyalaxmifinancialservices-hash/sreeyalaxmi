"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useTheme } from "next-themes"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { PlusIcon, SearchIcon, EyeIcon, PencilIcon, Trash2Icon, Loader2Icon, CheckIcon, XIcon, Camera } from "lucide-react"
import { toast } from "sonner"

interface Branch { _id: string; name: string; code: string }
interface Center { _id: string; name: string; code: string }
interface Group { _id: string; name: string; code: string }
interface Member {
  _id: string; firstName: string; lastName: string; phone: string; email?: string
  aadhaar: string; pan?: string; dob: string; gender: string; guardianName: string
  address: { street: string; city: string; state: string; pincode: string }
  photo?: string
  branch: Branch; center: Center; group: Group
  memberCode: string; verificationStatus: "pending" | "verified" | "rejected"
  status: "active" | "inactive"
}
interface Pagination { page: number; limit: number; total: number; pages: number }

const emptyForm = {
  memberCode: "",
  firstName: "", lastName: "", phone: "", email: "", aadhaar: "", pan: "",
  dob: "", gender: "male" as "male" | "female" | "other",
  guardianName: "",
  address: { street: "", city: "", state: "", pincode: "" },
  branch: "", center: "", group: "",
}

export default function MembersPage() {
  const { resolvedTheme } = useTheme()
  const colorScheme = resolvedTheme === "dark" ? "dark" : "light"
  const [members, setMembers] = useState<Member[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [centers, setCenters] = useState<Center[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [branchFilter, setBranchFilter] = useState("all")
  const [centerFilter, setCenterFilter] = useState("all")
  const [verificationFilter, setVerificationFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [deleting, setDeleting] = useState<Member | null>(null)
  const [viewing, setViewing] = useState<Member | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dropdownsLoading, setDropdownsLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const fetchGroups = useCallback(async (centerId?: string) => {
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (centerId) params.set("center", centerId)
      const res = await fetch(`/api/groups?${params}`)
      const json = await res.json()
      if (json.success) setGroups(json.data)
    } catch {}
  }, [])

  const fetchMembers = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (search) params.set("search", search)
      if (branchFilter !== "all") params.set("branch", branchFilter)
      if (centerFilter !== "all") params.set("center", centerFilter)
      if (verificationFilter !== "all") params.set("verificationStatus", verificationFilter)
      const res = await fetch(`/api/members?${params}`)
      const json = await res.json()
      if (json.success) {
        setMembers(json.data)
        setPagination(json.pagination)
      } else {
        toast.error(json.error || "Failed to fetch members")
      }
    } catch {
      toast.error("Failed to fetch members")
    } finally {
      setLoading(false)
    }
  }, [search, branchFilter, centerFilter, verificationFilter])

  useEffect(() => { fetchBranches() }, [fetchBranches])
  useEffect(() => { fetchCenters(branchFilter !== "all" ? branchFilter : undefined) }, [branchFilter, fetchCenters])
  useEffect(() => { fetchGroups(centerFilter !== "all" ? centerFilter : undefined) }, [centerFilter, fetchGroups])
  useEffect(() => { fetchMembers(1) }, [fetchMembers])

  useEffect(() => {
    Promise.all([
      fetch("/api/branches?limit=100").then(r => r.json()),
      fetch("/api/centers?limit=100").then(r => r.json()),
      fetch("/api/groups?limit=100").then(r => r.json()),
    ]).then(([b, c, g]) => {
      if (b.success) setBranches(b.data)
      if (c.success) setCenters(c.data)
      if (g.success) setGroups(g.data)
    }).catch(() => {})
  }, [])

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.memberCode.trim()) e.memberCode = "Member ID is required"
    if (!form.firstName.trim()) e.firstName = "First name is required"
    if (!form.lastName.trim()) e.lastName = "Last name is required"
    if (!form.guardianName.trim()) e.guardianName = "Guardian name is required"
    if (!form.phone.trim() || form.phone.length < 10) e.phone = "Phone must be at least 10 digits"
    if (!form.aadhaar.trim() || form.aadhaar.length !== 12) e.aadhaar = "Aadhaar must be 12 digits"
    if (form.pan && form.pan.length !== 10) e.pan = "PAN must be 10 characters"
    if (!form.dob) e.dob = "Date of birth is required"
    if (!form.branch) e.branch = "Branch is required"
    if (!form.center) e.center = "Center is required"
    if (!form.group) e.group = "Group is required"
    if (!form.address.street.trim()) e.street = "Street is required"
    if (!form.address.city.trim()) e.city = "City is required"
    if (!form.address.state.trim()) e.state = "State is required"
    if (!form.address.pincode.trim() || form.address.pincode.length < 6) e.pincode = "Pincode must be 6 digits"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      let photoUrl = ""
      if (imageFile) {
        const url = await uploadImage(imageFile)
        if (url) photoUrl = url
        else { setSubmitting(false); return }
      }
      const payload: any = {
        memberCode: form.memberCode,
        firstName: form.firstName, lastName: form.lastName,
        guardianName: form.guardianName,
        phone: form.phone, email: form.email || undefined,
        aadhaar: form.aadhaar, pan: form.pan || undefined,
        dob: form.dob, gender: form.gender, address: form.address,
        branch: form.branch, center: form.center, group: form.group,
        photo: photoUrl || (editing ? (editing as any).photo : "") || undefined,
      }
      const url = editing ? `/api/members/${editing._id}` : "/api/members"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (json.success) {
        toast.success(editing ? "Member updated" : "Member created")
        setDialogOpen(false)
        setImageFile(null)
        setImagePreview("")
        fetchMembers(pagination.page)
      } else {
        toast.error(json.error || "Operation failed")
      }
    } catch {
      toast.error("Operation failed")
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async (member: Member, status: "verified" | "rejected") => {
    try {
      const res = await fetch(`/api/members/${member._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus: status }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Member ${status}`)
        fetchMembers(pagination.page)
      } else {
        toast.error(json.error || "Failed to update verification")
      }
    } catch {
      toast.error("Failed to update verification")
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/members/${deleting._id}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        toast.success("Member deleted")
        setDeleteDialogOpen(false)
        setDeleting(null)
        fetchMembers(pagination.page)
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
    setErrors({})
    setImageFile(null)
    setImagePreview("")
    setDialogOpen(true)
  }

  const openEdit = async (m: Member) => {
    setEditing(m)
    if (branches.length === 0 || centers.length === 0 || groups.length === 0) {
      setDropdownsLoading(true)
      try {
        const [b, c, g] = await Promise.all([
          fetch("/api/branches?limit=100").then(r => r.json()),
          fetch("/api/centers?limit=100").then(r => r.json()),
          fetch("/api/groups?limit=100").then(r => r.json()),
        ])
        if (b.success) setBranches(b.data)
        if (c.success) setCenters(c.data)
        if (g.success) setGroups(g.data)
      } catch {}
      setDropdownsLoading(false)
    }
    const branchId = typeof m.branch === "object" ? m.branch._id : m.branch
    const centerId = typeof m.center === "object" ? m.center._id : m.center
    const groupId = typeof m.group === "object" ? m.group._id : m.group
    setForm({
      memberCode: (m as any).memberCode || "",
      firstName: m.firstName, lastName: m.lastName, phone: m.phone,
      email: m.email || "", aadhaar: m.aadhaar, pan: m.pan || "",
      guardianName: (m as any).guardianName || "",
      dob: m.dob ? new Date(m.dob).toISOString().split("T")[0] : "",
      gender: m.gender as any,
      address: m.address || { street: "", city: "", state: "", pincode: "" },
      branch: branchId,
      center: centerId,
      group: groupId,
    })
    setImageFile(null)
    setImagePreview((m as any).photo || "")
    setErrors({})
    setDialogOpen(true)
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "members")
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
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
      <div className="flex flex-1 flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Members</CardTitle>
              <Button size="sm" onClick={openCreate}>
                <PlusIcon className="mr-1 size-4" /> Add Member
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input placeholder="Search by name, phone, or Aadhaar..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchMembers(1)} />
                  </div>
                  <Select value={branchFilter} onValueChange={(v) => { setBranchFilter(v ?? "all"); setCenterFilter("all") }}>
                    <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="All Branches" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={centerFilter} onValueChange={(v) => { setCenterFilter(v ?? "all"); fetchMembers(1) }}>
                    <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="All Centers" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Centers</SelectItem>
                      {centers.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={verificationFilter} onValueChange={(v) => { setVerificationFilter(v ?? "all"); fetchMembers(1) }}>
                    <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Verification" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Verification</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Guardian/Husband</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Aadhaar</TableHead>
                        <TableHead>PAN</TableHead>
                        <TableHead>Center</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead>Verification</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 11 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                          </TableRow>
                        ))
                      ) : members.length === 0 ? (
                        <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">No members found</TableCell></TableRow>
                      ) : (
                        members.map((m) => (
                          <TableRow key={m._id}>
                            <TableCell className="font-medium">{m.memberCode}</TableCell>
                            <TableCell className="font-medium">{m.firstName} {m.lastName}</TableCell>
                            <TableCell>{m.guardianName || "—"}</TableCell>
                            <TableCell>{m.phone}</TableCell>
                            <TableCell>{m.aadhaar}</TableCell>
                            <TableCell>{m.pan || "—"}</TableCell>
                            <TableCell>{m.center?.name}</TableCell>
                            <TableCell>{m.group?.name}</TableCell>
                            <TableCell>
                              <Badge variant={m.verificationStatus === "verified" ? "default" : m.verificationStatus === "rejected" ? "destructive" : "secondary"}>
                                {m.verificationStatus}
                              </Badge>
                            </TableCell>
                            <TableCell><Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge></TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {m.verificationStatus === "pending" && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => handleVerify(m, "verified")} title="Verify">
                                    <CheckIcon className="size-4 text-green-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleVerify(m, "rejected")} title="Reject">
                                    <XIcon className="size-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => setViewing(m)} title="View Details">
                                <EyeIcon className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><PencilIcon className="size-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { setDeleting(m); setDeleteDialogOpen(true) }}><Trash2Icon className="size-4 text-destructive" /></Button>
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
                      <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchMembers(pagination.page - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchMembers(pagination.page + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

      <Dialog open={!!viewing} onOpenChange={(open) => { if (!open) setViewing(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>
              {viewing?.memberCode} · {viewing?.firstName} {viewing?.lastName}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {viewing.photo ? (
                  <img
                    src={viewing.photo}
                    alt="Member"
                    className="h-20 w-20 rounded-full object-cover border"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                    <Camera className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{viewing.firstName} {viewing.lastName}</p>
                  <p className="text-sm text-muted-foreground">{viewing.memberCode}</p>
                  <div className="flex gap-2 pt-1">
                    <Badge variant={viewing.verificationStatus === "verified" ? "default" : viewing.verificationStatus === "rejected" ? "destructive" : "secondary"}>
                      {viewing.verificationStatus}
                    </Badge>
                    <Badge variant={viewing.status === "active" ? "default" : "secondary"}>{viewing.status}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Guardian/Husband</p>
                  <p className="font-medium">{viewing.guardianName || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{viewing.phone || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{viewing.email || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Aadhaar</p>
                  <p className="font-medium">{viewing.aadhaar || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">PAN</p>
                  <p className="font-medium">{viewing.pan || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{viewing.dob ? new Date(viewing.dob).toLocaleDateString() : "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{viewing.gender || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Branch</p>
                  <p className="font-medium">{viewing.branch?.name || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Center</p>
                  <p className="font-medium">{viewing.center?.name || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Group</p>
                  <p className="font-medium">{viewing.group?.name || "—"}</p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">
                    {viewing.address ? `${viewing.address.street}, ${viewing.address.city}, ${viewing.address.state} - ${viewing.address.pincode}` : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Member" : "Create Member"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
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
                      <XIcon className="h-3 w-3" />
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
              <div>
                <Label>Member ID *</Label>
                <Input value={form.memberCode} onChange={(e) => setForm({ ...form, memberCode: e.target.value })} placeholder="e.g. MB00001" />
                {errors.memberCode && <p className="text-sm text-destructive mt-1">{errors.memberCode}</p>}
              </div>
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
            <div>
              <Label>Guardian / Husband Name *</Label>
              <Input value={form.guardianName || ""} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
              {errors.guardianName && <p className="text-sm text-destructive mt-1">{errors.guardianName}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone *</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Aadhaar *</Label>
                <Input value={form.aadhaar} onChange={(e) => setForm({ ...form, aadhaar: e.target.value })} />
                {errors.aadhaar && <p className="text-sm text-destructive mt-1">{errors.aadhaar}</p>}
              </div>
              <div>
                <Label>PAN</Label>
                <Input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} />
                {errors.pan && <p className="text-sm text-destructive mt-1">{errors.pan}</p>}
              </div>
              <div>
                <Label>Gender *</Label>
                <Select value={form.gender} onValueChange={(v) => { if (v === "male" || v === "female" || v === "other") setForm({ ...form, gender: v }) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Date of Birth *</Label>
              <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              {errors.dob && <p className="text-sm text-destructive mt-1">{errors.dob}</p>}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Branch *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                  style={{ colorScheme }}
                  value={form.branch}
                  onChange={(e) => { setForm({ ...form, branch: e.target.value, center: "", group: "" }); fetchCenters(e.target.value || undefined) }}
                  disabled={dropdownsLoading}
                >
                  <option value="">{dropdownsLoading ? "Loading..." : "Select branch"}</option>
                  {branches.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
                </select>
                {errors.branch && <p className="text-sm text-destructive mt-1">{errors.branch}</p>}
              </div>
              <div>
                <Label>Center *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                  style={{ colorScheme }}
                  value={form.center}
                  onChange={(e) => { setForm({ ...form, center: e.target.value, group: "" }); fetchGroups(e.target.value || undefined) }}
                  disabled={dropdownsLoading}
                >
                  <option value="">{dropdownsLoading ? "Loading..." : "Select center"}</option>
                  {centers.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
                </select>
                {errors.center && <p className="text-sm text-destructive mt-1">{errors.center}</p>}
              </div>
              <div>
                <Label>Group *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                  style={{ colorScheme }}
                  value={form.group}
                  onChange={(e) => setForm({ ...form, group: e.target.value })}
                  disabled={dropdownsLoading}
                >
                  <option value="">{dropdownsLoading ? "Loading..." : "Select group"}</option>
                  {groups.map((g) => <option key={g._id} value={g._id}>{g.name} ({g.code})</option>)}
                </select>
                {errors.group && <p className="text-sm text-destructive mt-1">{errors.group}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Street *</Label>
                <Input value={form.address.street} onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })} />
                {errors.street && <p className="text-sm text-destructive mt-1">{errors.street}</p>}
              </div>
              <div>
                <Label>City *</Label>
                <Input value={form.address.city} onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} />
                {errors.city && <p className="text-sm text-destructive mt-1">{errors.city}</p>}
              </div>
              <div>
                <Label>State *</Label>
                <Input value={form.address.state} onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} />
                {errors.state && <p className="text-sm text-destructive mt-1">{errors.state}</p>}
              </div>
              <div>
                <Label>Pincode *</Label>
                <Input value={form.address.pincode} onChange={(e) => setForm({ ...form, address: { ...form.address, pincode: e.target.value } })} />
                {errors.pincode && <p className="text-sm text-destructive mt-1">{errors.pincode}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || uploadingImage}>
              {submitting || uploadingImage ? <Loader2Icon className="mr-1 size-4 animate-spin" /> : null}
              {submitting ? (editing ? "Updating..." : "Creating...") : uploadingImage ? "Uploading..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete &quot;{deleting?.firstName} {deleting?.lastName}&quot;? This action cannot be undone.</AlertDialogDescription>
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
