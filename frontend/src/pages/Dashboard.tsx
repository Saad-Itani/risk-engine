import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../providers/ThemeProvider'
import { PortfolioBuilder } from '../components/portfolio/PortfolioBuilder'
import { RiskMetricsPanel } from '../components/risk-metrics/RiskMetricsPanel'
import { RiskAnalysisPanel } from '../components/risk-analysis/RiskAnalysisPanel'

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'portfolio' | 'metrics' | 'analysis'>('portfolio')

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-card m-4 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Risk Engine
          </h1>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 hover:bg-secondary transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="glass-card mx-4 mb-4 rounded-xl p-2">
        <div className="flex gap-2">
          <TabButton
            active={activeTab === 'portfolio'}
            onClick={() => setActiveTab('portfolio')}
          >
            Portfolio Builder
          </TabButton>
          <TabButton
            active={activeTab === 'metrics'}
            onClick={() => setActiveTab('metrics')}
          >
            Risk Metrics
          </TabButton>
          <TabButton
            active={activeTab === 'analysis'}
            onClick={() => setActiveTab('analysis')}
          >
            Risk Analysis
          </TabButton>
        </div>
      </div>

      {/* Content */}
      <main className="mx-4 mb-4">
        {activeTab === 'portfolio' && <PortfolioBuilder />}

        {activeTab === 'metrics' && <RiskMetricsPanel />}

        {activeTab === 'analysis' && <RiskAnalysisPanel />}
      </main>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all ${
        active
          ? 'bg-primary text-primary-foreground shadow-lg'
          : 'hover:bg-secondary text-muted-foreground'
      }`}
    >
      {children}
    </button>
  )
}
