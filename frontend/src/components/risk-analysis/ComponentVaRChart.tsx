import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { ComponentVaR } from '../../api/types'

interface ComponentVaRChartProps {
  components: ComponentVaR[]
}

/**
 * Horizontal bar chart showing risk contribution by position
 */
export function ComponentVaRChart({ components }: ComponentVaRChartProps) {
  // Sort by percentage contribution (descending)
  const sortedData = [...components]
    .sort((a, b) => b.percentage_contribution - a.percentage_contribution)
    .map((c) => ({
      symbol: c.symbol,
      contribution: c.percentage_contribution * 100, // Convert to percentage
      weight: c.weight * 100,
    }))

  // Color gradient based on contribution
  const getBarColor = (value: number) => {
    if (value > 30) return '#ef4444' // red-500
    if (value > 20) return '#f97316' // orange-500
    if (value > 10) return '#eab308' // yellow-500
    return '#3b82f6' // blue-500
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            type="number"
            domain={[0, 'dataMax']}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
            stroke="currentColor"
            opacity={0.5}
          />
          <YAxis
            type="category"
            dataKey="symbol"
            stroke="currentColor"
            opacity={0.7}
            width={50}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'contribution') return [`${value.toFixed(2)}%`, 'Risk Contribution']
              if (name === 'weight') return [`${value.toFixed(2)}%`, 'Portfolio Weight']
              return [value, name]
            }}
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Bar dataKey="contribution" radius={[0, 8, 8, 0]}>
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.contribution)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
