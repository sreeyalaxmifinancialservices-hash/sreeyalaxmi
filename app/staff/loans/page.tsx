"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/app/staff/dashboard/components/app-sidebar"
import { SiteHeader } from "@/app/staff/dashboard/components/site-header"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, Search, Loader2, XCircle, History, Pencil } from "lucide-react"
import { computeLoanBreakdown, LoanCalcConfig } from "@/lib/loan-calc"

interface Loan {
  _id: string
  loanId: string
  cycleNumber: number
  loanType: "group" | "bank" | "old"
  member: { _id: string; firstName: string; lastName: string; memberCode: string }
  branch: { _id: string; name: string; code: string }
  center: { _id: string; name: string; code: string }
  group: { _id: string; name: string; code: string }
  loanAmount: number
  insuranceAmount: number
  processingFee: number
  disbursementAmount: number
  noOfWeeks: number
  weeklyRepayment: number
  totalRepayment: number
  outstandingBalance: number
  principalOutstanding: number
  installmentsPaid: number
  disbursementDate: string
  status: string
  closureRemark?: string
  closedAt?: string
  preCloseDate?: string
  createdAt: string
  bankName?: string
  bankBranchName?: string
}

interface Member {
  _id: string
  firstName: string
  lastName: string
  memberCode: string
  branch: { _id: string; name: string }
  center: { _id: string; name: string }
  group: { _id: string; name: string }
}

interface Center {
  _id: string
  name: string
  code: string
  branch: { _id: string; name: string }
}

interface Group {
  _id: string
  name: string
  code: string
  center: { _id: string; name: string }
  branch: { _id: string; name: string }
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  disbursed: "default",
  active: "default",
  closed: "outline",
  preclosed: "outline",
  defaulted: "destructive",
  rejected: "destructive",
}

export default function StaffLoansPage() {
  const { resolvedTheme } = useTheme()
  const colorScheme = resolvedTheme === "dark" ? "dark" : "light"
  const [loans, setLoans] = React.useState<Loan[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState({
    loanType: "group" as "group" | "bank" | "old",
    member: "",
    branch: "",
    center: "",
    group: "",
    loanAmount: 0,
    totalReceived: 0,
    openingDate: "",
    closureDate: "",
    remarks: "",
    bankName: "",
    bankBranchName: "",
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 })

  const [members, setMembers] = React.useState<Member[]>([])
  const [centers, setCenters] = React.useState<Center[]>([])
  const [groups, setGroups] = React.useState<Group[]>([])

  const [closeDialogOpen, setCloseDialogOpen] = React.useState(false)
  const [closeLoan, setCloseLoan] = React.useState<Loan | null>(null)
  const [closeRemark, setCloseRemark] = React.useState("")

  const [editDatesOpen, setEditDatesOpen] = React.useState(false)
  const [editLoan, setEditLoan] = React.useState<Loan | null>(null)
  const [editMember, setEditMember] = React.useState("")
  const [editAmount, setEditAmount] = React.useState(0)
  const [editTotalReceived, setEditTotalReceived] = React.useState(0)
  const [editBranch, setEditBranch] = React.useState("")
  const [editCenter, setEditCenter] = React.useState("")
  const [editGroup, setEditGroup] = React.useState("")
  const [editBankName, setEditBankName] = React.useState("")
  const [editBankBranch, setEditBankBranch] = React.useState("")
  const [editRemarks, setEditRemarks] = React.useState("")
  const [editDisbursement, setEditDisbursement] = React.useState("")
  const [editClose, setEditClose] = React.useState("")
  const [editSaving, setEditSaving] = React.useState(false)
  const [editMemberSearch, setEditMemberSearch] = React.useState("")
  const [editMemberOpen, setEditMemberOpen] = React.useState(false)
  const [editPending, setEditPending] = React.useState(false)

  const [memberHistory, setMemberHistory] = React.useState<Loan[]>([])
  const [historyLoading, setHistoryLoading] = React.useState(false)

  const [loanConfig, setLoanConfig] = React.useState<LoanCalcConfig>({ processingFee: 100, insuranceRate: 3, interestRate: 10, defaultNoOfWeeks: 50 })

  const fetchLoanConfig = React.useCallback(async () => {
    try {
      const res = await fetch("/api/settings")
      const json = await res.json()
      if (json.success) {
        const s: Record<string, string | number> = {}
        json.data.forEach((x: { key: string; value: string | number }) => { s[x.key] = x.value })
        setLoanConfig({
          processingFee: Number(s.processing_fee) || 0,
          insuranceRate: Number(s.insurance_rate) || 0,
          interestRate: Number(s.interest_rate) || 0,
          defaultNoOfWeeks: Number(s.default_no_of_weeks) || 50,
        })
      }
    } catch { /* ignore */ }
  }, [])

  const fetchLoans = React.useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "10")
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/staff/loans?${params}`)
      const json = await res.json()
      if (json.success) {
        setLoans(json.data)
        setPagination(json.pagination)
      } else {
        toast.error(json.error || "Failed to fetch loans")
      }
    } catch {
      toast.error("Failed to fetch loans")
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  React.useEffect(() => { fetchLoans() }, [fetchLoans])

  const fetchDropdowns = React.useCallback(async () => {
    try {
      const [cRes, gRes] = await Promise.all([
        fetch("/api/staff/centers?limit=100"),
        fetch("/api/groups?limit=100&status=active"),
      ])
      const [cJson, gJson] = await Promise.all([
        cRes.json(), gRes.json(),
      ])
      if (cJson.success) setCenters(cJson.data)
      if (gJson.success) setGroups(gJson.data)
    } catch { /* ignore */ }
  }, [])

  React.useEffect(() => {
    fetchDropdowns()
    fetchLoanConfig()
  }, [fetchDropdowns, fetchLoanConfig])

  const fetchMembers = React.useCallback(async (centerId?: string) => {
    try {
      const params = new URLSearchParams({ limit: "100", status: "active" })
      if (centerId) params.set("centerId", centerId)
      const res = await fetch(`/api/staff/members?${params}`)
      const json = await res.json()
      if (json.success) setMembers(json.data)
    } catch { /* ignore */ }
  }, [])

  React.useEffect(() => {
    if (dialogOpen) fetchMembers(form.center || undefined)
  }, [dialogOpen, form.center, fetchMembers])

  const fetchMemberHistory = React.useCallback(async (memberId: string) => {
    if (!memberId) { setMemberHistory([]); return }
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/loans?member=${memberId}&limit=100`)
      const json = await res.json()
      if (json.success) {
        setMemberHistory(json.data.sort((a: Loan, b: Loan) => a.cycleNumber - b.cycleNumber))
      }
    } catch { /* ignore */ } finally {
      setHistoryLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (form.center && form.loanType === "group") {
      const center = centers.find((c) => c._id === form.center)
      if (center?.branch?._id && form.branch !== center.branch._id) {
        setForm((prev) => ({ ...prev, branch: center.branch._id }))
      }
    }
  }, [form.center, form.loanType, centers])

  const calc = React.useMemo(() => {
    if (!form.loanAmount) return null
    return computeLoanBreakdown(form.loanAmount, loanConfig.defaultNoOfWeeks, loanConfig)
  }, [form.loanAmount, loanConfig])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val)

  const formatDateDMY = (val?: string | Date) => {
    if (!val) return "—"
    const d = val instanceof Date ? val : new Date(val)
    if (isNaN(d.getTime())) return "—"
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    return `${dd}-${mm}-${d.getFullYear()}`
  }

  const handleCreate = async () => {
    try {
      setSubmitting(true)
      if (form.loanType === "old") {
        if (!form.member) { toast.error("Member is required"); setSubmitting(false); return }
        if (!form.loanAmount) { toast.error("Principal amount is required"); setSubmitting(false); return }
        if (!form.totalReceived && form.totalReceived !== 0) { toast.error("Total loan amount received is required"); setSubmitting(false); return }
        if (!form.openingDate) { toast.error("Opening date is required"); setSubmitting(false); return }
        if (!form.closureDate) { toast.error("Closure date is required"); setSubmitting(false); return }
        if (new Date(form.closureDate) < new Date(form.openingDate)) { toast.error("Closure date must be on/after opening date"); setSubmitting(false); return }
      }
      const res = await fetch("/api/staff/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setDialogOpen(false)
        setForm({ loanType: "group", member: "", branch: "", center: "", group: "", loanAmount: 0, totalReceived: 0, openingDate: "", closureDate: "", remarks: "", bankName: "", bankBranchName: "" })
        fetchLoans()
      } else {
        toast.error(json.error || "Failed to create loan")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const openCloseDialog = (loan: Loan) => {
    setCloseLoan(loan)
    setCloseRemark(loan.closureRemark || "")
    setCloseDialogOpen(true)
  }

  const handleCloseLoan = async () => {
    if (!closeLoan) return
    try {
      const res = await fetch(`/api/loans/${closeLoan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed", remarks: closeRemark }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setCloseDialogOpen(false)
        setCloseLoan(null)
        setCloseRemark("")
        fetchLoans()
      } else {
        toast.error(json.error || "Failed to close loan")
      }
    } catch {
      toast.error("An error occurred")
    }
  }

  const toDateInput = (val?: string) => {
    if (!val) return ""
    const d = new Date(val)
    if (isNaN(d.getTime())) return ""
    return d.toISOString().slice(0, 10)
  }

  const openEditLoan = (loan: Loan) => {
    setEditLoan(loan)
    setEditMember(loan.member?._id || "")
    setEditAmount(loan.loanAmount || 0)
    setEditTotalReceived(loan.totalRepayment || 0)
    setEditBranch(loan.branch?._id || "")
    setEditCenter(loan.center?._id || "")
    setEditGroup(loan.group?._id || "")
    setEditBankName(loan.bankName || "")
    setEditBankBranch(loan.bankBranchName || "")
    setEditRemarks((loan as any).remarks || "")
    setEditDisbursement(toDateInput(loan.disbursementDate))
    setEditClose(toDateInput(loan.closedAt || loan.preCloseDate))
    setEditMemberSearch("")
    setEditMemberOpen(false)
    setEditPending(false)
    setEditDatesOpen(true)
    fetchMembers(undefined)
    // Check whether a change request is already awaiting admin approval
    fetch("/api/staff/edit-requests?status=pending&entityType=loan&limit=100")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const found = json.data.some((q: any) => {
            const eid = q?.editRequest?.entityId
            return String(eid?._id || eid) === String(loan._id)
          })
          setEditPending(found)
        }
      })
      .catch(() => {})
  }

  const editFilteredMembers = React.useMemo(() => {
    const q = editMemberSearch.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) =>
      `${m.firstName} ${m.lastName} ${m.memberCode}`.toLowerCase().includes(q)
    )
  }, [members, editMemberSearch])

  const editSelectedMember = React.useMemo(
    () => members.find((x) => x._id === editMember),
    [members, editMember]
  )

  const handleEditMemberSelect = (memberId: string) => {
    const m = members.find((x) => x._id === memberId)
    setEditMember(memberId)
    if (editLoan && (editLoan.loanType === "group" || editLoan.loanType === "old") && m) {
      setEditBranch((m as any).branch?._id || "")
      setEditCenter(m.center?._id || "")
      setEditGroup(m.group?._id || "")
    }
    setEditMemberSearch("")
    setEditMemberOpen(false)
  }

  const handleEditCenterSelect = (centerId: string) => {
    setEditCenter(centerId)
    const c = centers.find((x) => x._id === centerId)
    if (c?.branch?._id) setEditBranch(c.branch._id)
  }

  const handleSubmitEditRequest = async () => {
    if (!editLoan) return
    if (editPending) { toast.error("A change request for this loan is already pending approval"); return }
    if (!editMember) { toast.error("Member is required"); return }
    if (!editAmount || editAmount < 1) { toast.error("Loan amount must be greater than 0"); return }
    if (!editDisbursement) { toast.error("Disbursement date is required"); return }
    try {
      setEditSaving(true)
      const isClosed = ["closed", "preclosed"].includes(editLoan.status)
      const newValues: Record<string, string | number | null> = {}
      // Only send changed fields
      if (editMember !== (editLoan.member?._id || "")) newValues.member = editMember
      if (editAmount !== editLoan.loanAmount) newValues.loanAmount = editAmount
      if (editLoan.loanType === "old" && editTotalReceived !== editLoan.totalRepayment) {
        newValues.totalReceived = editTotalReceived
      }
      if (editBranch !== (editLoan.branch?._id || "")) newValues.branch = editBranch
      if (editCenter !== (editLoan.center?._id || "")) newValues.center = editCenter
      if (editGroup !== (editLoan.group?._id || "")) newValues.group = editGroup
      if (editBankName !== (editLoan.bankName || "")) newValues.bankName = editBankName
      if (editBankBranch !== (editLoan.bankBranchName || "")) newValues.bankBranchName = editBankBranch
      if (editRemarks !== ((editLoan as any).remarks || "")) newValues.remarks = editRemarks
      if (editDisbursement !== toDateInput(editLoan.disbursementDate)) {
        newValues.disbursementDate = new Date(editDisbursement).toISOString()
      }
      const origClose = toDateInput(editLoan.closedAt || editLoan.preCloseDate)
      if (isClosed && editClose !== origClose) {
        newValues.closedAt = editClose ? new Date(editClose).toISOString() : null
        newValues.preCloseDate = editClose ? new Date(editClose).toISOString() : null
      }
      if (Object.keys(newValues).length === 0) { toast.info("No changes to send"); return }
      const res = await fetch("/api/staff/edit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "loan", entityId: editLoan._id, newValues }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Edit request sent for admin approval")
        setEditDatesOpen(false)
        setEditLoan(null)
        setEditPending(true)
      } else {
        toast.error(json.error || "Failed to submit edit request")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">My Loans</h1>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Loan
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by loan ID, member name, code or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="disbursed">Disbursed</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="defaulted">Defaulted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member ID</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Loan Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Weekly Repayment</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Closed On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : loans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No loans found</TableCell>
                  </TableRow>
                ) : (
                  loans.map((loan) => (
                    <TableRow key={loan._id}>
                      <TableCell className="font-mono text-sm">{loan.member?.memberCode || "—"}</TableCell>
                      <TableCell>{loan.member?.firstName} {loan.member?.lastName}</TableCell>
                      <TableCell>
                        <Badge variant={loan.loanType === "bank" ? "default" : "secondary"}>
                          {loan.loanType === "bank" ? "Bank Loan" : loan.loanType === "old" ? "Old Loan" : "Group Loan"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(loan.loanAmount)}</TableCell>
                      <TableCell>{formatCurrency(loan.weeklyRepayment)}</TableCell>
                      <TableCell>{formatCurrency(loan.outstandingBalance)}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[loan.status] || "default"}>{loan.status}</Badge>
                      </TableCell>
                      <TableCell>{formatDateDMY((loan as any).disbursementDate || loan.createdAt)}</TableCell>
                      <TableCell>
                        {loan.closedAt ? (
                          formatDateDMY(loan.closedAt)
                        ) : loan.preCloseDate ? (
                          formatDateDMY(loan.preCloseDate)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEditLoan(loan)} title="Request loan edit">
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          {["active", "disbursed", "approved"].includes(loan.status) && (
                            <Button variant="ghost" size="icon-sm" onClick={() => openCloseDialog(loan)} title="Close Loan">
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
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
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchLoans(pagination.page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchLoans(pagination.page + 1)}>Next</Button>
              </div>
            </div>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Loan</DialogTitle>
                <DialogDescription>Select loan type, member, and enter loan details. Choose Old Loan to record a historical loan.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loan Type</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                    style={{ colorScheme }}
                    value={form.loanType}
                    onChange={(e) => setForm({ ...form, loanType: e.target.value as "group" | "bank" | "old", branch: "", center: "", group: "", bankName: "", bankBranchName: "" })}
                  >
                    <option value="group">Group Loan</option>
                    <option value="bank">Bank Loan</option>
                    <option value="old">Old Loan</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Member</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                    style={{ colorScheme }}
                    value={form.member}
                    onChange={(e) => {
                      const v = e.target.value
                      const m = members.find((x) => x._id === v)
                      if (v) fetchMemberHistory(v)
                      else setMemberHistory([])
                      if (form.loanType === "group" || form.loanType === "old") {
                        const centerId = m?.center?._id || form.center
                        const center = centers.find((c) => c._id === centerId)
                        setForm({
                          ...form,
                          member: v,
                          branch: center?.branch?._id || form.branch,
                          center: centerId,
                          group: m?.group?._id || form.group,
                        })
                      } else {
                        setForm({ ...form, member: v })
                      }
                    }}
                  >
                    <option value="">Select member</option>
                    {members.map((m) => <option key={m._id} value={m._id}>{m.firstName} {m.lastName} ({m.memberCode})</option>)}
                  </select>
                </div>

                {(form.loanType === "group" || form.loanType === "old") && (
                  <>
                    <div className="space-y-2">
                      <Label>Center</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                        style={{ colorScheme }}
                        value={form.center}
                        onChange={(e) => setForm({ ...form, center: e.target.value })}
                        disabled={form.loanType === "old"}
                        title={form.loanType === "old" ? "Auto-filled from member" : undefined}
                      >
                        <option value="">Select center</option>
                        {centers.map((c) => (
                          <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                        ))}
                      </select>
                      {form.loanType === "old" && (
                        <p className="text-xs text-muted-foreground">Auto-filled from member</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Group</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                        style={{ colorScheme }}
                        value={form.group}
                        onChange={(e) => setForm({ ...form, group: e.target.value })}
                        disabled={form.loanType === "old"}
                        title={form.loanType === "old" ? "Auto-filled from member" : undefined}
                      >
                        <option value="">Select group</option>
                        {groups.filter((g) => !form.center || g.center?._id === form.center).map((g) => (
                          <option key={g._id} value={g._id}>{g.name} ({g.code})</option>
                        ))}
                      </select>
                      {form.loanType === "old" && (
                        <p className="text-xs text-muted-foreground">Auto-filled from member</p>
                      )}
                    </div>
                  </>
                )}

                {form.loanType === "bank" && (
                  <>
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input
                        value={form.bankName}
                        onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Branch Name</Label>
                      <Input
                        value={form.bankBranchName}
                        onChange={(e) => setForm({ ...form, bankBranchName: e.target.value })}
                        placeholder="Enter branch name"
                      />
                    </div>
                  </>
                )}

                {form.loanType === "old" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Principal Amount</Label>
                      <Input
                        type="number"
                        value={form.loanAmount || ""}
                        onChange={(e) => setForm({ ...form, loanAmount: Number(e.target.value) })}
                        placeholder="Enter principal amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Loan Amount Received</Label>
                      <Input
                        type="number"
                        value={form.totalReceived || ""}
                        onChange={(e) => setForm({ ...form, totalReceived: Number(e.target.value) })}
                        placeholder="Enter total amount received"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Opening Date</Label>
                      <Input
                        type="date"
                        value={form.openingDate}
                        onChange={(e) => setForm({ ...form, openingDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Closure Date</Label>
                      <Input
                        type="date"
                        value={form.closureDate}
                        min={form.openingDate || undefined}
                        onChange={(e) => setForm({ ...form, closureDate: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Remarks</Label>
                      <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Remarks for this old loan..." />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Loan Amount</Label>
                      <Input
                        type="number"
                        value={form.loanAmount || ""}
                        onChange={(e) => setForm({ ...form, loanAmount: Number(e.target.value) })}
                        placeholder="Enter loan amount"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Remarks</Label>
                      <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                    </div>
                  </>
                )}
              </div>

              {form.member && (
                <div className="mt-4 rounded-lg border bg-muted/50 p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Member Loan History
                  </h4>
                  {historyLoading ? (
                    <p className="text-sm text-muted-foreground">Loading history...</p>
                  ) : memberHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No previous loans for this member.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {memberHistory.map((l) => (
                        <div key={l._id} className="rounded-md border bg-background p-3 space-y-1 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">Cycle {l.cycleNumber} · {l.loanId}</span>
                            <Badge variant={statusColors[l.status] || "default"}>{l.status}</Badge>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Amount: {formatCurrency(l.loanAmount)}</span>
                            <span>O/S: {formatCurrency(l.outstandingBalance)}</span>
                          </div>
                          {l.closureRemark && (
                            <div className="rounded bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-2 text-xs">
                              <span className="font-semibold text-amber-700 dark:text-amber-400">Closure remark: </span>
                              <span className="text-foreground">{l.closureRemark}</span>
                              {l.closedAt && (
                                <span className="text-muted-foreground"> ({formatDateDMY(l.closedAt)})</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {calc && form.loanType !== "old" && (
                <div className="mt-4 rounded-lg bg-muted p-4 space-y-2">
                  <h4 className="font-semibold text-sm">Loan Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Insurance: <span className="font-medium">{formatCurrency(calc.insuranceAmount)}</span></div>
                    <div>Processing Fee: <span className="font-medium">{formatCurrency(calc.processingFee)}</span></div>
                    <div>Interest: <span className="font-medium">{formatCurrency(calc.interestAmount)}</span></div>
                    <div>Disbursement Amount: <span className="font-medium">{formatCurrency(calc.disbursementAmount)}</span></div>
                    <div>Weekly Repayment: <span className="font-medium">{formatCurrency(calc.weeklyRepayment)}</span></div>
                    <div>Total Repayment: <span className="font-medium">{formatCurrency(calc.totalRepayment)}</span></div>
                    <div>Tenure: <span className="font-medium">{calc.noOfWeeks} weeks</span></div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleCreate}
                  disabled={submitting || !form.member || !form.loanAmount || (form.loanType === "old" && (!form.totalReceived && form.totalReceived !== 0 || !form.openingDate || !form.closureDate))}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {form.loanType === "old" ? "Record Old Loan" : "Create Loan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Close Loan</DialogTitle>
                <DialogDescription>
                  Close loan {closeLoan?.loanId} for {closeLoan?.member?.firstName} {closeLoan?.member?.lastName}.
                  The remark will be recorded and shown in this member&apos;s history for future loan decisions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Closure Remark</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground"
                    value={closeRemark}
                    onChange={(e) => setCloseRemark(e.target.value)}
                    placeholder="Why is this loan being closed? e.g. Early closure, paid fully, default, member requested..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleCloseLoan}>Confirm Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={editDatesOpen} onOpenChange={setEditDatesOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Request Loan Edit</DialogTitle>
                <DialogDescription>
                  Propose corrections for {editLoan?.loanId} ({editLoan?.member?.firstName} {editLoan?.member?.lastName}). Changes apply after admin approval.
                </DialogDescription>
              </DialogHeader>
              {editPending && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                  A change request for this loan is already pending admin approval.
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Member</Label>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Search member by name or code..."
                        value={editSelectedMember && !editMemberOpen && !editMemberSearch ? `${editSelectedMember.firstName} ${editSelectedMember.lastName} (${editSelectedMember.memberCode})` : editMemberSearch}
                        onChange={(e) => {
                          setEditMemberSearch(e.target.value)
                          setEditMemberOpen(true)
                        }}
                        onFocus={() => setEditMemberOpen(true)}
                        onBlur={() => setTimeout(() => setEditMemberOpen(false), 150)}
                        className="pl-9"
                      />
                    </div>
                    {editMemberOpen && (
                      <div className="mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover shadow-lg">
                        {editFilteredMembers.length === 0 ? (
                          <p className="p-4 text-center text-sm text-muted-foreground">No members found</p>
                        ) : (
                          editFilteredMembers.map((m) => (
                            <button
                              key={m._id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleEditMemberSelect(m._id)}
                              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground ${editMember === m._id ? "bg-accent/60 font-medium" : ""}`}
                            >
                              <span className="truncate">{m.firstName} {m.lastName} ({m.memberCode})</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{editLoan?.loanType === "old" ? "Principal Amount" : "Loan Amount"}</Label>
                  <Input
                    type="number"
                    value={editAmount || ""}
                    onChange={(e) => setEditAmount(Number(e.target.value))}
                    placeholder="Enter amount"
                  />
                </div>
                {editLoan?.loanType === "old" ? (
                  <div className="space-y-2">
                    <Label>Total Amount Received</Label>
                    <Input
                      type="number"
                      value={editTotalReceived || ""}
                      onChange={(e) => setEditTotalReceived(Number(e.target.value))}
                      placeholder="Enter total received"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Loan Date</Label>
                    <Input
                      type="date"
                      value={editDisbursement}
                      onChange={(e) => setEditDisbursement(e.target.value)}
                    />
                  </div>
                )}

                {(editLoan?.loanType === "group" || editLoan?.loanType === "old") && (
                  <>
                    <div className="space-y-2">
                      <Label>Center</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                        style={{ colorScheme }}
                        value={editCenter}
                        onChange={(e) => handleEditCenterSelect(e.target.value)}
                        disabled={editLoan?.loanType === "old"}
                        title={editLoan?.loanType === "old" ? "Auto-filled from member" : undefined}
                      >
                        <option value="">Select center</option>
                        {centers.map((c) => (
                          <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Group</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                        style={{ colorScheme }}
                        value={editGroup}
                        onChange={(e) => setEditGroup(e.target.value)}
                        disabled={editLoan?.loanType === "old"}
                        title={editLoan?.loanType === "old" ? "Auto-filled from member" : undefined}
                      >
                        <option value="">Select group</option>
                        {groups.filter((g) => !editCenter || g.center?._id === editCenter).map((g) => (
                          <option key={g._id} value={g._id}>{g.name} ({g.code})</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {editLoan?.loanType === "bank" && (
                  <>
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input
                        value={editBankName}
                        onChange={(e) => setEditBankName(e.target.value)}
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Branch Name</Label>
                      <Input
                        value={editBankBranch}
                        onChange={(e) => setEditBankBranch(e.target.value)}
                        placeholder="Enter branch name"
                      />
                    </div>
                  </>
                )}

                {editLoan?.loanType === "old" && (
                  <>
                    <div className="space-y-2">
                      <Label>Opening Date</Label>
                      <Input
                        type="date"
                        value={editDisbursement}
                        onChange={(e) => setEditDisbursement(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Closure Date</Label>
                      <Input
                        type="date"
                        value={editClose}
                        min={editDisbursement || undefined}
                        onChange={(e) => setEditClose(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {editLoan && ["closed", "preclosed"].includes(editLoan.status) && editLoan.loanType !== "old" && (
                  <div className="space-y-2">
                    <Label>Close Date</Label>
                    <Input
                      type="date"
                      value={editClose}
                      onChange={(e) => setEditClose(e.target.value)}
                    />
                    {editClose && (
                      <Button variant="ghost" size="sm" onClick={() => setEditClose("")}>
                        Clear close date
                      </Button>
                    )}
                  </div>
                )}

                <div className="col-span-2 space-y-2">
                  <Label>Remarks</Label>
                  <Input value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} placeholder="Reason for this correction..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDatesOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmitEditRequest} disabled={editSaving || editPending || !editMember || !editAmount || !editDisbursement}>
                  {editSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send for Approval
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
