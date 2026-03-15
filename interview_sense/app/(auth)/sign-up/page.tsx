'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { createUserProfile } from '@/lib/firestore'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, UserPlus, Eye, EyeOff, Sparkles, MailCheck } from 'lucide-react'

export default function SignUpPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationSent, setVerificationSent] = useState(false)
  const [resending, setResending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth) {
      setError('Authentication is not initialized.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      const user = credential.user

      await updateProfile(user, { displayName })

      const now = new Date().toISOString()
      await createUserProfile(user.uid, {
        email: user.email || email,
        displayName: displayName || 'User',
        photoURL: null,
        createdAt: now,
        updatedAt: now,
      })

      await sendEmailVerification(user)
      setVerificationSent(true)
    } catch (err: any) {
      const code = err?.code
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.')
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.')
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!auth?.currentUser) return
    setResending(true)
    try {
      await sendEmailVerification(auth.currentUser)
    } catch {
      // silently ignore resend errors (e.g. too-many-requests)
    } finally {
      setResending(false)
    }
  }

  if (verificationSent) {
    return (
      <div className="space-y-8 animate-fade-up">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25 mb-2">
            <MailCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Check your email</h1>
          <p className="text-muted-foreground text-sm">
            We sent a verification link to
          </p>
          <p className="text-foreground font-medium text-sm">{email}</p>
        </div>

        <Card className="bg-card/60 border-border/40 backdrop-blur-md p-8 space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Click the link in that email to activate your account, then sign in below.
          </p>
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {resending ? 'Sending…' : 'Resend verification email'}
          </Button>
          <Link
            href="/sign-in"
            className="block w-full"
          >
            <Button className="w-full h-11">Go to Sign In</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Logo / Branding */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25 mb-2">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Create your account</h1>
        <p className="text-muted-foreground text-sm">
          Start practicing interviews with AI coaching
        </p>
      </div>

      <Card className="bg-card/60 border-border/40 backdrop-blur-md p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Display Name */}
          <div className="space-y-2">
            <label htmlFor="displayName" className="block text-sm font-medium text-foreground">
              Full Name
            </label>
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-2.5 bg-input/60 border border-border/40 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 bg-input/60 border border-border/40 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 bg-input/60 border border-border/40 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-input/60 border border-border/40 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>
      </Card>

      {/* Link to Sign In */}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
