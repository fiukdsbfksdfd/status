import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getUser } from "@/lib/user-store"

export async function GET(request: NextRequest) {
  const session = await getServerSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = getUser(session.user.email)

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({
    email: user.email,
    timeRemaining: user.timeRemaining,
    twoFactorEnabled: user.twoFactorEnabled,
  })
}
