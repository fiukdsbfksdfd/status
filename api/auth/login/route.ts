import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { authenticateUser, is2FAEnabled, get2FASecret } from "@/lib/user-store"
import { verifyTOTP } from "@/lib/totp"
import jose from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-this-in-production")

export async function POST(request: NextRequest) {
  const { email, password, twoFactorCode } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 })
  }

  const authResult = authenticateUser(email, password)

  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error || "Authentication failed" }, { status: 401 })
  }

  const needs2FA = is2FAEnabled(email)

  if (needs2FA) {
    if (!twoFactorCode) {
      return NextResponse.json({ error: "Two-factor code required", requiresTwoFactor: true }, { status: 403 })
    }

    const secret = get2FASecret(email)
    if (!secret) {
      return NextResponse.json({ error: "2FA secret not found" }, { status: 500 })
    }

    const isValidCode = await verifyTOTP(secret, twoFactorCode)
    if (!isValidCode) {
      return NextResponse.json({ error: "Invalid authenticator code" }, { status: 401 })
    }
  }

  // Create JWT token
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000
  const payload = {
    user: { email },
    expiresAt,
  }

  const token = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_SECRET)

  const cookieStore = await cookies()
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60,
  })

  return NextResponse.json({ success: true })
}
