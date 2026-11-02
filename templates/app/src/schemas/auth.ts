import { z } from "zod"

const email = z.email().max(254)
const password = z.string().min(12, "Use at least 12 characters").max(128)
export const loginInput = z.object({ email, password: z.string().min(1) })
export const signupInput = z.object({ name: z.string().trim().min(1).max(100), email, password })
export const forgotPasswordInput = z.object({ email })
export const resetPasswordInput = z
  .object({ password, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  })
