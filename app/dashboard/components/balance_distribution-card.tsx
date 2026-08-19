"use client";

import * as React from "react";

import { Label, Pie, PieChart } from "recharts";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

interface Collection {
  branch?: { name: string; code: string };
  total: number;
}

interface BranchTotal {
  branch: string;
  amount: number;
  percentage: number;
  key: string;
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const currencies = {
  INR: { label: "INR Balance" },
} as const;

type Currency = keyof typeof currencies;

export function BalanceDistributionCard() {
  const [currency, setCurrency] = React.useState<Currency>("INR");
  const [chartData, setChartData] = React.useState<BranchTotal[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/collections?limit=99999")
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return;

        const collections: Collection[] = json.data;
        const branchMap = new Map<string, number>();

        for (const c of collections) {
          const branchName = c.branch?.name || "Unknown";
          branchMap.set(branchName, (branchMap.get(branchName) || 0) + (c.total || 0));
        }

        const total = Array.from(branchMap.values()).reduce((sum, v) => sum + v, 0);

        const data: BranchTotal[] = Array.from(branchMap.entries())
          .map(([branch, amount], i) => ({
            branch,
            amount,
            percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
            key: `branch-${i}`,
          }))
          .sort((a, b) => b.amount - a.amount);

        setChartData(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalBalance = chartData.reduce((sum, item) => sum + item.amount, 0);

  const dynamicConfig = React.useMemo<ChartConfig>(() => {
    const config: ChartConfig = { amount: { label: "Collection" } };
    chartData.forEach((item, i) => {
      config[item.key] = {
        color: CHART_COLORS[i % CHART_COLORS.length],
        label: item.branch,
      };
    });
    return config;
  }, [chartData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">Branch Wise Collection</CardTitle>
        <CardAction>
          <Select onValueChange={(value) => setCurrency(value as Currency)} value={currency}>
            <SelectTrigger className="w-36" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Object.entries(currencies).map(([value, item]) => (
                  <SelectItem key={value} value={value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent className="grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        <ChartContainer config={dynamicConfig} className="mx-auto aspect-square h-50">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel className="w-52" nameKey="branch" />}
            />
            <Pie
              cornerRadius={6}
              data={chartData}
              dataKey="amount"
              innerRadius={65}
              nameKey="branch"
              outerRadius={90}
              paddingAngle={2}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (!(viewBox && "cx" in viewBox && "cy" in viewBox)) {
                    return null;
                  }

                  return (
                    <text dominantBaseline="middle" textAnchor="middle" x={viewBox.cx} y={viewBox.cy}>
                      <tspan className="fill-muted-foreground text-xs" x={viewBox.cx} y={(viewBox.cy ?? 0) - 8}>
                        Total
                      </tspan>
                      <tspan
                        className="fill-foreground font-heading font-medium text-lg tabular-nums"
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 14}
                      >
                        {formatCurrency(totalBalance, { currency, noDecimals: true })}
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="flex min-w-0 flex-col gap-3">
          {loading ? (
            <p className="text-muted-foreground text-xs">Loading...</p>
          ) : chartData.length === 0 ? (
            <p className="text-muted-foreground text-xs">No data</p>
          ) : (
            chartData.map((item) => {
              const colorIndex = chartData.indexOf(item) % CHART_COLORS.length;
              return (
                <div className="grid grid-cols-[1fr_auto] items-end gap-3" key={item.key}>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1">
                      <span aria-hidden="true" className="h-2 w-1 rounded-full" style={{ backgroundColor: CHART_COLORS[colorIndex] }} />
                      <p className="truncate text-muted-foreground text-xs">{item.branch}</p>
                    </div>
                    <p className="font-medium tabular-nums">
                      {formatCurrency(item.amount, { currency, noDecimals: true })}
                    </p>
                  </div>
                  <div className="font-medium tabular-nums">{item.percentage}%</div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
