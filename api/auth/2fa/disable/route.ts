import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { disable2FA, get2FASecret } from "@/lib/user-store"
import { verifyTOTP } from "@/lib/totp"

export async function POST(request: NextRequest) {
  const session = await getServerSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { code } = await request.json()

  if (!code || code.length !== 6) {
    return NextResponse.json({ error: "Invalid code format" }, { status: 400 })
  }

  const email = session.user.email
  const secret = get2FASecret(email)

  if (!secret) {
    return NextResponse.json({ error: "2FA not enabled" }, { status: 400 })
  }

  const isValid = await verifyTOTP(secret, code)

  if (!isValid) {
    return NextResponse.json({ error: "Invalid authenticator code" }, { status: 401 })
  }

  // Disable 2FA for user
  disable2FA(email)

  return NextResponse.json({ success: true })
}
