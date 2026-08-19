import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";

export async function GET() {
  try {
    await connectDB();

    const cookieStore = await cookies();

    const token = cookieStore.get("token")?.value;

    if (!token) {
      return Response.json({
        success: false,
      });
    }

    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );

    const user = await User.findById(decoded.id).select("-password");

    return Response.json({
      success: true,
      user,
    });
  } catch (error) {
    return Response.json({
      success: false,
    });
  }
}