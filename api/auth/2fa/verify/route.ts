// Force update - Nov 22 2024
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { verifyTOTP } from "@/lib/totp"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  console.log("=== NEW VERIFY ROUTE RUNNING ===")
  
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { code } = body

    console.log("Body received:", body)

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    if (code.length !== 6) {
      return NextResponse.json({ error: "Code must be 6 digits" }, { status: 400 })
    }

    const email = session.user.email
    const supabase = createClient()
    
    const { data: user, error } = await supabase
      .from('users')
      .select('temp_2fa_secret, temp_2fa_expires')
      .eq('email', email)
      .single()

    if (error || !user?.temp_2fa_secret) {
      return NextResponse.json({ 
        error: "Setup session not found",
        details: error?.message 
      }, { status: 400 })
    }

    if (new Date(user.temp_2fa_expires) < new Date()) {
      return NextResponse.json({ error: "Setup session expired" }, { status: 400 })
    }

    const isValid = await verifyTOTP(user.temp_2fa_secret, code)

    if (!isValid) {
      return NextResponse.json({ error: "Invalid authenticator code" }, { status: 401 })
    }

    await supabase
      .from('users')
      .update({ 
        two_factor_secret: user.temp_2fa_secret,
        two_factor_enabled: true,
        temp_2fa_secret: null,
        temp_2fa_expires: null
      })
      .eq('email', email)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("2FA verify error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
