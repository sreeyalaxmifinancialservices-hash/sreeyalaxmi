"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, FileSpreadsheet, FileText } from "lucide-react"

interface Repayment {
  _id: string
  repaymentId: string
  loan: { loanId: string; loanAmount: number }
  member: { firstName: string; lastName: string; memberCode: string }
  principal: number
  total: number
  noOfWeeksPaid: number
  installmentNumber: number
  paymentDate: string
  paymentMethod: string
  status: string
}

interface Loan {
  _id: string
  loanId: string
  loanAmount: number
  outstandingBalance: number
  weeklyRepayment: number
  installmentsPaid: number
  noOfWeeks: number
  member: { firstName: string; lastName: string; memberCode: string }
  status: string
}

export default function RepaymentsPage() {
  const [repayments, setRepayments] = React.useState<Repayment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [loans, setLoans] = React.useState<Loan[]>([])
  const [selectedLoan, setSelectedLoan] = React.useState<Loan | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 })

  const [form, setForm] = React.useState({
    loan: "", principal: 0, paymentMethod: "cash", paymentDate: "",
    insuranceAmount: 0, sd: 0, sbSavings: 0, dueAmount: 0, previousDue: 0,
    advanceAmount: 0, loanFees: 0, preClose: 0, noOfWeeksPaid: 1, remarks: "",
  })

  const fetchRepayments = React.useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      const res = await fetch(`/api/repayments?${params}`)
      const json = await res.json()
      if (json.success) {
        setRepayments(json.data || [])
        setPagination(json.pagination || { page: 1, pages: 1, total: 0 })
      } else {
        toast.error(json.error || "Failed to fetch repayments")
      }
    } catch {
      toast.error("Failed to fetch repayments")
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  React.useEffect(() => { fetchRepayments() }, [fetchRepayments])

  React.useEffect(() => {
    if (dialogOpen) {
      fetch("/api/loans?limit=100&status=active,disbursed")
        .then(r => r.json())
        .then(j => { if (j.success) setLoans(j.data || []) })
        .catch(() => {})
    }
  }, [dialogOpen])

  const handleLoanSelect = (loanId: string) => {
    const loan = loans.find(l => l._id === loanId)
    setSelectedLoan(loan || null)
    if (loan) {
      const weekly = loan.weeklyRepayment || Math.ceil(loan.loanAmount / loan.noOfWeeks)
      setForm(prev => ({
        ...prev,
        loan: loanId,
        principal: weekly,
        noOfWeeksPaid: loan.installmentsPaid + 1,
      }))
    }
  }

  const handleCreate = async () => {
    if (!form.loan || !form.paymentDate) {
      toast.error("Please select a loan and payment date")
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch("/api/repayments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Repayment recorded")
        setDialogOpen(false)
        setSelectedLoan(null)
        setForm({
          loan: "", principal: 0, paymentMethod: "cash", paymentDate: "",
          insuranceAmount: 0, sd: 0, sbSavings: 0, dueAmount: 0, previousDue: 0,
          advanceAmount: 0, loanFees: 0, preClose: 0, noOfWeeksPaid: 1, remarks: "",
        })
        fetchRepayments()
      } else {
        toast.error(json.error || "Failed to record repayment")
      }
    } catch {
      toast.error("Failed to record repayment")
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = repayments.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      r.repaymentId?.toLowerCase().includes(s) ||
      r.loan?.loanId?.toLowerCase().includes(s) ||
      `${r.member?.firstName} ${r.member?.lastName}`.toLowerCase().includes(s)
    )
  })

  const fetchAllRepayments = React.useCallback(async (): Promise<Repayment[]> => {
    try {
      const params = new URLSearchParams({ limit: "1000" })
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      const res = await fetch(`/api/repayments?${params}`)
      const json = await res.json()
      if (json.success) return json.data || []
      return []
    } catch { return [] }
  }, [dateFrom, dateTo])

  const applySearchFilter = (data: Repayment[]): Repayment[] => {
    if (!search) return data
    const s = search.toLowerCase()
    return data.filter(r =>
      r.repaymentId?.toLowerCase().includes(s) ||
      r.loan?.loanId?.toLowerCase().includes(s) ||
      `${r.member?.firstName} ${r.member?.lastName}`.toLowerCase().includes(s)
    )
  }

  const handleExportExcel = async () => {
    try {
      toast.info("Preparing export...")
      const all = applySearchFilter(await fetchAllRepayments())
      if (all.length === 0) { toast.error("No data to export"); return }
      const XLSX = await import("xlsx")
      const headers = ["Repayment ID", "Loan ID", "Member", "Principal", "Total", "Week Paid", "Installment", "Date", "Status"]
      const rows = all.map((r) => [
        r.repaymentId,
        r.loan?.loanId || "",
        `${r.member?.firstName || ""} ${r.member?.lastName || ""}`.trim(),
        r.principal,
        r.total,
        r.noOfWeeksPaid,
        r.installmentNumber,
        r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : "",
        r.status,
      ])
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Repayments")
      XLSX.writeFile(wb, "repayments-report.xlsx")
      toast.success("Excel exported successfully")
    } catch { toast.error("Failed to export Excel") }
  }

  const handleExportPDF = async () => {
    try {
      toast.info("Preparing export...")
      const all = applySearchFilter(await fetchAllRepayments())
      if (all.length === 0) { toast.error("No data to export"); return }
      const jsPDF = (await import("jspdf")).default
      const autoTable = (await import("jspdf-autotable")).default
      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text("Repayments Report", 14, 22)
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
      autoTable(doc, {
        startY: 36,
        head: [["Repayment ID", "Loan ID", "Member", "Principal", "Total", "Week Paid", "Installment", "Date", "Status"]],
        body: all.map((r) => [
          r.repaymentId,
          r.loan?.loanId || "",
          `${r.member?.firstName || ""} ${r.member?.lastName || ""}`.trim(),
          `₹${r.principal?.toLocaleString()}`,
          `₹${r.total?.toLocaleString()}`,
          String(r.noOfWeeksPaid),
          `#${r.installmentNumber}`,
          r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : "",
          r.status,
        ]),
      })
      doc.save("repayments-report.pdf")
      toast.success("PDF exported successfully")
    } catch { toast.error("Failed to export PDF") }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight">Repayments</h1>
          <p className="text-muted-foreground text-sm">Track and record loan repayments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 size-4" />Record Repayment</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search repayments..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Repayment ID</TableHead>
              <TableHead>Loan ID</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Principal</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Week Paid</TableHead>
              <TableHead>Installment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-[60px]" /></TableCell>
                ))}</TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No repayments found</TableCell></TableRow>
            ) : filtered.map(r => (
              <TableRow key={r._id}>
                <TableCell className="font-mono text-sm">{r.repaymentId}</TableCell>
                <TableCell className="font-mono text-sm">{r.loan?.loanId || "—"}</TableCell>
                <TableCell>{r.member?.firstName} {r.member?.lastName}</TableCell>
                <TableCell>₹{r.principal?.toLocaleString()}</TableCell>
                <TableCell>₹{r.total?.toLocaleString()}</TableCell>
                <TableCell>{r.noOfWeeksPaid}</TableCell>
                <TableCell>#{r.installmentNumber}</TableCell>
                <TableCell>{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString("en-IN") : "—"}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "completed" ? "default" : r.status === "missed" ? "destructive" : "secondary"}>
                    {r.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchRepayments(pagination.page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchRepayments(pagination.page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Record Repayment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Select Loan</Label>
              <Select value={form.loan} onValueChange={v => handleLoanSelect(v ?? "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a loan" /></SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className="min-w-[500px]">
                  {loans.map(l => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.loanId} — {l.member?.firstName} {l.member?.lastName} — ₹{l.outstandingBalance?.toLocaleString()} pending
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLoan && (
              <div className="rounded-lg border p-3 bg-muted/50 grid grid-cols-4 gap-3 text-sm">
                <div><span className="text-muted-foreground">Loan ID:</span> <span className="font-medium">{selectedLoan.loanId}</span></div>
                <div><span className="text-muted-foreground">Outstanding:</span> <span className="font-medium">₹{selectedLoan.outstandingBalance?.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Weekly Repayment:</span> <span className="font-medium">₹{selectedLoan.weeklyRepayment?.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Weeks Paid:</span> <span className="font-medium">{selectedLoan.installmentsPaid}/{selectedLoan.noOfWeeks}</span></div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Principal Amount</Label>
                <Input type="number" value={form.principal || ""} onChange={e => setForm({ ...form, principal: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Weeks Paid</Label>
                <Input type="number" value={form.noOfWeeksPaid || ""} onChange={e => setForm({ ...form, noOfWeeksPaid: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input type="date" value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm({ ...form, paymentMethod: v ?? "cash" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Insurance</Label>
                <Input type="number" value={form.insuranceAmount || ""} onChange={e => setForm({ ...form, insuranceAmount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>S.D.</Label>
                <Input type="number" value={form.sd || ""} onChange={e => setForm({ ...form, sd: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>S.B. Savings</Label>
                <Input type="number" value={form.sbSavings || ""} onChange={e => setForm({ ...form, sbSavings: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Loan Fees</Label>
                <Input type="number" value={form.loanFees || ""} onChange={e => setForm({ ...form, loanFees: Number(e.target.value) })} />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Due Amount</Label>
                <Input type="number" value={form.dueAmount || ""} onChange={e => setForm({ ...form, dueAmount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Previous Due</Label>
                <Input type="number" value={form.previousDue || ""} onChange={e => setForm({ ...form, previousDue: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Advance</Label>
                <Input type="number" value={form.advanceAmount || ""} onChange={e => setForm({ ...form, advanceAmount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Pre-Close</Label>
                <Input type="number" value={form.preClose || ""} onChange={e => setForm({ ...form, preClose: Number(e.target.value) })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
