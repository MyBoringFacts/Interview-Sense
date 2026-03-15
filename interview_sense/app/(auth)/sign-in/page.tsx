'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, LogIn, Eye, EyeOff, Sparkles, MailCheck } from 'lucide-react'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const needsVerification = searchParams.get('error') === 'verify-email'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resentEmail, setResentEmail] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth) {
      setError('Authentication is not initialized.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)

      // After clicking the link in the verification email, Firebase may not
      // immediately reflect emailVerified=true until we reload the user.
      await credential.user.reload()

      if (!credential.user.emailVerified) {
        setError(
          'Please verify your email before signing in. After clicking the link, try again or refresh this page.'
        )
        return
      }

      const redirectTo = searchParams.get('redirect')
      const allowed =
        redirectTo &&
        redirectTo.startsWith('/') &&
        !redirectTo.startsWith('//') &&
        !redirectTo.toLowerCase().startsWith('/sign-up') &&
        !redirectTo.toLowerCase().startsWith('/sign-in')
      router.push(allowed ? redirectTo : '/dashboard')
    } catch (err: any) {
      const code = err?.code
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        setError('Invalid email or password.')
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!auth) return
    setResending(true)
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      await sendEmailVerification(credential.user)
      setResentEmail(true)
    } catch {
      setError('Could not resend verification email. Make sure your email and password are correct.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Logo / Branding */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25 mb-2">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to continue your interview practice
        </p>
      </div>

      <Card className="bg-card/60 border-border/40 backdrop-blur-md p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Verification notice from redirect */}
          {needsVerification && !error && (
            <div className="flex items-start gap-3 text-sm text-amber-400 bg-amber-950/40 border border-amber-500/30 rounded-lg px-4 py-3">
              <MailCheck className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Your email is not yet verified. Check your inbox and click the link to activate your account.</span>
            </div>
          )}

          {/* Resent confirmation */}
          {resentEmail && (
            <div className="flex items-start gap-3 text-sm text-green-400 bg-green-950/40 border border-green-500/30 rounded-lg px-4 py-3">
              <MailCheck className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Verification email resent! Check your inbox.</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="space-y-3">
              <div className="text-sm text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg px-4 py-3">
                {error}
              </div>
              {error.includes('verify your email') && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 text-sm"
                  onClick={handleResendVerification}
                  disabled={resending || !email || !password}
                >
                  {resending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MailCheck className="h-4 w-4 mr-2" />}
                  {resending ? 'Sending…' : 'Resend verification email'}
                </Button>
              )}
            </div>
          )}

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

          {/* Submit */}
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <LogIn className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      </Card>

      {/* Link to Sign Up */}
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          href="/sign-up"
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Create one
        </Link>
      </p>
    </div>
  )
}
