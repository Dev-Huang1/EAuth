import CryptoJS from "crypto-js"

// Use the NEXT_PUBLIC_CRYPTO_SALT environment variable for additional security
const SALT = process.env.NEXT_PUBLIC_CRYPTO_SALT || "default-salt-value"

export function encryptData(data: string, password: string): string {
  return CryptoJS.AES.encrypt(data, password + SALT).toString()
}

export function decryptData(encryptedData: string, password: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password + SALT)
    return bytes.toString(CryptoJS.enc.Utf8)
  } catch (error) {
    console.error("Decryption failed:", error)
    return ""
  }
}

export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password + SALT).toString()
}

