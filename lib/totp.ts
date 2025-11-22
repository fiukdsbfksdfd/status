// TOTP (Time-based One-Time Password) implementation using simple algorithm
// For production, use a library like 'speakeasy'

function base32Encode(buffer: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let bits = 0
  let value = 0
  let output = ""

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]
    bits += 8
    while (bits >= 5) {
      bits -= 5
      output += alphabet[(value >>> bits) & 31]
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31]
  }

  // Add padding
  while (output.length % 8) {
    output += "="
  }

  return output
}

function base32Decode(str: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  str = str.replace(/=/g, "")
  let bits = 0
  let value = 0
  const output: number[] = []

  for (let i = 0; i < str.length; i++) {
    value = (value << 5) | alphabet.indexOf(str[i])
    bits += 5
    if (bits >= 8) {
      bits -= 8
      output.push((value >>> bits) & 255)
    }
  }

  return new Uint8Array(output)
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const algorithm = { name: "HMAC", hash: "SHA-1" }
  const cryptoKey = await crypto.subtle.importKey("raw", key, algorithm, false, ["sign"])
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, message)
  return new Uint8Array(signature)
}

function generateSecret(): string {
  const randomBytes = new Uint8Array(20)
  crypto.getRandomValues(randomBytes)
  return base32Encode(randomBytes)
}

async function generateTOTP(secret: string): Promise<string> {
  const key = base32Decode(secret)
  let time = Math.floor(Date.now() / 1000 / 30) // Changed const to let
  const timeBuffer = new Uint8Array(8)

  for (let i = 7; i >= 0; i--) {
    timeBuffer[i] = time & 0xff
    time >>>= 8
  }

  const hmac = await hmacSha1(key, timeBuffer)
  const offset = hmac[hmac.length - 1] & 0xf
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  return (code % 1000000).toString().padStart(6, "0")
}

async function verifyTOTP(secret: string, code: string, window = 1): Promise<boolean> {
  const current = Math.floor(Date.now() / 1000 / 30)

  for (let i = -window; i <= window; i++) {
    let time = current + i
    const timeBuffer = new Uint8Array(8)

    for (let j = 7; j >= 0; j--) {
      timeBuffer[j] = time & 0xff
      time >>>= 8
    }

    const key = base32Decode(secret)
    const hmac = await hmacSha1(key, timeBuffer)
    const offset = hmac[hmac.length - 1] & 0xf
    const testCode =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)

    if ((testCode % 1000000).toString().padStart(6, "0") === code) {
      return true
    }
  }

  return false
}

function getTOTPQRCode(secret: string, email: string, issuer = "TimeRemaining"): string {
  const label = `${issuer} (${email})`
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  })
  return `otpauth://totp/${label}?${params}`
}

function getQRCodeImageUrl(otpauthUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`
}

const generateTOTPSecret = generateSecret

function generateQRCodeURL(email: string, secret: string): string {
  const otpauthUrl = getTOTPQRCode(secret, email)
  return getQRCodeImageUrl(otpauthUrl)
}

export {
  generateSecret,
  generateTOTP,
  verifyTOTP,
  getTOTPQRCode,
  getQRCodeImageUrl,
  generateTOTPSecret,
  generateQRCodeURL,
}
