"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { NavMain } from "@/app/admin/dashboard/components/nav-main"
import { NavSecondary } from "@/app/admin/dashboard/components/nav-secondary"
import { NavUser } from "@/app/admin/dashboard/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  MapPinIcon,
  UserCogIcon,
  CreditCardIcon,
  ClipboardListIcon,
  BarChart3Icon,
  CommandIcon,
  LandmarkIcon,
  ClipboardCheckIcon,
  PencilIcon,
  UsersIcon,
  SearchIcon,
} from "lucide-react"
import { useNotificationCounts } from "@/hooks/use-notification-counts"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = React.useState({ name: "Staff", email: "", avatar: "/avatars/shadcn.svg" })
  const counts = useNotificationCounts("staff")

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then(async (res) => {
        if (res.success && res.user) {
          let photo: string | undefined
          try {
            const staffRes = await fetch(`/api/staff?search=${encodeURIComponent(res.user.email)}`)
            const staffJson = await staffRes.json()
            if (staffJson.success && staffJson.data?.length > 0) {
              photo = staffJson.data[0].photo
            }
          } catch {}
          setUser({
            name: res.user.name || "Staff",
            email: res.user.email || "",
            avatar: photo || "/avatars/shadcn.svg",
          })
        }
      })
      .catch(() => {})
  }, [])

  const navMain = [
    { title: "Dashboard", url: "/staff/dashboard", icon: <LayoutDashboardIcon /> },
    { title: "My Centers", url: "/staff/centers", icon: <MapPinIcon /> },
  ]

  const navRequests = [
    { title: "Create & Manage", url: "/staff/center-requests", icon: <ClipboardCheckIcon />, badge: counts.pendingCenterRequests },
    { title: "Edit/Delete Requests", url: "/staff/edit-requests", icon: <PencilIcon />, badge: counts.pendingEditRequests },
  ]

  const navPeople = [
    { title: "Members", url: "/staff/members", icon: <UserCogIcon />, badge: counts.pendingMemberVerifications },
    { title: "Groups", url: "/staff/groups", icon: <UsersIcon /> },
    { title: "Leaders", url: "/staff/leaders", icon: <UserCogIcon /> },
  ]

  const navLoan = [
    { title: "Loans", url: "/staff/loans", icon: <LandmarkIcon />, badge: counts.pendingLoans },
    { title: "Repayments", url: "/staff/repayments", icon: <CreditCardIcon /> },
    // { title: "Collections", url: "/staff/collections", icon: <ClipboardListIcon /> },
    { title: "Group Collection", url: "/staff/group-collection", icon: <ClipboardListIcon />, badge: counts.pendingGroupAssignments },
    { title: "Collection History", url: "/staff/group-collection/history", icon: <ClipboardListIcon /> },
    { title: "Member & Loan Search", url: "/staff/member-search", icon: <SearchIcon /> },
  ]

  const navSecondary = [
    { title: "Reports", url: "/staff/reports", icon: <BarChart3Icon /> },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="/staff/dashboard" />}
            >
              <img src="/logo.png" alt="Sreeyalakshmi Logo" className="size-8! min-w-8! rounded-full object-cover group-data-[collapsible=icon]:size-7! group-data-[collapsible=icon]:min-w-7!" />
              <span className="text-base font-semibold">SREEYALAXMI FINANCIAL</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavMain items={navRequests} label="Requests" />
        <NavMain items={navPeople} label="People" />
        <NavMain items={navLoan} label="Loan Management" />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
