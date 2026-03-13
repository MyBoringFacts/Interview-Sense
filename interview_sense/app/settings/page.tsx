'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from '@/components/dashboard/header'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Bell, Lock, Palette, Zap, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    email: '',
    notifications: true,
    emailAlerts: false,
    difficulty: 'intermediate',
    theme: 'dark',
  })

  const sections = [
    { id: 'account',       label: 'Account',              icon: Lock,    iconColor: 'text-primary',   delay: 'delay-75' },
    { id: 'notifications', label: 'Notifications',        icon: Bell,    iconColor: 'text-secondary', delay: 'delay-150' },
    { id: 'preferences',   label: 'Interview Preferences', icon: Zap,    iconColor: 'text-accent',    delay: 'delay-225' },
    { id: 'appearance',    label: 'Appearance',            icon: Palette, iconColor: 'text-primary',   delay: 'delay-300' },
  ]

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
          <Card className={cn('bg-card/60 border-border/40 overflow-hidden animate-fade-up', sections[0].delay)}>
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
            </div>
          </Card>

          {/* Notifications */}
          <Card className={cn('bg-card/60 border-border/40 overflow-hidden animate-fade-up', sections[1].delay)}>
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
              <Bell className="h-4 w-4 text-secondary" />
              <h2 className="font-bold text-foreground">Notifications</h2>
            </div>
            <div className="p-6 divide-y divide-border/40 space-y-0">
              {[
                { key: 'notifications' as const, label: 'Interview Reminders',   sub: 'Get notified about upcoming scheduled interviews' },
                { key: 'emailAlerts'   as const, label: 'Email Alerts',          sub: 'Receive email updates about your performance' },
              ].map(({ key, label, sub }) => (
                <div key={key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, [key]: !settings[key] })}
                    className={cn(
                      'relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none',
                      settings[key] ? 'bg-primary' : 'bg-muted/40 border border-border/60'
                    )}
                    aria-checked={settings[key]}
                    role="switch"
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                        settings[key] ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Interview Preferences */}
          <Card className={cn('bg-card/60 border-border/40 overflow-hidden animate-fade-up', sections[2].delay)}>
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
              <Zap className="h-4 w-4 text-accent" />
              <h2 className="font-bold text-foreground">Interview Preferences</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-foreground mb-3">Default Difficulty</label>
              <div className="flex gap-2">
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSettings({ ...settings, difficulty: level })}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200 active:scale-95',
                      settings.difficulty === level
                        ? 'bg-primary text-white shadow-sm shadow-primary/30'
                        : 'bg-card/60 border border-border/40 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Appearance */}
          <Card className={cn('bg-card/60 border-border/40 overflow-hidden animate-fade-up', sections[3].delay)}>
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
              <Palette className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-foreground">Appearance</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-foreground mb-3">Theme</label>
              <div className="flex gap-2">
                {['light', 'dark', 'auto'].map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setSettings({ ...settings, theme })}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200 active:scale-95',
                      settings.theme === theme
                        ? 'bg-primary text-white shadow-sm shadow-primary/30'
                        : 'bg-card/60 border border-border/40 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Save */}
          <div className="animate-fade-up delay-375 pb-6">
            <Button className="w-full" size="lg">
              <Save />
              Save Changes
            </Button>
          </div>
        </main>
      </div>
    </div>
  )
}
