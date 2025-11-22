import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  const appId = request.headers.get("X-App-ID")
  const signature = request.headers.get("X-Signature")
  const { email, password } = await request.json()

  if (!appId || !signature || !email || !password) {
    return NextResponse.json({ status: "invalid" }, { status: 401 })
  }

  const secret = process.env.APP_SECRET || "your-app-secret"
  const payload = JSON.stringify({ email, password })
  const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex")

  if (signature !== expectedSignature) {
    return NextResponse.json({ status: "invalid" }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: signInError,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !user) {
      return NextResponse.json({ status: "invalid" }, { status: 401 })
    }

    const { data: userRecord } = await supabase.from("users").select("time_remaining").eq("id", user.id).single()

    if (!userRecord) {
      return NextResponse.json({ status: "invalid" }, { status: 401 })
    }

    return NextResponse.json({
      status: "valid",
      timeRemaining: userRecord.time_remaining,
    })
  } catch (err) {
    return NextResponse.json({ status: "invalid" }, { status: 401 })
  }
}
