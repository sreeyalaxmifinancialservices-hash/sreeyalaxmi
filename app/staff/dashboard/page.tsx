"use client"

import { useEffect, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import { AppSidebar } from "./components/app-sidebar"
import { SiteHeader } from "./components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPinIcon, IndianRupeeIcon, ClockIcon, CreditCardIcon, CalendarDaysIcon, CalendarRangeIcon, AlertCircleIcon } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface DashboardData {
  centersCount: number
  centers: { _id: string; name: string }[]
  totalMembers: number
  activeLoans: number
  totalLoans: number
  totalDisbursed: number
  totalCollected: number
  todayCollected: number
  weekCollected: number
  pendingCollection: number
  pendingCount: number
  recentCollections: { date: string; total: number }[]
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const BAR_COLORS = [
  "hsl(210, 80%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(35, 90%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)",
  "hsl(190, 70%, 45%)",
  "hsl(50, 85%, 50%)",
]

function buildChartData(records: { date: string; total: number }[]) {
  const now = new Date()
  const result: { name: string; amount: number }[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const next = new Date(d)
    next.setDate(d.getDate() + 1)

    let total = 0
    for (const r of records) {
      const rd = new Date(r.date)
      if (rd >= d && rd < next) total += r.total || 0
    }

    result.push({ name: `${DAY_NAMES[d.getDay()]} ${d.getDate()}`, amount: total })
  }

  return result
}

interface TooltipEntry {
  value?: number | string
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">₹{Number(payload[0].value).toLocaleString("en-IN")}</p>
    </div>
  )
}

export default function StaffDashboard() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const chartData = useMemo(
    () => buildChartData(data?.recentCollections ?? []),
    [data]
  )

  useEffect(() => {
    fetch("/api/staff/dashboard")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const kpis = [
    {
      title: "Total Collected",
      value: `₹${(data?.totalCollected ?? 0).toLocaleString()}`,
      icon: <IndianRupeeIcon className="size-4" />,
      color: "text-emerald-600",
    },
    {
      title: "Today's Collection",
      value: `₹${(data?.todayCollected ?? 0).toLocaleString()}`,
      icon: <CalendarDaysIcon className="size-4" />,
      color: "text-violet-600",
    },
    {
      title: "This Week",
      value: `₹${(data?.weekCollected ?? 0).toLocaleString()}`,
      icon: <CalendarRangeIcon className="size-4" />,
      color: "text-orange-600",
    },
    {
      title: "Pending Collection",
      value: data?.pendingCount
        ? `₹${(data?.pendingCollection ?? 0).toLocaleString()}`
        : "₹0",
      subtitle: data?.pendingCount ? `${data.pendingCount} assignment(s)` : undefined,
      icon: <AlertCircleIcon className="size-4" />,
      color: "text-rose-600",
    },
    {
      title: "Assigned Centers",
      value: data?.centersCount ?? 0,
      icon: <MapPinIcon className="size-4" />,
      color: "text-pink-600",
    },
    {
      title: "Total Members",
      value: data?.totalMembers ?? 0,
      icon: <ClockIcon className="size-4" />,
      color: "text-amber-600",
    },
    {
      title: "Active Loans",
      value: data?.activeLoans ?? 0,
      icon: <CreditCardIcon className="size-4" />,
      color: "text-blue-600",
    },
  ]

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
          <div className="space-y-1">
            <h1 className="text-3xl tracking-tight">Staff Dashboard</h1>
            <p className="text-muted-foreground text-sm">Overview of your assigned centers and activities</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    <div className="mt-2 h-8 w-20 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kpis.map((kpi) => (
                  <Card key={kpi.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                      <span className={kpi.color}>{kpi.icon}</span>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{kpi.value}</div>
                      {"subtitle" in kpi && kpi.subtitle && (
                        <p className="mt-1 text-xs text-muted-foreground">{kpi.subtitle}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Collections</CardTitle>
                  <CardDescription>Collections over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  {data?.recentCollections && data.recentCollections.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="4 4" stroke={isDark ? "#333" : "#e5e7eb"} strokeOpacity={0.5} />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tickMargin={10}
                          fontSize={12}
                          tick={{ fill: isDark ? "#999" : "#666" }}
                          interval={0}
                        />
                        <YAxis hide axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: isDark ? "#3f3f46" : "#f4f4f5", opacity: 0.4 }} />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          {chartData.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                      No collection data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
