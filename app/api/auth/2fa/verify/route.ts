import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyTOTP } from "@/lib/totp"

export async function POST(request: NextRequest) {
  const { secret, code } = await request.json()

  if (!secret || !code) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!(await verifyTOTP(secret, code))) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 })
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      two_fa_enabled: true,
      two_fa_secret: secret,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (updateError) {
    return NextResponse.json({ error: "Failed to enable 2FA" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
