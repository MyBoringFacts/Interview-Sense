'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Brain, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'

export function DashboardHeader() {
  const { firebaseUser, userProfile, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/sign-in')
  }

  const displayName =
    userProfile?.displayName ||
    firebaseUser?.displayName ||
    firebaseUser?.email?.split('@')[0] ||
    'User'

  return (
    <header className="border-b border-border/40 bg-card/40 backdrop-blur-sm sticky top-0 z-40 animate-fade-in">
      <div className="px-6 py-3.5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-sm shadow-primary/30">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              InterviewSense
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {displayName}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

