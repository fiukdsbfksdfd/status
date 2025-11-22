import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: userRecord } = await supabase.from("users").select("time_remaining").eq("id", user.id).single()

  if (!userRecord) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const newTimeRemaining = userRecord.time_remaining + 6 * 60 * 60 // 6 hours in seconds

  const { error: updateError } = await supabase
    .from("users")
    .update({ time_remaining: newTimeRemaining, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (updateError) {
    return NextResponse.json({ error: "Failed to add time" }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    timeRemaining: newTimeRemaining,
  })
}
