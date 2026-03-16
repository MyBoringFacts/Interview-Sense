'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from '@/components/dashboard/header'
import { Sidebar } from '@/components/dashboard/sidebar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/context/AuthContext'
import { getUserSettings, updateUserSettings, type UserSettings } from '@/lib/firestore'
import { Lock, Save, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  )
}

function SettingsContent() {
  const { firebaseUser } = useAuth()
  const [settings, setSettings] = useState<UserSettings & { email: string }>({
    email: '',
    notifications: true,
    emailAlerts: false,
    difficulty: 'intermediate',
    theme: 'dark',
  })
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!firebaseUser) return
    setSettings((prev) => ({ ...prev, email: firebaseUser.email || '' }))
    getUserSettings(firebaseUser.uid).then((s) => {
      setSettings((prev) => ({ ...prev, ...s }))
      setLoaded(true)
    })
  }, [firebaseUser])

  const handleSave = async () => {
    if (!firebaseUser) return
    setSaving(true)
    const { email, ...settingsToSave } = settings
    await updateUserSettings(firebaseUser.uid, settingsToSave)
    setSaving(false)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader />

        <main className="mx-auto w-full max-w-3xl p-6 space-y-6">
          <div className="animate-fade-up">
            <h1 className="text-3xl font-bold text-foreground mb-1">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences and interview settings</p>
          </div>

          {/* Account */}
          <Card className="bg-card/60 border-border/40 overflow-hidden animate-fade-up">
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
              <Lock className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-foreground">Account</h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-input/60 border border-border/40 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <Button variant="outline" className="w-full">Change Password</Button>
              </div>
              <div className="pt-4 border-t border-border/40">
                <label className="block text-sm font-medium text-destructive mb-2">Delete Account</label>
                <p className="text-xs text-muted-foreground mb-3">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button variant="destructive" className="w-full" onClick={() => {}}>
                  Delete Account
                </Button>
              </div>
            </div>
          </Card>

          {/* Save */}
          <div className="animate-fade-up delay-375 pb-6">
            <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </main>
      </div>
    </div>
  )
}
