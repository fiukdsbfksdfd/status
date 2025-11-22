import { type NextRequest, NextResponse } from "next/server"
import { getUser, authenticateUser } from "@/lib/user-store"
import crypto from "crypto"

// This is the endpoint your external app will call
// It validates credentials and returns time remaining + status
export async function POST(request: NextRequest) {
  // Check for custom header identifying the external app
  const appId = request.headers.get("X-App-ID")
  const signature = request.headers.get("X-Signature")

  if (!appId || !signature) {
    return NextResponse.json({ status: "invalid", error: "Missing authentication headers" }, { status: 401 })
  }

  const body = await request.text()

  // Verify signature with a shared secret (you can set this in environment)
  const appSecret = process.env.APP_SECRET || "your-shared-secret"
  const expectedSignature = crypto.createHmac("sha256", appSecret).update(body).digest("hex")

  if (signature !== expectedSignature) {
    return NextResponse.json({ status: "invalid", error: "Invalid signature" }, { status: 401 })
  }

  const { email, password } = JSON.parse(body)

  if (!email || !password) {
    return NextResponse.json({ status: "invalid", error: "Missing credentials" }, { status: 400 })
  }

  // Authenticate the user
  const authResult = authenticateUser(email, password)

  if (!authResult.success) {
    return NextResponse.json({
      status: "invalid",
      message: "Authentication failed",
    })
  }

  // Get user and check time remaining
  const user = getUser(email)

  if (!user) {
    return NextResponse.json({
      status: "invalid",
      message: "User not found",
    })
  }

  // Check if time has expired
  if (user.timeRemaining <= 0) {
    return NextResponse.json({
      status: "invalid",
      message: "No time remaining",
      timeRemaining: 0,
    })
  }

  return NextResponse.json({
    status: "valid",
    timeRemaining: user.timeRemaining,
    message: "Authentication successful",
  })
}
