"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function GroupAssignedRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/center-assigned-collection"); }, [router]);
  return <div className="p-8 text-sm text-muted-foreground">Redirecting to Center Assignments...</div>;
}
