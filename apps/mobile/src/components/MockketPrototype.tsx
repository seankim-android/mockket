/**
 * Mockket — Premium UI Prototype
 *
 * Self-contained web component. Uses Tailwind CSS + lucide-react only.
 * Inline styles handle anything Tailwind cannot express (SVG paths, CSS vars,
 * custom box-shadows, font-variant-numeric, keyframe animations).
 *
 * Covers: Portfolio · Markets · Agents · Challenges · Activity
 *         + Agent Profile overlay + Trade overlay
 */

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Search,
  Bell,
  X,
  Plus,
  Minus,
  BarChart2,
  Zap,
  Award,
  Clock,
  Activity,
  Check,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// ─── Design tokens ───────────────────────────────────────────────────────────

const C = {
  bg: {
    primary: "#0F172A",
    secondary: "#0D1526",
    surface: "#1E293B",
    elevated: "#243044",
  },
  text: {
    primary: "#F8FAFC",
    secondary: "#CBD5E1",
    muted: "#94A3B8",
    dim: "#64748B",
  },
  brand: "#10B981",
  brandSubtle: "rgba(16,185,129,0.12)",
  brandGlow: "rgba(16,185,129,0.18)",
  positive: "#10B981",
  negative: "#EF4444",
  negativeSubtle: "rgba(239,68,68,0.12)",
  border: "#334155",
  borderSubtle: "#1E293B",
  warning: "#F59E0B",
};

const cardStyle: React.CSSProperties = {
  background: C.bg.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
};

const glowGreen: React.CSSProperties = {
  boxShadow: "0 0 20px rgba(16,185,129,0.15)",
};

const tabularNums: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum"',
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const PORTFOLIO_VALUE = 127_843.62;
const PORTFOLIO_DAY_CHANGE = +2341.18;
const PORTFOLIO_DAY_PCT = +1.86;
const PORTFOLIO_CASH = 34_210.0;
const PORTFOLIO_INVESTED = 93_633.62;

const SPARKLINE_PORTFOLIO = [
  108000, 110200, 109400, 112800, 111200, 115600, 114100, 118300, 116800,
  120100, 119200, 122400, 121000, 124700, 123100, 125800, 124200, 127843,
];

const MARKETS = [
  {
    ticker: "NVDA",
    name: "NVIDIA",
    price: 875.4,
    change: +4.82,
    mktCap: "2.15T",
    spark: [820, 835, 828, 850, 842, 865, 858, 875],
  },
  {
    ticker: "AAPL",
    name: "Apple",
    price: 192.35,
    change: -0.73,
    mktCap: "2.98T",
    spark: [195, 194, 193.5, 194.2, 193, 192.8, 192.4, 192.35],
  },
  {
    ticker: "TSLA",
    name: "Tesla",
    price: 248.9,
    change: +3.21,
    mktCap: "792B",
    spark: [235, 238, 237, 241, 240, 244, 246, 248.9],
  },
  {
    ticker: "BTC",
    name: "Bitcoin",
    price: 62_450,
    change: +2.14,
    mktCap: "1.23T",
    spark: [60000, 60800, 60400, 61200, 61000, 62000, 61800, 62450],
  },
  {
    ticker: "ETH",
    name: "Ethereum",
    price: 3_284.5,
    change: -1.08,
    mktCap: "394B",
    spark: [3320, 3310, 3305, 3295, 3290, 3285, 3288, 3284.5],
  },
  {
    ticker: "MSFT",
    name: "Microsoft",
    price: 418.6,
    change: +0.94,
    mktCap: "3.11T",
    spark: [412, 413, 414.5, 415, 414, 416, 417, 418.6],
  },
];

const AGENTS = [
  {
    id: "marcus",
    name: 'Marcus "The Bull" Chen',
    shortName: "Marcus",
    risk: "high" as const,
    strategy: "Momentum · Stocks + Crypto",
    winRate: 0.68,
    totalReturn: +142.3,
    monthReturn: +18.7,
    aum: "$2.1M",
    trades: 847,
    hired: true,
    mode: "autopilot" as const,
    allocation: 45000,
    color: "#F59E0B",
    description:
      "Chases volume breakouts and momentum signals. Goes in heavy when the setup is right. Not for the faint-hearted.",
    recentTrades: [
      {
        action: "buy" as const,
        ticker: "NVDA",
        qty: 12,
        price: 868.2,
        time: "09:32",
        rationale:
          "Volume spike on $NVDA, classic breakout setup, went in heavy.",
      },
      {
        action: "buy" as const,
        ticker: "BTC",
        qty: 0.5,
        price: 61200,
        time: "06:00",
        rationale: "Momentum flush finished, accumulating at key level.",
      },
      {
        action: "sell" as const,
        ticker: "AAPL",
        qty: 8,
        price: 194.1,
        time: "Yesterday",
        rationale:
          "Volume dried up, rotation out of mega-cap into high-beta names.",
      },
    ],
  },
  {
    id: "priya",
    name: "Priya Sharma",
    shortName: "Priya",
    risk: "low" as const,
    strategy: "Value · Stocks Only",
    winRate: 0.74,
    totalReturn: +67.8,
    monthReturn: +4.2,
    aum: "$890K",
    trades: 312,
    hired: false,
    mode: "advisory" as const,
    allocation: 0,
    color: "#6366F1",
    description:
      "Deep fundamental research. Patient entries at value. Rarely wrong, never rushed.",
    recentTrades: [
      {
        action: "buy" as const,
        ticker: "MSFT",
        qty: 5,
        price: 412.5,
        time: "10:15",
        rationale:
          "P/E came down to an attractive entry point, initiated a 5% position.",
      },
      {
        action: "buy" as const,
        ticker: "AAPL",
        qty: 10,
        price: 189.8,
        time: "2d ago",
        rationale:
          "Services revenue accelerating, market ignoring the margin expansion.",
      },
      {
        action: "sell" as const,
        ticker: "TSLA",
        qty: 3,
        price: 245.0,
        time: "3d ago",
        rationale: "Valuation stretched relative to delivery numbers.",
      },
    ],
  },
];

const CHALLENGES = [
  {
    id: "c1",
    opponent: "Marcus",
    opponentReturn: +18.7,
    myReturn: +14.2,
    startDate: "Jan 20",
    endDate: "Feb 20",
    daysLeft: 0,
    hoursLeft: 14,
    minsLeft: 32,
    startBalance: 10000,
    status: "active" as const,
  },
];

const ACTIVITY = [
  {
    id: "a1",
    agent: "Marcus",
    action: "buy" as const,
    ticker: "NVDA",
    qty: 12,
    price: 868.2,
    total: 10418.4,
    time: "Today · 09:32",
    quote: "Volume spike on $NVDA, classic breakout setup, went in heavy.",
  },
  {
    id: "a2",
    agent: "You",
    action: "sell" as const,
    ticker: "TSLA",
    qty: 5,
    price: 248.1,
    total: 1240.5,
    time: "Today · 08:14",
    quote: "",
  },
  {
    id: "a3",
    agent: "Priya",
    action: "buy" as const,
    ticker: "MSFT",
    qty: 5,
    price: 412.5,
    total: 2062.5,
    time: "Today · 10:15",
    quote:
      "P/E came down to an attractive entry point, initiated a 5% position.",
  },
  {
    id: "a4",
    agent: "Marcus",
    action: "buy" as const,
    ticker: "BTC",
    qty: 0.5,
    price: 61200,
    total: 30600,
    time: "Yesterday · 06:00",
    quote: "Momentum flush finished, accumulating at key level.",
  },
  {
    id: "a5",
    agent: "You",
    action: "buy" as const,
    ticker: "AAPL",
    qty: 3,
    price: 191.2,
    total: 573.6,
    time: "Yesterday · 14:22",
    quote: "",
  },
];

// ─── Utility helpers ──────────────────────────────────────────────────────────

const fmt = (n: number, dec = 2) =>
  Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

// Build a tiny SVG path from an array of values, normalized to a viewBox
function sparkPath(
  values: number[],
  w: number,
  h: number,
  padding = 2
): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (w - padding * 2);
    const y = h - padding - ((v - min) / range) * (h - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return "M" + pts.join(" L");
}

function areaPath(
  values: number[],
  w: number,
  h: number,
  padding = 2
): string {
  const line = sparkPath(values, w, h, padding);
  const lastX = (w - padding).toFixed(1);
  const firstX = padding.toFixed(1);
  return `${line} L${lastX},${h} L${firstX},${h} Z`;
}

// ─── Atom components ──────────────────────────────────────────────────────────

const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <span
    style={{
      fontSize: 10,
      letterSpacing: "0.12em",
      fontWeight: 700,
      color: C.text.dim,
      textTransform: "uppercase",
      ...style,
    }}
  >
    {children}
  </span>
);

const DeltaBadge: React.FC<{ value: number; suffix?: string }> = ({
  value,
  suffix = "%",
}) => {
  const positive = value >= 0;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 12,
        fontWeight: 600,
        color: positive ? C.positive : C.negative,
        background: positive ? C.brandSubtle : C.negativeSubtle,
        borderRadius: 6,
        padding: "2px 7px",
        ...tabularNums,
      }}
    >
      {positive ? (
        <ArrowUpRight size={11} />
      ) : (
        <ArrowDownRight size={11} />
      )}
      {positive ? "+" : ""}
      {fmt(value)}
      {suffix}
    </span>
  );
};

const RiskBadge: React.FC<{ risk: "low" | "medium" | "high" | "degen" }> = ({
  risk,
}) => {
  const map = {
    low: { label: "LOW RISK", color: C.positive },
    medium: { label: "MED RISK", color: C.warning },
    high: { label: "HIGH RISK", color: "#F97316" },
    degen: { label: "DEGEN", color: C.negative },
  };
  const { label, color } = map[risk];
  return (
    <span
      style={{
        fontSize: 9,
        letterSpacing: "0.1em",
        fontWeight: 700,
        color,
        background: `${color}18`,
        border: `1px solid ${color}40`,
        borderRadius: 4,
        padding: "2px 6px",
      }}
    >
      {label}
    </span>
  );
};

// ─── Skeleton / Empty / Error atoms ──────────────────────────────────────────

const Skeleton: React.FC<{ width?: string | number; height?: number; style?: React.CSSProperties }> = ({
  width = "100%",
  height = 16,
  style,
}) => (
  <div
    className="skeleton"
    style={{ width, height, borderRadius: 6, flexShrink: 0, ...style }}
  />
);

const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}> = ({ icon, title, body, action }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
      gap: 12,
      textAlign: "center",
    }}
  >
    <div style={{ color: C.text.dim, marginBottom: 4 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: C.text.secondary }}>{title}</div>
    <div style={{ fontSize: 13, color: C.text.dim, lineHeight: 1.5, maxWidth: 220 }}>{body}</div>
    {action && (
      <button
        onClick={action.onClick}
        style={{
          marginTop: 8,
          background: C.brand,
          border: "none",
          borderRadius: 8,
          color: "#fff",
          fontWeight: 700,
          fontSize: 13,
          padding: "10px 20px",
          cursor: "pointer",
          ...glowGreen,
        }}
      >
        {action.label}
      </button>
    )}
  </div>
);

const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
      gap: 12,
      textAlign: "center",
    }}
  >
    <AlertCircle size={32} color={C.negative} />
    <div style={{ fontSize: 15, fontWeight: 700, color: C.text.secondary }}>
      Failed to load
    </div>
    <div style={{ fontSize: 13, color: C.text.dim, lineHeight: 1.5 }}>
      Check your connection and try again.
    </div>
    <button
      onClick={onRetry}
      style={{
        marginTop: 8,
        background: C.bg.elevated,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        color: C.text.secondary,
        fontWeight: 700,
        fontSize: 13,
        padding: "10px 20px",
        cursor: "pointer",
      }}
    >
      Retry
    </button>
  </div>
);

// Mini sparkline for market rows
const MiniSpark: React.FC<{ values: number[]; positive: boolean }> = ({
  values,
  positive,
}) => {
  const w = 48;
  const h = 20;
  const color = positive ? C.positive : C.negative;
  const pts = values
    .map((v, i) => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      const x = 1 + (i / (values.length - 1)) * (w - 2);
      const y = h - 1 - ((v - min) / range) * (h - 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Win-rate filled bar
const WinBar: React.FC<{ rate: number; color: string }> = ({ rate, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div
      style={{
        flex: 1,
        height: 5,
        background: C.border,
        borderRadius: 99,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${rate * 100}%`,
          height: "100%",
          background: color,
          borderRadius: 99,
          transition: "width 0.8s cubic-bezier(.16,1,.3,1)",
        }}
      />
    </div>
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: C.text.primary,
        width: 36,
        textAlign: "right",
        ...tabularNums,
      }}
    >
      {Math.round(rate * 100)}%
    </span>
  </div>
);

// ─── Portfolio sparkline chart ────────────────────────────────────────────────

const PortfolioChart: React.FC<{ period: string }> = ({ period }) => {
  const values = SPARKLINE_PORTFOLIO;
  const w = 340;
  const h = 120;
  const id = "pgrd";

  const linePath = sparkPath(values, w, h, 0);
  const fillPath = areaPath(values, w, h, 0);

  const timeLabels: Record<string, string[]> = {
    "1W": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "1M": ["Jan 25", "Feb 1", "Feb 8", "Feb 15", "Feb 20"],
    "3M": ["Dec", "Jan", "Feb"],
  };
  const labels = timeLabels[period] || timeLabels["1M"];

  return (
    <div style={{ width: "100%", padding: "0 0 4px" }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: "100%", height: "auto", overflow: "visible" }}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.positive} stopOpacity="0.22" />
            <stop offset="100%" stopColor={C.positive} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Subtle grid lines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            y1={h * f}
            x2={w}
            y2={h * f}
            stroke={C.border}
            strokeWidth={0.5}
            strokeDasharray="4 6"
          />
        ))}
        {/* Area fill */}
        <path d={fillPath} fill={`url(#${id})`} />
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={C.positive}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* End dot */}
        {(() => {
          const last = values[values.length - 1];
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min || 1;
          const cx = w;
          const cy = h - ((last - min) / range) * h;
          return (
            <g>
              <circle cx={cx} cy={cy} r={5} fill={C.positive} opacity={0.25} />
              <circle cx={cx} cy={cy} r={2.5} fill={C.positive} />
            </g>
          );
        })()}
      </svg>
      {/* Time axis labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          padding: "0 2px",
        }}
      >
        {labels.map((l) => (
          <span
            key={l}
            style={{ fontSize: 10, color: C.text.dim, letterSpacing: "0.04em" }}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
};

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: "portfolio", label: "Portfolio", Icon: BarChart2 },
  { id: "markets", label: "Markets", Icon: TrendingUp },
  { id: "agents", label: "Agents", Icon: Zap },
  { id: "challenges", label: "Challenge", Icon: Award },
  { id: "activity", label: "Activity", Icon: Activity },
];

const TabBar: React.FC<{
  active: string;
  onChange: (t: string) => void;
}> = ({ active, onChange }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-around",
      background: C.bg.surface,
      borderTop: `1px solid ${C.border}`,
      padding: "8px 0 12px",
    }}
  >
    {TABS.map(({ id, label, Icon }) => {
      const isActive = active === id;
      return (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            padding: "0 4px",
            position: "relative",
          }}
        >
          {/* Emerald pill indicator above icon */}
          <div
            style={{
              width: isActive ? 20 : 0,
              height: 3,
              background: C.brand,
              borderRadius: 99,
              marginBottom: 2,
              transition: "width 0.25s cubic-bezier(.16,1,.3,1)",
              boxShadow: isActive ? `0 0 8px ${C.brand}` : "none",
            }}
          />
          <Icon
            size={20}
            color={isActive ? C.brand : C.text.dim}
            strokeWidth={isActive ? 2 : 1.5}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: isActive ? 700 : 400,
              color: isActive ? C.brand : C.text.dim,
              letterSpacing: "0.04em",
            }}
          >
            {label}
          </span>
        </button>
      );
    })}
  </div>
);

// ─── Portfolio tab ────────────────────────────────────────────────────────────

const PortfolioTab: React.FC<{ onOpenTrade: () => void; loading?: boolean; error?: boolean; onRetry?: () => void }> = ({
  onOpenTrade,
  loading = false,
  error = false,
  onRetry,
}) => {
  const [period, setPeriod] = useState("1M");

  if (error) {
    return <ErrorState onRetry={onRetry ?? (() => {})} />;
  }

  if (loading) {
    return (
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header skeleton */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton width={140} height={12} />
            <Skeleton width={200} height={40} />
            <Skeleton width={160} height={22} />
          </div>
          <Skeleton width={72} height={40} style={{ borderRadius: 10 }} />
        </div>
        {/* Chart skeleton */}
        <div style={{ ...cardStyle, padding: "16px 16px 8px" }}>
          <Skeleton width={120} height={28} style={{ marginBottom: 14, borderRadius: 8 }} />
          <Skeleton width="100%" height={120} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            {[48, 48, 60, 48, 48].map((w, i) => <Skeleton key={i} width={w} height={10} />)}
          </div>
        </div>
        {/* Stats skeleton */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ ...cardStyle, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton width={60} height={10} />
              <Skeleton width={100} height={22} />
            </div>
          ))}
        </div>
        {/* Holdings skeleton */}
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: i < 3 ? `1px solid ${C.borderSubtle}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Skeleton width={40} height={40} style={{ borderRadius: 10 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Skeleton width={50} height={14} />
                  <Skeleton width={100} height={11} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                <Skeleton width={60} height={14} />
                <Skeleton width={40} height={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const holdings = [
    {
      ticker: "NVDA",
      name: "NVIDIA",
      qty: 12,
      avgCost: 842.1,
      price: 875.4,
      value: 10504.8,
      change: +3.95,
    },
    {
      ticker: "BTC",
      name: "Bitcoin",
      qty: 0.5,
      avgCost: 58000,
      price: 62450,
      value: 31225,
      change: +7.67,
    },
    {
      ticker: "MSFT",
      name: "Microsoft",
      qty: 10,
      avgCost: 405.2,
      price: 418.6,
      value: 4186,
      change: +3.31,
    },
    {
      ticker: "TSLA",
      name: "Tesla",
      qty: 8,
      avgCost: 260.0,
      price: 248.9,
      value: 1991.2,
      change: -4.27,
    },
  ];

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Label>Total Portfolio Value</Label>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: C.text.primary,
              letterSpacing: "-1.5px",
              lineHeight: 1.1,
              marginTop: 4,
              ...tabularNums,
            }}
          >
            ${fmt(PORTFOLIO_VALUE)}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 6,
            }}
          >
            <DeltaBadge value={PORTFOLIO_DAY_CHANGE} suffix="" />
            <DeltaBadge value={PORTFOLIO_DAY_PCT} />
            <span style={{ fontSize: 11, color: C.text.dim }}>Today</span>
          </div>
        </div>
        <button
          onClick={onOpenTrade}
          style={{
            background: C.brand,
            border: "none",
            borderRadius: 10,
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            padding: "10px 16px",
            cursor: "pointer",
            ...glowGreen,
          }}
        >
          Trade
        </button>
      </div>

      {/* Chart card */}
      <div style={{ ...cardStyle, padding: "16px 16px 8px" }}>
        {/* Period selector */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 14,
            background: C.bg.primary,
            borderRadius: 8,
            padding: 3,
          }}
        >
          {["1W", "1M", "3M"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                flex: 1,
                background: period === p ? C.bg.elevated : "transparent",
                border: "none",
                borderRadius: 6,
                color: period === p ? C.text.primary : C.text.dim,
                fontWeight: period === p ? 700 : 400,
                fontSize: 12,
                padding: "5px 0",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {p}
            </button>
          ))}
        </div>
        <PortfolioChart period={period} />
      </div>

      {/* Cash / Invested summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "Invested", value: PORTFOLIO_INVESTED, color: C.positive },
          { label: "Cash", value: PORTFOLIO_CASH, color: C.text.muted },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{ ...cardStyle, padding: "14px 16px" }}
          >
            <Label>{label}</Label>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color,
                marginTop: 5,
                ...tabularNums,
              }}
            >
              ${fmt(value, 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Holdings */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Label>Holdings</Label>
          <Label>{holdings.length} positions</Label>
        </div>
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          {holdings.length === 0 ? (
            <EmptyState
              icon={<BarChart2 size={36} />}
              title="No positions yet"
              body="Make your first trade to start building your portfolio."
              action={{ label: "Trade Now", onClick: onOpenTrade }}
            />
          ) : holdings.map((h, i) => {
            const pos = h.change >= 0;
            return (
              <div
                key={h.ticker}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  borderBottom:
                    i < holdings.length - 1
                      ? `1px solid ${C.borderSubtle}`
                      : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: C.bg.elevated,
                      border: `1px solid ${C.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 800,
                      color: C.text.primary,
                      letterSpacing: "0.03em",
                    }}
                  >
                    {h.ticker.slice(0, 3)}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: C.text.primary,
                      }}
                    >
                      {h.ticker}
                    </div>
                    <div style={{ fontSize: 11, color: C.text.dim, marginTop: 1 }}>
                      {h.qty} shares · avg {fmtUSD(h.avgCost)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: C.text.primary,
                      ...tabularNums,
                    }}
                  >
                    ${fmt(h.value, 0)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: pos ? C.positive : C.negative,
                      marginTop: 2,
                      ...tabularNums,
                    }}
                  >
                    {pct(h.change)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Markets tab ──────────────────────────────────────────────────────────────

const MarketsTab: React.FC<{ onSelectTicker: (t: string) => void; loading?: boolean; error?: boolean; onRetry?: () => void }> = ({
  onSelectTicker,
  loading = false,
  error = false,
  onRetry,
}) => {
  const [query, setQuery] = useState("");
  const filtered = MARKETS.filter(
    (m) =>
      m.ticker.toLowerCase().includes(query.toLowerCase()) ||
      m.name.toLowerCase().includes(query.toLowerCase())
  );

  if (error) return <ErrorState onRetry={onRetry ?? (() => {})} />;

  if (loading) {
    return (
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Skeleton width={100} height={28} style={{ borderRadius: 6 }} />
          <Skeleton width={90} height={30} style={{ borderRadius: 8 }} />
        </div>
        <Skeleton width="100%" height={44} style={{ borderRadius: 10 }} />
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ padding: "8px 16px", borderBottom: `1px solid ${C.border}` }}>
            <Skeleton width="100%" height={12} />
          </div>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "0 16px", alignItems: "center", padding: "13px 16px", borderBottom: i < 5 ? `1px solid ${C.borderSubtle}` : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <Skeleton width={50} height={14} />
                <Skeleton width={80} height={11} />
              </div>
              <Skeleton width={48} height={20} />
              <Skeleton width={60} height={14} />
              <Skeleton width={44} height={12} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text.primary, letterSpacing: "-0.5px" }}>
          Markets
        </h1>
        {/* Market status badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "rgba(16,185,129,0.1)",
            border: `1px solid rgba(16,185,129,0.3)`,
            borderRadius: 8,
            padding: "5px 10px",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: C.positive,
              boxShadow: `0 0 6px ${C.positive}`,
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.positive }}>
            NYSE OPEN
          </span>
        </div>
      </div>

      {/* Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: C.bg.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "10px 14px",
        }}
      >
        <Search size={16} color={C.text.dim} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ticker or name…"
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            color: C.text.primary,
            fontSize: 14,
          }}
        />
      </div>

      {/* Market list */}
      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto auto",
            gap: "0 16px",
            padding: "8px 16px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          {["Asset", "Spark", "Price", "24h"].map((h) => (
            <Label key={h} style={{ textAlign: h === "Asset" ? "left" : "right" }}>
              {h}
            </Label>
          ))}
        </div>
        {filtered.map((m, i) => {
          const pos = m.change >= 0;
          return (
            <button
              key={m.ticker}
              onClick={() => onSelectTicker(m.ticker)}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto",
                gap: "0 16px",
                alignItems: "center",
                width: "100%",
                padding: "13px 16px",
                background: "none",
                border: "none",
                borderBottom:
                  i < filtered.length - 1
                    ? `1px solid ${C.borderSubtle}`
                    : "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {/* Asset info */}
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.text.primary,
                    fontFamily: "monospace",
                    letterSpacing: "0.03em",
                  }}
                >
                  {m.ticker}
                </div>
                <div style={{ fontSize: 11, color: C.text.dim, marginTop: 1 }}>
                  {m.name}
                </div>
              </div>
              {/* Mini sparkline */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <MiniSpark values={m.spark} positive={pos} />
              </div>
              {/* Price */}
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.text.primary,
                  textAlign: "right",
                  fontFamily: "monospace",
                  ...tabularNums,
                }}
              >
                {m.price >= 1000
                  ? `$${(m.price / 1000).toFixed(1)}k`
                  : `$${fmt(m.price)}`}
              </div>
              {/* Change */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: pos ? C.positive : C.negative,
                  textAlign: "right",
                  fontFamily: "monospace",
                  ...tabularNums,
                }}
              >
                {pct(m.change)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Agent card ───────────────────────────────────────────────────────────────

const AgentCard: React.FC<{
  agent: (typeof AGENTS)[0];
  onOpen: () => void;
}> = ({ agent, onOpen }) => {
  const riskColor =
    agent.risk === "low"
      ? C.positive
      : agent.risk === "high"
      ? "#F97316"
      : C.warning;

  return (
    <div
      style={{
        ...cardStyle,
        padding: 16,
        boxShadow: agent.hired ? `0 0 24px ${agent.color}1A` : "none",
        border: agent.hired
          ? `1px solid ${agent.color}40`
          : `1px solid ${C.border}`,
      }}
    >
      {/* Top row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Avatar with risk ring glow */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: `${agent.color}25`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              boxShadow: `0 0 0 2px ${riskColor}, 0 0 12px ${riskColor}60`,
              flexShrink: 0,
            }}
          >
            {agent.shortName[0]}
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: C.text.primary,
                lineHeight: 1.2,
              }}
            >
              {agent.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: C.text.dim,
                marginTop: 3,
              }}
            >
              {agent.strategy}
            </div>
          </div>
        </div>
        <RiskBadge risk={agent.risk} />
      </div>

      {/* Win rate bar */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 5,
          }}
        >
          <Label>Win Rate</Label>
          <Label>Month Return</Label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <WinBar rate={agent.winRate} color={agent.color} />
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: agent.monthReturn >= 0 ? C.positive : C.negative,
              ...tabularNums,
            }}
          >
            {pct(agent.monthReturn)}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[
          { label: "Total Return", value: pct(agent.totalReturn) },
          { label: "AUM", value: agent.aum },
          { label: "Trades", value: agent.trades.toString() },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: C.bg.primary,
              borderRadius: 8,
              padding: "8px 10px",
              textAlign: "center",
            }}
          >
            <Label style={{ display: "block", marginBottom: 3 }}>{label}</Label>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.text.primary,
                ...tabularNums,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Action row */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onOpen}
          style={{
            flex: 1,
            background: C.bg.primary,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.text.secondary,
            fontWeight: 600,
            fontSize: 13,
            padding: "9px 0",
            cursor: "pointer",
          }}
        >
          Profile
        </button>
        {agent.hired ? (
          <div
            style={{
              flex: 2,
              background: C.bg.elevated,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.text.muted,
              fontWeight: 600,
              fontSize: 13,
              padding: "9px 0",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <Check size={13} color={C.positive} />
            Managing · Autopilot
          </div>
        ) : (
          <button
            style={{
              flex: 2,
              background: C.brand,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              padding: "9px 0",
              cursor: "pointer",
              ...glowGreen,
            }}
          >
            Hire Agent
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Agents tab ───────────────────────────────────────────────────────────────

const AgentsTab: React.FC<{
  onOpenAgent: (id: string) => void;
  loading?: boolean;
}> = ({ onOpenAgent, loading = false }) => {
  if (loading) {
    return (
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Skeleton width={180} height={28} style={{ borderRadius: 6 }} />
          <Skeleton width={56} height={26} style={{ borderRadius: 6 }} />
        </div>
        {[0, 1].map((i) => (
          <div key={i} style={{ ...cardStyle, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Skeleton width={48} height={48} style={{ borderRadius: "50%" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Skeleton width={140} height={15} />
                  <Skeleton width={100} height={11} />
                </div>
              </div>
              <Skeleton width={60} height={20} style={{ borderRadius: 4 }} />
            </div>
            <Skeleton width="100%" height={8} style={{ borderRadius: 99 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {[0, 1, 2].map((j) => <Skeleton key={j} width="100%" height={50} style={{ borderRadius: 8 }} />)}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Skeleton width="33%" height={38} style={{ borderRadius: 8 }} />
              <Skeleton width="67%" height={38} style={{ borderRadius: 8 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
  <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: C.text.primary,
          letterSpacing: "-0.5px",
        }}
      >
        Agent Marketplace
      </h1>
      <span
        style={{
          fontSize: 11,
          color: C.text.dim,
          background: C.bg.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          padding: "4px 8px",
        }}
      >
        2 hired
      </span>
    </div>
    {AGENTS.map((a) => (
      <AgentCard key={a.id} agent={a} onOpen={() => onOpenAgent(a.id)} />
    ))}
    {/* V2 teaser */}
    <div
      style={{
        ...cardStyle,
        padding: 16,
        opacity: 0.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text.primary }}>
          + 4 more agents
        </div>
        <div style={{ fontSize: 11, color: C.text.dim, marginTop: 2 }}>
          HODL Hannah · The Quant · The Degen · Elena
        </div>
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: C.brand,
          background: C.brandSubtle,
          border: `1px solid rgba(16,185,129,0.3)`,
          borderRadius: 6,
          padding: "4px 8px",
          letterSpacing: "0.08em",
        }}
      >
        V2
      </div>
    </div>
  </div>
  );
};

// ─── Challenge tab ────────────────────────────────────────────────────────────

const ChallengesTab: React.FC<{ onNewChallenge?: () => void }> = ({ onNewChallenge }) => {
  const ch = CHALLENGES[0];

  if (!ch) {
    return (
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text.primary, letterSpacing: "-0.5px" }}>Challenge</h1>
          <button
            onClick={onNewChallenge}
            style={{ display: "flex", alignItems: "center", gap: 5, background: C.brand, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 12, padding: "8px 12px", cursor: "pointer", ...glowGreen }}
          >
            <Plus size={13} /> New
          </button>
        </div>
        <EmptyState
          icon={<Award size={36} />}
          title="No active challenges"
          body="Challenge Marcus, Priya, or a friend and see who makes the best trades."
          action={{ label: "Start a Challenge", onClick: onNewChallenge ?? (() => {}) }}
        />
      </div>
    );
  }

  const myPct = ch.myReturn;
  const theirPct = ch.opponentReturn;
  const total = Math.abs(myPct) + Math.abs(theirPct);
  const myShare = Math.abs(myPct) / total;
  const theyWinning = theirPct > myPct;

  // Animated progress tick
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const totalSecs = ch.hoursLeft * 3600 + ch.minsLeft * 60;
  const elapsed = tick % totalSecs;
  const hh = Math.floor((totalSecs - elapsed) / 3600);
  const mm = Math.floor(((totalSecs - elapsed) % 3600) / 60);
  const ss = (totalSecs - elapsed) % 60;

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: C.text.primary,
            letterSpacing: "-0.5px",
          }}
        >
          Challenge
        </h1>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: C.brand,
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontWeight: 700,
            fontSize: 12,
            padding: "8px 12px",
            cursor: "pointer",
            ...glowGreen,
          }}
        >
          <Plus size={13} />
          New
        </button>
      </div>

      {/* Active challenge card */}
      <div
        style={{
          ...cardStyle,
          padding: 20,
          border: `1px solid ${C.border}`,
          background: "linear-gradient(160deg, #1E293B 0%, #1a2844 100%)",
        }}
      >
        {/* Status row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: C.positive,
                boxShadow: `0 0 8px ${C.positive}`,
                animation: "pulse 1.5s infinite",
              }}
            />
            <Label style={{ color: C.positive }}>Live Challenge</Label>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 8,
              padding: "5px 10px",
            }}
          >
            <Clock size={12} color={C.text.dim} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.text.primary,
                fontFamily: "monospace",
                ...tabularNums,
              }}
            >
              {String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}:
              {String(ss).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* VS layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 40px 1fr",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {/* Me */}
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 12, color: C.text.dim, marginBottom: 4 }}>
              You
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: theyWinning ? C.text.secondary : C.positive,
                letterSpacing: "-0.5px",
                ...tabularNums,
              }}
            >
              {pct(myPct)}
            </div>
            <div style={{ fontSize: 11, color: C.text.dim, marginTop: 3 }}>
              ${fmt(ch.startBalance * (1 + myPct / 100), 0)}
            </div>
          </div>

          {/* VS */}
          <div
            style={{
              textAlign: "center",
              fontSize: 13,
              fontWeight: 900,
              color: C.text.dim,
              letterSpacing: "0.1em",
            }}
          >
            VS
          </div>

          {/* Opponent */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: C.text.dim, marginBottom: 4 }}>
              {ch.opponent}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: theyWinning ? "#F97316" : C.text.secondary,
                letterSpacing: "-0.5px",
                ...tabularNums,
              }}
            >
              {pct(theirPct)}
            </div>
            <div style={{ fontSize: 11, color: C.text.dim, marginTop: 3 }}>
              ${fmt(ch.startBalance * (1 + theirPct / 100), 0)}
            </div>
          </div>
        </div>

        {/* Battle bar */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              height: 8,
              borderRadius: 99,
              overflow: "hidden",
              gap: 2,
            }}
          >
            <div
              style={{
                flex: myShare,
                background: theyWinning
                  ? C.text.dim
                  : `linear-gradient(90deg, ${C.positive}, #34d399)`,
                borderRadius: "99px 0 0 99px",
                transition: "flex 0.8s cubic-bezier(.16,1,.3,1)",
              }}
            />
            <div
              style={{
                flex: 1 - myShare,
                background: theyWinning
                  ? "linear-gradient(90deg, #F97316, #fb923c)"
                  : C.text.dim,
                borderRadius: "0 99px 99px 0",
                transition: "flex 0.8s cubic-bezier(.16,1,.3,1)",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 5,
            }}
          >
            <span style={{ fontSize: 10, color: C.text.dim }}>
              You · {Math.round(myShare * 100)}%
            </span>
            <span style={{ fontSize: 10, color: C.text.dim }}>
              {ch.opponent} · {Math.round((1 - myShare) * 100)}%
            </span>
          </div>
        </div>

        {theyWinning && (
          <div
            style={{
              background: "rgba(249,115,22,0.08)",
              border: "1px solid rgba(249,115,22,0.25)",
              borderRadius: 8,
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={13} color="#F97316" />
            <span style={{ fontSize: 12, color: "#fb923c" }}>
              Marcus is ahead by{" "}
              <strong>{(theirPct - myPct).toFixed(1)}%</strong> — make a move.
            </span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 14,
          }}
        >
          <span style={{ fontSize: 11, color: C.text.dim }}>
            Started {ch.startDate}
          </span>
          <span style={{ fontSize: 11, color: C.text.dim }}>
            Ends {ch.endDate}
          </span>
        </div>
      </div>

      {/* New challenge prompt */}
      <div
        style={{
          ...cardStyle,
          padding: 20,
          textAlign: "center",
          borderStyle: "dashed",
        }}
      >
        <Award size={28} color={C.text.dim} style={{ margin: "0 auto 10px" }} />
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: C.text.secondary,
            marginBottom: 4,
          }}
        >
          Start a new challenge
        </div>
        <div style={{ fontSize: 12, color: C.text.dim, marginBottom: 14 }}>
          Beat Priya in a 1-month showdown
        </div>
        <button
          style={{
            background: C.bg.elevated,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.text.secondary,
            fontWeight: 600,
            fontSize: 13,
            padding: "9px 20px",
            cursor: "pointer",
          }}
        >
          Choose opponent
        </button>
      </div>
    </div>
  );
};

// ─── Activity tab ─────────────────────────────────────────────────────────────

const ActivityTab: React.FC = () => (
  <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
    <h1
      style={{
        fontSize: 22,
        fontWeight: 800,
        color: C.text.primary,
        letterSpacing: "-0.5px",
      }}
    >
      Activity
    </h1>
    <div style={{ ...cardStyle, overflow: "hidden" }}>
      {ACTIVITY.length === 0 ? (
        <EmptyState
          icon={<Activity size={36} />}
          title="No trades yet"
          body="Your trade history and agent activity will appear here."
        />
      ) : ACTIVITY.map((item, i) => {
        const isBuy = item.action === "buy";
        const dotColor = isBuy ? C.positive : C.negative;
        const isAgent = item.agent !== "You";
        return (
          <div
            key={item.id}
            style={{
              padding: "14px 16px",
              borderBottom:
                i < ACTIVITY.length - 1
                  ? `1px solid ${C.borderSubtle}`
                  : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              {/* Left: dot + info */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                {/* Status dot */}
                <div style={{ paddingTop: 3, flexShrink: 0 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: dotColor,
                      boxShadow: `0 0 8px ${dotColor}80`,
                    }}
                  />
                </div>
                <div>
                  {/* Agent + action line */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isAgent ? C.brand : C.text.secondary,
                      }}
                    >
                      {item.agent}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: isBuy ? C.positive : C.negative,
                        background: isBuy ? C.brandSubtle : C.negativeSubtle,
                        borderRadius: 4,
                        padding: "1px 5px",
                      }}
                    >
                      {item.action.toUpperCase()}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: C.text.primary,
                        fontFamily: "monospace",
                      }}
                    >
                      {item.ticker}
                    </span>
                    <span style={{ fontSize: 12, color: C.text.muted }}>
                      {item.qty} × ${fmt(item.price)}
                    </span>
                  </div>
                  {/* Quote */}
                  {item.quote && (
                    <p
                      style={{
                        fontSize: 12,
                        color: C.text.dim,
                        fontStyle: "italic",
                        marginTop: 4,
                        lineHeight: 1.5,
                        borderLeft: `2px solid ${C.brand}60`,
                        paddingLeft: 8,
                      }}
                    >
                      "{item.quote}"
                    </p>
                  )}
                  <div style={{ fontSize: 10, color: C.text.dim, marginTop: 4 }}>
                    {item.time}
                  </div>
                </div>
              </div>

              {/* Right: total value */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isBuy ? C.positive : C.negative,
                  flexShrink: 0,
                  ...tabularNums,
                }}
              >
                {isBuy ? "+" : "-"}${fmt(item.total, 0)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ─── Dev panel ────────────────────────────────────────────────────────────────

const LS_API_URL = "dev:apiUrl";
const LS_SECRET  = "dev:secret";

const DevPanel: React.FC = () => {
  const [mode, setMode]       = useState<"iex" | "test">("iex");
  const [busy, setBusy]       = useState(false);
  const [apiUrl, setApiUrl]   = useState(() => localStorage.getItem(LS_API_URL) ?? "");
  const [secret, setSecret]   = useState(() => localStorage.getItem(LS_SECRET) ?? "");
  const [editing, setEditing] = useState(!localStorage.getItem(LS_API_URL));
  const [err, setErr]         = useState("");

  const headers = (extra?: Record<string, string>) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
    ...extra,
  });

  useEffect(() => {
    if (!apiUrl || !secret) return;
    fetch(`${apiUrl}/dev/sim`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => setMode(d.mode))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveConfig = () => {
    localStorage.setItem(LS_API_URL, apiUrl.replace(/\/$/, ""));
    localStorage.setItem(LS_SECRET, secret);
    setEditing(false);
    setErr("");
    fetch(`${apiUrl.replace(/\/$/, "")}/dev/sim`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => setMode(d.mode))
      .catch(() => setErr("Could not reach backend"));
  };

  const toggle = async () => {
    if (!apiUrl || !secret) { setEditing(true); return; }
    setBusy(true);
    setErr("");
    const next = mode === "test" ? "iex" : "test";
    try {
      const r = await fetch(`${apiUrl}/dev/sim`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ mode: next }),
      });
      if (r.ok) setMode(next);
      else setErr(`Error ${r.status}`);
    } catch {
      setErr("Request failed");
    } finally {
      setBusy(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#0f172a",
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "8px 10px",
    color: C.text.primary,
    fontSize: 12,
    outline: "none",
  };

  return (
    <div style={{ padding: "0 16px 24px" }}>
      <div style={{ ...cardStyle, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.text.dim, textTransform: "uppercase" }}>
            Dev Tools
          </p>
          <button
            onClick={() => setEditing((v) => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.text.dim, fontSize: 11 }}
          >
            {editing ? "done" : "config"}
          </button>
        </div>

        {/* Config fields */}
        {editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              style={inputStyle}
              placeholder="API URL (e.g. https://your-app.railway.app)"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <input
              style={inputStyle}
              placeholder="DEV_SECRET"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <button
              onClick={saveConfig}
              style={{
                background: C.brand,
                border: "none",
                borderRadius: 8,
                padding: "8px 0",
                color: "#000",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Save & Connect
            </button>
          </div>
        )}

        {/* Toggle row */}
        {!editing && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text.primary }}>
                Alpaca Test Stream
              </p>
              <p style={{ fontSize: 11, color: err ? C.negative : C.text.dim, marginTop: 3 }}>
                {err || (mode === "test"
                  ? "ON · AAPL-only feed, works on weekends"
                  : "OFF · IEX feed, market hours only")}
              </p>
            </div>
            <button
              onClick={toggle}
              disabled={busy}
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                background: mode === "test" ? C.brand : "#334155",
                border: "none",
                cursor: busy ? "wait" : "pointer",
                position: "relative",
                flexShrink: 0,
                transition: "background 0.2s ease",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 3,
                  left: mode === "test" ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s ease",
                }}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Agent Profile overlay ────────────────────────────────────────────────────

const AgentProfileOverlay: React.FC<{
  agentId: string;
  onClose: () => void;
  onTrade: () => void;
}> = ({ agentId, onClose, onTrade }) => {
  const agent = AGENTS.find((a) => a.id === agentId)!;
  if (!agent) return null;

  const gradientColor =
    agent.risk === "low"
      ? "#3730a3"
      : agent.risk === "high"
      ? "#92400e"
      : "#78350f";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: C.bg.primary,
        zIndex: 50,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Full-bleed gradient header */}
      <div
        style={{
          background: `linear-gradient(160deg, ${gradientColor} 0%, ${C.bg.primary} 70%)`,
          padding: "48px 20px 24px",
          position: "relative",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "rgba(0,0,0,0.4)",
            border: "none",
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={16} color={C.text.primary} />
        </button>

        {/* Avatar */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: `${agent.color}30`,
            border: `3px solid ${agent.color}`,
            boxShadow: `0 0 24px ${agent.color}80`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            fontWeight: 800,
            color: agent.color,
            marginBottom: 14,
          }}
        >
          {agent.shortName[0]}
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: C.text.primary,
            letterSpacing: "-0.5px",
            marginBottom: 4,
          }}
        >
          {agent.name}
        </h2>
        <div style={{ fontSize: 13, color: C.text.muted, marginBottom: 8 }}>
          {agent.strategy}
        </div>
        <RiskBadge risk={agent.risk} />
        <p
          style={{
            fontSize: 13,
            color: C.text.secondary,
            lineHeight: 1.6,
            marginTop: 12,
          }}
        >
          {agent.description}
        </p>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 1,
          background: C.border,
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {[
          { label: "Win Rate", value: `${Math.round(agent.winRate * 100)}%` },
          { label: "Total Return", value: pct(agent.totalReturn) },
          { label: "30d Return", value: pct(agent.monthReturn) },
          { label: "Trades", value: agent.trades.toString() },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: C.bg.surface,
              padding: "14px 10px",
              textAlign: "center",
            }}
          >
            <Label style={{ display: "block", marginBottom: 4 }}>{label}</Label>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: C.text.primary,
                ...tabularNums,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Trade log */}
      <div style={{ padding: "20px 16px", flex: 1 }}>
        <Label style={{ display: "block", marginBottom: 12 }}>
          Recent Trades
        </Label>
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          {agent.recentTrades.map((trade, i) => {
            const isBuy = trade.action === "buy";
            return (
              <div
                key={i}
                style={{
                  padding: "14px 16px",
                  borderBottom:
                    i < agent.recentTrades.length - 1
                      ? `1px solid ${C.borderSubtle}`
                      : "none",
                }}
              >
                {/* Top line */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {/* Buy/Sell badge */}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        color: isBuy ? C.positive : C.negative,
                        background: isBuy ? C.brandSubtle : C.negativeSubtle,
                        border: `1px solid ${isBuy ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                        borderRadius: 4,
                        padding: "2px 6px",
                      }}
                    >
                      {trade.action.toUpperCase()}
                    </span>
                    {/* Ticker */}
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: C.text.primary,
                        fontFamily: "monospace",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {trade.ticker}
                    </span>
                    <span style={{ fontSize: 12, color: C.text.muted }}>
                      {trade.qty} ×
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: C.text.primary,
                        fontFamily: "monospace",
                        ...tabularNums,
                      }}
                    >
                      ${fmt(trade.price)}
                    </div>
                    <div style={{ fontSize: 10, color: C.text.dim, marginTop: 1 }}>
                      {trade.time}
                    </div>
                  </div>
                </div>
                {/* Rationale quote */}
                <p
                  style={{
                    fontSize: 12,
                    color: C.text.muted,
                    fontStyle: "italic",
                    lineHeight: 1.55,
                    borderLeft: `2px solid ${agent.color}50`,
                    paddingLeft: 10,
                    margin: 0,
                  }}
                >
                  "{trade.rationale}"
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          padding: "16px",
          borderTop: `1px solid ${C.border}`,
          background: C.bg.surface,
          display: "flex",
          gap: 10,
        }}
      >
        {agent.hired ? (
          <>
            <button
              style={{
                flex: 1,
                background: C.bg.elevated,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                color: C.negative,
                fontWeight: 700,
                fontSize: 14,
                padding: "14px 0",
                cursor: "pointer",
              }}
            >
              Pause Agent
            </button>
            <button
              onClick={onTrade}
              style={{
                flex: 2,
                background: C.brand,
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                padding: "14px 0",
                cursor: "pointer",
                ...glowGreen,
              }}
            >
              Trade NVDA Now
            </button>
          </>
        ) : (
          <button
            style={{
              flex: 1,
              background: C.brand,
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              padding: "14px 0",
              cursor: "pointer",
              ...glowGreen,
            }}
          >
            Hire {agent.shortName} — Advisory Mode
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Trade overlay ────────────────────────────────────────────────────────────

const TradeOverlay: React.FC<{
  ticker?: string;
  onClose: () => void;
}> = ({ ticker = "NVDA", onClose }) => {
  const market = MARKETS.find((m) => m.ticker === ticker) || MARKETS[0];
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState(1);
  const isBuy = side === "buy";

  // Bid/ask spread: buy at ask, sell at bid (CLAUDE.md requirement)
  const spreadPct = market.price > 5000 ? 0.001 : 0.0005; // 0.1% crypto, 0.05% stocks
  const ask = market.price * (1 + spreadPct);
  const bid = market.price * (1 - spreadPct);
  const executionPrice = isBuy ? ask : bid;
  const total = qty * executionPrice;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "relative",
          background: C.bg.surface,
          borderRadius: "20px 20px 0 0",
          padding: "0 0 24px",
          borderTop: `1px solid ${C.border}`,
          zIndex: 1,
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 36,
            height: 4,
            background: C.border,
            borderRadius: 99,
            margin: "10px auto 0",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px 0",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: C.text.primary,
                letterSpacing: "-0.5px",
                fontFamily: "monospace",
              }}
            >
              {market.ticker}
            </div>
            <div style={{ fontSize: 12, color: C.text.dim, marginTop: 1 }}>
              {MARKETS.find((m) => m.ticker === market.ticker)?.name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: C.bg.elevated,
              border: `1px solid ${C.border}`,
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={15} color={C.text.muted} />
          </button>
        </div>

        {/* Price hero with bid/ask */}
        <div style={{ padding: "18px 20px 0" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: C.text.primary,
                letterSpacing: "-1px",
                fontFamily: "monospace",
                ...tabularNums,
              }}
            >
              ${fmt(market.price)}
            </div>
            <div style={{ marginTop: 4 }}>
              <DeltaBadge value={market.change} />
            </div>
          </div>
          {/* Bid / Ask row */}
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", fontWeight: 700, color: C.negative, textTransform: "uppercase" as const, marginBottom: 2 }}>Bid</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: isBuy ? C.text.dim : C.negative, fontFamily: "monospace", ...tabularNums, transition: "color 0.2s" }}>${fmt(bid)}</div>
            </div>
            <div style={{ width: 1, background: C.border }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", fontWeight: 700, color: C.positive, textTransform: "uppercase" as const, marginBottom: 2 }}>Ask</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: isBuy ? C.positive : C.text.dim, fontFamily: "monospace", ...tabularNums, transition: "color 0.2s" }}>${fmt(ask)}</div>
            </div>
          </div>
        </div>

        {/* Buy / Sell toggle */}
        <div style={{ padding: "16px 20px 0" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              background: C.bg.primary,
              borderRadius: 10,
              padding: 4,
              gap: 4,
            }}
          >
            {(["buy", "sell"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                style={{
                  background:
                    side === s
                      ? s === "buy"
                        ? C.brand
                        : C.negative
                      : "transparent",
                  border: "none",
                  borderRadius: 7,
                  color:
                    side === s
                      ? "#fff"
                      : s === "buy"
                      ? C.positive
                      : C.negative,
                  fontWeight: 700,
                  fontSize: 14,
                  padding: "10px 0",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  transition: "all 0.2s",
                  boxShadow:
                    side === s && s === "buy"
                      ? `0 0 12px rgba(16,185,129,0.4)`
                      : side === s && s === "sell"
                      ? `0 0 12px rgba(239,68,68,0.4)`
                      : "none",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity row */}
        <div style={{ padding: "16px 20px 0" }}>
          <Label style={{ display: "block", marginBottom: 8 }}>Quantity (shares)</Label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: C.bg.primary,
              borderRadius: 10,
              padding: "4px 4px",
            }}
          >
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              style={{
                width: 40,
                height: 40,
                background: C.bg.elevated,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Minus size={16} color={C.text.secondary} />
            </button>
            <div
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 22,
                fontWeight: 800,
                color: C.text.primary,
                fontFamily: "monospace",
                ...tabularNums,
              }}
            >
              {qty}
            </div>
            <button
              onClick={() => setQty(qty + 1)}
              style={{
                width: 40,
                height: 40,
                background: C.bg.elevated,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={16} color={C.text.secondary} />
            </button>
          </div>
        </div>

        {/* Value summary */}
        <div style={{ padding: "12px 20px 0" }}>
          <div
            style={{
              background: C.bg.primary,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {[
              {
                label: isBuy ? "Ask (execution price)" : "Bid (execution price)",
                value: `$${fmt(executionPrice)}`,
                highlight: false,
              },
              {
                label: "Estimated total",
                value: `$${fmt(total)}`,
                highlight: true,
              },
              {
                label: "Available cash",
                value: `$${fmt(PORTFOLIO_CASH, 0)}`,
                highlight: false,
              },
            ].map(({ label, value, highlight }, i, arr) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "11px 14px",
                  borderBottom:
                    i < arr.length - 1
                      ? `1px solid ${C.border}`
                      : "none",
                  background: highlight
                    ? isBuy
                      ? "rgba(16,185,129,0.06)"
                      : "rgba(239,68,68,0.06)"
                    : "transparent",
                }}
              >
                <Label style={{ fontSize: 11 }}>{label}</Label>
                <span
                  style={{
                    fontSize: highlight ? 16 : 14,
                    fontWeight: highlight ? 800 : 600,
                    color: highlight
                      ? isBuy
                        ? C.positive
                        : C.negative
                      : C.text.primary,
                    fontFamily: "monospace",
                    ...tabularNums,
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Confirm button */}
        <div style={{ padding: "16px 20px 0" }}>
          <button
            style={{
              width: "100%",
              background: isBuy ? C.brand : C.negative,
              border: "none",
              borderRadius: 12,
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
              padding: "16px 0",
              cursor: "pointer",
              letterSpacing: "0.04em",
              boxShadow: isBuy
                ? "0 0 24px rgba(16,185,129,0.35)"
                : "0 0 24px rgba(239,68,68,0.35)",
              transition: "box-shadow 0.2s",
            }}
          >
            {isBuy ? "Buy" : "Sell"} {qty} {market.ticker} @ ${fmt(executionPrice)} · ${fmt(total, 0)}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Header bar ───────────────────────────────────────────────────────────────

const AppHeader: React.FC<{ tab: string }> = ({ tab: _tab }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 16px 0",
        background: C.bg.primary,
      }}
    >
      {/* Logo / wordmark */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: C.text.primary,
          letterSpacing: "-0.5px",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: C.brand,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 10px ${C.brand}`,
          }}
        >
          <TrendingUp size={13} color="#fff" strokeWidth={2.5} />
        </div>
        mockket
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.brand,
            background: C.brandSubtle,
            border: `1px solid rgba(16,185,129,0.3)`,
            borderRadius: 6,
            padding: "4px 8px",
            letterSpacing: "0.06em",
          }}
        >
          PAPER
        </div>
        <button
          style={{
            background: C.bg.surface,
            border: `1px solid ${C.border}`,
            borderRadius: "50%",
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <Bell size={16} color={C.text.muted} />
          <div
            style={{
              position: "absolute",
              top: 7,
              right: 7,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: C.negative,
              border: `1.5px solid ${C.bg.primary}`,
            }}
          />
        </button>
      </div>
    </div>
  );
};

// ─── Root component ───────────────────────────────────────────────────────────

export const MockketPrototype: React.FC = () => {
  const [tab, setTab] = useState("portfolio");
  const [agentOverlay, setAgentOverlay] = useState<string | null>(null);
  const [tradeOverlay, setTradeOverlay] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Simulate data fetch: 1.5s load then reveal content
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(t);
  }, []);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <>
      {/* Global keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #1E293B 25%, #243044 50%, #1E293B 75%);
          background-size: 800px 100%;
          animation: shimmer 1.4s infinite linear;
          border-radius: 6px;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg.secondary}; }
      `}</style>

      {/* Phone frame */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          minHeight: "100vh",
          background: C.bg.secondary,
          padding: "32px 16px",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            width: 390,
            maxWidth: "100%",
            background: C.bg.primary,
            borderRadius: 44,
            border: `8px solid #1a1a2e`,
            boxShadow:
              "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
            overflow: "hidden",
            position: "relative",
            minHeight: 844,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Status bar notch simulation */}
          <div
            style={{
              height: 44,
              background: C.bg.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              flexShrink: 0,
            }}
          >
            <span
              style={{ fontSize: 12, fontWeight: 700, color: C.text.primary }}
            >
              9:41
            </span>
            <div
              style={{
                width: 120,
                height: 28,
                background: "#0a0a14",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#1a1a2a",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  alignItems: "flex-end",
                  height: 12,
                }}
              >
                {[4, 7, 10, 12].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: 3,
                      height: h,
                      background:
                        i < 3 ? C.text.primary : C.text.dim,
                      borderRadius: 1,
                    }}
                  />
                ))}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.text.primary,
                }}
              >
                100%
              </span>
            </div>
          </div>

          {/* App header */}
          <AppHeader tab={tab} />

          {/* Content — scrollable */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              background: C.bg.primary,
              scrollbarWidth: "none",
            }}
          >
            {tab === "portfolio" && (
              <PortfolioTab
                onOpenTrade={() => setTradeOverlay("NVDA")}
                loading={isLoading}
                error={hasError}
                onRetry={handleRetry}
              />
            )}
            {tab === "markets" && (
              <MarketsTab
                onSelectTicker={(t) => setTradeOverlay(t)}
                loading={isLoading}
                error={hasError}
                onRetry={handleRetry}
              />
            )}
            {tab === "agents" && (
              <AgentsTab onOpenAgent={(id) => setAgentOverlay(id)} loading={isLoading} />
            )}
            {tab === "challenges" && <ChallengesTab />}
            {tab === "activity" && <ActivityTab />}
            {tab === "activity" && <DevPanel />}
          </div>

          {/* Tab bar */}
          <TabBar active={tab} onChange={setTab} />

          {/* Agent profile overlay */}
          {agentOverlay && (
            <AgentProfileOverlay
              agentId={agentOverlay}
              onClose={() => setAgentOverlay(null)}
              onTrade={() => {
                setAgentOverlay(null);
                setTradeOverlay("NVDA");
              }}
            />
          )}

          {/* Trade overlay */}
          {tradeOverlay && (
            <TradeOverlay
              ticker={tradeOverlay}
              onClose={() => setTradeOverlay(null)}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default MockketPrototype;
