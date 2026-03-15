'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUserProfile, type UserProfile } from '@/lib/firestore'

interface AuthContextValue {
  /** Firebase auth user (null when signed out). */
  firebaseUser: FirebaseUser | null
  /** Firestore user profile (null when signed out or not yet loaded). */
  userProfile: UserProfile | null
  /** True while the initial auth state is being resolved. */
  loading: boolean
  /** Sign out the current user. */
  signOut: () => Promise<void>
  /** Refresh the Firestore profile (call after profile updates). */
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  userProfile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (user) {
        const profile = await getUserProfile(user.uid)
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signOut = async () => {
    if (!auth) return
    await firebaseSignOut(auth)
    setFirebaseUser(null)
    setUserProfile(null)
  }

  const refreshProfile = async () => {
    if (!firebaseUser) return
    const profile = await getUserProfile(firebaseUser.uid)
    setUserProfile(profile)
  }

  return (
    <AuthContext.Provider
      value={{ firebaseUser, userProfile, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
