import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: userRecord } = await supabase
    .from("users")
    .select("email, time_remaining, two_fa_enabled")
    .eq("id", user.id)
    .single()

  if (!userRecord) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({
    email: userRecord.email,
    timeRemaining: userRecord.time_remaining,
    twoFactorEnabled: userRecord.two_fa_enabled,
  })
}
