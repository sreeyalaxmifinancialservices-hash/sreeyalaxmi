"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/app/leader/dashboard/components/app-sidebar"
import { SiteHeader } from "@/app/leader/dashboard/components/site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Search, Loader2, ScrollTextIcon, IndianRupeeIcon } from "lucide-react"

interface Repayment {
  _id: string
  repaymentNumber: string
  loan: { loanNumber: string; loanAmount: number }
  member: { firstName: string; lastName: string; memberCode: string }
  amount: number
  installmentNumber: number
  paymentDate: string
  paymentMethod: string
  status: string
  createdAt: string
}

interface Loan {
  _id: string
  loanNumber: string
  loanAmount: number
  outstandingBalance: number
  weeklyRepayment: number
  installmentsPaid: number
  totalInstallments: number
  member: { firstName: string; lastName: string; memberCode: string }
  status: string
}

export default function LeaderRepaymentsPage() {
  const [repayments, setRepayments] = React.useState<Repayment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")
  const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [loans, setLoans] = React.useState<Loan[]>([])
  const [form, setForm] = React.useState({ loan: "", amount: 0, paymentMethod: "cash", paymentDate: "", remarks: "" })
  const [submitting, setSubmitting] = React.useState(false)
  const [selectedLoan, setSelectedLoan] = React.useState<Loan | null>(null)

  const [weeklySummary, setWeeklySummary] = React.useState({ collected: 0, pending: 0, totalExpected: 0 })

  const fetchRepayments = React.useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "10")
      if (search) params.set("search", search)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)

      const res = await fetch(`/api/leader/repayments?${params}`)
      const json = await res.json()
      if (json.success) {
        setRepayments(json.data)
        setPagination(json.pagination)
        if (json.weeklySummary) setWeeklySummary(json.weeklySummary)
      } else {
        toast.error(json.error || "Failed to fetch repayments")
      }
    } catch {
      toast.error("Failed to fetch repayments")
    } finally {
      setLoading(false)
    }
  }, [search, dateFrom, dateTo])

  React.useEffect(() => { fetchRepayments() }, [fetchRepayments])

  React.useEffect(() => {
    if (dialogOpen) {
      fetch("/api/leader/loans?status=active,disbursed&limit=100")
        .then((r) => r.json())
        .then((j) => { if (j.success) setLoans(j.data) })
        .catch(() => {})
    }
  }, [dialogOpen])

  React.useEffect(() => {
    const loan = loans.find((l) => l._id === form.loan)
    setSelectedLoan(loan || null)
  }, [form.loan, loans])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val)

  const handleRecordCollection = async () => {
    try {
      setSubmitting(true)
      const res = await fetch("/api/leader/repayments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message || "Collection recorded")
        setDialogOpen(false)
        setForm({ loan: "", amount: 0, paymentMethod: "cash", paymentDate: "", remarks: "" })
        fetchRepayments(pagination.page)
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Repayments</h1>
              <p className="text-muted-foreground text-sm">View and record weekly collections for your center</p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Record Collection
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collected This Week</CardTitle>
                <IndianRupeeIcon className="size-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(weeklySummary.collected)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending This Week</CardTitle>
                <ScrollTextIcon className="size-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(weeklySummary.pending)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expected</CardTitle>
                <IndianRupeeIcon className="size-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(weeklySummary.totalExpected)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by loan number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[170px]" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[170px]" />
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repayment #</TableHead>
                  <TableHead>Loan #</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Installment</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : repayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No repayments found
                    </TableCell>
                  </TableRow>
                ) : (
                  repayments.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium">{r.repaymentNumber}</TableCell>
                      <TableCell>{r.loan?.loanNumber}</TableCell>
                      <TableCell>{r.member?.firstName} {r.member?.lastName}</TableCell>
                      <TableCell>{formatCurrency(r.amount)}</TableCell>
                      <TableCell>{r.installmentNumber}</TableCell>
                      <TableCell className="capitalize">{r.paymentMethod}</TableCell>
                      <TableCell>{new Date(r.paymentDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "completed" ? "default" : r.status === "missed" ? "destructive" : "secondary"}>{r.status}</Badge>
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
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchRepayments(pagination.page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchRepayments(pagination.page + 1)}>Next</Button>
              </div>
            </div>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Record Weekly Collection</DialogTitle>
                <DialogDescription>Select a loan and enter the payment amount.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Loan</Label>
                   <Select value={form.loan || ""} onValueChange={(v) => setForm({ ...form, loan: v ?? "" })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select loan" /></SelectTrigger>
                    <SelectContent>
                      {loans.map((l) => (
                        <SelectItem key={l._id} value={l._id}>
                          {l.loanNumber} - {l.member?.firstName} {l.member?.lastName} (Balance: {formatCurrency(l.outstandingBalance)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedLoan && (
                  <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                    <div>Loan Amount: <span className="font-medium">{formatCurrency(selectedLoan.loanAmount)}</span></div>
                    <div>Outstanding: <span className="font-medium">{formatCurrency(selectedLoan.outstandingBalance)}</span></div>
                    <div>Weekly Repayment: <span className="font-medium">{formatCurrency(selectedLoan.weeklyRepayment)}</span></div>
                    <div>Installments: <span className="font-medium">{selectedLoan.installmentsPaid}/{selectedLoan.totalInstallments}</span></div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                     <Select value={form.paymentMethod || ""} onValueChange={(v) => setForm({ ...form, paymentMethod: v ?? "" })}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
                <Button onClick={handleRecordCollection} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
