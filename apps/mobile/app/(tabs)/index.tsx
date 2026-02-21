import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Text, Screen } from '@/components/primitives'
import { tokens } from '@/design/tokens'
import { MissionCards } from '@/features/ftue/MissionCards'
import { useFtue } from '@/features/ftue/useFtue'
import { useAuthStore } from '@/features/auth/store'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query/keys'

interface LeaderboardEntry {
  display_name: string
  total_value: number
  return_pct: number
}

function MarketStatusBadge() {
  const { data: config } = useQuery({
    queryKey: queryKeys.config(),
    queryFn: () => api.get<{ marketStatus: string }>('/config/market-status'),
    refetchInterval: 60_000,
  })

  const status = config?.marketStatus ?? 'unknown'
  const color =
    status === 'open'
      ? '#22c55e'
      : status === 'pre-market' || status === 'after-hours'
        ? '#f59e0b'
        : '#6b7280'

  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="label" style={{ color }}>
        {status.toUpperCase()}
      </Text>
    </View>
  )
}

function LeaderboardPreview() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.leaderboard(),
    queryFn: () => api.get<LeaderboardEntry[]>('/challenges/leaderboard'),
    staleTime: 5 * 60_000,
  })

  const top5 = data?.slice(0, 5) ?? []

  return (
    <View style={styles.section}>
      <Text variant="heading" style={styles.sectionTitle}>
        Leaderboard
      </Text>
      {isLoading ? (
        <Text variant="body" color="secondary">
          Loading...
        </Text>
      ) : top5.length === 0 ? (
        <Text variant="body" color="secondary">
          No rankings yet.
        </Text>
      ) : (
        top5.map((entry, i) => (
          <View key={i} style={styles.leaderRow}>
            <Text variant="label" color="secondary" style={styles.rank}>
              #{i + 1}
            </Text>
            <Text variant="body" style={styles.leaderName}>
              {entry.display_name}
            </Text>
            <Text
              variant="label"
              style={{ color: entry.return_pct >= 0 ? '#22c55e' : '#ef4444' }}
            >
              {entry.return_pct >= 0 ? '+' : ''}
              {Number(entry.return_pct).toFixed(1)}%
            </Text>
          </View>
        ))
      )}
    </View>
  )
}

export default function Home() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { shouldShowDay2Card } = useFtue()

  const { data: portfolio } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api.get<{ cash: number; totalValue: number; returnPct: number }>('/portfolio'),
  })

  const { data: activeChallenges = [] } = useQuery({
    queryKey: ['challenges', 'active'],
    queryFn: () => api.get<any[]>('/challenges?status=active'),
  })

  const { data: agentActivity = [] } = useQuery({
    queryKey: ['activity'],
    queryFn: () => api.get<any[]>('/activity'),
    select: (data) => data.slice(0, 5),
  })

  return (
    <Screen>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="heading">Mockket</Text>
        <MarketStatusBadge />
      </View>

      {portfolio && (
        <View style={styles.portfolioCard}>
          <Text variant="caption" color="secondary">Portfolio Value</Text>
          <Text style={styles.portfolioValue}>
            ${portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text
            variant="body"
            style={{ color: portfolio.returnPct >= 0 ? tokens.colors.positive : tokens.colors.negative }}
          >
            {portfolio.returnPct >= 0 ? '+' : ''}{portfolio.returnPct?.toFixed(2) ?? '0.00'}% all time
          </Text>
        </View>
      )}

      {shouldShowDay2Card(profile?.createdAt) && (
        <TouchableOpacity
          style={styles.day2Card}
          onPress={() => router.push('/(tabs)/challenges')}
          accessibilityRole="button"
          accessibilityLabel="Start a challenge against Marcus"
        >
          <Text variant="label">Marcus is watching the market. Are you ahead?</Text>
          <Text variant="caption" style={{ color: tokens.colors.brand.default, marginTop: tokens.spacing[1] }}>
            Start a challenge →
          </Text>
        </TouchableOpacity>
      )}

      <MissionCards />

      {activeChallenges.length > 0 && (
        <View style={[styles.section, styles.glowCard]}>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>ACTIVE CHALLENGE</Text>
          <TouchableOpacity
            onPress={() => router.push(`/challenge/${activeChallenges[0].id}`)}
            accessibilityRole="button"
            accessibilityLabel="View active challenge"
          >
            <Text variant="label">vs {activeChallenges[0].agent_id ?? 'Friend'}</Text>
            <Text variant="caption" color="secondary">
              Ends {activeChallenges[0].ends_at ? new Date(activeChallenges[0].ends_at).toLocaleDateString() : '—'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {agentActivity.length > 0 && (
        <View style={styles.section}>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>TODAY'S MOVES</Text>
          {agentActivity.map((item: any) => (
            <View key={item.id} style={styles.feedRow}>
              <Text variant="caption" style={{ color: tokens.colors.warning }}>
                {item.agent_id ? 'Marcus' : 'You'}
              </Text>
              <Text variant="caption" color="secondary" style={{ flex: 1, marginLeft: tokens.spacing[2] }}>
                {item.action?.toUpperCase()} {item.quantity} {item.ticker}
                {item.quote ? ` — "${item.quote}"` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      <LeaderboardPreview />
    </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.bg.primary },
  content: { padding: tokens.spacing[4] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing[6],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[1],
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  section: { marginTop: tokens.spacing[6] },
  sectionTitle: { marginBottom: tokens.spacing[3] },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border.default,
  },
  rank: { width: 32 },
  leaderName: { flex: 1 },
  portfolioCard: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.xl,
    padding: tokens.spacing[6],
    alignItems: 'center',
    gap: tokens.spacing[2],
    marginBottom: tokens.spacing[4],
    borderWidth: 1,
    borderColor: tokens.colors.border.default,
  },
  portfolioValue: {
    fontSize: 36,
    fontWeight: '700',
    color: tokens.colors.text.primary,
  },
  day2Card: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[4],
    borderLeftWidth: 3,
    borderLeftColor: tokens.colors.brand.default,
  },
  glowCard: {
    shadowColor: tokens.colors.brand.default,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  feedRow: {
    flexDirection: 'row',
    paddingVertical: tokens.spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border.default,
  },
})
