import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload {
  id: string;
  email: string;
  role: "admin" | "staff";
  // role: "admin" | "staff" | "leader";
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    if (!token) return null;
    
    const decoded = verifyToken(token);
    if (!decoded) return null;
    
    await connectDB();
    const user = await User.findById(decoded.id).select("-password").lean();
    
    return user;
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireRole(roles: string[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}

// Role-based access control
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["*"],
  staff: [
    "centers:read",
    "members:read",
    "members:update",
    "repayments:create",
    "repayments:read",
    "collections:create",
    "collections:read",
    "daily-reports:read",
    "daily-reports:create",
    "loans:read",
    "reports:read",
  ],
  // leader: [
  //   "centers:read",
  //   "members:read",
  //   "loans:read",
  //   "disbursements:create",
  //   "repayments:read",
  //   "collections:create",
  //   "collections:read",
  // ],
};

export function hasPermission(role: string, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  if (permissions.includes("*")) return true;
  return permissions.includes(permission);
}
