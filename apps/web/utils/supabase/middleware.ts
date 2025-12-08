import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

// 1. Specify protected and public routes
const protectedRoutes = ["/dashboard", "/private"]
const publicRoutes = ["/login", "/signup", "/"]

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. Check if the current route is protected or public
  const path = request.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.includes(path)
  const _isPublicRoute = publicRoutes.includes(path)

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        supabaseResponse = NextResponse.next({
          request,
        })
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options)
        }
      },
    },
  })

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  // 3. Get user info from supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 4. Redirect to /login if the user is not authenticated
  if (isProtectedRoute && !user) {
    const nextUrl = new URL("/login", request.nextUrl)
    return NextResponse.redirect(nextUrl)
  }

  // 5. Redirect to `/dashboard` or `/private` if the user is authenticated
  // if (
  //   isPublicRoute &&
  //   user &&
  //   !request.nextUrl.pathname.startsWith("/private")
  // ) {
  //   const nextUrl = new URL("/private", request.nextUrl);
  //   return NextResponse.redirect(nextUrl);
  // }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
