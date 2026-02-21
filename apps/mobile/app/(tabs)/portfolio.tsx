import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Text } from '@/components/primitives'
import { api } from '@/lib/api/client'
import { tokens } from '@/design/tokens'

interface Portfolio {
  cash: number
  holdings: Array<{ ticker: string; quantity: number; avg_cost: number }>
}

interface Trade {
  id: string
  ticker: string
  action: string
  quantity: number
  price_at_execution: number
  executed_at: string
  agent_id: string | null
}

interface UserProfile {
  id: string
  display_name: string
  is_premium: boolean
  leaderboard_opt_in: boolean
  reset_count: number
}

interface NotificationPrefs {
  advisory_recommendations: boolean
  agent_reactions: boolean
  challenge_milestones: boolean
  portfolio_alerts: boolean
  recommendation_expiry: boolean
}

function calcPortfolioValue(portfolio: Portfolio): number {
  return portfolio.cash + portfolio.holdings.reduce((sum, h) => sum + h.quantity * h.avg_cost, 0)
}

export default function PortfolioScreen() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'portfolio' | 'settings'>('portfolio')
  const [deleteInput, setDeleteInput] = useState('')
  const [showDelete, setShowDelete] = useState(false)

  const { data: portfolio } = useQuery<Portfolio>({
    queryKey: ['portfolio'],
    queryFn: () => api.get<Portfolio>('/portfolio'),
  })

  const { data: trades = [] } = useQuery<Trade[]>({
    queryKey: ['trades'],
    queryFn: () => api.get<Trade[]>('/trades'),
  })

  const { data: user } = useQuery<UserProfile>({
    queryKey: ['user-me'],
    queryFn: () => api.get<UserProfile>('/users/me'),
  })

  const { mutate: updateUser } = useMutation({
    mutationFn: (patch: Partial<UserProfile>) => api.patch('/users/me', patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-me'] }),
  })

  const { data: notifPrefs } = useQuery<NotificationPrefs>({
    queryKey: ['notif-prefs'],
    queryFn: () => api.get<NotificationPrefs>('/users/me/notification-preferences'),
  })

  const { mutate: updateNotifPrefs } = useMutation({
    mutationFn: (patch: Partial<NotificationPrefs>) =>
      api.patch('/users/me/notification-preferences', patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notif-prefs'] }),
  })

  const totalValue = portfolio ? calcPortfolioValue(portfolio) : 0
  const returnPct = ((totalValue - 100_000) / 100_000) * 100
  const pnlColor = returnPct >= 0 ? tokens.colors.positive : tokens.colors.negative

  const selfTrades = trades.filter((t) => !t.agent_id)
  const agentTrades = trades.filter((t) => !!t.agent_id)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="heading" style={styles.pageTitle}>Portfolio</Text>

      {/* Tab bar */}
      <View style={styles.tabs}>
        {(['portfolio', 'settings'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text
              variant="label"
              style={tab === t ? { color: tokens.colors.brand.default } : { color: tokens.colors.text.secondary }}
            >
              {t === 'portfolio' ? 'Portfolio' : 'Settings'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'portfolio' ? (
        <>
          {/* Summary card */}
          <View style={styles.summaryCard}>
            <Text variant="caption" color="secondary">Total Value</Text>
            <Text variant="title">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            <Text variant="body" style={{ color: pnlColor }}>
              {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}% all time
            </Text>
          </View>

          {/* Segment breakdown */}
          <View style={styles.section}>
            <Text variant="label" color="secondary" style={styles.sectionTitle}>BREAKDOWN</Text>
            <View style={styles.card}>
              <Row label="Cash" value={`$${portfolio?.cash.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '--'}`} />
              <Row label="Self trades" value={`${selfTrades.length} trades`} />
              <Row label="Agent trades" value={`${agentTrades.length} trades`} />
              <Row label="Resets" value={`${user?.reset_count ?? 0}`} />
            </View>
          </View>

          {/* Holdings */}
          {portfolio?.holdings && portfolio.holdings.length > 0 && (
            <View style={styles.section}>
              <Text variant="label" color="secondary" style={styles.sectionTitle}>HOLDINGS</Text>
              {portfolio.holdings.map((h) => (
                <View key={h.ticker} style={styles.holdingRow}>
                  <View>
                    <Text variant="label">{h.ticker}</Text>
                    <Text variant="caption" color="secondary">{h.quantity} shares @ ${Number(h.avg_cost).toFixed(2)}</Text>
                  </View>
                  <Text variant="mono">${(h.quantity * h.avg_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Recent trades */}
          {trades.length > 0 && (
            <View style={styles.section}>
              <Text variant="label" color="secondary" style={styles.sectionTitle}>RECENT TRADES</Text>
              {trades.slice(0, 10).map((t) => (
                <View key={t.id} style={styles.tradeRow}>
                  <View>
                    <Text variant="label">{t.action.toUpperCase()} {t.quantity} {t.ticker}</Text>
                    <Text variant="caption" color="secondary">
                      ${Number(t.price_at_execution).toFixed(2)}{t.agent_id ? ` · via agent` : ''}
                    </Text>
                  </View>
                  <Text variant="caption" color="secondary">
                    {new Date(t.executed_at).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Reset button (IAP — placeholder) */}
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() =>
              Alert.alert('Reset Portfolio', 'This costs $0.99. Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset ($0.99)', style: 'destructive', onPress: () => api.post('/portfolio/reset', {}) },
              ])
            }
          >
            <Text variant="label" style={{ color: tokens.colors.negative }}>Reset Portfolio — $0.99</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Settings */}
          <View style={styles.section}>
            <Text variant="label" color="secondary" style={styles.sectionTitle}>ACCOUNT</Text>
            <View style={styles.card}>
              <Row label="Display name" value={user?.display_name ?? '—'} />
              <Row label="Subscription" value={user?.is_premium ? 'Premium' : 'Free'} />
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="label" color="secondary" style={styles.sectionTitle}>PREFERENCES</Text>
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <Text variant="body">Appear on leaderboard</Text>
                <Switch
                  value={user?.leaderboard_opt_in ?? false}
                  onValueChange={(val) => updateUser({ leaderboard_opt_in: val } as any)}
                  trackColor={{ true: tokens.colors.brand.default, false: tokens.colors.bg.tertiary }}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="label" color="secondary" style={styles.sectionTitle}>NOTIFICATIONS</Text>
            <View style={styles.card}>
              {([
                ['advisory_recommendations', 'Advisory recommendations'],
                ['agent_reactions', 'Agent reactions'],
                ['challenge_milestones', 'Challenge milestones'],
                ['portfolio_alerts', 'Portfolio alerts (5%+ moves)'],
                ['recommendation_expiry', 'Recommendation expiry'],
              ] as const).map(([key, label]) => (
                <View key={key} style={styles.switchRow}>
                  <Text variant="body">{label}</Text>
                  <Switch
                    value={notifPrefs?.[key] ?? false}
                    onValueChange={(val) => updateNotifPrefs({ [key]: val } as any)}
                    trackColor={{ true: tokens.colors.brand.default, false: tokens.colors.bg.tertiary }}
                  />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="label" color="secondary" style={styles.sectionTitle}>INFO</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.menuRow}>
                <Text variant="body">What's New</Text>
                <Text variant="caption" color="secondary">›</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuRow} onPress={() => setShowDelete((v) => !v)}>
                <Text variant="body" style={{ color: tokens.colors.error }}>Delete Account</Text>
                <Text variant="caption" color="secondary">›</Text>
              </TouchableOpacity>
              {showDelete && (
                <View style={{ marginTop: tokens.spacing[3] }}>
                  <Text variant="caption" color="secondary" style={{ marginBottom: tokens.spacing[2] }}>
                    Type DELETE to confirm. This cannot be undone.
                  </Text>
                  <TextInput
                    style={styles.deleteInput}
                    value={deleteInput}
                    onChangeText={setDeleteInput}
                    placeholder="DELETE"
                    placeholderTextColor={tokens.colors.text.muted}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[styles.deleteBtn, deleteInput !== 'DELETE' && { opacity: 0.4 }]}
                    disabled={deleteInput !== 'DELETE'}
                    onPress={() => api.delete('/users/me')}
                  >
                    <Text variant="label" style={{ color: '#fff' }}>Delete my account</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text variant="caption" color="secondary">{label}</Text>
      <Text variant="caption">{value}</Text>
    </View>
  )
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: tokens.spacing[2] },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.bg.primary },
  content: { padding: tokens.spacing[4], paddingTop: 60 },
  pageTitle: { marginBottom: tokens.spacing[4] },
  tabs: { flexDirection: 'row', marginBottom: tokens.spacing[4], gap: tokens.spacing[3] },
  tabBtn: { paddingBottom: tokens.spacing[2], borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: tokens.colors.brand.default },
  summaryCard: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.xl,
    padding: tokens.spacing[6],
    alignItems: 'center',
    marginBottom: tokens.spacing[6],
    gap: tokens.spacing[2],
  },
  section: { marginBottom: tokens.spacing[4] },
  sectionTitle: { marginBottom: tokens.spacing[3], letterSpacing: 1 },
  card: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
  },
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.default,
  },
  tradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.default,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing[2],
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing[3],
  },
  divider: { height: 1, backgroundColor: tokens.colors.border.default },
  resetBtn: {
    borderWidth: 1,
    borderColor: tokens.colors.negative,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    alignItems: 'center',
    marginTop: tokens.spacing[4],
    marginBottom: tokens.spacing[8],
  },
  deleteInput: {
    backgroundColor: tokens.colors.bg.primary,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing[3],
    color: tokens.colors.text.primary,
    marginBottom: tokens.spacing[2],
    borderWidth: 1,
    borderColor: tokens.colors.error,
  },
  deleteBtn: {
    backgroundColor: tokens.colors.error,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing[3],
    alignItems: 'center',
  },
})
