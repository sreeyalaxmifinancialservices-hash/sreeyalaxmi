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
import { Plus, Search, Loader2, CheckCircle, Banknote, XCircle, Eye, FileSpreadsheet, FileText, History, MessageSquarePlus, Pencil, Trash2 } from "lucide-react"
import { computeLoanBreakdown, LoanCalcConfig } from "@/lib/loan-calc"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
  const [form, setForm] = React.useState({ loanType: "group" as "group" | "bank" | "old", member: "", branch: "", center: "", group: "", loanAmount: 0, totalReceived: 0, openingDate: "", closureDate: "", remarks: "", bankName: "", bankBranchName: "" })
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

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleteLoan, setDeleteLoan] = React.useState<Loan | null>(null)
  const [deleteSaving, setDeleteSaving] = React.useState(false)

  const [memberHistory, setMemberHistory] = React.useState<Loan[]>([])
  const [historyLoading, setHistoryLoading] = React.useState(false)
  const [memberSearch, setMemberSearch] = React.useState("")
  const [memberListOpen, setMemberListOpen] = React.useState(false)
  const [membersLoading, setMembersLoading] = React.useState(false)

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
        fetch("/api/branches?limit=500&status=active"),
        fetch("/api/centers?limit=500&status=active"),
        fetch("/api/groups?limit=500&status=active"),
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

  const fetchMembers = React.useCallback(async (branchId?: string, centerId?: string, searchText?: string) => {
    try {
      setMembersLoading(true)
      const params = new URLSearchParams({ limit: "1000", status: "active" })
      if (branchId) params.set("branch", branchId)
      if (centerId) params.set("center", centerId)
      if (searchText) params.set("search", searchText)
      const res = await fetch(`/api/members?${params}`)
      const json = await res.json()
      if (json.success) setMembers(json.data)
    } catch { /* ignore */ } finally {
      setMembersLoading(false)
    }
  }, [])

  // Initial fetch when dialog opens — fetch ALL members (no branch/center filter)
  // so no member is missing from the list.
  React.useEffect(() => {
    if (dialogOpen) {
      setMemberSearch("")
      setMemberListOpen(false)
      fetchMembers(undefined, undefined, undefined)
    }
  }, [dialogOpen, fetchMembers])

  // Debounced server-side search for members (by name / code / phone).
  // NOTE: intentionally NOT filtering by branch/center here so ALL
  // members stay visible. Branch/center selects only affect the loan form.
  React.useEffect(() => {
    if (!dialogOpen) return
    const t = setTimeout(() => {
      fetchMembers(undefined, undefined, memberSearch.trim() || undefined)
    }, 400)
    return () => clearTimeout(t)
  }, [memberSearch, dialogOpen, fetchMembers])

  const filteredMembers = React.useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) =>
      `${m.firstName} ${m.lastName} ${m.memberCode}`.toLowerCase().includes(q)
    )
  }, [members, memberSearch])

  const selectedMember = React.useMemo(
    () => members.find((x) => x._id === form.member),
    [members, form.member]
  )

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

  const handleMemberSelect = React.useCallback((memberId: string) => {
    const m = members.find((x) => x._id === memberId)
    if (memberId) fetchMemberHistory(memberId)
    else setMemberHistory([])
    if (form.loanType === "group" || form.loanType === "old") {
      setForm((prev) => ({
        ...prev,
        member: memberId,
        branch: m?.branch?._id || prev.branch,
        center: m?.center?._id || prev.center,
        group: m?.group?._id || prev.group,
      }))
    } else {
      setForm((prev) => ({ ...prev, member: memberId }))
    }
    setMemberListOpen(false)
  }, [members, form.loanType, fetchMemberHistory])

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
      const payload: Record<string, unknown> = { ...form }
      if (form.loanType === "old") {
        if (!form.member) { toast.error("Member is required"); setSubmitting(false); return }
        if (!form.loanAmount) { toast.error("Principal amount is required"); setSubmitting(false); return }
        if (!form.totalReceived && form.totalReceived !== 0) { toast.error("Total loan amount received is required"); setSubmitting(false); return }
        if (!form.openingDate) { toast.error("Opening date is required"); setSubmitting(false); return }
        if (!form.closureDate) { toast.error("Closure date is required"); setSubmitting(false); return }
        if (new Date(form.closureDate) < new Date(form.openingDate)) { toast.error("Closure date must be on/after opening date"); setSubmitting(false); return }
      }
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const openDeleteDialog = (loan: Loan) => {
    setDeleteLoan(loan)
    setDeleteDialogOpen(true)
  }

  const handleDeleteLoan = async () => {
    if (!deleteLoan) return
    try {
      setDeleteSaving(true)
      const res = await fetch(`/api/loans/${deleteLoan._id}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message || "Loan deleted successfully")
        setDeleteDialogOpen(false)
        setDeleteLoan(null)
        fetchLoans()
      } else {
        toast.error(json.error || "Failed to delete loan")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setDeleteSaving(false)
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
    setEditDatesOpen(true)
    if (members.length === 0) fetchMembers(undefined, undefined, undefined)
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
      setEditBranch(m.branch?._id || "")
      setEditCenter(m.center?._id || "")
      setEditGroup(m.group?._id || "")
    }
    setEditMemberSearch("")
    setEditMemberOpen(false)
  }

  const handleUpdateLoan = async () => {
    if (!editLoan) return
    if (!editMember) { toast.error("Member is required"); return }
    if (!editAmount || editAmount < 1) { toast.error("Loan amount must be greater than 0"); return }
    if (!editDisbursement) { toast.error("Disbursement date is required"); return }
    try {
      setEditSaving(true)
      const isClosed = ["closed", "preclosed"].includes(editLoan.status)
      const body: Record<string, string | number | null> = {}
      // Only send changed fields so untouched values (e.g. computed totals) stay intact
      if (editMember !== (editLoan.member?._id || "")) body.member = editMember
      if (editAmount !== editLoan.loanAmount) body.loanAmount = editAmount
      if (editLoan.loanType === "old" && editTotalReceived !== editLoan.totalRepayment) {
        body.totalReceived = editTotalReceived
      }
      if (editBranch !== (editLoan.branch?._id || "")) body.branch = editBranch
      if (editCenter !== (editLoan.center?._id || "")) body.center = editCenter
      if (editGroup !== (editLoan.group?._id || "")) body.group = editGroup
      if (editBankName !== (editLoan.bankName || "")) body.bankName = editBankName
      if (editBankBranch !== (editLoan.bankBranchName || "")) body.bankBranchName = editBankBranch
      if (editRemarks !== ((editLoan as any).remarks || "")) body.remarks = editRemarks
      if (editDisbursement !== toDateInput(editLoan.disbursementDate)) {
        body.disbursementDate = new Date(editDisbursement).toISOString()
      }
      const origClose = toDateInput(editLoan.closedAt || editLoan.preCloseDate)
      if (isClosed && editClose !== origClose) {
        body.closedAt = editClose ? new Date(editClose).toISOString() : null
        body.preCloseDate = editClose ? new Date(editClose).toISOString() : null
      }
      if (Object.keys(body).length === 0) { toast.info("No changes to save"); return }
      const res = await fetch(`/api/loans/${editLoan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message || "Loan updated")
        setEditDatesOpen(false)
        setEditLoan(null)
        fetchLoans()
      } else {
        toast.error(json.error || "Failed to update loan")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setEditSaving(false)
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
      const headers = ["Loan #", "Member ID", "Member", "Loan Type", "Amount", "Weekly Repayment", "Outstanding", "Status", "Date"]
      const rows = allLoans.map((l) => [
        l.loanId,
        l.member?.memberCode || "",
        `${l.member?.firstName || ""} ${l.member?.lastName || ""}`.trim(),
        l.loanType === "bank" ? "Bank Loan" : l.loanType === "old" ? "Old Loan" : "Group Loan",
        l.loanAmount,
        l.weeklyRepayment,
        l.outstandingBalance,
        l.status,
                formatDateDMY(l.createdAt),
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
      doc.text(`Generated: ${formatDateDMY(new Date())}`, 14, 30)
      autoTable(doc, {
        startY: 36,
        head: [["Loan #", "Member ID", "Member", "Type", "Amount", "Weekly Repay", "Outstanding", "Status", "Date"]],
        body: allLoans.map((l) => [
          l.loanId,
          l.member?.memberCode || "",
          `${l.member?.firstName || ""} ${l.member?.lastName || ""}`.trim(),
          l.loanType === "bank" ? "Bank" : l.loanType === "old" ? "Old" : "Group",
          `₹${l.loanAmount?.toLocaleString()}`,
          `₹${l.weeklyRepayment?.toLocaleString()}`,
          `₹${l.outstandingBalance?.toLocaleString()}`,
          l.status,
                  formatDateDMY(l.createdAt),
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
                      <TableCell>{formatDateDMY(loan.disbursementDate || loan.createdAt)}</TableCell>
                      <TableCell>
                        {loan.closedAt ? (
                          formatDateDMY(loan.closedAt)
                        ) : loan.preCloseDate ? (
                          formatDateDMY(loan.preCloseDate)
                        ) : loan.status === "closed" && (loan as any).updatedAt ? (
                          formatDateDMY((loan as any).updatedAt)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                       <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEditLoan(loan)} title="Edit loan">
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
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
                          <Button variant="ghost" size="icon-sm" onClick={() => openDeleteDialog(loan)} title="Delete Loan">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setMemberSearch("")
              setMemberListOpen(false)
              setMemberHistory([])
            }
          }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader className="sticky top-0 z-10 bg-popover pb-2">
                <DialogTitle>Create New Loan</DialogTitle>
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
                <div className="col-span-2 space-y-2">
                  <Label>Member {members.length > 0 && <span className="text-muted-foreground font-normal">({filteredMembers.length} of {members.length} shown)</span>}</Label>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Search member by name or code..."
                        value={selectedMember && !memberListOpen && !memberSearch ? `${selectedMember.firstName} ${selectedMember.lastName} (${selectedMember.memberCode})` : memberSearch}
                        onChange={(e) => {
                          setMemberSearch(e.target.value)
                          setMemberListOpen(true)
                        }}
                        onFocus={() => setMemberListOpen(true)}
                        onBlur={() => setTimeout(() => setMemberListOpen(false), 150)}
                        className="pl-9 pr-9"
                      />
                      {(memberSearch || form.member) && (
                        <button
                          type="button"
                          aria-label="Clear member selection"
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setMemberSearch("")
                            setForm((prev) => ({ ...prev, member: "" }))
                            setMemberHistory([])
                            setMemberListOpen(true)
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {memberListOpen && (
                      <div className="mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover shadow-lg">
                        {membersLoading ? (
                          <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading members...
                          </div>
                        ) : filteredMembers.length === 0 ? (
                          <p className="p-4 text-center text-sm text-muted-foreground">No members found — try a different search or clear branch/center filter</p>
                        ) : (
                          filteredMembers.map((m) => {
                            const isSelected = form.member === m._id
                            return (
                              <button
                                key={m._id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  handleMemberSelect(m._id)
                                  setMemberSearch("")
                                }}
                                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground ${isSelected ? "bg-accent/60 font-medium" : ""}`}
                              >
                                <span className="truncate">{m.firstName} {m.lastName} ({m.memberCode})</span>
                                {isSelected && <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />}
                              </button>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                  {selectedMember && (
                    <p className="text-xs text-muted-foreground">
                      Selected: <span className="font-medium text-foreground">{selectedMember.firstName} {selectedMember.lastName} ({selectedMember.memberCode})</span>
                    </p>
                  )}
                </div>

                {(form.loanType === "group" || form.loanType === "old") && (
                  <>
                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                        style={{ colorScheme }}
                        value={form.branch}
                        onChange={(e) => setForm({ ...form, branch: e.target.value })}
                        disabled={form.loanType === "old"}
                        title={form.loanType === "old" ? "Auto-filled from member" : undefined}
                      >
                        <option value="">Select branch</option>
                        {branches.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
                      </select>
                      {form.loanType === "old" && (
                        <p className="text-xs text-muted-foreground">Auto-filled from member</p>
                      )}
                    </div>
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
                        {centers.filter((c) => !form.branch || c.branch?._id === form.branch).map((c) => (
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

              <DialogFooter className="sticky bottom-0 z-10">
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
                          <TableCell>{formatDateDMY(loan.disbursementDate)}</TableCell>
                          <TableCell>{formatCurrency(loan.loanAmount)}</TableCell>
                          <TableCell>{loan.noOfWeeks}</TableCell>
                          <TableCell>{formatCurrency(loan.principalOutstanding)}</TableCell>
                          <TableCell>{formatCurrency(loan.outstandingBalance)}</TableCell>
                          <TableCell>{formatDateDMY(loan.preCloseDate)}</TableCell>
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
                    <p className="font-medium">{formatDateDMY(viewLoan.createdAt)}</p>
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

          <Dialog open={editDatesOpen} onOpenChange={setEditDatesOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Loan</DialogTitle>
                <DialogDescription>
                  Correct details for {editLoan?.loanId} — member, amounts, branch mapping, dates and remarks.
                </DialogDescription>
              </DialogHeader>
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
                        {membersLoading ? (
                          <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading members...
                          </div>
                        ) : editFilteredMembers.length === 0 ? (
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
                              {editMember === m._id && <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Member and amounts cannot be changed once repayments are recorded.
                  </p>
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
                      <Label>Branch</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                        style={{ colorScheme }}
                        value={editBranch}
                        onChange={(e) => setEditBranch(e.target.value)}
                        disabled={editLoan?.loanType === "old"}
                        title={editLoan?.loanType === "old" ? "Auto-filled from member" : undefined}
                      >
                        <option value="">Select branch</option>
                        {branches.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Center</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-border dark:text-foreground dark:[&>option]:bg-background dark:[&>option]:text-foreground"
                        style={{ colorScheme }}
                        value={editCenter}
                        onChange={(e) => setEditCenter(e.target.value)}
                        disabled={editLoan?.loanType === "old"}
                        title={editLoan?.loanType === "old" ? "Auto-filled from member" : undefined}
                      >
                        <option value="">Select center</option>
                        {centers.filter((c) => !editBranch || c.branch?._id === editBranch).map((c) => (
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
                  <Input value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} placeholder="Remarks..." />
                </div>
              </div>
              {editLoan && !["closed", "preclosed"].includes(editLoan.status) && editLoan.loanType !== "old" && (
                <p className="text-xs text-muted-foreground">
                  Close date can be edited once the loan is closed. Use the close action to close this loan first.
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDatesOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateLoan} disabled={editSaving || !editMember || !editAmount || !editDisbursement}>
                  {editSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Loan</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete loan {deleteLoan?.loanId} for {deleteLoan?.member?.firstName} {deleteLoan?.member?.lastName} ({deleteLoan?.member?.memberCode})? This action cannot be undone.
                  {deleteLoan && deleteLoan.outstandingBalance > 0 && (
                    <> This loan still has an outstanding balance of {formatCurrency(deleteLoan.outstandingBalance)}.</>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteSaving}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteLoan} disabled={deleteSaving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleteSaving ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

  )
}
