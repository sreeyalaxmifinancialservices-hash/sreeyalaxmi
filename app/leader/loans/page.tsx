"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/app/leader/dashboard/components/app-sidebar"
import { SiteHeader } from "@/app/leader/dashboard/components/site-header"
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
import { Search, Loader2, BanknoteIcon } from "lucide-react"

interface Loan {
  _id: string
  loanNumber: string
  member: { firstName: string; lastName: string; memberCode: string }
  loanProduct: { name: string; code: string }
  loanAmount: number
  disbursementAmount: number
  weeklyRepayment: number
  outstandingBalance: number
  installmentsPaid: number
  totalInstallments: number
  status: string
  createdAt: string
  disbursedDate?: string
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

export default function LeaderLoansPage() {
  const [loans, setLoans] = React.useState<Loan[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 })

  const [disburseDialogOpen, setDisburseDialogOpen] = React.useState(false)
  const [selectedLoan, setSelectedLoan] = React.useState<Loan | null>(null)
  const [disburseAmount, setDisburseAmount] = React.useState(0)
  const [submitting, setSubmitting] = React.useState(false)

  const fetchLoans = React.useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "10")
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/leader/loans?${params}`)
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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val)

  const openDisburse = (loan: Loan) => {
    setSelectedLoan(loan)
    setDisburseAmount(loan.disbursementAmount)
    setDisburseDialogOpen(true)
  }

  const handleDisburse = async () => {
    if (!selectedLoan) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/leader/loans/${selectedLoan._id}/disburse`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: disburseAmount }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message || "Disbursement recorded")
        setDisburseDialogOpen(false)
        fetchLoans(pagination.page)
      } else {
        toast.error(json.error || "Failed to record disbursement")
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
              <h1 className="text-2xl font-bold">Loans</h1>
              <p className="text-muted-foreground text-sm">View and track loan disbursements for your center</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by loan number or member..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan #</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Weekly Repayment</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Paid/Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
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
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No loans found
                    </TableCell>
                  </TableRow>
                ) : (
                  loans.map((loan) => (
                    <TableRow key={loan._id}>
                      <TableCell className="font-medium">{loan.loanNumber}</TableCell>
                      <TableCell>{loan.member?.firstName} {loan.member?.lastName}</TableCell>
                      <TableCell>{loan.loanProduct?.name}</TableCell>
                      <TableCell>{formatCurrency(loan.loanAmount)}</TableCell>
                      <TableCell>{formatCurrency(loan.weeklyRepayment)}</TableCell>
                      <TableCell>{formatCurrency(loan.outstandingBalance)}</TableCell>
                      <TableCell>{loan.installmentsPaid}/{loan.totalInstallments}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[loan.status] || "default"}>{loan.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(loan.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {loan.status === "approved" && (
                            <Button variant="ghost" size="icon-sm" onClick={() => openDisburse(loan)} title="Record Disbursement">
                              <BanknoteIcon className="h-4 w-4 text-blue-600" />
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

          <Dialog open={disburseDialogOpen} onOpenChange={setDisburseDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Record Loan Disbursement</DialogTitle>
                <DialogDescription>
                  Confirm the disbursement for {selectedLoan?.loanNumber}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {selectedLoan && (
                  <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member</span>
                      <span className="font-medium">{selectedLoan.member?.firstName} {selectedLoan.member?.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Loan Amount</span>
                      <span className="font-medium">{formatCurrency(selectedLoan.loanAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Disbursement Amount</span>
                      <span className="font-medium">{formatCurrency(selectedLoan.disbursementAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weekly Repayment</span>
                      <span className="font-medium">{formatCurrency(selectedLoan.weeklyRepayment)}</span>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Amount to Disburse</Label>
                  <Input
                    type="number"
                    value={disburseAmount || ""}
                    onChange={(e) => setDisburseAmount(Number(e.target.value))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDisburseDialogOpen(false)} disabled={submitting}>Cancel</Button>
                <Button onClick={handleDisburse} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Disbursement
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
