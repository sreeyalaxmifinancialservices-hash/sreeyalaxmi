"use client"

import { useEffect, useState, useCallback } from "react"
import { AppSidebar } from "@/app/leader/dashboard/components/app-sidebar"
import { SiteHeader } from "@/app/leader/dashboard/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPinIcon, CalendarIcon, ClockIcon, UsersIcon } from "lucide-react"
import { toast } from "sonner"

interface Center {
  _id: string
  name: string
  code: string
  meetingDay: string
  meetingTime: string
  location: string
  status: "active" | "inactive"
  branch?: { name: string; code: string }
}

interface Member {
  _id: string
  firstName: string
  lastName: string
  memberCode: string
  phone: string
  status: string
  group?: { name: string }
}

export default function LeaderCentersPage() {
  const [center, setCenter] = useState<Center | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(true)

  const fetchCenter = useCallback(async () => {
    try {
      const res = await fetch("/api/leader/center")
      const json = await res.json()
      if (json.success) {
        setCenter(json.data)
      } else {
        toast.error(json.error || "Failed to fetch center")
      }
    } catch {
      toast.error("Failed to fetch center")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMembers = useCallback(async () => {
    if (!center?._id) return
    setMembersLoading(true)
    try {
      const res = await fetch(`/api/members?center=${center._id}&limit=100`)
      const json = await res.json()
      if (json.success) {
        setMembers(json.data)
      }
    } catch {
      // silent
    } finally {
      setMembersLoading(false)
    }
  }, [center?._id])

  useEffect(() => { fetchCenter() }, [fetchCenter])
  useEffect(() => { fetchMembers() }, [fetchMembers])

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
            <h1 className="text-3xl tracking-tight">My Center</h1>
            <p className="text-muted-foreground text-sm">View your assigned center details</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-[200px] w-full" />
                </CardContent>
              </Card>
            </div>
          ) : !center ? (
            <Card>
              <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
                No center assigned to you
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPinIcon className="size-4" />
                      Center Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Center Name</span>
                        <span className="font-semibold">{center.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Center Code</span>
                        <span className="font-medium">{center.code}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Location</span>
                        <span className="font-medium">{center.location}</span>
                      </div>
                      {center.branch && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Branch</span>
                          <span className="font-medium">{center.branch.name}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={center.status === "active" ? "default" : "secondary"}>
                          {center.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="size-4" />
                      Meeting Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Meeting Day</span>
                        <span className="font-semibold">{center.meetingDay}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Meeting Time</span>
                        <span className="font-semibold">{center.meetingTime}</span>
                      </div>
                      <div className="rounded-lg bg-muted p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <ClockIcon className="size-4" />
                          <span>Next meeting: {center.meetingDay} at {center.meetingTime}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UsersIcon className="size-4" />
                    Members in Center ({members.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Member Code</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Group</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {membersLoading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                              {Array.from({ length: 5 }).map((_, j) => (
                                <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : members.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              No members in this center
                            </TableCell>
                          </TableRow>
                        ) : (
                          members.map((m) => (
                            <TableRow key={m._id}>
                              <TableCell className="font-medium">{m.firstName} {m.lastName}</TableCell>
                              <TableCell>{m.memberCode}</TableCell>
                              <TableCell>{m.phone}</TableCell>
                              <TableCell>{m.group?.name || "-"}</TableCell>
                              <TableCell>
                                <Badge variant={m.status === "active" ? "default" : "secondary"}>
                                  {m.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
