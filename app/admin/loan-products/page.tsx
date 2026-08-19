"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BanknoteIcon, InfoIcon } from "lucide-react"

export default function LoanProductsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">Loan Configuration</h1>
        <p className="text-muted-foreground text-sm">General loan settings for the organization</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BanknoteIcon className="size-5" />
            General Loan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <InfoIcon className="size-5 text-blue-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">This system uses a single General Loan product</p>
              <p className="text-sm text-muted-foreground">
                Loan amounts, insurance, processing fees, and tenure are entered directly when disbursing a loan.
                There are no separate loan products to manage.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Default Loan Amount</p>
              <p className="text-2xl font-bold">₹15,000</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Default Tenure</p>
              <p className="text-2xl font-bold">50 weeks</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Max Loan Cycles</p>
              <p className="text-2xl font-bold">4 cycles</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
