'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { firebaseUser, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    const redirectQuery = pathname ? `redirect=${encodeURIComponent(pathname)}` : ''
    if (!firebaseUser) {
      router.replace(redirectQuery ? `/sign-in?${redirectQuery}` : '/sign-in')
    } else if (!firebaseUser.emailVerified) {
      router.replace(redirectQuery ? `/sign-in?error=verify-email&${redirectQuery}` : '/sign-in?error=verify-email')
    }
  }, [firebaseUser, loading, router, pathname])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!firebaseUser || !firebaseUser.emailVerified) {
    return null
  }

  return <>{children}</>
}
