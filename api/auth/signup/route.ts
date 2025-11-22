import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createUser, authenticateUser } from "@/lib/user-store"
import jose from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-this-in-production")

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 })
  }

  // Create user
  const createResult = createUser(email, password)

  if (!createResult.success) {
    return NextResponse.json({ error: createResult.error || "Signup failed" }, { status: 400 })
  }

  // Authenticate and create session
  const authResult = authenticateUser(email, password)

  if (!authResult.success) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }

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
