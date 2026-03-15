'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Brain, Zap, Target, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/40 backdrop-blur-sm sticky top-0 z-50 animate-fade-in">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-sm shadow-primary/30">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                InterviewSense
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/sign-in">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Get Started <ArrowRight /></Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="space-y-8 text-center">
          <div className="space-y-5 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium">
              <Zap className="h-3.5 w-3.5" />
              AI-Powered Interview Coaching
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-balance leading-tight">
              Master Your Interview Skills with{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI Coaching
              </span>
            </h1>
            <p className="text-xl text-muted-foreground text-balance mx-auto max-w-2xl leading-relaxed">
              Practice behavioral, technical, and system design interviews with real-time AI feedback, personalized coaching, and performance analytics.
            </p>
          </div>

          <div className="flex gap-3 justify-center animate-fade-up delay-150">
            <Link href="/interview/new">
              <Button size="lg">
                <Zap />
                Start Free Interview
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="lg" variant="outline">
                Create Account
                <ArrowRight />
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground animate-fade-up delay-225">
            Sign in or create an account to start — no credit card required
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-3 animate-fade-up text-balance">Why Choose InterviewSense?</h2>
        <p className="text-center text-muted-foreground mb-12 animate-fade-up delay-75">Everything you need to land your dream job.</p>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Brain,
              color: 'text-primary',
              bg: 'bg-primary/10',
              title: 'AI-Powered Coaching',
              desc: 'Get real-time feedback from our advanced AI interviewer trained on industry standards and best practices.',
              delay: 'delay-75',
            },
            {
              icon: Target,
              color: 'text-accent',
              bg: 'bg-accent/10',
              title: 'Multiple Interview Types',
              desc: 'Practice behavioral, technical, system design, and product manager interviews with company-specific questions.',
              delay: 'delay-150',
            },
            {
              icon: TrendingUp,
              color: 'text-secondary',
              bg: 'bg-secondary/10',
              title: 'Performance Analytics',
              desc: 'Track your improvement over time with detailed reports and actionable insights on your interview performance.',
              delay: 'delay-225',
            },
          ].map(({ icon: Icon, color, bg, title, desc, delay }) => (
            <Card
              key={title}
              className={`bg-card/50 border-border/40 p-8 space-y-4 hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 animate-fade-up ${delay}`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="text-muted-foreground leading-relaxed">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-3 text-balance">How It Works</h2>
        <p className="text-center text-muted-foreground mb-12">Four simple steps to interview mastery.</p>

        <div className="grid gap-8 md:grid-cols-4">
          {[
            { step: 1, title: 'Choose Interview Type', description: 'Select from behavioral, technical, or system design interviews', delay: '' },
            { step: 2, title: 'Pick a Company', description: 'Practice with real questions from top tech companies', delay: 'delay-75' },
            { step: 3, title: 'Interview with AI', description: 'Have a live conversation with our AI interviewer', delay: 'delay-150' },
            { step: 4, title: 'Get Feedback', description: 'Receive detailed analytics and improvement recommendations', delay: 'delay-225' },
          ].map((item) => (
            <div key={item.step} className={`space-y-4 animate-fade-up ${item.delay}`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-lg border border-primary/30">
                {item.step}
              </div>
              <h3 className="font-bold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Built on Google AI */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { value: 'Gemini Live API', label: 'Real-time voice AI by Google', delay: '' },
            { value: 'Multimodal', label: 'Voice + screen understanding', delay: 'delay-75' },
            { value: 'Zero latency', label: 'Native audio, no transcription lag', delay: 'delay-150' },
          ].map(({ value, label, delay }) => (
            <Card
              key={label}
              className={`bg-card/50 border-border/40 p-8 text-center space-y-2 hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300 animate-fade-up ${delay}`}
            >
              <p className="text-2xl font-bold text-primary">{value}</p>
              <p className="text-muted-foreground text-sm">{label}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features List */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-2 items-center">
          <div className="space-y-6 animate-slide-in-left">
            <h2 className="text-3xl font-bold text-balance">Everything You Need to Succeed</h2>
            <div className="space-y-3">
              {[
                'Real-time AI feedback during interviews',
                'Curated questions from top companies',
                'Video recording and playback',
                'Detailed performance reports',
                'Interview transcript and analysis',
                'Personalized improvement plans',
              ].map((feature, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 animate-fade-up delay-${i * 75 + 75}`}
                >
                  <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <Card className="bg-gradient-to-br from-primary/15 to-accent/8 border-primary/30 p-10 flex flex-col justify-center space-y-5 animate-scale-in delay-150">
            <h3 className="text-2xl font-bold text-balance">Ready to Master Your Interviews?</h3>
            <p className="text-muted-foreground leading-relaxed">
              Join thousands of professionals who have improved their interview skills with InterviewSense.
            </p>
            <Link href="/interview/new">
              <Button className="w-full" size="lg">
                Sign In to Start Your First Interview
                <ArrowRight />
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/30 mt-20">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-bold">InterviewSense</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {'© 2026 InterviewSense. All rights reserved.'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
