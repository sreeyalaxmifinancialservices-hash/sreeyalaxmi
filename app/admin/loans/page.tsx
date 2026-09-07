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
import { Plus, Search, Loader2, CheckCircle, Banknote, XCircle, Eye, FileSpreadsheet, FileText, History, MessageSquarePlus } from "lucide-react"
import { computeLoanBreakdown, LoanCalcConfig } from "@/lib/loan-calc"

interface Loan {
  _id: string
  loanId: string
  cycleNumber: number
  loanType: "group" | "bank"
  member: { _id: string; firstName: string; lastName: string; memberCode: string }
  branch: { name: string; code: string }
  center: { name: string; code: string }
  group: { name: string; code: string }
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
  totalInstallments: number
  disbursementDate: string
  preCloseDate?: string
  status: string
  closureRemark?: string
  closedAt?: string
  updatedAt?: string
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

interface Branch {
  _id: string
  name: string
  code: string
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

export default function LoansPage() {
  const { resolvedTheme } = useTheme()
  const colorScheme = resolvedTheme === "dark" ? "dark" : "light"
  const [loans, setLoans] = React.useState<Loan[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [branchFilter, setBranchFilter] = React.useState("all")
  const [centerFilter, setCenterFilter] = React.useState("all")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState({ loanType: "group" as "group" | "bank", member: "", branch: "", center: "", group: "", loanAmount: 0, remarks: "", bankName: "", bankBranchName: "" })
  const [submitting, setSubmitting] = React.useState(false)
  const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 })

  const [members, setMembers] = React.useState<Member[]>([])
  const [branches, setBranches] = React.useState<Branch[]>([])
  const [centers, setCenters] = React.useState<Center[]>([])
  const [groups, setGroups] = React.useState<Group[]>([])

  const [cyclesOpen, setCyclesOpen] = React.useState(false)
  const [cycleLoans, setCycleLoans] = React.useState<Loan[]>([])
  const [cycleLoading, setCycleLoading] = React.useState(false)
  const [cycleMemberName, setCycleMemberName] = React.useState("")
  const [viewLoan, setViewLoan] = React.useState<Loan | null>(null)

  const [closeDialogOpen, setCloseDialogOpen] = React.useState(false)
  const [closeLoan, setCloseLoan] = React.useState<Loan | null>(null)
  const [closeRemark, setCloseRemark] = React.useState("")

  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
  const [rejectLoan, setRejectLoan] = React.useState<Loan | null>(null)
  const [rejectRemark, setRejectRemark] = React.useState("")

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
      if (branchFilter !== "all") params.set("branch", branchFilter)
      if (centerFilter !== "all") params.set("center", centerFilter)

      const res = await fetch(`/api/loans?${params}`)
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
  }, [search, statusFilter, branchFilter, centerFilter])

  React.useEffect(() => { fetchLoans() }, [fetchLoans])

  const fetchDropdowns = React.useCallback(async () => {
    try {
      const [bRes, cRes, gRes] = await Promise.all([
        fetch("/api/branches?limit=100&status=active"),
        fetch("/api/centers?limit=100&status=active"),
        fetch("/api/groups?limit=100&status=active"),
      ])
      const [bJson, cJson, gJson] = await Promise.all([
        bRes.json(), cRes.json(), gRes.json(),
      ])
      if (bJson.success) setBranches(bJson.data)
      if (cJson.success) setCenters(cJson.data)
      if (gJson.success) setGroups(gJson.data)
    } catch { /* ignore */ }
  }, [])

  React.useEffect(() => {
    fetchDropdowns()
    fetchLoanConfig()
  }, [fetchDropdowns, fetchLoanConfig])

  const fetchMembers = React.useCallback(async (branchId?: string, centerId?: string) => {
    try {
      const params = new URLSearchParams({ limit: "100", status: "active" })
      if (branchId) params.set("branch", branchId)
      if (centerId) params.set("center", centerId)
      const res = await fetch(`/api/members?${params}`)
      const json = await res.json()
      if (json.success) setMembers(json.data)
    } catch { /* ignore */ }
  }, [])

  React.useEffect(() => {
    if (dialogOpen) fetchMembers(form.branch || undefined, form.center || undefined)
  }, [dialogOpen, form.branch, form.center, fetchMembers])

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

  const calc = React.useMemo(() => {
    if (!form.loanAmount) return null
    return computeLoanBreakdown(form.loanAmount, loanConfig.defaultNoOfWeeks, loanConfig)
  }, [form.loanAmount, loanConfig])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val)

  const handleCreate = async () => {
    try {
      setSubmitting(true)
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setDialogOpen(false)
        setForm({ loanType: "group", member: "", branch: "", center: "", group: "", loanAmount: 0, remarks: "", bankName: "", bankBranchName: "" })
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

  const fetchCycles = async (memberId: string, memberName: string) => {
    setCycleLoading(true)
    setCycleMemberName(memberName)
    setCyclesOpen(true)
    try {
      const res = await fetch(`/api/loans?member=${memberId}&limit=100`)
      const json = await res.json()
      if (json.success) {
        setCycleLoans(json.data.sort((a: Loan, b: Loan) => a.cycleNumber - b.cycleNumber))
      } else {
        toast.error("Failed to fetch cycles")
      }
    } catch {
      toast.error("Failed to fetch cycles")
    } finally {
      setCycleLoading(false)
    }
  }

  const handleAction = async (loanId: string, action: string, remarks?: string) => {
    try {
      const res = await fetch(`/api/loans/${loanId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, remarks }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        fetchLoans()
      } else {
        toast.error(json.error || "Action failed")
      }
    } catch {
      toast.error("An error occurred")
    }
  }

  const openCloseDialog = (loan: Loan) => {
    setCloseLoan(loan)
    const isAutoRemark = loan.closureRemark === "Auto-closed on full repayment"
    setCloseRemark(isAutoRemark ? "" : loan.closureRemark || "")
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

  const openRejectDialog = (loan: Loan) => {
    setRejectLoan(loan)
    setRejectRemark("")
    setRejectDialogOpen(true)
  }

  const handleRejectLoan = async () => {
    if (!rejectLoan) return
    try {
      const res = await fetch(`/api/loans/${rejectLoan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", remarks: rejectRemark }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setRejectDialogOpen(false)
        setRejectLoan(null)
        setRejectRemark("")
        fetchLoans()
      } else {
        toast.error(json.error || "Failed to reject loan")
      }
    } catch {
      toast.error("An error occurred")
    }
  }

  const fetchAllLoans = React.useCallback(async (): Promise<Loan[]> => {
    try {
      const params = new URLSearchParams()
      params.set("limit", "1000")
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (branchFilter !== "all") params.set("branch", branchFilter)
      if (centerFilter !== "all") params.set("center", centerFilter)
      const res = await fetch(`/api/loans?${params}`)
      const json = await res.json()
      if (json.success) return json.data
      return []
    } catch {
      return []
    }
  }, [search, statusFilter, branchFilter, centerFilter])

  const handleExportExcel = async () => {
    try {
      toast.info("Preparing export...")
      const allLoans = await fetchAllLoans()
      if (allLoans.length === 0) { toast.error("No data to export"); return }
      const XLSX = await import("xlsx")
      const headers = ["Loan #", "Member", "Loan Type", "Amount", "Weekly Repayment", "Outstanding", "Status", "Date"]
      const rows = allLoans.map((l) => [
        l.loanId,
        `${l.member?.firstName || ""} ${l.member?.lastName || ""}`.trim(),
        l.loanType === "bank" ? "Bank Loan" : "Group Loan",
        l.loanAmount,
        l.weeklyRepayment,
        l.outstandingBalance,
        l.status,
        new Date(l.createdAt).toLocaleDateString(),
      ])
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Loans")
      XLSX.writeFile(wb, "loans-report.xlsx")
      toast.success("Excel exported successfully")
    } catch { toast.error("Failed to export Excel") }
  }

  const handleExportPDF = async () => {
    try {
      toast.info("Preparing export...")
      const allLoans = await fetchAllLoans()
      if (allLoans.length === 0) { toast.error("No data to export"); return }
      const jsPDF = (await import("jspdf")).default
      const autoTable = (await import("jspdf-autotable")).default
      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text("Loans Report", 14, 22)
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
      autoTable(doc, {
        startY: 36,
        head: [["Loan #", "Member", "Type", "Amount", "Weekly Repay", "Outstanding", "Status", "Date"]],
        body: allLoans.map((l) => [
          l.loanId,
          `${l.member?.firstName || ""} ${l.member?.lastName || ""}`.trim(),
          l.loanType === "bank" ? "Bank" : "Group",
          `₹${l.loanAmount?.toLocaleString()}`,
          `₹${l.weeklyRepayment?.toLocaleString()}`,
          `₹${l.outstandingBalance?.toLocaleString()}`,
          l.status,
          new Date(l.createdAt).toLocaleDateString(),
        ]),
      })
      doc.save("loans-report.pdf")
      toast.success("PDF exported successfully")
    } catch { toast.error("Failed to export PDF") }
  }

  return (
      <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Loans</h1>
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
                New Loan
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by loan number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
            <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v ?? "")}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Branch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={centerFilter} onValueChange={(v) => setCenterFilter(v ?? "")}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Center" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Centers</SelectItem>
                {centers.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan #</TableHead>
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
                      <TableCell className="font-medium">{loan.loanId}</TableCell>
                      <TableCell>{loan.member?.firstName} {loan.member?.lastName}</TableCell>
                      <TableCell>
                        <Badge variant={loan.loanType === "bank" ? "default" : "secondary"}>
                          {loan.loanType === "bank" ? "Bank Loan" : "Group Loan"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(loan.loanAmount)}</TableCell>
                      <TableCell>{formatCurrency(loan.weeklyRepayment)}</TableCell>
                      <TableCell>{formatCurrency(loan.outstandingBalance)}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[loan.status] || "default"}>{loan.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(loan.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {loan.closedAt ? (
                          new Date(loan.closedAt).toLocaleDateString()
                        ) : loan.preCloseDate ? (
                          new Date(loan.preCloseDate).toLocaleDateString()
                        ) : loan.status === "closed" && (loan as any).updatedAt ? (
                          new Date((loan as any).updatedAt).toLocaleDateString()
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                       <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => fetchCycles(loan.member?._id || "", `${loan.member?.firstName} ${loan.member?.lastName}`)} title="View Cycles">
                            Cycles
                          </Button>
                          {loan.loanType === "bank" && (
                            <Button variant="outline" size="sm" onClick={() => setViewLoan(loan)} title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {loan.status === "pending" && (
                            <Button variant="ghost" size="icon-sm" onClick={() => handleAction(loan._id, "approved")} title="Approve">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {loan.status === "pending" && (
                            <Button variant="ghost" size="icon-sm" onClick={() => openRejectDialog(loan)} title="Reject">
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                          {loan.status === "approved" && (
                            <Button variant="ghost" size="icon-sm" onClick={() => handleAction(loan._id, "disbursed")} title="Disburse">
                              <Banknote className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          {loan.status === "disbursed" && loan.outstandingBalance > 0 && (
                            <Button variant="ghost" size="icon-sm" onClick={() => handleAction(loan._id, "active")} title="Activate">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {["active", "disbursed", "approved"].includes(loan.status) && (
                            <Button variant="ghost" size="icon-sm" onClick={() => openCloseDialog(loan)} title="Close Loan">
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                          {loan.status === "closed" && (
                            <Button
                              variant={loan.closureRemark && loan.closureRemark !== "Auto-closed on full repayment" ? "outline" : "default"}
                              size="sm"
                              onClick={() => openCloseDialog(loan)}
                              title={loan.closureRemark && loan.closureRemark !== "Auto-closed on full repayment" ? "Edit Remark" : "Add Remark"}
                            >
                              <MessageSquarePlus className="h-4 w-4 mr-1" />
                              {loan.closureRemark && loan.closureRemark !== "Auto-closed on full repayment" ? "Edit" : "Add Remark"}
                            </Button>
                          )}
                          {loan.closureRemark && loan.closureRemark !== "Auto-closed on full repayment" && (
                            <Button variant="outline" size="sm" onClick={() => fetchCycles(loan.member?._id || "", `${loan.member?.firstName} ${loan.member?.lastName}`)} title="View Closure Remark">
                              <History className="h-4 w-4" />
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
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Loan</DialogTitle>
                <DialogDescription>Select loan type, member, and enter loan amount.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loan Type</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                    style={{ colorScheme }}
                    value={form.loanType}
                    onChange={(e) => setForm({ ...form, loanType: e.target.value as "group" | "bank", branch: "", center: "", group: "", bankName: "", bankBranchName: "" })}
                  >
                    <option value="group">Group Loan</option>
                    <option value="bank">Bank Loan</option>
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
                      if (form.loanType === "group") {
                        setForm({
                          ...form,
                          member: v,
                          branch: m?.branch?._id || form.branch,
                          center: m?.center?._id || form.center,
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

                {form.loanType === "group" && (
                  <>
                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                        style={{ colorScheme }}
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
                        value={form.center}
                        onChange={(e) => setForm({ ...form, center: e.target.value })}
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
                        value={form.group}
                        onChange={(e) => setForm({ ...form, group: e.target.value })}
                      >
                        <option value="">Select group</option>
                        {groups.filter((g) => !form.center || g.center?._id === form.center).map((g) => (
                          <option key={g._id} value={g._id}>{g.name} ({g.code})</option>
                        ))}
                      </select>
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
                                <span className="text-muted-foreground"> ({new Date(l.closedAt).toLocaleDateString()})</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {calc && (
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
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Loan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={cyclesOpen} onOpenChange={setCyclesOpen}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Loan Cycles — {cycleMemberName}</DialogTitle>
                <DialogDescription>All loan cycles for this member.</DialogDescription>
              </DialogHeader>
              {cycleLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : cycleLoans.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No loans found for this member.</p>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cycle No.</TableHead>
                        <TableHead>Loan #</TableHead>
                        <TableHead>Disbursement Date</TableHead>
                        <TableHead>Loan Amount</TableHead>
                        <TableHead>No. of Weeks</TableHead>
                        <TableHead>Principal O/S</TableHead>
                        <TableHead>Loan O/S Amount</TableHead>
                        <TableHead>Pre-Close Date</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Closure Remark</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cycleLoans.map((loan) => (
                        <TableRow key={loan._id}>
                          <TableCell className="font-medium">{loan.cycleNumber}</TableCell>
                          <TableCell>{loan.loanId}</TableCell>
                          <TableCell>{loan.disbursementDate ? new Date(loan.disbursementDate).toLocaleDateString() : "—"}</TableCell>
                          <TableCell>{formatCurrency(loan.loanAmount)}</TableCell>
                          <TableCell>{loan.noOfWeeks}</TableCell>
                          <TableCell>{formatCurrency(loan.principalOutstanding)}</TableCell>
                          <TableCell>{formatCurrency(loan.outstandingBalance)}</TableCell>
                          <TableCell>{loan.preCloseDate ? new Date(loan.preCloseDate).toLocaleDateString() : "—"}</TableCell>
                          <TableCell>{formatCurrency(loan.totalRepayment)}</TableCell>
                          <TableCell>
                            {loan.closureRemark ? (
                              <span className="text-xs text-amber-700 dark:text-amber-400">{loan.closureRemark}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusColors[loan.status] || "default"}>{loan.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={!!viewLoan} onOpenChange={(open) => { if (!open) setViewLoan(null) }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Loan Details</DialogTitle>
                <DialogDescription>Bank loan information for {viewLoan?.loanId}</DialogDescription>
              </DialogHeader>
              {viewLoan && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Loan #</p>
                    <p className="font-medium">{viewLoan.loanId}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant={statusColors[viewLoan.status] || "default"}>{viewLoan.status}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Member</p>
                    <p className="font-medium">{viewLoan.member?.firstName} {viewLoan.member?.lastName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Member Code</p>
                    <p className="font-medium">{viewLoan.member?.memberCode}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Bank Name</p>
                    <p className="font-medium">{viewLoan.bankName || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Bank Branch</p>
                    <p className="font-medium">{viewLoan.bankBranchName || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Loan Amount</p>
                    <p className="font-medium">{formatCurrency(viewLoan.loanAmount)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Weekly Repayment</p>
                    <p className="font-medium">{formatCurrency(viewLoan.weeklyRepayment)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Outstanding</p>
                    <p className="font-medium">{formatCurrency(viewLoan.outstandingBalance)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Disbursement Amount</p>
                    <p className="font-medium">{formatCurrency(viewLoan.disbursementAmount)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">No. of Weeks</p>
                    <p className="font-medium">{viewLoan.noOfWeeks}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date(viewLoan.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewLoan(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{closeLoan?.status === "closed" ? (closeLoan?.closureRemark && closeLoan.closureRemark !== "Auto-closed on full repayment" ? "Update Closure Remark" : "Add Closure Remark") : "Close Loan"}</DialogTitle>
                <DialogDescription>
                  {closeLoan?.status === "closed" ? (
                    <>
                      Add or update remark for auto-closed loan {closeLoan?.loanId} for {closeLoan?.member?.firstName} {closeLoan?.member?.lastName}.
                      This will be shown in member history.
                    </>
                  ) : (
                    <>
                      Close loan {closeLoan?.loanId} for {closeLoan?.member?.firstName} {closeLoan?.member?.lastName}.
                      The remark will be recorded and shown in this member&apos;s history for future loan decisions.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Closure Remark</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground"
                    value={closeRemark}
                    onChange={(e) => setCloseRemark(e.target.value)}
                    placeholder={closeLoan?.status === "closed" ? "Enter remark for this auto-closed loan..." : "Why is this loan being closed? e.g. Early closure, paid fully, default, member requested..."}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
                <Button variant={closeLoan?.status === "closed" ? "default" : "destructive"} onClick={handleCloseLoan}>
                  {closeLoan?.status === "closed" ? "Save Remark" : "Confirm Close"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Reject Loan</DialogTitle>
                <DialogDescription>
                  Reject loan {rejectLoan?.loanId} for {rejectLoan?.member?.firstName} {rejectLoan?.member?.lastName}.
                  The remark will be recorded and shown in this member&apos;s history for future loan decisions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Rejection Reason</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground"
                    value={rejectRemark}
                    onChange={(e) => setRejectRemark(e.target.value)}
                    placeholder="Why is this loan being rejected? e.g. Incomplete documents, member not eligible, policy violation..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleRejectLoan}>Confirm Reject</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

  )
}
