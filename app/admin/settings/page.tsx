"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Save, Loader2 } from "lucide-react"

interface Setting {
  _id: string
  key: string
  value: any
  description: string
  category: string
}

export default function SettingsPage() {
  const [settings, setSettings] = React.useState<Setting[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [editedValues, setEditedValues] = React.useState<Record<string, any>>({})
  const [hasChanges, setHasChanges] = React.useState(false)

  const fetchSettings = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/settings")
      const json = await res.json()
      if (json.success) {
        setSettings(json.data)
        const initial: Record<string, any> = {}
        json.data.forEach((s: Setting) => { initial[s.key] = s.value })
        setEditedValues(initial)
      } else {
        toast.error(json.error || "Failed to fetch settings")
      }
    } catch {
      toast.error("Failed to fetch settings")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { fetchSettings() }, [fetchSettings])

  const grouped = React.useMemo(() => {
    const groups: Record<string, Setting[]> = {}
    settings.forEach((s) => {
      if (!groups[s.category]) groups[s.category] = []
      groups[s.category].push(s)
    })
    return groups
  }, [settings])

  const handleValueChange = (key: string, value: any) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const settingsToSave = settings.map((s) => ({
        key: s.key,
        value: editedValues[s.key] ?? s.value,
        description: s.description,
        category: s.category,
      }))

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsToSave }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setSettings(json.data)
        const initial: Record<string, any> = {}
        json.data.forEach((s: Setting) => { initial[s.key] = s.value })
        setEditedValues(initial)
        setHasChanges(false)
      } else {
        toast.error(json.error || "Failed to save settings")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  const renderInput = (setting: Setting) => {
    const currentValue = editedValues[setting.key] ?? setting.value

    if (typeof setting.value === "boolean") {
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!currentValue}
            onChange={(e) => handleValueChange(setting.key, e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm text-muted-foreground">{currentValue ? "Enabled" : "Disabled"}</span>
        </div>
      )
    }

    if (typeof setting.value === "number") {
      return (
        <Input
          type="number"
          value={currentValue}
          onChange={(e) => handleValueChange(setting.key, Number(e.target.value))}
          className="max-w-xs"
        />
      )
    }

    return (
      <Input
        value={currentValue || ""}
        onChange={(e) => handleValueChange(setting.key, e.target.value)}
        className="max-w-xs"
      />
    )
  }

  return (
      <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Settings</h1>
            <Button onClick={handleSave} disabled={!hasChanges || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </div>

          {loading ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-4">
                  <Skeleton className="h-6 w-40" />
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-8 w-48" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
              No settings found. Configure settings in the database.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([category, categorySettings]) => (
                <div key={category} className="rounded-lg border">
                  <div className="border-b bg-muted/50 px-4 py-3">
                    <h2 className="text-lg font-semibold capitalize">{category.replace(/_/g, " ")}</h2>
                  </div>
                  <div className="divide-y">
                    {categorySettings.map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between px-4 py-3">
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="font-medium text-sm">{setting.key.replace(/_/g, " ")}</div>
                          {setting.description && (
                            <div className="text-xs text-muted-foreground mt-0.5">{setting.description}</div>
                          )}
                        </div>
                        <div>{renderInput(setting)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

  )
}
