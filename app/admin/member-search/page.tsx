import { MemberLoanSearch } from "@/components/member-loan-search"

export default function AdminMemberSearchPage() {
  return <MemberLoanSearch apiBase="/api/member-loans" role="admin" />
}
