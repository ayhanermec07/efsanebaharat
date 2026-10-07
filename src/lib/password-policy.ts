export const CUSTOMER_PASSWORD_HINT = 'En az 8 karakter, en az bir harf ve bir rakam kullanın.'

export function isValidCustomerPassword(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password)
}
