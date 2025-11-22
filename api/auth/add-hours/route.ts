import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { addTime } from "@/lib/user-store"

export async function POST(request: NextRequest) {
  const session = await getServerSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { hours } = await request.json()

  if (!hours || hours <= 0) {
    return NextResponse.json({ error: "Invalid hours value" }, { status: 400 })
  }

  const result = addTime(session.user.email, hours)

  if (!result.success) {
    return NextResponse.json({ error: "Failed to add hours" }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    timeRemaining: result.timeRemaining,
  })
}
