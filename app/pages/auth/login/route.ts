import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyTOTP } from "@/lib/totp"

export async function POST(request: NextRequest) {
  const { email, password, twoFactorCode } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 })
  }

  const supabase = await createClient()

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 })
  }

  // Check if 2FA is enabled
  const { data: userRecord } = await supabase
    .from("users")
    .select("two_fa_enabled, two_fa_secret")
    .eq("id", userData.user.id)
    .single()

  if (userRecord?.two_fa_enabled) {
    if (!twoFactorCode) {
      return NextResponse.json({ requiresTwoFactor: true }, { status: 200 })
    }

    if (!userRecord.two_fa_secret || !verifyTOTP(userRecord.two_fa_secret, twoFactorCode)) {
      return NextResponse.json({ error: "Invalid 2FA code" }, { status: 401 })
    }
  }

  return NextResponse.json({ success: true })
}
