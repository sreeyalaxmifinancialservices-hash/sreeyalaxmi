"use client"

import * as React from "react"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Search, Loader2, FileSpreadsheet, FileText, Eye, Users } from "lucide-react"

interface LoanResult {
  _id: string
  loanId: string
  cycleNumber: number
  loanType: "group" | "bank"
  loanAmount: number
  insuranceAmount: number
  processingFee: number
  disbursementAmount: number
  noOfWeeks: number
  weeklyRepayment: number
  totalRepayment: number
  principalOutstanding: number
  outstandingBalance: number
  installmentsPaid: number
  disbursementDate?: string
  maturityDate?: string
  preCloseDate?: string
  preCloseAmount?: number
  status: string
  remarks?: string
  closureRemark?: string
  closedAt?: string
  bankName?: string
  bankBranchName?: string
  createdAt: string
  branch?: { name: string; code: string }
  center?: { name: string; code: string }
  group?: { name: string; code: string }
}

interface MemberResult {
  _id: string
  firstName: string
  lastName: string
  guardianName?: string
  memberCode: string
  phone: string
  email?: string
  aadhaar?: string
  pan?: string
  dob?: string
  gender?: string
  address?: { street: string; city: string; state: string; pincode: string }
  verificationRemarks?: string
  status: string
  verificationStatus: string
  branch?: { name: string; code: string }
  center?: { name: string; code: string }
  group?: { name: string; code: string }
  loanStats: {
    totalLoans: number
    activeLoans: number
    closedLoans: number
    defaultedLoans: number
    totalBorrowed: number
    outstandingBalance: number
    totalRepaid: number
  }
  loans: LoanResult[]
}

interface Branch { _id: string; name: string; code: string }
interface Center { _id: string; name: string; code: string }

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "secondary",
  disbursed: "default",
  active: "default",
  closed: "outline",
  preclosed: "outline",
  defaulted: "destructive",
  rejected: "destructive",
}

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : "—")
const fmtCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val || 0)

export function MemberLoanSearch({ apiBase, role }: { apiBase: string; role: "admin" | "staff" }) {
  const [search, setSearch] = React.useState("")
  const [branchFilter, setBranchFilter] = React.useState("all")
  const [centerFilter, setCenterFilter] = React.useState("all")
  const [members, setMembers] = React.useState<MemberResult[]>([])
  const [loading, setLoading] = React.useState(true)
  const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 })

  const [branches, setBranches] = React.useState<Branch[]>([])
  const [centers, setCenters] = React.useState<Center[]>([])

  const [detailOpen, setDetailOpen] = React.useState(false)
  const [selectedMember, setSelectedMember] = React.useState<MemberResult | null>(null)
  const [detailLoading, setDetailLoading] = React.useState(false)

  const [profileOpen, setProfileOpen] = React.useState(false)
  const [profileMember, setProfileMember] = React.useState<MemberResult | null>(null)
  const [profileLoading, setProfileLoading] = React.useState(false)

  React.useEffect(() => {
    const loadDropdowns = async () => {
      try {
        if (role === "admin") {
          const [bRes, cRes] = await Promise.all([
            fetch("/api/branches?limit=100&status=active"),
            fetch("/api/centers?limit=100&status=active"),
          ])
          const [bJson, cJson] = await Promise.all([bRes.json(), cRes.json()])
          if (bJson.success) setBranches(bJson.data)
          if (cJson.success) setCenters(cJson.data)
        } else {
          const res = await fetch("/api/staff/centers?limit=100")
          const json = await res.json()
          if (json.success) setCenters(json.data)
        }
      } catch { /* ignore */ }
    }
    loadDropdowns()
  }, [role])

  const fetchMembers = React.useCallback(
    async (page = 1) => {
      try {
        setLoading(true)
        const params = new URLSearchParams({ page: String(page), limit: "10" })
        if (search) params.set("search", search)
        if (role === "admin" && branchFilter !== "all") params.set("branch", branchFilter)
        if (centerFilter !== "all") params.set("center", centerFilter)

        const res = await fetch(`${apiBase}?${params}`)
        const json = await res.json()
        if (json.success) {
          setMembers(json.data)
          setPagination(json.pagination)
        } else {
          toast.error(json.error || "Failed to search members")
        }
      } catch {
        toast.error("Failed to search members")
      } finally {
        setLoading(false)
      }
    },
    [apiBase, search, branchFilter, centerFilter, role]
  )

  React.useEffect(() => {
    const t = setTimeout(() => { fetchMembers() }, 0)
    return () => clearTimeout(t)
  }, [fetchMembers])

  const handleSearch = () => { fetchMembers(1) }

  const viewMember = async (member: MemberResult) => {
    setSelectedMember(member)
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const res = await fetch(`${apiBase}?memberId=${member._id}`)
      const json = await res.json()
      if (json.success) setSelectedMember(json.data)
      else toast.error(json.error || "Failed to load member details")
    } catch {
      toast.error("Failed to load member details")
    } finally {
      setDetailLoading(false)
    }
  }

  const viewProfile = async (member: MemberResult) => {
    setProfileMember(member)
    setProfileOpen(true)
    setProfileLoading(true)
    try {
      const res = await fetch(`${apiBase}?memberId=${member._id}`)
      const json = await res.json()
      if (json.success) setProfileMember(json.data)
      else toast.error(json.error || "Failed to load member profile")
    } catch {
      toast.error("Failed to load member profile")
    } finally {
      setProfileLoading(false)
    }
  }

  const memberHeaders = ["Member Code", "Name", "Branch", "Center", "Group", "Phone", "Status", "No. of Loans", "Active", "Closed", "Defaulted", "Total Borrowed", "Outstanding"]
  const loanHeaders = ["Member Code", "Member Name", "Loan #", "Cycle", "Type", "Amount", "Disbursement Date", "Maturity Date", "Closing Date", "No. of Weeks", "Weekly Repayment", "Total Repayment", "Principal O/S", "Outstanding", "Installments Paid", "Remarks", "Closure Remark", "Status"]

  const memberRow = (m: MemberResult): (string | number)[] => [
    m.memberCode,
    `${m.firstName} ${m.lastName}`.trim(),
    m.branch?.name || "",
    m.center?.name || "",
    m.group?.name || "",
    m.phone || "",
    m.status,
    m.loanStats.totalLoans,
    m.loanStats.activeLoans,
    m.loanStats.closedLoans,
    m.loanStats.defaultedLoans,
    m.loanStats.totalBorrowed,
    m.loanStats.outstandingBalance,
  ]

  const loanRow = (m: MemberResult, l: LoanResult): (string | number)[] => [
    m.memberCode,
    `${m.firstName} ${m.lastName}`.trim(),
    l.loanId,
    l.cycleNumber,
    l.loanType === "bank" ? "Bank Loan" : "Group Loan",
    l.loanAmount,
    l.disbursementDate ? new Date(l.disbursementDate).toLocaleDateString() : "",
    l.maturityDate ? new Date(l.maturityDate).toLocaleDateString() : "",
    l.closedAt ? new Date(l.closedAt).toLocaleDateString() : l.preCloseDate ? new Date(l.preCloseDate).toLocaleDateString() : "",
    l.noOfWeeks,
    l.weeklyRepayment,
    l.totalRepayment,
    l.principalOutstanding,
    l.outstandingBalance,
    l.installmentsPaid,
    l.remarks || "",
    l.closureRemark || "",
    l.status,
  ]

  const flattenLoanRows = (list: MemberResult[]): (string | number)[][] => {
    const rows: (string | number)[][] = []
    for (const m of list) {
      if (m.loans?.length) {
        for (const l of m.loans) rows.push(loanRow(m, l))
      } else {
        rows.push(loanRow(m, {} as LoanResult))
      }
    }
    return rows
  }

  const exportMemberExcel = async (member: MemberResult) => {
    try {
      const XLSX = await import("xlsx")
      const loans = member.loans || []
      const ws = XLSX.utils.aoa_to_sheet([
        ["Member Loan Details"],
        ["Member Code", member.memberCode],
        ["Name", `${member.firstName} ${member.lastName}`.trim()],
        ["Phone", member.phone || ""],
        ["Branch", member.branch?.name || ""],
        ["Center", member.center?.name || ""],
        ["Group", member.group?.name || ""],
        ["No. of Loans", member.loanStats.totalLoans],
        ["Total Borrowed", member.loanStats.totalBorrowed],
        ["Outstanding", member.loanStats.outstandingBalance],
        [],
        loanHeaders,
        ...loans.map((l) => loanRow(member, l)),
      ])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Member Loans")
      XLSX.writeFile(wb, `${member.memberCode}-loans.xlsx`)
      toast.success("Excel exported successfully")
    } catch {
      toast.error("Failed to export Excel")
    }
  }

  const exportMemberPDF = async (member: MemberResult) => {
    try {
      const jsPDF = (await import("jspdf")).default
      const autoTable = (await import("jspdf-autotable")).default
      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text("Member Loan Details", 14, 18)
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25)
      autoTable(doc, {
        startY: 30,
        head: [["Member Code", "Name", "Phone", "Branch", "Center", "No. of Loans", "Outstanding"]],
        body: [[
          member.memberCode,
          `${member.firstName} ${member.lastName}`.trim(),
          member.phone || "—",
          member.branch?.name || "—",
          member.center?.name || "—",
          member.loanStats.totalLoans,
          `₹${(member.loanStats.outstandingBalance || 0).toLocaleString()}`,
        ]],
      })
      const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
      autoTable(doc, {
        startY: lastY + 8,
        head: [loanHeaders],
        body: (member.loans || []).map((l) => loanRow(member, l).map((cell) => String(cell))),
      })
      doc.save(`${member.memberCode}-loans.pdf`)
      toast.success("PDF exported successfully")
    } catch {
      toast.error("Failed to export PDF")
    }
  }

  const handleExportExcel = async () => {
    try {
      toast.info("Preparing export...")
      if (members.length === 0) { toast.error("No data to export"); return }
      const XLSX = await import("xlsx")
      const ws1 = XLSX.utils.aoa_to_sheet([memberHeaders, ...members.map(memberRow)])
      const ws2 = XLSX.utils.aoa_to_sheet([loanHeaders, ...flattenLoanRows(members)])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws1, "Members")
      XLSX.utils.book_append_sheet(wb, ws2, "Member Loans")
      XLSX.writeFile(wb, "member-loan-search.xlsx")
      toast.success("Excel exported successfully")
    } catch { toast.error("Failed to export Excel") }
  }

  const handleExportPDF = async () => {
    try {
      toast.info("Preparing export...")
      if (members.length === 0) { toast.error("No data to export"); return }
      const jsPDF = (await import("jspdf")).default
      const autoTable = (await import("jspdf-autotable")).default
      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text("Member Loan Search Report", 14, 22)
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
      autoTable(doc, {
        startY: 36,
        head: [memberHeaders],
        body: members.map(memberRow).map((row) => row.map((cell) => String(cell))),
      })
      const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
      autoTable(doc, {
        startY: lastY + 8,
        head: [loanHeaders],
        body: flattenLoanRows(members).map((row) => row.map((cell) => String(cell))),
      })
      doc.save("member-loan-search.pdf")
      toast.success("PDF exported successfully")
    } catch { toast.error("Failed to export PDF") }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Member & Loan Search
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, member code, phone or Aadhaar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
            className="pl-9"
          />
        </div>
        {role === "admin" && (
          <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v ?? "")}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={centerFilter} onValueChange={(v) => setCenterFilter(v ?? "")}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Center" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Centers</SelectItem>
            {centers.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={handleSearch} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Search
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Center</TableHead>
              <TableHead>No. of Loans</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Total Borrowed</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Status</TableHead>
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
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No members found. Try a different search.
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m._id}>
                  <TableCell className="font-medium">{m.memberCode}</TableCell>
                  <TableCell>{m.firstName} {m.lastName}</TableCell>
                  <TableCell>{m.branch?.name || "—"}</TableCell>
                  <TableCell>{m.center?.name || "—"}</TableCell>
                  <TableCell><Badge variant="default">{m.loanStats.totalLoans}</Badge></TableCell>
                  <TableCell>{m.loanStats.activeLoans}</TableCell>
                  <TableCell>{fmtCurrency(m.loanStats.totalBorrowed)}</TableCell>
                  <TableCell>{fmtCurrency(m.loanStats.outstandingBalance)}</TableCell>
                  <TableCell>
                    <Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => viewProfile(m)}>
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => viewMember(m)}>
                        <Users className="mr-1 h-4 w-4" />
                        View Loans
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
            Page {pagination.page} of {pagination.pages} ({pagination.total} members)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchMembers(pagination.page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchMembers(pagination.page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[60vw] sm:max-w-[60vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Loan Details — {selectedMember?.firstName} {selectedMember?.lastName} ({selectedMember?.memberCode})
            </DialogTitle>
            <DialogDescription>All loan cycles and details for this member.</DialogDescription>
          </DialogHeader>

          {detailLoading || !selectedMember ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-sm text-muted-foreground">Total Loans</div>
                  <div className="text-xl font-bold">{selectedMember.loanStats.totalLoans}</div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-sm text-muted-foreground">Active Loans</div>
                  <div className="text-xl font-bold">{selectedMember.loanStats.activeLoans}</div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-sm text-muted-foreground">Total Borrowed</div>
                  <div className="text-xl font-bold">{fmtCurrency(selectedMember.loanStats.totalBorrowed)}</div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-sm text-muted-foreground">Outstanding</div>
                  <div className="text-xl font-bold">{fmtCurrency(selectedMember.loanStats.outstandingBalance)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-muted-foreground">Branch: </span>{selectedMember.branch?.name || "—"}</div>
                <div><span className="text-muted-foreground">Center: </span>{selectedMember.center?.name || "—"}</div>
                <div><span className="text-muted-foreground">Group: </span>{selectedMember.group?.name || "—"}</div>
                <div><span className="text-muted-foreground">Phone: </span>{selectedMember.phone || "—"}</div>
              </div>

              {selectedMember.loans.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No loans taken by this member yet.</p>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cycle</TableHead>
                        <TableHead>Loan #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Disbursement</TableHead>
                        <TableHead>Maturity</TableHead>
                        <TableHead>Closing Date</TableHead>
                        <TableHead>No. of Weeks</TableHead>
                        <TableHead>Weekly Repay</TableHead>
                        <TableHead>Outstanding</TableHead>
                        <TableHead>Installments Paid</TableHead>
                        <TableHead>Closure Remark</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedMember.loans.map((loan) => (
                        <TableRow key={loan._id}>
                          <TableCell className="font-medium">{loan.cycleNumber}</TableCell>
                          <TableCell>{loan.loanId}</TableCell>
                          <TableCell>
                            <Badge variant={loan.loanType === "bank" ? "default" : "secondary"}>
                              {loan.loanType === "bank" ? "Bank" : "Group"}
                            </Badge>
                          </TableCell>
                          <TableCell>{fmtCurrency(loan.loanAmount)}</TableCell>
                          <TableCell>{fmtDate(loan.disbursementDate)}</TableCell>
                          <TableCell>{fmtDate(loan.maturityDate)}</TableCell>
                          <TableCell>{fmtDate(loan.closedAt || loan.preCloseDate)}</TableCell>
                          <TableCell>{loan.noOfWeeks}</TableCell>
                          <TableCell>{fmtCurrency(loan.weeklyRepayment)}</TableCell>
                          <TableCell>{fmtCurrency(loan.outstandingBalance)}</TableCell>
                          <TableCell>{loan.installmentsPaid} / {loan.noOfWeeks}</TableCell>
                          <TableCell>
                            {loan.closureRemark ? (
                              <span className="text-xs text-amber-700 dark:text-amber-400">{loan.closureRemark}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {loan.remarks ? (
                              <span className="text-xs">{loan.remarks}</span>
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

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => exportMemberExcel(selectedMember)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
                <Button variant="outline" onClick={() => exportMemberPDF(selectedMember)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
                <Button variant="default" onClick={() => setDetailOpen(false)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Member Profile — {profileMember?.firstName} {profileMember?.lastName} ({profileMember?.memberCode})
            </DialogTitle>
            <DialogDescription>Complete profile information for this member.</DialogDescription>
          </DialogHeader>

          {profileLoading || !profileMember ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Member Code</div>
                  <div className="font-medium">{profileMember.memberCode}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Name</div>
                  <div className="font-medium">{profileMember.firstName} {profileMember.lastName}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Guardian</div>
                  <div className="font-medium">{profileMember.guardianName || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Gender</div>
                  <div className="font-medium capitalize">{profileMember.gender || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Date of Birth</div>
                  <div className="font-medium">{fmtDate(profileMember.dob)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Phone</div>
                  <div className="font-medium">{profileMember.phone || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Email</div>
                  <div className="font-medium">{profileMember.email || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Aadhaar</div>
                  <div className="font-medium">{profileMember.aadhaar || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">PAN</div>
                  <div className="font-medium">{profileMember.pan || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="font-medium">
                    <Badge variant={profileMember.status === "active" ? "default" : "secondary"}>{profileMember.status}</Badge>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Verification</div>
                  <div className="font-medium">
                    <Badge variant={profileMember.verificationStatus === "verified" ? "default" : "secondary"}>{profileMember.verificationStatus}</Badge>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">No. of Loans</div>
                  <div className="font-medium">{profileMember.loanStats.totalLoans}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Outstanding</div>
                  <div className="font-medium">{fmtCurrency(profileMember.loanStats.outstandingBalance)}</div>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <div className="text-muted-foreground">Branch / Center / Group</div>
                <div className="font-medium">
                  {profileMember.branch?.name || "—"} · {profileMember.center?.name || "—"} · {profileMember.group?.name || "—"}
                </div>
                {profileMember.address && (
                  <>
                    <div className="text-muted-foreground">Address</div>
                    <div className="font-medium">
                      {[profileMember.address.street, profileMember.address.city, profileMember.address.state, profileMember.address.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  </>
                )}
                {profileMember.verificationRemarks && (
                  <>
                    <div className="text-muted-foreground">Verification Remarks</div>
                    <div className="font-medium">{profileMember.verificationRemarks}</div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => viewMember(profileMember)}>
                  <Users className="mr-2 h-4 w-4" />
                  View Loans
                </Button>
                <Button variant="default" onClick={() => setProfileOpen(false)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
