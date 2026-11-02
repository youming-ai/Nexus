import "@tanstack/react-start/server-only"
import { env } from "cloudflare:workers"

export async function sendAuthEmail(to: string, subject: string, url: string) {
  const cleanSubject = subject.replace(/[\r\n]+/g, " ").trim()
  const escapedUrl = url.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;")
  const escapedSubject = cleanSubject
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
  await env.EMAIL.send({
    from: env.EMAIL_FROM,
    to,
    subject: cleanSubject,
    text: `${cleanSubject}\n\n${url}`,
    html: `<p>${escapedSubject}</p><p><a href="${escapedUrl}">Continue</a></p>`,
  })
}
