import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600">403</h1>
        <p className="mt-4 text-xl text-muted-foreground">Access Denied</p>
        <p className="mt-2 text-sm text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Go to Login
        </Link>
      </div>
    </div>
  )
}
