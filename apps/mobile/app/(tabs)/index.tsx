import { ScrollView, View, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Text } from '@/components/primitives'
import { tokens } from '@/design/tokens'
import { MissionCards } from '@/features/ftue/MissionCards'
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
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="heading">Mockket</Text>
        <MarketStatusBadge />
      </View>

      <MissionCards />

      <LeaderboardPreview />
    </ScrollView>
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
})
