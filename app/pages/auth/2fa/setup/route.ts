import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateSecret, getTOTPQRCode, getQRCodeImageUrl } from "@/lib/totp"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: userRecord } = await supabase.from("users").select("email").eq("id", user.id).single()

  if (!userRecord) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const secret = generateSecret()
  const otpauthUrl = getTOTPQRCode(secret, userRecord.email)
  const qrCodeUrl = getQRCodeImageUrl(otpauthUrl)

  return NextResponse.json({
    secret,
    qrCodeUrl,
  })
}
