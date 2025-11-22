"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

interface UserData {
  email: string
  timeRemaining: number
  twoFactorEnabled?: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [verify2FACode, setVerify2FACode] = useState("")
  const [disabling2FA, setDisabling2FA] = useState(false)
  const [disable2FACode, setDisable2FACode] = useState("")

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()
        if (!authUser) {
          router.push("/login")
          return
        }

        const response = await fetch("/api/auth/user")
        if (!response.ok) {
          router.push("/login")
          return
        }
        const data = await response.json()
        setUser(data)
      } catch (err) {
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router, supabase])

  const handleAddSixHours = async () => {
    setAdding(true)
    try {
      const response = await fetch("/api/auth/add-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const data = await response.json()
        setUser({ ...user!, timeRemaining: data.timeRemaining })
      }
    } catch (err) {
      console.error("Failed to add hours", err)
    } finally {
      setAdding(false)
    }
  }

  const handleSetup2FA = async () => {
    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (response.ok) {
        setQrCodeUrl(data.qrCodeUrl)
        setShow2FASetup(true)
      }
    } catch (err) {
      console.error("Failed to setup 2FA", err)
    }
  }

  const handleVerify2FA = async () => {
    try {
      console.log("Sending code:", verify2FACode)
      
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verify2FACode }),
      })

      const data = await response.json()
      console.log("Response:", data)

      if (!response.ok) {
        alert(`Verification failed: ${data.error || 'Unknown error'}`)
        return
      }

      setUser({ ...user!, twoFactorEnabled: true })
      setShow2FASetup(false)
      setQrCodeUrl("")
      setVerify2FACode("")
    } catch (err) {
      console.error("Failed to verify 2FA", err)
      alert("Network error: " + err)
    }
  }

  const handleDisable2FA = async () => {
    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disable2FACode }),
      })

      if (response.ok) {
        setUser({ ...user!, twoFactorEnabled: false })
        setDisabling2FA(false)
        setDisable2FACode("")
      }
    } catch (err) {
      console.error("Failed to disable 2FA", err)
    }
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const hours = Math.floor(user?.timeRemaining || 0)
  const minutes = Math.floor(((user?.timeRemaining || 0) % 1) * 60)

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Time Remaining</p>
              <div className="text-4xl font-bold text-primary">
                {hours}h {minutes}m
              </div>
            </div>

            <Button onClick={handleAddSixHours} disabled={adding} className="w-full">
              {adding ? "Adding..." : "Add 6 Hours"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>Secure your account with an authenticator app</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!user?.twoFactorEnabled ? (
              !show2FASetup ? (
                <Button onClick={handleSetup2FA} variant="outline" className="w-full bg-transparent">
                  Enable 2FA
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm mb-3">Scan this QR code with your authenticator app:</p>
                    <img src={qrCodeUrl || "/placeholder.svg"} alt="2FA QR Code" className="w-48 h-48 mx-auto" />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Verify Code</label>
                    <Input
                      type="text"
                      placeholder="000000"
                      value={verify2FACode}
                      onChange={(e) => setVerify2FACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleVerify2FA} disabled={verify2FACode.length !== 6} className="flex-1">
                      Verify & Enable
                    </Button>
                    <Button
                      onClick={() => {
                        setShow2FASetup(false)
                        setQrCodeUrl("")
                        setVerify2FACode("")
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  Two-factor authentication is enabled
                </div>

                {!disabling2FA ? (
                  <Button onClick={() => setDisabling2FA(true)} variant="destructive" className="w-full">
                    Disable 2FA
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm">Enter your authenticator code to disable 2FA:</p>
                    <Input
                      type="text"
                      placeholder="000000"
                      value={disable2FACode}
                      onChange={(e) => setDisable2FACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleDisable2FA}
                        disabled={disable2FACode.length !== 6}
                        variant="destructive"
                        className="flex-1"
                      >
                        Disable
                      </Button>
                      <Button onClick={() => setDisabling2FA(false)} variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
