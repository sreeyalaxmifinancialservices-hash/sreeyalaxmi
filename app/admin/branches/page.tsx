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
import { PlusIcon, SearchIcon, PencilIcon, Trash2Icon, Loader2Icon, PowerIcon } from "lucide-react"
import { toast } from "sonner"

interface Branch {
  _id: string
  name: string
  code: string
  address: string
  phone: string
  email: string
  manager?: string
  status: "active" | "inactive"
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

const emptyForm = {
  name: "",
  code: "",
  address: "",
  phone: "",
  email: "",
  manager: "",
  status: "active" as "active" | "inactive",
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fetchBranches = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (search) params.set("search", search)
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/branches?${params}`)
      const json = await res.json()
      if (json.success) {
        setBranches(json.data)
        setPagination(json.pagination)
      } else {
        toast.error(json.error || "Failed to fetch branches")
      }
    } catch {
      toast.error("Failed to fetch branches")
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    fetchBranches(1)
  }, [fetchBranches])

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Branch name is required"
    if (!form.code.trim()) e.code = "Branch code is required"
    if (!form.address.trim()) e.address = "Address is required"
    if (!form.phone.trim() || form.phone.length < 10) e.phone = "Phone must be at least 10 digits"
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload = { ...form, manager: form.manager || undefined }
      const url = editingBranch ? `/api/branches/${editingBranch._id}` : "/api/branches"
      const method = editingBranch ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(editingBranch ? "Branch updated" : "Branch created")
        setDialogOpen(false)
        fetchBranches(pagination.page)
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
    if (!deletingBranch) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/branches/${deletingBranch._id}?permanent=true`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        toast.success("Branch deleted permanently")
        setPermanentDeleteOpen(false)
        setDeletingBranch(null)
        fetchBranches(pagination.page)
      } else {
        toast.error(json.error || "Failed to delete")
      }
    } catch {
      toast.error("Failed to delete")
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (branch: Branch) => {
    const newStatus = branch.status === "active" ? "inactive" : "active"
    try {
      const res = await fetch(`/api/branches/${branch._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...branch, status: newStatus }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Branch ${newStatus === "active" ? "activated" : "deactivated"}`)
        fetchBranches(pagination.page)
      } else {
        toast.error(json.error || "Failed to update status")
      }
    } catch {
      toast.error("Failed to update status")
    }
  }

  const openCreate = () => {
    setEditingBranch(null)
    setForm(emptyForm)
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch)
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      manager: branch.manager || "",
      status: branch.status,
    })
    setErrors({})
    setDialogOpen(true)
  }

  return (
      <div className="flex flex-1 flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Branches</CardTitle>
              <Button size="sm" onClick={openCreate}>
                <PlusIcon className="mr-1 size-4" /> Add Branch
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or code..."
                      className="pl-8"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && fetchBranches(1)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); fetchBranches(1) }}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
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
                        <TableHead>Address</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 7 }).map((_, j) => (
                              <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : branches.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">No branches found</TableCell>
                        </TableRow>
                      ) : (
                        branches.map((b) => (
                          <TableRow key={b._id}>
                            <TableCell className="font-medium">{b.name}</TableCell>
                            <TableCell>{b.code}</TableCell>
                            <TableCell>{b.address}</TableCell>
                            <TableCell>{b.phone}</TableCell>
                            <TableCell>{b.email}</TableCell>
                            <TableCell>
                              <Badge variant={b.status === "active" ? "default" : "secondary"}>
                                {b.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                                <PencilIcon className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(b)} title={b.status === "active" ? "Deactivate" : "Activate"}>
                                <PowerIcon className={`size-4 ${b.status === "active" ? "text-orange-500" : "text-green-500"}`} />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => { setDeletingBranch(b); setPermanentDeleteOpen(true) }} title="Delete permanently">
                                <Trash2Icon className="size-4 text-destructive" />
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
                    <span className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchBranches(pagination.page - 1)}>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchBranches(pagination.page + 1)}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Edit Branch" : "Create Branch"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Branch Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label>Branch Code *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              {errors.code && <p className="text-sm text-destructive mt-1">{errors.code}</p>}
            </div>
            <div>
              <Label>Address *</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              {errors.address && <p className="text-sm text-destructive mt-1">{errors.address}</p>}
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
              <Label>Manager</Label>
              <Input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => { if (v === "active" || v === "inactive") setForm({ ...form, status: v }) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
              {editingBranch ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate &quot;{deletingBranch?.name}&quot;? This will mark the branch as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {submitting ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={permanentDeleteOpen} onOpenChange={setPermanentDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete &quot;{deletingBranch?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {submitting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
