// In-memory user storage
interface UserRecord {
  email: string
  password: string // hashed
  timeRemaining: number // in hours
  createdAt: number
  apiKey: string
  twoFactorSecret?: string // Base32 encoded TOTP secret
  twoFactorEnabled: boolean
}

const users = new Map<string, UserRecord>()
const sessions = new Map<string, { email: string; expiresAt: number }>()

// Simple hash function (use bcrypt in production!)
function hashPassword(password: string): string {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  return Array.from(new Uint8Array(data))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

function generateApiKey(): string {
  return "sk_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function createUser(email: string, password: string): { success: boolean; error?: string } {
  if (users.has(email)) {
    return { success: false, error: "User already exists" }
  }

  users.set(email, {
    email,
    password: hashPassword(password),
    timeRemaining: 0,
    createdAt: Date.now(),
    apiKey: generateApiKey(),
    twoFactorEnabled: false,
  })

  return { success: true }
}

export function authenticateUser(email: string, password: string): { success: boolean; error?: string } {
  const user = users.get(email)

  if (!user) {
    return { success: false, error: "Invalid credentials" }
  }

  if (!verifyPassword(password, user.password)) {
    return { success: false, error: "Invalid credentials" }
  }

  return { success: true }
}

export function getUser(email: string): UserRecord | undefined {
  return users.get(email)
}

export function addTime(email: string, hours: number): { success: boolean; timeRemaining?: number } {
  const user = users.get(email)

  if (!user) {
    return { success: false }
  }

  user.timeRemaining += hours
  return { success: true, timeRemaining: user.timeRemaining }
}

export function validateApiKey(apiKey: string): { valid: boolean; email?: string } {
  for (const [email, user] of users.entries()) {
    if (user.apiKey === apiKey) {
      return { valid: true, email }
    }
  }
  return { valid: false }
}

export function enable2FA(email: string, secret: string): { success: boolean; error?: string } {
  const user = users.get(email)

  if (!user) {
    return { success: false, error: "User not found" }
  }

  user.twoFactorSecret = secret
  user.twoFactorEnabled = true

  return { success: true }
}

export function disable2FA(email: string): { success: boolean; error?: string } {
  const user = users.get(email)

  if (!user) {
    return { success: false, error: "User not found" }
  }

  user.twoFactorSecret = undefined
  user.twoFactorEnabled = false

  return { success: true }
}

export function get2FASecret(email: string): string | undefined {
  const user = users.get(email)
  return user?.twoFactorSecret
}

export function is2FAEnabled(email: string): boolean {
  const user = users.get(email)
  return user?.twoFactorEnabled ?? false
}
const temp2FASecrets = new Map<string, { secret: string; expiresAt: number }>()

export function setTemp2FASecret(email: string, secret: string) {
  temp2FASecrets.set(email, {
    secret,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  })
}

export function getTemp2FASecret(email: string): string | null {
  const data = temp2FASecrets.get(email)
  if (!data) return null
  
  if (Date.now() > data.expiresAt) {
    temp2FASecrets.delete(email)
    return null
  }
  
  return data.secret
}

export function clearTemp2FASecret(email: string) {
  temp2FASecrets.delete(email)
}
