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
    <div className="min-h-screen max-w-[1800px] mx-auto">
      {/* Header - Bloomberg Terminal Style */}
      <header className="terminal-card m-3 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-bloomberg mono tracking-tight">
              RISK_ENGINE
            </h1>
            <span className="text-xs text-muted-foreground mono">v1.0</span>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded p-2 hover:bg-secondary transition-all duration-150 border border-transparent hover:border-primary/30"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* Tabs - Compact Terminal Style */}
      <div className="terminal-card mx-3 mb-3 p-2">
        <div className="flex gap-1">
          <TabButton
            active={activeTab === 'portfolio'}
            onClick={() => setActiveTab('portfolio')}
          >
            PORTFOLIO
          </TabButton>
          <TabButton
            active={activeTab === 'metrics'}
            onClick={() => setActiveTab('metrics')}
          >
            VAR CALC
          </TabButton>
          <TabButton
            active={activeTab === 'analysis'}
            onClick={() => setActiveTab('analysis')}
          >
            ANALYSIS
          </TabButton>
        </div>
      </div>

      {/* Content - Compact spacing */}
      <main className="mx-3 mb-3">
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
      className={`px-4 py-2 rounded font-semibold text-xs mono tracking-wide transition-all duration-150 ${
        active
          ? 'bg-primary text-black border border-primary'
          : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
      }`}
    >
      {children}
    </button>
  )
}
