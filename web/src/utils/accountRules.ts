// Used by the account forms and by the mock API, so both give the same messages.
// "This username is already taken" needs the other accounts, so only the API checks it (story 1).

export interface AccountInput {
  fullName: string
  username: string
  phone: string
}

export type AccountErrors = Partial<Record<'fullName' | 'username' | 'phone' | 'password', string>>
export type PasswordErrors = Partial<Record<'current' | 'next' | 'confirm', string>>

export const USERNAME_PATTERN = /^[a-z0-9]{3,20}$/
const PHONE_PATTERN = /^0\d{8,9}$/ // Cambodian numbers: 0 and 8 or 9 more digits

export function checkAccount(input: AccountInput): AccountErrors {
  const errors: AccountErrors = {}
  if (!input.fullName.trim()) errors.fullName = 'Full name is required'
  if (!USERNAME_PATTERN.test(input.username)) errors.username = 'Username must be 3-20 lowercase letters or numbers'
  if (!PHONE_PATTERN.test(input.phone.replace(/\s/g, ''))) errors.phone = 'Phone must be 9 or 10 digits and start with 0'
  return errors
}

// 8 or more characters with at least one letter and one number
export function passwordError(password: string): string | null {
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return 'Password must have 8 or more characters, with a letter and a number'
  }
  return null
}

export function checkNewPassword(current: string, next: string, confirm: string): PasswordErrors {
  const errors: PasswordErrors = {}
  if (!current) errors.current = 'Enter your current password'
  const weak = passwordError(next)
  if (weak) errors.next = weak
  else if (next === current) errors.next = 'Choose a password different from the current one'
  if (confirm !== next) errors.confirm = 'The two passwords are not the same'
  return errors
}
