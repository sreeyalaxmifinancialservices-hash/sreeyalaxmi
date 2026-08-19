import { AppSidebar } from "../dashboard/components/app-sidebar"
import { ChartAreaInteractive } from "@/app/dashboard/components/chart-area-interactive"
import { DataTable } from "@/app/dashboard/components/data-table"
import { SectionCards } from "@/app/dashboard/components/section-cards"
import { SiteHeader } from "@/app/dashboard/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import data from "./data.json"
import { format } from "date-fns";
import { Download, RotateCw, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { BalanceDistributionCard } from "./components/balance_distribution-card";
import { FinanceNotification } from "./components/finance_notification";
import { IncomeBreakdown } from "./components/income_breakdown";
import { OverviewKpis } from "./components/overview_kpis";
import { QuickActions } from "./components/quick_action";
import { TransactionsOverviewCard } from "./components/transaction_overview_card";
import { UpcomingTransactions } from "./components/upcoming_transactions";
import { Wallet } from "./components/wallet";

export default function Page() {
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
        {/* <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable data={data} />
            </div>
          </div>
        </div> */}
        <div className="flex flex-col gap-4 p-4">
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">Personal Finances</h1>
        {/* <p className="text-muted-foreground text-sm">{formattedDate}</p> */}
      </div>

      <Tabs defaultValue="30-days" className="flex flex-col gap-4">
        {/* <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList variant="line">
            <TabsTrigger value="30-days">Dashboard</TabsTrigger>
            <TabsTrigger value="12-months">Accounts</TabsTrigger>
            <TabsTrigger value="custom">Transactions</TabsTrigger>
          </TabsList> 

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <RotateCw className="size-4" />
              <span>Updated 5 min ago</span>
            </div>
            <Button size="sm" variant="outline">
              <Settings2 />
              Settings
            </Button>
            <Button size="sm" variant="outline">
              <Download data-icon="inline-start" />
              Export
            </Button>
          </div> */}
        {/* </div> */}

        <TabsContent value="30-days" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-6">
              <OverviewKpis />
            </div>

            <div className="flex flex-col gap-4 xl:col-span-6">
              <IncomeBreakdown />
              <FinanceNotification />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <TransactionsOverviewCard />
            </div>
            <div className="xl:col-span-5">
              <BalanceDistributionCard />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-4">
              <Wallet />
            </div>
            <div className="xl:col-span-4">
              <UpcomingTransactions />
            </div>
            <div className="xl:col-span-4">
              <QuickActions />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="12-months">
          <div className="flex h-64 items-center justify-center rounded-xl border border-border border-dashed text-muted-foreground">
            Accounts view coming soon.
          </div>
        </TabsContent>

        <TabsContent value="custom">
          <div className="flex h-64 items-center justify-center rounded-xl border border-border border-dashed text-muted-foreground">
            Transactions view coming soon.
          </div>
        </TabsContent>
      </Tabs>
    </div>
      </SidebarInset>
    </SidebarProvider>
  )
}






