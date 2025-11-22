import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: userRecord } = await supabase.from("users").select("two_fa_enabled").eq("email", email).single()

  if (!userRecord) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({ twoFAEnabled: userRecord.two_fa_enabled })
}
