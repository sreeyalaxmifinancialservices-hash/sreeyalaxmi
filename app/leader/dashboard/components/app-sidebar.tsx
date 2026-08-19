"use client"

import * as React from "react"
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
  CreditCardIcon,
  ScrollTextIcon,
  CommandIcon,
} from "lucide-react"

const data = {
  user: {
    name: "Leader",
    email: "leader@lms.com",
    avatar: "/avatars/shadcn.svg",
  },
  navMain: [
    { title: "Dashboard", url: "/leader/dashboard", icon: <LayoutDashboardIcon /> },
    { title: "My Center", url: "/leader/centers", icon: <MapPinIcon /> },
    { title: "Loans", url: "/leader/loans", icon: <CreditCardIcon /> },
    { title: "Repayments", url: "/leader/repayments", icon: <ScrollTextIcon /> },
  ],
  navSecondary: [],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="/leader/dashboard" />}
            >
              <img src="/logo.png" alt="Sreeyalakshmi Logo" className="size-8! min-w-8! rounded-full object-cover group-data-[collapsible=icon]:size-7! group-data-[collapsible=icon]:min-w-7!" />
              <span className="text-base font-semibold">SREEYALAXMI FINANCIAL</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
