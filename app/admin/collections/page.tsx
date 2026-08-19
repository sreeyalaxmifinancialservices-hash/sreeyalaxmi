"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, Loader2, FileSpreadsheet, FileText } from "lucide-react"

interface Collection {
  _id: string
  collectionId: string
  source: "report" | "group"
  branch: { _id?: string; name: string; code: string }
  center: { _id?: string; name: string; code: string }
  group: { _id?: string; name: string; code: string }
  leader: { firstName: string; lastName: string } | null
  staffName: string
  collectionDate: string
  cashAmount: number
  onlineAmount: number
  total: number
  status: string
  createdAt: string
}

interface GroupCollection {
  _id: string
  assignmentId: string
  branchId: { _id?: string; name: string; code?: string }
  centerId: { _id?: string; name: string; code?: string }
  groupId: { _id?: string; name: string; code?: string }
  staffId: { firstName: string; lastName: string }
  staffName: string
  leaderName: string
  collectionDate: string
  totalCollected: number
  status: string
}

interface Branch { _id: string; name: string; code: string }
interface Center { _id: string; name: string; code: string; branch: { _id: string } }
interface Group { _id: string; name: string; code: string; leader: { _id: string; firstName: string; lastName: string } | null }
interface Staff { _id: string; firstName: string; lastName: string }

export default function CollectionsPage() {
  const { resolvedTheme } = useTheme()
  const colorScheme = resolvedTheme === "dark" ? "dark" : "light"
  const [collections, setCollections] = React.useState<Collection[]>([])
  const [loading, setLoading] = React.useState(true)
  const [branchFilter, setBranchFilter] = React.useState("all")
  const [centerFilter, setCenterFilter] = React.useState("all")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")
  const [staffFilter, setStaffFilter] = React.useState("all")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [branches, setBranches] = React.useState<Branch[]>([])
  const [centers, setCenters] = React.useState<Center[]>([])
  const [groups, setGroups] = React.useState<Group[]>([])
  const [staffList, setStaffList] = React.useState<Staff[]>([])
  const [form, setForm] = React.useState({ branch: "", center: "", group: "", staff: "", collectionDate: "", cashAmount: 0, onlineAmount: 0, advanceAmount: 0, insuranceAmount: 0, savingsAmount: 0, remarks: "", leader: "" })
  const [leaderName, setLeaderName] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 })

  const normalizeGroup = React.useCallback((g: GroupCollection): Collection => ({
    _id: g._id,
    collectionId: g.assignmentId,
    source: "group",
    branch: { _id: g.branchId?._id, name: g.branchId?.name || "", code: g.branchId?.code || "" },
    center: { _id: g.centerId?._id, name: g.centerId?.name || "", code: g.centerId?.code || "" },
    group: { _id: g.groupId?._id, name: g.groupId?.name || "", code: g.groupId?.code || "" },
    leader: g.leaderName ? { firstName: g.leaderName, lastName: "" } : null,
    staffName: g.staffName,
    collectionDate: g.collectionDate,
    cashAmount: g.totalCollected || 0,
    onlineAmount: 0,
    total: g.totalCollected || 0,
    status: g.status,
    createdAt: "",
  }), [])

  const loadMerged = React.useCallback(async (): Promise<Collection[]> => {
    const [colRes, groupRes] = await Promise.all([
      fetch("/api/collections?limit=1000").then((r) => r.json()),
      fetch("/api/group-assigned-collection").then((r) => r.json()),
    ])
    const reports: Collection[] = colRes.success ? colRes.data : []
    const groups: GroupCollection[] = groupRes.success
      ? (groupRes.data as GroupCollection[]).filter((g) => (g.totalCollected || 0) > 0)
      : []

    let all: Collection[] = [
      ...reports.map((c) => ({ ...c, source: "report" as const })),
      ...groups.map(normalizeGroup),
    ]

    if (branchFilter !== "all") all = all.filter((c) => String(c.branch?._id) === branchFilter)
    if (centerFilter !== "all") all = all.filter((c) => String(c.center?._id) === centerFilter)
    if (staffFilter !== "all") {
      const staffDoc = staffList.find((s) => s._id === staffFilter)
      if (staffDoc) {
        const fullName = `${staffDoc.firstName} ${staffDoc.lastName}`
        all = all.filter((c) => c.staffName === fullName)
      }
    }
    if (dateFrom) {
      const f = new Date(dateFrom).setHours(0, 0, 0, 0)
      all = all.filter((c) => new Date(c.collectionDate).getTime() >= f)
    }
    if (dateTo) {
      const t = new Date(dateTo).setHours(23, 59, 59, 999)
      all = all.filter((c) => new Date(c.collectionDate).getTime() <= t)
    }

    all.sort((a, b) => new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime())
    return all
  }, [branchFilter, centerFilter, staffFilter, dateFrom, dateTo, staffList, normalizeGroup])

  const fetchCollections = React.useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const all = await loadMerged()
      const total = all.length
      const pages = Math.max(1, Math.ceil(total / 10))
      const current = Math.min(page, pages)
      setCollections(all.slice((current - 1) * 10, current * 10))
      setPagination({ page: current, pages, total })
    } catch {
      toast.error("Failed to fetch collections")
    } finally {
      setLoading(false)
    }
  }, [loadMerged])

  React.useEffect(() => { fetchCollections() }, [fetchCollections])

  React.useEffect(() => {
    Promise.all([
      fetch("/api/branches?limit=100&status=active").then((r) => r.json()),
      fetch("/api/centers?limit=100&status=active").then((r) => r.json()),
      fetch("/api/staff?limit=100&status=active").then((r) => r.json()),
    ]).then(([b, c, s]) => {
      if (b.success) setBranches(b.data)
      if (c.success) setCenters(c.data)
      if (s.success) setStaffList(s.data)
    }).catch(() => {})
  }, [])

  const fetchGroups = React.useCallback(async (centerId: string) => {
    try {
      const res = await fetch(`/api/groups?limit=100&status=active&center=${centerId}`).then((r) => r.json())
      if (res.success) setGroups(res.data)
    } catch {}
  }, [])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val)

  const fetchAllCollections = React.useCallback(async (): Promise<Collection[]> => {
    try {
      return await loadMerged()
    } catch { return [] }
  }, [loadMerged])

  const handleExportExcel = async () => {
    try {
      toast.info("Preparing export...")
      const all = await fetchAllCollections()
      if (all.length === 0) { toast.error("No data to export"); return }
      const XLSX = await import("xlsx")
      const headers = ["Type", "Collection #", "Branch", "Center", "Group", "Leader", "Staff", "Date", "Cash", "Online", "Total", "Status"]
      const rows = all.map((c) => [
        c.source === "group" ? "Group Collection" : "Report",
        c.collectionId,
        c.branch?.name || "",
        c.center?.name || "",
        c.group?.name || "",
        c.leader ? `${c.leader.firstName} ${c.leader.lastName}` : "",
        c.staffName,
        new Date(c.collectionDate).toLocaleDateString(),
        c.cashAmount,
        c.onlineAmount,
        c.total,
        c.status,
      ])
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Collections")
      XLSX.writeFile(wb, "collections-report.xlsx")
      toast.success("Excel exported successfully")
    } catch { toast.error("Failed to export Excel") }
  }

  const handleExportPDF = async () => {
    try {
      toast.info("Preparing export...")
      const all = await fetchAllCollections()
      if (all.length === 0) { toast.error("No data to export"); return }
      const jsPDF = (await import("jspdf")).default
      const autoTable = (await import("jspdf-autotable")).default
      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text("Collections Report", 14, 22)
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
      autoTable(doc, {
        startY: 36,
        head: [["Type", "Collection #", "Branch", "Center", "Group", "Leader", "Staff", "Date", "Cash", "Online", "Total", "Status"]],
        body: all.map((c) => [
          c.source === "group" ? "Group Collection" : "Report",
          c.collectionId,
          c.branch?.name || "",
          c.center?.name || "",
          c.group?.name || "",
          c.leader ? `${c.leader.firstName} ${c.leader.lastName}` : "",
          c.staffName,
          new Date(c.collectionDate).toLocaleDateString(),
          `₹${c.cashAmount?.toLocaleString()}`,
          `₹${c.onlineAmount?.toLocaleString()}`,
          `₹${c.total?.toLocaleString()}`,
          c.status,
        ]),
      })
      doc.save("collections-report.pdf")
      toast.success("PDF exported successfully")
    } catch { toast.error("Failed to export PDF") }
  }

  const handleCreate = async () => {
    try {
      setSubmitting(true)
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setDialogOpen(false)
        setForm({ branch: "", center: "", group: "", staff: "", collectionDate: "", cashAmount: 0, onlineAmount: 0, advanceAmount: 0, insuranceAmount: 0, savingsAmount: 0, remarks: "", leader: "" })
        setLeaderName("")
        fetchCollections()
      } else {
        toast.error(json.error || "Failed to record collection")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  return (
      <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Collections</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <FileText className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Record Collection
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Branch</Label>
              <select
                className="flex h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                style={{ colorScheme }}
                suppressHydrationWarning
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="all">All Branches</option>
                {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Center</Label>
              <select
                className="flex h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                style={{ colorScheme }}
                suppressHydrationWarning
                value={centerFilter}
                onChange={(e) => setCenterFilter(e.target.value)}
              >
                <option value="all">All Centers</option>
                {centers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Staff</Label>
              <select
                className="flex h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                style={{ colorScheme }}
                suppressHydrationWarning
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
              >
                <option value="all">All Staff</option>
                {staffList.map((s) => <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[170px]" />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[170px]" />
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Collection #</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Leader</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Cash</TableHead>
                  <TableHead>Online</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 12 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : collections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No collections found</TableCell>
                  </TableRow>
                ) : (
                  collections.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell>
                        <Badge variant={c.source === "group" ? "secondary" : "outline"}>
                          {c.source === "group" ? "Group Collection" : "Report"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{c.collectionId}</TableCell>
                      <TableCell>{c.branch?.name}</TableCell>
                      <TableCell>{c.center?.name}</TableCell>
                      <TableCell>{c.group?.name || "—"}</TableCell>
                      <TableCell>{c.leader ? `${c.leader.firstName} ${c.leader.lastName}` : "—"}</TableCell>
                      <TableCell>{c.staffName}</TableCell>
                      <TableCell>{new Date(c.collectionDate).toLocaleDateString()}</TableCell>
                      <TableCell>{formatCurrency(c.cashAmount)}</TableCell>
                      <TableCell>{formatCurrency(c.onlineAmount)}</TableCell>
                      <TableCell>{formatCurrency(c.total)}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "completed" ? "default" : "secondary"}>{c.status}</Badge>
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
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchCollections(pagination.page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchCollections(pagination.page + 1)}>Next</Button>
              </div>
            </div>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Record Collection</DialogTitle>
                <DialogDescription>Enter the collection details for today.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                    style={{ colorScheme }}
                    suppressHydrationWarning
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  >
                    <option value="">Select branch</option>
                    {branches.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Center</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                    style={{ colorScheme }}
                    suppressHydrationWarning
                    value={form.center}
                    onChange={(e) => {
                      const centerId = e.target.value
                      setForm({ ...form, center: centerId, group: "", leader: "" })
                      setLeaderName("")
                      setGroups([])
                      if (centerId) fetchGroups(centerId)
                    }}
                  >
                    <option value="">Select center</option>
                    {centers.filter((c) => !form.branch || c.branch?._id === form.branch).map((c) => (
                      <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Group</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                    style={{ colorScheme }}
                    suppressHydrationWarning
                    value={form.group}
                    onChange={(e) => {
                      const groupId = e.target.value
                      const selectedGroup = groups.find((g) => g._id === groupId)
                      const leaderId = selectedGroup?.leader?._id || ""
                      const leaderFullName = selectedGroup?.leader ? `${selectedGroup.leader.firstName} ${selectedGroup.leader.lastName}` : ""
                      setForm({ ...form, group: groupId, leader: leaderId })
                      setLeaderName(leaderFullName)
                    }}
                  >
                    <option value="">Select group</option>
                    {groups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Staff</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                    style={{ colorScheme }}
                    suppressHydrationWarning
                    value={form.staff}
                    onChange={(e) => setForm({ ...form, staff: e.target.value })}
                  >
                    <option value="">Select staff</option>
                    {staffList.map((s) => <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Collection Date</Label>
                  <Input type="date" value={form.collectionDate} onChange={(e) => setForm({ ...form, collectionDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Cash Amount</Label>
                  <Input type="number" value={form.cashAmount} onChange={(e) => setForm({ ...form, cashAmount: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Online Amount</Label>
                  <Input type="number" value={form.onlineAmount} onChange={(e) => setForm({ ...form, onlineAmount: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Advance Amount</Label>
                  <Input type="number" value={form.advanceAmount} onChange={(e) => setForm({ ...form, advanceAmount: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Insurance Amount</Label>
                  <Input type="number" value={form.insuranceAmount} onChange={(e) => setForm({ ...form, insuranceAmount: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Savings Amount</Label>
                  <Input type="number" value={form.savingsAmount} onChange={(e) => setForm({ ...form, savingsAmount: Number(e.target.value) })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Remarks</Label>
                  <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Collection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

  )
}
