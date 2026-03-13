'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const interviewTypes = [
  {
    id: 'behavioral',
    title: 'Behavioral Interview',
    description: 'Practice answering behavioral questions using the STAR method',
    difficulty: 'All Levels',
    duration: '15–20 min',
  },
  {
    id: 'technical',
    title: 'Technical Round',
    description: 'Solve coding problems with AI assistance and real-time feedback',
    difficulty: 'Intermediate–Advanced',
    duration: '30–45 min',
  },
  {
    id: 'system-design',
    title: 'System Design',
    description: 'Architect scalable systems and communicate your design decisions',
    difficulty: 'Advanced',
    duration: '45–60 min',
  },
  {
    id: 'product',
    title: 'Product Manager',
    description: 'Practice product sense and strategy questions',
    difficulty: 'All Levels',
    duration: '20–30 min',
  },
]

const companies = [
  'Google', 'Amazon', 'Meta', 'Microsoft', 'Apple', 'Tesla',
  'Netflix', 'Airbnb', 'Uber', 'LinkedIn', 'Twitter', 'Stripe',
]

interface InterviewSetupProps {
  onStart: (config: { type: string; company?: string; role?: string }) => void
}

export function InterviewSetup({ onStart }: InterviewSetupProps) {
  const [selectedType, setSelectedType]       = useState<string | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [customRole, setCustomRole]           = useState('')

  const handleStart = () => {
    if (selectedType) {
      onStart({ type: selectedType, company: selectedCompany ?? undefined, role: customRole || undefined })
    }
  }

  const isReady = selectedType && (selectedCompany || customRole)

  return (
    <div className="space-y-8">
      {/* Interview Type Selection */}
      <div className="animate-fade-up">
        <h2 className="text-xl font-bold text-foreground mb-4">Select Interview Type</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {interviewTypes.map((type, i) => (
            <Card
              key={type.id}
              className={cn(
                'p-5 cursor-pointer transition-all duration-200 border-2 hover:-translate-y-0.5 animate-fade-up',
                i === 0 ? '' : i === 1 ? 'delay-75' : i === 2 ? 'delay-150' : 'delay-225',
                selectedType === type.id
                  ? 'border-primary bg-primary/10 shadow-sm shadow-primary/20'
                  : 'border-border/40 bg-card/40 hover:border-primary/50'
              )}
              onClick={() => setSelectedType(type.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-foreground">{type.title}</h3>
                {selectedType === type.id && (
                  <span className="h-2 w-2 rounded-full bg-primary animate-scale-in" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{type.description}</p>
              <div className="flex gap-2 text-xs">
                <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full font-medium">
                  {type.difficulty}
                </span>
                <span className="px-2.5 py-1 bg-secondary/10 text-secondary rounded-full font-medium">
                  {type.duration}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Company Selection */}
      {selectedType && (
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl font-bold text-foreground">Choose Company <span className="text-muted-foreground font-normal text-base">(Optional)</span></h2>
          <div className="grid gap-2 grid-cols-3 md:grid-cols-6">
            {companies.map((company) => (
              <button
                key={company}
                onClick={() =>
                  setSelectedCompany(selectedCompany === company ? null : company)
                }
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95',
                  selectedCompany === company
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : 'bg-card/60 border border-border/40 text-foreground hover:border-primary/50 hover:-translate-y-px'
                )}
              >
                {company}
              </button>
            ))}
          </div>

          <div className="mt-2">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Or specify a custom role:
            </label>
            <input
              type="text"
              placeholder="e.g., Senior Software Engineer at Startup"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              className="w-full px-4 py-2.5 bg-input/60 border border-border/40 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>
      )}

      {/* Start Button */}
      <div className="flex gap-3 animate-fade-up delay-300">
        <Link href="/dashboard" className="flex-1">
          <Button variant="outline" className="w-full">Cancel</Button>
        </Link>
        <Button
          onClick={handleStart}
          disabled={!isReady}
          className="flex-1"
        >
          <Zap />
          Start Interview
          <ArrowRight />
        </Button>
      </div>
    </div>
  )
}
