"use client"

import { useEffect, useState, useCallback } from "react"

interface NotificationCounts {
  pendingInquiries: number
  pendingCenterRequests: number
  pendingEditRequests: number
  pendingMemberVerifications: number
  pendingLoans: number
  pendingGroupAssignments: number
}

export function useNotificationCounts(role: "admin" | "staff") {
  const [counts, setCounts] = useState<NotificationCounts>({
    pendingInquiries: 0,
    pendingCenterRequests: 0,
    pendingEditRequests: 0,
    pendingMemberVerifications: 0,
    pendingLoans: 0,
    pendingGroupAssignments: 0,
  })

  const fetchCounts = useCallback(async () => {
    try {
      if (role === "admin") {
        const [inquiriesRes, centerRequestsRes, membersRes, loansRes, groupAssignRes] = await Promise.all([
          fetch("/api/inquiries?status=pending&limit=1").then((r) => r.json()),
          fetch("/api/admin/center-requests?status=pending&limit=1").then((r) => r.json()),
          fetch("/api/members?verificationStatus=pending&limit=1").then((r) => r.json()),
          fetch("/api/loans?status=pending&limit=1").then((r) => r.json()),
          fetch("/api/center-assigned-collection?status=Pending%20Review&limit=1").then((r) => r.json()),
        ])
        setCounts({
          pendingInquiries: inquiriesRes.pagination?.total || 0,
          pendingCenterRequests: centerRequestsRes.pagination?.total || 0,
          pendingEditRequests: 0,
          pendingMemberVerifications: membersRes.pagination?.total || 0,
          pendingLoans: loansRes.pagination?.total || 0,
          pendingGroupAssignments: groupAssignRes.pagination?.total || 0,
        })
      } else {
        const [centerRequestsRes, editRequestsRes, membersRes, loansRes, groupAssignRes] = await Promise.all([
          fetch("/api/staff/center-requests?status=pending&limit=1").then((r) => r.json()),
          fetch("/api/staff/edit-requests?status=pending&limit=1").then((r) => r.json()),
          fetch("/api/members?verificationStatus=pending&limit=1").then((r) => r.json()),
          fetch("/api/staff/loans?status=pending&limit=1").then((r) => r.json()),
          fetch("/api/staff/center-assigned-collection?status=Pending&limit=1").then((r) => r.json()),
        ])
        setCounts({
          pendingInquiries: 0,
          pendingCenterRequests: centerRequestsRes.pagination?.total || 0,
          pendingEditRequests: editRequestsRes.pagination?.total || 0,
          pendingMemberVerifications: membersRes.pagination?.total || 0,
          pendingLoans: loansRes.pagination?.total || 0,
          pendingGroupAssignments: groupAssignRes.pagination?.total || 0,
        })
      }
    } catch {
      // silently fail
    }
  }, [role])

  useEffect(() => {
    fetchCounts()
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [fetchCounts])

  return counts
}
