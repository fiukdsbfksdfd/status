import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyTOTP } from "@/lib/totp"

export async function POST(request: NextRequest) {
  const { code } = await request.json()

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 })
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: userRecord } = await supabase.from("users").select("two_fa_secret").eq("id", user.id).single()

  if (!userRecord?.two_fa_secret) {
    return NextResponse.json({ error: "2FA not enabled" }, { status: 400 })
  }

  if (!verifyTOTP(userRecord.two_fa_secret, code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 })
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      two_fa_enabled: false,
      two_fa_secret: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (updateError) {
    return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
