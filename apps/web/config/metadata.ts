import type { Metadata } from "next"

const siteConfig = {
  name: "Nexus - Next.js Starter Kit",
  description:
    "Nexus is a modern monorepo starter kit featuring Next.js, Turborepo, shadcn/ui, Tailwind CSS v4, Supabase, and Prisma - perfect for building scalable full-stack applications with efficient monorepo architecture",
  keywords: [
    "nexus",
    "nextjs",
    "next.js",
    "turborepo",
    "monorepo",
    "shadcn",
    "tailwindcss",
    "supabase",
    "prisma",
    "starter kit",
    "fullstack",
    "typescript",
    "react",
    "pnpm",
    "workspace",
  ],
  author: "youming-ai",
}

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.author }],
  robots: "index, follow",
  openGraph: {
    type: "website",
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
}
