import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyTOTP } from "@/lib/totp"

export async function POST(request: NextRequest) {
  const { email, code } = await request.json()

  if (!email || !code) {
    return NextResponse.json({ error: "Email and code required" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: userRecord } = await supabase.from("users").select("two_fa_secret").eq("email", email).single()

  if (!userRecord?.two_fa_secret) {
    return NextResponse.json({ error: "2FA not enabled for this user" }, { status: 400 })
  }

  if (!verifyTOTP(userRecord.two_fa_secret, code)) {
    return NextResponse.json({ error: "Invalid 2FA code" }, { status: 401 })
  }

  return NextResponse.json({ success: true })
}
