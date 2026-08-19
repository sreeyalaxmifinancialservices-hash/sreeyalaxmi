"use client"

import * as React from "react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Download, Loader2, FileSpreadsheet, FileText } from "lucide-react"

type ReportType = "daily-branch" | "weekly-repayment" | "collection" | "center" | "outstanding"

interface Center { _id: string; name: string }

export default function StaffReportsPage() {
  const [reportType, setReportType] = React.useState<ReportType>("daily-branch")
  const [centerFilter, setCenterFilter] = React.useState("all")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [reportData, setReportData] = React.useState<any>(null)
  const [centers, setCenters] = React.useState<Center[]>([])

  React.useEffect(() => {
    fetch("/api/staff/centers?limit=100")
      .then((r) => r.json())
      .then((j) => { if (j.success) setCenters(j.data) })
      .catch(() => {})
  }, [])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ type: reportType })
      if (centerFilter !== "all") params.set("center", centerFilter)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)

      const res = await fetch(`/api/staff/reports?${params}`)
      const json = await res.json()
      if (json.success) {
        setReportData(json.data)
      } else {
        toast.error(json.error || "Failed to fetch report")
      }
    } catch {
      toast.error("Failed to fetch report")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val)

  const getReportHeaders = (): string[] => {
    if (!reportData) return []
    switch (reportData.type) {
      case "daily-branch":
        return ["Status", "Count", "Total Amount"]
      case "weekly-repayment":
        return ["Loan #", "Member", "Total", "Principal", "Date"]
      case "collection":
        return ["Collection #", "Total", "Cash", "Online", "Date", "Status"]
      case "center":
        return ["Name", "Branch", "Leader", "Status"]
      case "outstanding":
        return ["Center", "Branch", "Leader", "Staff", "Group", "Loan Count", "Total Outstanding"]
      default:
        return []
    }
  }

  const getReportRows = (): any[][] => {
    if (!reportData) return []
    switch (reportData.type) {
      case "daily-branch":
        return (reportData.loanSummary || []).map((s: any) => [
          s._id || "",
          s.count || 0,
          s.totalAmount || 0,
        ])
      case "weekly-repayment":
        return (reportData.repayments || []).map((r: any) => [
          r.loan?.loanId || "",
          `${r.member?.firstName || ""} ${r.member?.lastName || ""}`.trim(),
          r.total || 0,
          r.principal || 0,
          r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : "",
        ])
      case "collection":
        return (reportData.collections || []).map((c: any) => [
          c.collectionId || "",
          c.total || 0,
          c.cashAmount || 0,
          c.onlineAmount || 0,
          c.collectionDate ? new Date(c.collectionDate).toLocaleDateString() : "",
          c.status || "",
        ])
      case "center":
        return (reportData.centers || []).map((c: any) => [
          c.name || "",
          c.branch?.name || "",
          c.leader ? `${c.leader.firstName} ${c.leader.lastName}` : "—",
          c.status || "",
        ])
      case "outstanding":
        return (reportData.centerWiseData || []).map((r: any) => [
          r.centerName || "—",
          r.branchName || "—",
          r.leaderName || "—",
          r.staffName || "—",
          r.groupName || "—",
          r.loanCount || 0,
          r.totalOutstanding || 0,
        ])
      default:
        return []
    }
  }

  const handleExportExcel = async () => {
    if (!reportData) {
      toast.error("Generate a report first")
      return
    }
    try {
      const XLSX = await import("xlsx")
      const headers = getReportHeaders()
      const rows = getReportRows()
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Report")
      XLSX.writeFile(wb, `${reportType}-report.xlsx`)
      toast.success("Excel exported successfully")
    } catch {
      toast.error("Failed to export Excel")
    }
  }

  const handleExportPDF = async () => {
    if (!reportData) {
      toast.error("Generate a report first")
      return
    }
    try {
      const jsPDF = (await import("jspdf")).default
      const autoTable = (await import("jspdf-autotable")).default
      const doc = new jsPDF()
      const headers = getReportHeaders()
      const rows = getReportRows()
      const titleMap: Record<string, string> = {
        "daily-branch": "Daily Branch Report",
        "weekly-repayment": "Weekly Repayment Report",
        collection: "Collection Report",
        center: "Center Report",
        outstanding: "Outstanding Report",
      }
      doc.setFontSize(16)
      doc.text(titleMap[reportType] || "Report", 14, 22)
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
      autoTable(doc, {
        startY: 36,
        head: [headers],
        body: rows.map((row) => row.map((cell) => String(cell))),
      })
      doc.save(`${reportType}-report.pdf`)
      toast.success("PDF exported successfully")
    } catch {
      toast.error("Failed to export PDF")
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
            <h1 className="text-2xl font-bold">Reports</h1>
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

          <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Report Type</Label>
              <Select value={reportType} onValueChange={(v: string | null) => { if (v) { setReportType(v as ReportType); setReportData(null) } }}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily-branch">Daily Branch Report</SelectItem>
                  <SelectItem value="weekly-repayment">Weekly Repayment Report</SelectItem>
                  <SelectItem value="collection">Collection Report</SelectItem>
                  <SelectItem value="center">Center Report</SelectItem>
                  <SelectItem value="outstanding">Outstanding Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Center</Label>
              <Select value={centerFilter} onValueChange={(v: string | null) => setCenterFilter(v ?? "all")}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Center" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All My Centers</SelectItem>
                  {centers.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[170px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[170px]" />
            </div>
            <Button onClick={fetchReport} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Report
            </Button>
          </div>

          {loading && (
            <div className="rounded-lg border p-8">
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          )}

          {!loading && reportData && (
            <div className="rounded-lg border">
              {reportData.type === "daily-branch" && (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Daily Branch Report</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Collected</div>
                      <div className="text-xl font-bold">{formatCurrency(reportData.collectionSummary?.totalCollected || 0)}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Cash</div>
                      <div className="text-xl font-bold">{formatCurrency(reportData.collectionSummary?.cash || 0)}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Online</div>
                      <div className="text-xl font-bold">{formatCurrency(reportData.collectionSummary?.online || 0)}</div>
                    </div>
                  </div>
                  {reportData.loanSummary?.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Total Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.loanSummary.map((s: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell><Badge variant="outline">{s._id}</Badge></TableCell>
                            <TableCell>{s.count}</TableCell>
                            <TableCell>{formatCurrency(s.totalAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {reportData.type === "weekly-repayment" && (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Weekly Repayment Report</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Collected</div>
                      <div className="text-xl font-bold">{formatCurrency(reportData.summary?.totalCollected || 0)}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Principal</div>
                      <div className="text-xl font-bold">{formatCurrency(reportData.summary?.totalPrincipal || 0)}</div>
                    </div>
                  </div>
                  {reportData.repayments?.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Loan #</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Principal</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.repayments.map((r: any) => (
                          <TableRow key={r._id}>
                            <TableCell>{r.loan?.loanId}</TableCell>
                            <TableCell>{r.member?.firstName} {r.member?.lastName}</TableCell>
                            <TableCell>{formatCurrency(r.total || 0)}</TableCell>
                            <TableCell>{formatCurrency(r.principal || 0)}</TableCell>
                            <TableCell>{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : ""}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {reportData.type === "collection" && (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Collection Report</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Amount</div>
                      <div className="text-xl font-bold">{formatCurrency(reportData.summary?.totalAmount || 0)}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Cash</div>
                      <div className="text-xl font-bold">{formatCurrency(reportData.summary?.totalCash || 0)}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Online</div>
                      <div className="text-xl font-bold">{formatCurrency(reportData.summary?.totalOnline || 0)}</div>
                    </div>
                  </div>
                  {reportData.collections?.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Collection #</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Cash</TableHead>
                          <TableHead>Online</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.collections.map((c: any) => (
                          <TableRow key={c._id}>
                            <TableCell>{c.collectionId}</TableCell>
                            <TableCell>{formatCurrency(c.total || 0)}</TableCell>
                            <TableCell>{formatCurrency(c.cashAmount || 0)}</TableCell>
                            <TableCell>{formatCurrency(c.onlineAmount || 0)}</TableCell>
                            <TableCell>{c.collectionDate ? new Date(c.collectionDate).toLocaleDateString() : ""}</TableCell>
                            <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {reportData.type === "center" && (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Center Report</h3>
                  <div className="rounded-lg bg-muted p-3 mb-4">
                    <div className="text-sm text-muted-foreground">Total Centers</div>
                    <div className="text-xl font-bold">{reportData.summary?.total || 0}</div>
                  </div>
                  {reportData.centers?.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Branch</TableHead>
                          <TableHead>Leader</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.centers.map((c: any) => (
                          <TableRow key={c._id}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell>{c.branch?.name}</TableCell>
                            <TableCell>{c.leader ? `${c.leader.firstName} ${c.leader.lastName}` : "—"}</TableCell>
                            <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {reportData.type === "outstanding" && (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Center Wise Outstanding Report</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Outstanding</div>
                      <div className="text-xl font-bold">{formatCurrency(reportData.summary?.totalOutstanding || 0)}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Active Loans</div>
                      <div className="text-xl font-bold">{reportData.summary?.totalLoans || 0}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Centers</div>
                      <div className="text-xl font-bold">{reportData.summary?.totalCenters || 0}</div>
                    </div>
                  </div>
                  {reportData.centerWiseData?.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Center</TableHead>
                          <TableHead>Branch</TableHead>
                          <TableHead>Leader</TableHead>
                          <TableHead>Staff</TableHead>
                          <TableHead>Group</TableHead>
                          <TableHead>Loan Count</TableHead>
                          <TableHead>Total Outstanding</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.centerWiseData.map((r: any) => (
                          <TableRow key={r._id}>
                            <TableCell className="font-medium">{r.centerName || "—"}</TableCell>
                            <TableCell>{r.branchName || "—"}</TableCell>
                            <TableCell>{r.leaderName || "—"}</TableCell>
                            <TableCell>{r.staffName || "—"}</TableCell>
                            <TableCell>{r.groupName || "—"}</TableCell>
                            <TableCell>{r.loanCount}</TableCell>
                            <TableCell>{formatCurrency(r.totalOutstanding)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {(!reportData.centerWiseData?.length) && (
                    <p className="text-muted-foreground text-center py-4">No outstanding loans found for the selected filters.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {!loading && !reportData && (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
              Select filters and click &quot;Generate Report&quot; to view data.
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
