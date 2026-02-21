import { FlatList, StyleSheet, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Text, Screen } from '@/components/primitives'
import { api } from '@/lib/api/client'
import { tokens } from '@/design/tokens'

interface ActivityItem {
  id: string
  type: 'trade' | 'agent_trade' | 'dividend' | 'split' | 'agent_reaction'
  agent_id: string | null
  ticker: string | null
  action: string | null
  quantity: number | null
  price: number | null
  total: number | null
  quote: string | null
  created_at: string
}

const AGENT_NAMES: Record<string, string> = {
  'marcus-bull-chen': 'Marcus',
  'priya-sharma': 'Priya',
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const agentName = item.agent_id ? (AGENT_NAMES[item.agent_id] ?? item.agent_id) : 'You'
  const isAgent = !!item.agent_id
  const actionColor = item.action === 'buy' ? tokens.colors.positive : tokens.colors.negative

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: isAgent ? tokens.colors.warning : tokens.colors.brand.default },
          ]}
        >
          <Text style={styles.avatarText}>{agentName[0]}</Text>
        </View>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <Text variant="label">{agentName}</Text>
          {item.action && item.ticker && (
            <Text variant="caption" style={{ color: actionColor }}>
              {item.action.toUpperCase()} {item.ticker}
            </Text>
          )}
        </View>
        {item.quote ? (
          <Text variant="caption" color="secondary" style={styles.quote}>
            "{item.quote}"
          </Text>
        ) : item.type === 'dividend' ? (
          <Text variant="caption" color="secondary">
            Dividend credit
          </Text>
        ) : item.quantity && item.price ? (
          <Text variant="caption" color="secondary">
            {item.quantity} shares @ ${Number(item.price).toFixed(2)}
          </Text>
        ) : null}
        <Text variant="caption" color="secondary" style={styles.time}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
    </View>
  )
}

const Separator = () => <View style={styles.separator} />

export default function ActivityScreen() {
  const { data: items = [], isLoading } = useQuery<ActivityItem[]>({
    queryKey: ['activity'],
    queryFn: () => api.get<ActivityItem[]>('/activity'),
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <Screen style={styles.centered}>
        <Text variant="body" color="secondary">
          Loading…
        </Text>
      </Screen>
    )
  }

  if (items.length === 0) {
    return (
      <Screen style={styles.centered}>
        <Text variant="body" color="secondary">
          No activity yet.
        </Text>
        <Text
          variant="caption"
          color="secondary"
          style={{ marginTop: tokens.spacing[2], textAlign: 'center' }}
        >
          Hire an agent to see their moves here.
        </Text>
      </Screen>
    )
  }

  return (
    <Screen>
      <Text variant="heading" style={styles.title}>
        Activity
      </Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActivityRow item={item} />}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.list}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing[6],
  },
  title: { paddingHorizontal: tokens.spacing[4], marginBottom: tokens.spacing[4] },
  list: { paddingBottom: tokens.spacing[8] },
  row: {
    flexDirection: 'row',
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
    gap: tokens.spacing[3],
  },
  rowLeft: { paddingTop: 2 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rowContent: { flex: 1, gap: tokens.spacing[1] },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quote: { fontStyle: 'italic', lineHeight: 18 },
  time: { marginTop: tokens.spacing[1] },
  separator: {
    height: 1,
    backgroundColor: tokens.colors.border.default,
    marginHorizontal: tokens.spacing[4],
  },
})
