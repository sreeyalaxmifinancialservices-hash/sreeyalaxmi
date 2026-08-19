"use client"

import { AppSidebar } from "@/app/staff/dashboard/components/app-sidebar"
import { SiteHeader } from "@/app/staff/dashboard/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { MemberLoanSearch } from "@/components/member-loan-search"

export default function StaffMemberSearchPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" collapsible="icon" />
      <SidebarInset>
        <SiteHeader />
        <main className="p-6">
          <MemberLoanSearch apiBase="/api/staff/member-loans" role="staff" />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
