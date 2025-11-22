import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { generateTOTPSecret, generateQRCodeURL } from "@/lib/totp"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const email = session.user.email
    const secret = generateTOTPSecret()
    
    // Store in Supabase instead of memory
    const supabase = createClient()
    await supabase
      .from('users')
      .update({ 
        temp_2fa_secret: secret,
        temp_2fa_expires: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })
      .eq('email', email)
    
    const qrCodeUrl = generateQRCodeURL(email, secret)
    
    return NextResponse.json({ qrCodeUrl })
  } catch (error) {
    console.error("2FA setup error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
