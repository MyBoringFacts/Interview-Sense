'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReportCardProps {
  title: string
  score: number
  date: string
  category: string
  highlights: string[]
  improvements: string[]
  animationDelay?: string
}

export function ReportCard({
  title,
  score,
  date,
  category,
  highlights,
  improvements,
  animationDelay = '',
}: ReportCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-green-400'
    if (score >= 7)   return 'text-blue-400'
    if (score >= 5.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getBarColor = (score: number) => {
    if (score >= 8.5) return 'bg-green-500'
    if (score >= 7)   return 'bg-blue-500'
    if (score >= 5.5) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card
      className={cn(
        'bg-card/60 border-border/40 overflow-hidden hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 animate-fade-up group',
        animationDelay
      )}
    >
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-bold text-foreground truncate">{title}</h3>
            <p className="text-xs text-muted-foreground">{date} &middot; {category}</p>
          </div>
          <div className={cn('text-right shrink-0', getScoreColor(score))}>
            <p className="text-3xl font-bold tabular-nums">{score.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">out of 10</p>
          </div>
        </div>

        {/* Score bar */}
        <div className="w-full bg-muted/20 rounded-full h-1.5 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700 ease-out', getBarColor(score))}
            style={{ width: `${(score / 10) * 100}%` }}
          />
        </div>

        {/* Highlights and Improvements */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-400" />
              Strengths
            </p>
            <ul className="space-y-1">
              {highlights.map((h, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                  &bull; {h}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5 text-yellow-400" />
              To Improve
            </p>
            <ul className="space-y-1">
              {improvements.map((imp, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                  &bull; {imp}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full opacity-80 group-hover:opacity-100 transition-opacity"
        >
          View Detailed Report
        </Button>
      </div>
    </Card>
  )
}
