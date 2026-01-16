# Risk Engine Frontend

Modern React frontend for the Risk Engine application with glassmorphic UI design.

## Tech Stack

- **Vite** - Fast build tool
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **TanStack Query (React Query)** - Server state management
- **Zustand** - Client state management
- **Framer Motion** - Animations
- **Recharts** - Data visualization
- **React Hook Form + Zod** - Form handling and validation
- **Axios** - HTTP client

## Getting Started

### Prerequisites

- Node.js v20.11.0 or higher
- npm 9.6.7 or higher

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server (runs on http://localhost:3000)
npm run dev
```

The frontend will proxy API requests to the Flask backend running on `http://localhost:5000`.

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Linting

```bash
# Run ESLint
npm run lint
```

## Project Structure

```
src/
├── api/                    # API client layer
│   ├── client.ts           # Axios instance
│   ├── endpoints.ts        # API route constants
│   ├── types.ts            # TypeScript interfaces
│   ├── services/           # API service functions
│   └── hooks/              # React Query hooks
├── components/
│   ├── ui/                 # Base UI components
│   ├── common/             # Shared components (GlassCard, etc.)
│   ├── portfolio/          # Portfolio builder components
│   ├── risk-metrics/       # VaR/ES calculation UI
│   └── risk-analysis/      # Risk analysis dashboard
├── pages/                  # Page components
├── store/                  # Zustand stores
├── hooks/                  # Custom hooks
├── lib/                    # Utilities and constants
├── providers/              # React context providers
├── styles/                 # Global styles
└── types/                  # TypeScript types
```

## Environment Variables

Create a `.env.local` file in the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_ENABLE_LLM=true
```

## Features

### Completed
- ✅ Project setup (Vite + React + TypeScript)
- ✅ Tailwind CSS with glassmorphic design
- ✅ API client layer with React Query hooks
- ✅ Zustand portfolio store with localStorage persistence
- ✅ Theme provider (dark/light mode)
- ✅ Base UI components (GlassCard, Button, Input, Select, Checkbox, Slider, etc.)
- ✅ Portfolio Builder (TickerSearch with autocomplete, HoldingsTable with inline editing)
- ✅ Risk Metrics Panel (VaR/ES calculation with Historical/Parametric/Monte Carlo methods)
- ✅ Risk Analysis Dashboard:
  - Risk assessment badge (LOW/MODERATE/HIGH/SEVERE)
  - Risk facts display with key metrics
  - Component VaR chart (horizontal bars)
  - Component VaR table (sortable, detailed breakdown)
  - LLM recommendations display (markdown rendering)
  - Backtesting results visualization (Kupiec test)
- ✅ Comprehensive documentation

### Future Enhancements
- 📋 Time series charts for historical VaR
- 📋 Correlation heatmap visualization
- 📋 Asset allocation pie charts
- 📋 Export to PDF/CSV
- 📋 Multi-portfolio comparison

## Usage Guide

### 1. Portfolio Builder Tab

**Search and Add Holdings:**
1. Type a ticker symbol (e.g., "AAPL") in the search box
2. Select from autocomplete results
3. Enter number of shares
4. Click "Add to Portfolio"

**Manage Holdings:**
- **Edit Shares**: Click on the shares number in the table to edit inline
- **Remove**: Click the X button next to a holding
- **Clear All**: Remove all holdings at once

Portfolio data persists in localStorage and will be available when you return.

### 2. Risk Metrics Tab

**Calculate VaR or ES:**
1. **Select Metric**: Choose Value at Risk (VaR) or Expected Shortfall (ES)
2. **Choose Method**:
   - **Historical**: Uses actual historical return data
   - **Parametric**: Assumes normal distribution of returns
   - **Monte Carlo**: Simulates thousands of future scenarios
     - Bootstrap: Resamples from historical data
     - Normal: Assumes normal distribution
     - Student-t: Accounts for fat tails (more realistic)
3. **Configure Parameters**:
   - Confidence Level: 90%, 95%, or 99% (typical: 95%)
   - Horizon Days: Forecast period, usually 1-10 days
   - Lookback Days: Historical window, typically 252 (1 year)
   - Monte Carlo Simulations: 1000-10000 paths
   - Degrees of Freedom: For Student-t (5-10 typical)
4. **Compute**: Click the button to run the calculation
5. **Review Results**: View VaR/ES dollars, log returns, and holdings breakdown

### 3. Risk Analysis Tab

**Comprehensive Portfolio Analysis:**
1. **Configure Analysis**:
   - Set confidence level (e.g., 95%)
   - Set horizon days (e.g., 5 days)
   - Set lookback period (e.g., 252 days)
   - ✅ Enable Backtesting (validates model with historical data)
   - ✅ Enable Expected Shortfall (shows tail risk)
   - ✅ Enable AI Recommendations (experimental, requires backend LLM setup)
   - Add custom instructions for AI (optional)
2. **Analyze Risk**: Click the button
3. **Review Results**:
   - **Risk Level Badge**: Overall portfolio risk (LOW/MODERATE/HIGH/SEVERE)
   - **Risk Facts**: Key metrics like VaR%, max position weight, diversification
   - **Component VaR Chart**: Visual breakdown of risk by position
   - **Component VaR Table**: Detailed numbers with sorting
   - **AI Recommendations**: Markdown-formatted insights and suggestions
   - **Backtest Results**: Kupiec test validation (p-value interpretation)

**Understanding Risk Levels:**
- **LOW** (VaR < 2%): Portfolio risk is within acceptable limits
- **MODERATE** (2% ≤ VaR < 5%): Normal risk, consider diversification
- **HIGH** (5% ≤ VaR < 10%): Significant risk, review positions
- **SEVERE** (VaR ≥ 10%): Immediate action recommended

## Development Notes

- The app uses a tabbed interface for Portfolio Builder, Risk Metrics, and Risk Analysis
- Portfolio holdings persist in localStorage via Zustand
- API responses are cached by React Query for better performance
- Glassmorphic design achieved through backdrop-blur and custom CSS variables
- All API calls use React Query hooks for automatic loading/error states
- Dark/light mode preference saved to localStorage

## Backend Integration

The frontend expects the Flask backend to be running on `http://localhost:5000` with the following endpoints:

- `GET /universe?q={query}` - Search companies
- `POST /var` - Compute VaR
- `POST /es` - Compute ES
- `POST /risk/backtest` - Run backtesting
- `POST /risk/analysis` - Comprehensive risk analysis

CORS must be enabled in the Flask backend for `http://localhost:3000`.

## License

Private project for Risk Engine application.
