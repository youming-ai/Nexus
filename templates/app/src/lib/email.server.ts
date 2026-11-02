import "@tanstack/react-start/server-only"
import { sendEmail as voidSend } from "void/email"

export async function sendAuthEmail(to: string, subject: string, url: string) {
  const cleanSubject = subject.replace(/[\r\n]+/g, " ").trim()
  const escapedUrl = url.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;")
  const escapedSubject = cleanSubject
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
  const result = await voidSend({
    to,
    subject: cleanSubject,
    text: `${cleanSubject}\n\n${url}`,
    html: `<p>${escapedSubject}</p><p><a href="${escapedUrl}">Continue</a></p>`,
  })
  if (!result.ok) throw new Error(`sendEmail failed: ${JSON.stringify(result)}`)
}
