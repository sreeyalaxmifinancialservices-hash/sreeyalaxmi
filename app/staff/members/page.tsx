"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { AppSidebar } from "@/app/staff/dashboard/components/app-sidebar"
import { SiteHeader } from "@/app/staff/dashboard/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { SearchIcon, CheckIcon, XIcon, EyeIcon, PencilIcon, PlusIcon, TrashIcon, Camera, Download } from "lucide-react"
import { toast } from "sonner"

interface Center { _id: string; name: string; branch: { _id: string; name: string } }
interface Branch { _id: string; name: string; code: string }
interface Group { _id: string; name: string; code: string; center: string }
interface Member {
  _id: string; firstName: string; lastName: string; phone: string; email?: string
  aadhaar: string; dob: string; gender: string; guardianName: string
  pan?: string; photo?: string
  address: { street: string; city: string; state: string; pincode: string }
  center: Center; group?: Group
  memberCode: string; verificationStatus: "pending" | "verified" | "rejected"
  status: "active" | "inactive"
}
interface Pagination { page: number; limit: number; total: number; pages: number }

export default function StaffMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [centerFilter, setCenterFilter] = useState("all")
  const [verificationFilter, setVerificationFilter] = useState("all")
  const [centers, setCenters] = useState<Center[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", guardianName: "", phone: "", email: "",
    aadhaar: "", pan: "", dob: "", gender: "",
    street: "", city: "", state: "", pincode: "",
  })
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    memberCode: "",
    firstName: "", lastName: "", guardianName: "", phone: "", email: "",
    aadhaar: "", pan: "", dob: "", gender: "",
    street: "", city: "", state: "", pincode: "",
  })
  const [addBranch, setAddBranch] = useState("")
  const [addCenter, setAddCenter] = useState("")
  const [addGroup, setAddGroup] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [addImageFile, setAddImageFile] = useState<File | null>(null)
  const [addImagePreview, setAddImagePreview] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const addFileInputRef = useRef<HTMLInputElement>(null)

  const fetchCenters = useCallback(async () => {
    try {
      const [centersRes, branchesRes] = await Promise.all([
        fetch("/api/staff/centers").then((r) => r.json()),
        fetch("/api/branches?limit=100&status=active").then((r) => r.json()),
      ])
      if (centersRes.success) setCenters(centersRes.data)
      if (branchesRes.success) setBranches(branchesRes.data)
    } catch {}
  }, [])

  const fetchMembers = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (search) params.set("search", search)
      if (centerFilter !== "all") params.set("centerId", centerFilter)
      if (verificationFilter !== "all") params.set("status", verificationFilter)
      const res = await fetch(`/api/staff/members?${params}`)
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
  }, [search, centerFilter, verificationFilter])

  useEffect(() => { fetchCenters() }, [fetchCenters])
  useEffect(() => { fetchMembers(1) }, [fetchMembers])

  useEffect(() => {
    if (addCenter) {
      fetch(`/api/groups?center=${addCenter}&limit=100`)
        .then((r) => r.json())
        .then((json) => { if (json.success) setGroups(json.data) })
        .catch(() => {})
    } else {
      setGroups([])
    }
    setAddGroup("")
  }, [addCenter])

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

  const viewMemberDetails = (member: Member) => {
    setSelectedMember(member)
    setDetailOpen(true)
  }

  const openEditDialog = (member: Member) => {
    setEditMember(member)
    setEditForm({
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      guardianName: member.guardianName || "",
      phone: member.phone || "",
      email: member.email || "",
      aadhaar: member.aadhaar || "",
      pan: member.pan || "",
      dob: member.dob ? member.dob.split("T")[0] : "",
      gender: member.gender || "",
      street: member.address?.street || "",
      city: member.address?.city || "",
      state: member.address?.state || "",
      pincode: member.address?.pincode || "",
    })
  }

  const handleEditSubmit = async () => {
    if (!editMember) return
    if (!editForm.firstName || !editForm.lastName || !editForm.phone) {
      toast.error("First name, last name, and phone are required")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/staff/edit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "member",
          entityId: editMember._id,
          newValues: {
            firstName: editForm.firstName,
            lastName: editForm.lastName,
            guardianName: editForm.guardianName,
            phone: editForm.phone,
            email: editForm.email || undefined,
            aadhaar: editForm.aadhaar,
            pan: editForm.pan || undefined,
            dob: editForm.dob ? new Date(editForm.dob).toISOString() : undefined,
            gender: editForm.gender,
            address: {
              street: editForm.street,
              city: editForm.city,
              state: editForm.state,
              pincode: editForm.pincode,
            },
          },
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Edit request submitted for admin approval")
        setEditMember(null)
      } else {
        toast.error(json.error || "Failed to submit edit request")
      }
    } catch {
      toast.error("Failed to submit edit request")
    } finally {
      setSubmitting(false)
    }
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

  const handleAddImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB")
      return
    }
    setAddImageFile(file)
    setAddImagePreview(URL.createObjectURL(file))
  }

  const removeAddImage = () => {
    setAddImageFile(null)
    setAddImagePreview("")
    if (addFileInputRef.current) addFileInputRef.current.value = ""
  }

  const handleAddSubmit = async () => {
    if (!addForm.memberCode) {
      toast.error("Member ID is required")
      return
    }
    if (!addForm.firstName || !addForm.lastName || !addForm.phone || !addForm.aadhaar || !addForm.dob || !addForm.gender) {
      toast.error("Please fill in all required fields")
      return
    }
    if (!addBranch || !addCenter || !addGroup) {
      toast.error("Please select branch, center, and group")
      return
    }
    if (!addForm.street || !addForm.city || !addForm.state || !addForm.pincode) {
      toast.error("Please fill in all address fields")
      return
    }
    setSubmitting(true)
    try {
      let photoUrl = ""
      if (addImageFile) {
        const url = await uploadImage(addImageFile)
        if (url) photoUrl = url
        else { setSubmitting(false); return }
      }
      const res = await fetch("/api/staff/member-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          memberData: {
            memberCode: addForm.memberCode,
            firstName: addForm.firstName,
            lastName: addForm.lastName,
            guardianName: addForm.guardianName,
            phone: addForm.phone,
            email: addForm.email,
            aadhaar: addForm.aadhaar,
            pan: addForm.pan,
            dob: addForm.dob,
            gender: addForm.gender,
            address: {
              street: addForm.street,
              city: addForm.city,
              state: addForm.state,
              pincode: addForm.pincode,
            },
            branch: addBranch,
            center: addCenter,
            group: addGroup,
            photo: photoUrl || undefined,
          },
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Member add request submitted for admin approval")
        setAddForm({ memberCode: "", firstName: "", lastName: "", guardianName: "", phone: "", email: "", aadhaar: "", pan: "", dob: "", gender: "", street: "", city: "", state: "", pincode: "" })
        setAddBranch(""); setAddCenter(""); setAddGroup("")
        setAddImageFile(null)
        setAddImagePreview("")
        setAddOpen(false)
      } else {
        toast.error(json.error || "Failed to submit request")
      }
    } catch {
      toast.error("Failed to submit request")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRequest = async (member: Member) => {
    if (!confirm(`Request deletion of ${member.firstName} ${member.lastName}? This will be sent to admin for approval.`)) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/staff/member-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", memberId: member._id }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Member delete request submitted for admin approval")
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
              <CardTitle>Members</CardTitle>
              <Button size="sm" onClick={() => { setAddImageFile(null); setAddImagePreview(""); setAddOpen(true) }}>
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
                  <Select value={centerFilter} onValueChange={(v) => { setCenterFilter(v ?? "all"); fetchMembers(1) }} items={[{ label: "All Centers", value: "all" }, ...centers.map(c => ({ label: c.name, value: c._id }))]}>
                    <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Centers" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Centers</SelectItem>
                      {centers.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={verificationFilter} onValueChange={(v) => { setVerificationFilter(v ?? "all"); fetchMembers(1) }} items={[{ label: "All Verification", value: "all" }, { label: "Pending", value: "pending" }, { label: "Verified", value: "verified" }, { label: "Rejected", value: "rejected" }]}>
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
                        <TableHead>Photo</TableHead>
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
                            {Array.from({ length: 12 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                          </TableRow>
                        ))
                      ) : members.length === 0 ? (
                        <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">No members found</TableCell></TableRow>
                      ) : (
                        members.map((m) => (
                          <TableRow key={m._id}>
                            <TableCell>
                              {m.photo ? (
                                <img src={m.photo} alt={`${m.firstName} ${m.lastName}`} className="h-8 w-8 rounded-full object-cover" />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                  {m.firstName[0]}{m.lastName[0]}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{m.memberCode}</TableCell>
                            <TableCell className="font-medium">{m.firstName} {m.lastName}</TableCell>
                            <TableCell>{m.guardianName || "—"}</TableCell>
                            <TableCell>{m.phone}</TableCell>
                            <TableCell>{m.aadhaar}</TableCell>
                            <TableCell>{m.pan || "—"}</TableCell>
                            <TableCell>{m.center?.name}</TableCell>
                            <TableCell>{m.group?.name || "—"}</TableCell>
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
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(m)} title="Request Edit">
                                <PencilIcon className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => viewMemberDetails(m)} title="View Details">
                                <EyeIcon className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(m)} title="Request Delete" disabled={submitting}>
                                <TrashIcon className="size-4 text-destructive" />
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
                      <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchMembers(pagination.page - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchMembers(pagination.page + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      {detailOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Member Details</h2>
              <Button variant="ghost" size="sm" onClick={() => { setDetailOpen(false); setSelectedMember(null) }}>Close</Button>
            </div>
            <div className="flex flex-col items-center mb-4">
              <div className="relative">
                {selectedMember.photo ? (
                  <img src={selectedMember.photo} alt={`${selectedMember.firstName} ${selectedMember.lastName}`} className="h-28 w-28 rounded-full object-cover" />
                ) : (
                  <div className="h-28 w-28 rounded-full bg-muted flex items-center justify-center text-2xl font-medium">
                    {selectedMember.firstName[0]}{selectedMember.lastName[0]}
                  </div>
                )}
                {selectedMember.photo && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(selectedMember.photo!)
                        const blob = await res.blob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `${selectedMember.firstName}_${selectedMember.lastName}_photo.jpg`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      } catch {
                        toast.error("Download failed")
                      }
                    }}
                    className="absolute bottom-0 right-0 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/80 transition-colors"
                    title="Download photo"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {selectedMember.firstName} {selectedMember.lastName}</div>
              <div><span className="text-muted-foreground">Guardian/Husband:</span> {selectedMember.guardianName || "—"}</div>
              <div><span className="text-muted-foreground">Code:</span> {selectedMember.memberCode}</div>
              <div><span className="text-muted-foreground">Phone:</span> {selectedMember.phone}</div>
              <div><span className="text-muted-foreground">Email:</span> {selectedMember.email || "—"}</div>
              <div><span className="text-muted-foreground">Aadhaar:</span> {selectedMember.aadhaar}</div>
              <div><span className="text-muted-foreground">Gender:</span> {selectedMember.gender}</div>
              <div><span className="text-muted-foreground">DOB:</span> {selectedMember.dob ? new Date(selectedMember.dob).toLocaleDateString() : "—"}</div>
              <div><span className="text-muted-foreground">Center:</span> {selectedMember.center?.name}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {selectedMember.address?.street}, {selectedMember.address?.city}, {selectedMember.address?.state} - {selectedMember.address?.pincode}</div>
              <div><span className="text-muted-foreground">Verification:</span> <Badge variant={selectedMember.verificationStatus === "verified" ? "default" : selectedMember.verificationStatus === "rejected" ? "destructive" : "secondary"}>{selectedMember.verificationStatus}</Badge></div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant={selectedMember.status === "active" ? "default" : "secondary"}>{selectedMember.status}</Badge></div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Member Edit</DialogTitle>
            <DialogDescription>
              Submit changes for {editMember?.firstName} {editMember?.lastName}. Changes will be sent to admin for approval.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Guardian/Husband</Label>
              <Input value={editForm.guardianName} onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Aadhaar</Label>
              <Input value={editForm.aadhaar} onChange={(e) => setEditForm({ ...editForm, aadhaar: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>PAN</Label>
              <Input value={editForm.pan} onChange={(e) => setEditForm({ ...editForm, pan: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>DOB</Label>
              <Input type="date" value={editForm.dob} onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={editForm.gender} onValueChange={(v) => setEditForm({ ...editForm, gender: v ?? "" })} items={[{ label: "Male", value: "male" }, { label: "Female", value: "female" }, { label: "Other", value: "other" }]}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Street</Label>
              <Input value={editForm.street} onChange={(e) => setEditForm({ ...editForm, street: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Pincode</Label>
              <Input value={editForm.pincode} onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>Submit a new member request. This will be sent to admin for approval.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 mb-2">
            <div
              className="relative h-24 w-24 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => addFileInputRef.current?.click()}
            >
              {addImagePreview ? (
                <>
                  <img src={addImagePreview} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute top-0 right-0 h-6 w-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                    onClick={(e) => { e.stopPropagation(); removeAddImage() }}
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <Camera className="h-8 w-8 text-muted-foreground/40" />
              )}
            </div>
            <input
              ref={addFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAddImageChange}
            />
            <p className="text-xs text-muted-foreground">Click to upload photo (max 5MB)</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Member ID *</Label>
              <Input value={addForm.memberCode} onChange={(e) => setAddForm({ ...addForm, memberCode: e.target.value })} placeholder="e.g. MB00001" />
            </div>
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input value={addForm.firstName} onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input value={addForm.lastName} onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Guardian/Husband</Label>
              <Input value={addForm.guardianName} onChange={(e) => setAddForm({ ...addForm, guardianName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Aadhaar *</Label>
              <Input value={addForm.aadhaar} onChange={(e) => setAddForm({ ...addForm, aadhaar: e.target.value })} maxLength={12} />
            </div>
            <div className="space-y-2">
              <Label>PAN</Label>
              <Input value={addForm.pan} onChange={(e) => setAddForm({ ...addForm, pan: e.target.value })} maxLength={10} />
            </div>
            <div className="space-y-2">
              <Label>DOB *</Label>
              <Input type="date" value={addForm.dob} onChange={(e) => setAddForm({ ...addForm, dob: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Gender *</Label>
              <Select value={addForm.gender} onValueChange={(v) => setAddForm({ ...addForm, gender: v ?? "" })} items={[{ label: "Male", value: "male" }, { label: "Female", value: "female" }, { label: "Other", value: "other" }]}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch *</Label>
              <Select value={addBranch} onValueChange={(v) => { setAddBranch(v ?? ""); setAddCenter(""); setAddGroup("") }} items={branches.map(b => ({ label: b.name, value: b._id }))}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Center *</Label>
              <Select value={addCenter} onValueChange={(v) => { setAddCenter(v ?? ""); setAddGroup("") }} disabled={!addBranch} items={centers.filter((c) => c.branch?._id === addBranch).map(c => ({ label: c.name, value: c._id }))}>
                <SelectTrigger><SelectValue placeholder="Select center" /></SelectTrigger>
                <SelectContent>
                  {centers.filter((c) => c.branch?._id === addBranch).map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Group *</Label>
              <Select value={addGroup} onValueChange={(v) => setAddGroup(v ?? "")} disabled={!addCenter} items={groups.map(g => ({ label: g.name, value: g._id }))}>
                <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                <SelectContent>
                  {groups.map((g) => <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Street *</Label>
              <Input value={addForm.street} onChange={(e) => setAddForm({ ...addForm, street: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Input value={addForm.city} onChange={(e) => setAddForm({ ...addForm, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Input value={addForm.state} onChange={(e) => setAddForm({ ...addForm, state: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Pincode *</Label>
              <Input value={addForm.pincode} onChange={(e) => setAddForm({ ...addForm, pincode: e.target.value })} maxLength={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSubmit} disabled={submitting || uploadingImage}>
              {submitting ? "Submitting..." : uploadingImage ? "Uploading..." : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
