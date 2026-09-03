"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CollectionRecord {
  _id: string;
  collectionDate: string;
  total: number;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CustomAxisTick(props: any) {
  const { x, y, payload } = props;
  return (
    <text
      x={x}
      y={y}
      dy={8}
      textAnchor="middle"
      fontSize={11}
      className="fill-muted-foreground"
    >
      {payload?.value}
    </text>
  );
}

function CustomTooltip({ active, payload, label, viewType }: any) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  const label2 = viewType === "daily" ? "Daily Collection" : "Weekly Collection";
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-card-foreground">{label}</p>
      <p className="text-sm font-semibold text-card-foreground">
        {label2} : ₹{Number(value).toLocaleString("en-IN")}
      </p>
    </div>
  );
}

function DottedPattern() {
  return (
    <defs>
      <pattern id="dotPattern" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="0.8" fill="currentColor" opacity="0.12" />
      </pattern>
    </defs>
  );
}

const DAILY_COLORS = [
  "hsl(210, 80%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(35, 90%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)",
  "hsl(190, 70%, 45%)",
  "hsl(50, 85%, 50%)",
];

const WEEKLY_COLORS = [
  "hsl(210, 80%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(35, 90%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)",
  "hsl(190, 70%, 45%)",
];

function buildDailyData(records: CollectionRecord[]) {
  const now = new Date();
  const result: { name: string; daily: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);

    let total = 0;
    for (const r of records) {
      const rd = new Date(r.collectionDate);
      if (rd >= d && rd < next) {
        total += r.total || 0;
      }
    }

    const dayName = DAY_NAMES[d.getDay()];
    const label = `${dayName} ${d.getDate()}`;
    result.push({ name: label, daily: total });
  }

  return result;
}

function buildWeeklyData(records: CollectionRecord[]) {
  const now = new Date();
  const result: { name: string; weekly: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);
    weekEnd.setHours(23, 59, 59, 999);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    let total = 0;
    for (const r of records) {
      const rd = new Date(r.collectionDate);
      if (rd >= weekStart && rd <= weekEnd) {
        total += r.total || 0;
      }
    }

    const startLabel = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
    const endLabel = `${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;
    result.push({ name: `${startLabel}-${endLabel}`, weekly: total });
  }

  return result;
}

export function TransactionsOverviewCard() {
  const [view, setView] = useState("daily");
  const [chartData, setChartData] = useState<{ name: string; daily?: number; weekly?: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/collections?limit=99999", { credentials: "include" }).then(r => r.json()),
      fetch("/api/center-assigned-collection", { credentials: "include" }).then(r => r.json()),
    ])
      .then(([collectionsRes, groupRes]) => {
        const collectionRecords: CollectionRecord[] = collectionsRes.success ? collectionsRes.data : [];
        const groupRecords: CollectionRecord[] = (groupRes.success ? groupRes.data : [])
          .filter((g: any) => g.status === "Complete" || g.totalCollected > 0)
          .map((g: any) => ({
            _id: g._id,
            collectionDate: g.collectionDate,
            total: g.totalCollected || 0,
          }));
        const allRecords = [...collectionRecords, ...groupRecords];
        setRecords(allRecords);
        setChartData(buildDailyData(allRecords));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (records.length === 0 && !loading) {
      setChartData([]);
      return;
    }
    if (view === "daily") {
      setChartData(buildDailyData(records));
    } else {
      setChartData(buildWeeklyData(records));
    }
  }, [view, records, loading]);

  const dataKey = view === "daily" ? "daily" : "weekly";
  const colors = view === "daily" ? DAILY_COLORS : WEEKLY_COLORS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">Collection Overview</CardTitle>
        <CardAction>
          <Select value={view} onValueChange={(v) => { if (v) setView(v); }}>
            <SelectTrigger className="w-28" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex h-50 items-center justify-center text-muted-foreground text-sm">
            Loading...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-50 items-center justify-center text-muted-foreground text-sm">
            No collection data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ bottom: 0, left: 0, right: 0, top: 0 }}>
              <DottedPattern />
              <rect width="100%" height="100%" fill="url(#dotPattern)" />
              <CartesianGrid
                vertical={false}
                strokeDasharray="4 4"
                stroke="hsl(var(--border))"
                strokeOpacity={0.5}
              />
              <XAxis
                axisLine={false}
                dataKey="name"
                tickLine={false}
                tickMargin={10}
                tick={<CustomAxisTick />}
                interval={0}
                angle={view === "daily" ? -35 : 0}
                textAnchor={view === "daily" ? "end" : "middle"}
                height={view === "daily" ? 50 : 30}
              />
              <YAxis hide axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip
                content={<CustomTooltip viewType={view} />}
                cursor={false}
              />
              <Bar
                dataKey={dataKey}
                radius={[4, 4, 0, 0]}
                maxBarSize={view === "daily" ? 40 : 50}
                onMouseEnter={(_, index) => setHoveredBar(index)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {chartData.map((_, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={colors[i % colors.length]}
                    style={{
                      filter: hoveredBar === i
                        ? `drop-shadow(0 0 10px ${colors[i % colors.length]}) drop-shadow(0 0 4px ${colors[i % colors.length]})`
                        : "none",
                      transform: hoveredBar === i ? "scaleY(1.05)" : "scaleY(1)",
                      transformOrigin: "bottom",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
