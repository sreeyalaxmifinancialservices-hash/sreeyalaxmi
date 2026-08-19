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
  Building2Icon,
  MapPinIcon,
  UsersIcon,
  UserCogIcon,
  HandCoinsIcon,
  BanknoteIcon,
  ScrollTextIcon,
  CreditCardIcon,
  ClipboardListIcon,
  BarChart3Icon,
  Settings2Icon,
  CircleHelpIcon,
  SearchIcon,
  CommandIcon,
  ShieldCheckIcon,
  FileTextIcon,
  HelpCircleIcon,
  ClipboardCheckIcon,
} from "lucide-react"
import { useNotificationCounts } from "@/hooks/use-notification-counts"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const counts = useNotificationCounts("admin")

  const navMain = [
    { title: "Dashboard", url: "/admin/dashboard", icon: <LayoutDashboardIcon /> },
    { title: "Branches", url: "/admin/branches", icon: <Building2Icon /> },
    { title: "Centers", url: "/admin/centers", icon: <MapPinIcon /> },
    { title: "Groups", url: "/admin/groups", icon: <UsersIcon /> },
    { title: "Members", url: "/admin/members", icon: <UserCogIcon />, badge: counts.pendingMemberVerifications },
    { title: "Staff", url: "/admin/staff", icon: <ShieldCheckIcon /> },
    { title: "Leaders", url: "/admin/leaders", icon: <HandCoinsIcon /> },
    { title: "Manage Request", url: "/admin/center-requests", icon: <ClipboardCheckIcon />, badge: counts.pendingCenterRequests },
  ]

  const navLoan = [
    { title: "Loans", url: "/admin/loans", icon: <CreditCardIcon />, badge: counts.pendingLoans },
    { title: "Repayments", url: "/admin/repayments", icon: <ScrollTextIcon /> },
    { title: "Collections", url: "/admin/collections", icon: <ClipboardListIcon /> },
    { title: "Group Assignments", url: "/admin/group-assigned-collection", icon: <ClipboardListIcon />, badge: counts.pendingGroupAssignments },
    { title: "Member & Loan Search", url: "/admin/member-search", icon: <SearchIcon /> },
  ]

  const navSecondary = [
    { title: "Reports", url: "/admin/reports", icon: <BarChart3Icon /> },
    { title: "Inquiries", url: "/admin/inquiries", icon: <HelpCircleIcon />, badge: counts.pendingInquiries },
    { title: "Settings", url: "/admin/settings", icon: <Settings2Icon /> },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="/" />}
            >
              <img src="/logo.png" alt="Sreeyalakshmi Logo" className="size-8! min-w-8! rounded-full object-cover group-data-[collapsible=icon]:size-7! group-data-[collapsible=icon]:min-w-7!" />
              <span className="text-base font-semibold">SREEYALAXMI FINANCIAL</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavMain items={navLoan} label="Loan Management" />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: "Admin", email: "admin@gmail.com", avatar: "/avatars/shadcn.svg" }} />
      </SidebarFooter>
    </Sidebar>
  )
}
