import { cookies } from "next/headers"
import { jwtVerify, SignJWT } from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-this-in-production")

interface Session {
  user: {
    email: string
  }
  expiresAt: number
}

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) return null

  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    return verified.payload as Session
  } catch {
    return null
  }
}

export async function createSession(email: string): Promise<string> {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  const payload = {
    user: { email },
    expiresAt,
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_SECRET)

  return token
}
