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
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Download, Loader2, FileSpreadsheet, FileText } from "lucide-react"

type ReportType =
  | "daily-branch"
  | "weekly-repayment"
  | "disbursement"
  | "collection"
  | "member-history"
  | "center"
  | "branch-collection"
  | "center-collection"
  | "group-collection"
  | "staff-collection"
  | "outstanding"

interface Branch { _id: string; name: string }
interface Center { _id: string; name: string }
interface Staff { _id: string; firstName: string; lastName: string }

export default function ReportsPage() {
  const [reportType, setReportType] = React.useState<ReportType>("daily-branch")
  const [branchFilter, setBranchFilter] = React.useState("all")
  const [centerFilter, setCenterFilter] = React.useState("all")
  const [staffFilter, setStaffFilter] = React.useState("all")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [reportData, setReportData] = React.useState<any>(null)

  const [branches, setBranches] = React.useState<Branch[]>([])
  const [centers, setCenters] = React.useState<Center[]>([])
  const [staffList, setStaffList] = React.useState<Staff[]>([])

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

  const fetchReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ type: reportType })
      if (branchFilter !== "all") params.set("branch", branchFilter)
      if (centerFilter !== "all") params.set("center", centerFilter)
      if (staffFilter !== "all") params.set("staff", staffFilter)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)

      const res = await fetch(`/api/reports?${params}`)
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
        return ["Branch", "Total Amount", "Cash", "Online", "Collections"]
      case "weekly-repayment":
        return ["Loan #", "Member", "Amount", "Principal", "Interest", "Date"]
      case "disbursement":
        return ["Loan #", "Member", "Amount", "Branch", "Date"]
      case "collection":
        return ["Collection #", "Branch", "Center", "Staff", "Leader", "Total", "Cash", "Online", "Date", "Status"]
      case "member-history":
        return ["Member Code", "Name", "Branch", "Center", "Status", "Verified"]
      case "center":
        return ["Name", "Branch", "Leader", "Staff", "Status"]
      case "branch-collection":
        return ["Branch", "Total Amount", "Cash", "Online", "Collections"]
      case "center-collection":
        return ["Center", "Total Amount", "Cash", "Online", "Collections"]
      case "group-collection":
        return ["Group", "Center", "Total Amount", "Cash", "Online", "Collections"]
      case "staff-collection":
        return ["Staff", "Total Amount", "Cash", "Online", "Collections"]
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
        return (reportData.branchCollections || []).map((r: any) => [
          r.branchName || "—",
          Number(r.totalAmount) || 0,
          Number(r.cashAmount) || 0,
          Number(r.onlineAmount) || 0,
          r.count || 0,
        ])
      case "weekly-repayment":
        return (reportData.repayments || []).map((r: any) => [
          r.loan?.loanId || "",
          `${r.member?.firstName || ""} ${r.member?.lastName || ""}`.trim(),
          Number(r.total) || 0,
          Number(r.principal) || 0,
          (Number(r.total) || 0) - (Number(r.principal) || 0),
          r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : "",
        ])
      case "disbursement":
        return (reportData.loans || []).map((l: any) => [
          l.loanId || "",
          `${l.member?.firstName || ""} ${l.member?.lastName || ""}`.trim(),
          l.loanAmount || 0,
          l.branch?.name || "",
          l.disbursementDate ? new Date(l.disbursementDate).toLocaleDateString() : "",
        ])
      case "collection":
        return (reportData.collections || []).map((c: any) => [
          c.collectionId || "",
          c.branch?.name || "",
          c.center?.name || "",
          c.staffName || "",
          c.leader ? `${c.leader.firstName} ${c.leader.lastName}` : "—",
          Number(c.total) || 0,
          Number(c.cashAmount) || 0,
          Number(c.onlineAmount) || 0,
          c.collectionDate ? new Date(c.collectionDate).toLocaleDateString() : "",
          c.status || "",
        ])
      case "member-history":
        return (reportData.members || []).map((m: any) => [
          m.memberCode || "",
          `${m.firstName || ""} ${m.lastName || ""}`.trim(),
          m.branch?.name || "",
          m.center?.name || "",
          m.status || "",
          m.verificationStatus || "",
        ])
      case "center":
        return (reportData.centers || []).map((c: any) => [
          c.name || "",
          c.branch?.name || "",
          c.leader ? `${c.leader.firstName} ${c.leader.lastName}` : "—",
          c.staff ? `${c.staff.firstName} ${c.staff.lastName}` : "—",
          c.status || "",
        ])
      case "branch-collection":
        return (reportData.collections || []).map((r: any) => [
          r.branchName || "—",
          r.totalAmount || 0,
          r.cashAmount || 0,
          r.onlineAmount || 0,
          r.count || 0,
        ])
      case "center-collection":
        return (reportData.collections || []).map((r: any) => [
          r.centerName || "—",
          r.totalAmount || 0,
          r.cashAmount || 0,
          r.onlineAmount || 0,
          r.count || 0,
        ])
      case "group-collection":
        return (reportData.collections || []).map((r: any) => [
          r.groupName || "—",
          r.centerName || "—",
          r.totalAmount || 0,
          r.cashAmount || 0,
          r.onlineAmount || 0,
          r.count || 0,
        ])
      case "staff-collection":
        return (reportData.collections || []).map((r: any) => [
          r._id || "—",
          r.totalAmount || 0,
          r.cashAmount || 0,
          r.onlineAmount || 0,
          r.count || 0,
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
        disbursement: "Disbursement Report",
        collection: "Collection Report",
        "member-history": "Member History Report",
        center: "Center Report",
        "branch-collection": "Branch Wise Collection Report",
        "center-collection": "Center Wise Collection Report",
        "group-collection": "Group Wise Collection Report",
        "staff-collection": "Staff Wise Collection Report",
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

  const showBranchFilter = reportType === "daily-branch" || reportType === "disbursement" || reportType === "collection" || reportType === "member-history" || reportType === "branch-collection" || reportType === "center-collection" || reportType === "group-collection" || reportType === "staff-collection" || reportType === "outstanding"
  const showCenterFilter = reportType === "daily-branch" || reportType === "disbursement" || reportType === "collection" || reportType === "member-history" || reportType === "center-collection" || reportType === "group-collection" || reportType === "outstanding"
  const showStaffFilter = reportType === "collection" || reportType === "staff-collection"

  return (
      <div className="flex flex-1 flex-col gap-4">
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
              <Select value={reportType} onValueChange={(v) => { setReportType(v as ReportType); setReportData(null) }}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily-branch">Daily Branch Report</SelectItem>
                  <SelectItem value="weekly-repayment">Weekly Repayment Report</SelectItem>
                  <SelectItem value="disbursement">Disbursement Report</SelectItem>
                  <SelectItem value="collection">Collection Report</SelectItem>
                  <SelectItem value="member-history">Member History Report</SelectItem>
                  <SelectItem value="center">Center Report</SelectItem>
                  <SelectItem value="branch-collection">Branch Wise Collection</SelectItem>
                  <SelectItem value="center-collection">Center Wise Collection</SelectItem>
                  <SelectItem value="group-collection">Group Wise Collection</SelectItem>
                  <SelectItem value="staff-collection">Staff Wise Collection</SelectItem>
                  <SelectItem value="outstanding">Outstanding Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {showBranchFilter && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">Branch</Label>
                <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v ?? "")}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Branch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showCenterFilter && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">Center</Label>
                <Select value={centerFilter} onValueChange={(v) => setCenterFilter(v ?? "")}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Center" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Centers</SelectItem>
                    {centers.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showStaffFilter && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">Staff</Label>
                <Select value={staffFilter} onValueChange={(v) => setStaffFilter(v ?? "")}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Staff" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {staffList.map((s) => <SelectItem key={s._id} value={s._id}>{s.firstName} {s.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
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

                  {reportData.branchCollections?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">Branch Wise Collection</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Branch</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Cash</TableHead>
                            <TableHead>Online</TableHead>
                            <TableHead>No. of Collections</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.branchCollections.map((r: any) => (
                            <TableRow key={r._id}>
                              <TableCell className="font-medium">{r.branchName || "—"}</TableCell>
                              <TableCell>{formatCurrency(Number(r.totalAmount) || 0)}</TableCell>
                              <TableCell>{formatCurrency(Number(r.cashAmount) || 0)}</TableCell>
                              <TableCell>{formatCurrency(Number(r.onlineAmount) || 0)}</TableCell>
                              <TableCell>{r.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {reportData.loanSummary?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Loan Summary</h4>
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
                    </div>
                  )}

                  {(!reportData.branchCollections?.length && !reportData.loanSummary?.length) && (
                    <p className="text-muted-foreground text-center py-4">No data found for the selected filters.</p>
                  )}
                </div>
              )}

              {reportData.type === "weekly-repayment" && (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Weekly Repayment Report</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Collected</div>
                      <div className="text-xl font-bold">{formatCurrency(reportData.summary?.totalCollected || 0)}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Principal</div>
                      <div className="text-xl font-bold">{formatCurrency(reportData.summary?.totalPrincipal || 0)}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Interest</div>
                      <div className="text-xl font-bold">{formatCurrency(reportData.summary?.totalInterest || 0)}</div>
                    </div>
                  </div>
                  {reportData.repayments?.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Loan #</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Principal</TableHead>
                          <TableHead>Interest</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.repayments.map((r: any) => (
                          <TableRow key={r._id}>
                            <TableCell>{r.loan?.loanId || "—"}</TableCell>
                            <TableCell>{r.member?.firstName} {r.member?.lastName}</TableCell>
                            <TableCell>{formatCurrency(Number(r.total) || 0)}</TableCell>
                            <TableCell>{formatCurrency(Number(r.principal) || 0)}</TableCell>
                            <TableCell>{formatCurrency((Number(r.total) || 0) - (Number(r.principal) || 0))}</TableCell>
                            <TableCell>{new Date(r.paymentDate).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {reportData.type === "disbursement" && (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Disbursement Report</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Disbursed</div>
                      <div className="text-xl font-bold">{formatCurrency(reportData.summary?.totalDisbursed || 0)}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Loan Count</div>
                      <div className="text-xl font-bold">{reportData.summary?.count || 0}</div>
                    </div>
                  </div>
                  {reportData.loans?.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Loan #</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Branch</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.loans.map((l: any) => (
                          <TableRow key={l._id}>
                            <TableCell>{l.loanId}</TableCell>
                            <TableCell>{l.member?.firstName} {l.member?.lastName}</TableCell>
                            <TableCell>{formatCurrency(l.loanAmount)}</TableCell>
                            <TableCell>{l.branch?.name}</TableCell>
                            <TableCell>{l.disbursementDate ? new Date(l.disbursementDate).toLocaleDateString() : "—"}</TableCell>
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
                          <TableHead>Branch</TableHead>
                          <TableHead>Center</TableHead>
                          <TableHead>Staff</TableHead>
                          <TableHead>Leader</TableHead>
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
                            <TableCell>{c.branch?.name || "—"}</TableCell>
                            <TableCell>{c.center?.name || "—"}</TableCell>
                            <TableCell>{c.staffName || "—"}</TableCell>
                            <TableCell>{c.leader ? `${c.leader.firstName} ${c.leader.lastName}` : "—"}</TableCell>
                            <TableCell>{formatCurrency(Number(c.total) || 0)}</TableCell>
                            <TableCell>{formatCurrency(Number(c.cashAmount) || 0)}</TableCell>
                            <TableCell>{formatCurrency(Number(c.onlineAmount) || 0)}</TableCell>
                            <TableCell>{new Date(c.collectionDate).toLocaleDateString()}</TableCell>
                            <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {reportData.type === "member-history" && (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Member History Report</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Members</div>
                      <div className="text-xl font-bold">{reportData.summary?.total || 0}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Active</div>
                      <div className="text-xl font-bold">{reportData.summary?.active || 0}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Verified</div>
                      <div className="text-xl font-bold">{reportData.summary?.verified || 0}</div>
                    </div>
                  </div>
                  {reportData.members?.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Branch</TableHead>
                          <TableHead>Center</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Verified</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.members.map((m: any) => (
                          <TableRow key={m._id}>
                            <TableCell>{m.memberCode}</TableCell>
                            <TableCell>{m.firstName} {m.lastName}</TableCell>
                            <TableCell>{m.branch?.name}</TableCell>
                            <TableCell>{m.center?.name}</TableCell>
                            <TableCell><Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge></TableCell>
                            <TableCell><Badge variant={m.verificationStatus === "verified" ? "default" : "secondary"}>{m.verificationStatus}</Badge></TableCell>
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
                          <TableHead>Staff</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.centers.map((c: any) => (
                          <TableRow key={c._id}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell>{c.branch?.name}</TableCell>
                            <TableCell>{c.leader ? `${c.leader.firstName} ${c.leader.lastName}` : "—"}</TableCell>
                            <TableCell>{c.staff ? `${c.staff.firstName} ${c.staff.lastName}` : "—"}</TableCell>
                            <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {reportData.type === "branch-collection" && (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Branch Wise Collection Report</h3>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Collected</div>
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
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Branches</div>
                      <div className="text-xl font-bold">{reportData.summary?.totalBranches || 0}</div>
                    </div>
                  </div>
                  {reportData.collections?.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Branch</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Cash</TableHead>
                          <TableHead>Online</TableHead>
                          <TableHead>No. of Collections</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.collections.map((r: any) => (
                          <TableRow key={r._id}>
                            <TableCell className="font-medium">{r.branchName || "—"}</TableCell>
                            <TableCell>{formatCurrency(r.totalAmount)}</TableCell>
                            <TableCell>{formatCurrency(r.cashAmount)}</TableCell>
                            <TableCell>{formatCurrency(r.onlineAmount)}</TableCell>
                            <TableCell>{r.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {reportData.type === "center-collection" && (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Center Wise Collection Report</h3>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Collected</div>
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
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Centers</div>
                      <div className="text-xl font-bold">{reportData.summary?.totalCenters || 0}</div>
                    </div>
                  </div>
                  {reportData.collections?.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Center</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Cash</TableHead>
                          <TableHead>Online</TableHead>
                          <TableHead>No. of Collections</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.collections.map((r: any) => (
                          <TableRow key={r._id}>
                            <TableCell className="font-medium">{r.centerName || "—"}</TableCell>
                            <TableCell>{formatCurrency(r.totalAmount)}</TableCell>
                            <TableCell>{formatCurrency(r.cashAmount)}</TableCell>
                            <TableCell>{formatCurrency(r.onlineAmount)}</TableCell>
                            <TableCell>{r.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {reportData.type === "group-collection" && (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Group Wise Collection Report</h3>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Collected</div>
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
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Groups</div>
                      <div className="text-xl font-bold">{reportData.summary?.totalGroups || 0}</div>
                    </div>
                  </div>
                  {reportData.collections?.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Group</TableHead>
                          <TableHead>Center</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Cash</TableHead>
                          <TableHead>Online</TableHead>
                          <TableHead>No. of Collections</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.collections.map((r: any) => (
                          <TableRow key={r._id}>
                            <TableCell className="font-medium">{r.groupName || "—"}</TableCell>
                            <TableCell>{r.centerName || "—"}</TableCell>
                            <TableCell>{formatCurrency(r.totalAmount)}</TableCell>
                            <TableCell>{formatCurrency(r.cashAmount)}</TableCell>
                            <TableCell>{formatCurrency(r.onlineAmount)}</TableCell>
                            <TableCell>{r.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {reportData.type === "staff-collection" && (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Staff Wise Collection Report</h3>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Total Collected</div>
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
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-sm text-muted-foreground">Staff Members</div>
                      <div className="text-xl font-bold">{reportData.summary?.totalStaff || 0}</div>
                    </div>
                  </div>
                  {reportData.collections?.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff Name</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Cash</TableHead>
                          <TableHead>Online</TableHead>
                          <TableHead>No. of Collections</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.collections.map((r: any) => (
                          <TableRow key={r._id}>
                            <TableCell className="font-medium">{r._id || "—"}</TableCell>
                            <TableCell>{formatCurrency(r.totalAmount)}</TableCell>
                            <TableCell>{formatCurrency(r.cashAmount)}</TableCell>
                            <TableCell>{formatCurrency(r.onlineAmount)}</TableCell>
                            <TableCell>{r.count}</TableCell>
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

  )
}
