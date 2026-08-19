"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "./components/app-sidebar"
import { SiteHeader } from "./components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPinIcon, BanknoteIcon, UsersIcon, IndianRupeeIcon, ClockIcon, CalendarIcon } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface CenterData {
  _id: string
  name: string
  code: string
  meetingDay: string
  meetingTime: string
  location: string
  memberCount: number
}

interface WeeklyCollection {
  week: string
  amount: number
}

interface DisbursedLoan {
  _id: string
  loanNumber: string
  memberName: string
  loanAmount: number
  disbursedDate: string
  status: string
}

interface DashboardData {
  assignedCenter: CenterData | null
  activeLoans: number
  weeklyCollection: number
  totalMembers: number
  weeklyCollections: WeeklyCollection[]
  recentDisbursements: DisbursedLoan[]
}

export default function LeaderDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/leader/dashboard")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const kpis = [
    {
      title: "Assigned Center",
      value: data?.assignedCenter?.name || "N/A",
      icon: <MapPinIcon className="size-4" />,
      color: "text-blue-600",
    },
    {
      title: "Active Loans",
      value: data?.activeLoans ?? 0,
      icon: <BanknoteIcon className="size-4" />,
      color: "text-green-600",
    },
    {
      title: "Weekly Collection",
      value: `₹${(data?.weeklyCollection ?? 0).toLocaleString()}`,
      icon: <IndianRupeeIcon className="size-4" />,
      color: "text-emerald-600",
    },
    {
      title: "Total Members",
      value: data?.totalMembers ?? 0,
      icon: <UsersIcon className="size-4" />,
      color: "text-violet-600",
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
            <h1 className="text-3xl tracking-tight">Leader Dashboard</h1>
            <p className="text-muted-foreground text-sm">Overview of your assigned center</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
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
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="size-4" />
                      Center Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data?.assignedCenter ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Center Name</span>
                          <span className="font-medium">{data.assignedCenter.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Center Code</span>
                          <span className="font-medium">{data.assignedCenter.code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Location</span>
                          <span className="font-medium">{data.assignedCenter.location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Meeting Day</span>
                          <span className="font-medium">{data.assignedCenter.meetingDay}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Meeting Time</span>
                          <span className="font-medium">{data.assignedCenter.meetingTime}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                        No center assigned
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Collections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data?.weeklyCollections && data.weeklyCollections.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data.weeklyCollections}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip />
                           <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                        No collection data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Disbursements</CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.recentDisbursements && data.recentDisbursements.length > 0 ? (
                    <div className="space-y-3">
                      {data.recentDisbursements.map((loan) => (
                        <div key={loan._id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium">{loan.loanNumber}</p>
                            <p className="text-sm text-muted-foreground">{loan.memberName}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹{loan.loanAmount.toLocaleString()}</p>
                            <Badge variant={loan.status === "disbursed" ? "default" : "secondary"} className="text-xs">
                              {loan.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-[100px] items-center justify-center text-muted-foreground">
                      No recent disbursements
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
