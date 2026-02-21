import { useState } from 'react'
import { ActivityIndicator, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Text, Screen } from '@/components/primitives'
import { api } from '@/lib/api/client'
import { tokens } from '@/design/tokens'

interface Challenge {
  id: string
  agent_id: string | null
  opponent_user_id: string | null
  duration: '1w' | '1m' | '3m'
  starting_balance: number
  status: string
  ends_at: string | null
  winner_id: string | null
  invite_token: string | null
}

interface LeaderboardEntry {
  display_name: string
  portfolio_cash: number
  return_pct: number
}

const DURATION_LABELS: Record<string, string> = { '1w': '1 Week', '1m': '1 Month', '3m': '3 Months' }

export default function ChallengesScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [duration, setDuration] = useState<'1w' | '1m'>('1w')
  const [startingBalance, setStartingBalance] = useState('10000')
  const [tab, setTab] = useState<'challenges' | 'leaderboard'>('challenges')
  const [opponentType, setOpponentType] = useState<'agent' | 'friend'>('agent')
  const [friendUsername, setFriendUsername] = useState('')
  const [friendSearchResults, setFriendSearchResults] = useState<Array<{ id: string; display_name: string }>>([])
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; display_name: string } | null>(null)

  const { data: challenges = [], isLoading } = useQuery<Challenge[]>({
    queryKey: ['challenges'],
    queryFn: () => api.get<Challenge[]>('/challenges'),
  })

  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: () => api.get<LeaderboardEntry[]>('/challenges/leaderboard'),
    enabled: tab === 'leaderboard',
  })

  async function searchFriend() {
    if (!friendUsername.trim()) return
    try {
      const results = await api.get<Array<{ id: string; display_name: string }>>(
        `/users/search?q=${encodeURIComponent(friendUsername)}`
      )
      setFriendSearchResults(results)
    } catch {
      setFriendSearchResults([])
    }
  }

  const { mutate: createChallenge, isPending: isCreating } = useMutation({
    mutationFn: () =>
      api.post('/challenges', {
        duration,
        startingBalance: parseFloat(startingBalance),
        agentId: opponentType === 'agent' ? 'marcus-bull-chen' : null,
        opponentUserId: opponentType === 'friend' ? selectedFriend?.id : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
      setShowNew(false)
      setOpponentType('agent')
      setFriendUsername('')
      setFriendSearchResults([])
      setSelectedFriend(null)
    },
  })

  const active = challenges.filter((c) => c.status === 'active' || c.status === 'pending')
  const history = challenges.filter((c) => ['completed', 'forfeited', 'expired'].includes(c.status))

  return (
    <Screen>
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="heading" style={styles.pageTitle}>Challenges</Text>

      {/* Tab bar */}
      <View style={styles.tabs}>
        {(['challenges', 'leaderboard'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text variant="label" style={tab === t ? { color: tokens.colors.brand.default } : { color: tokens.colors.text.secondary }}>
              {t === 'challenges' ? 'My Challenges' : 'Leaderboard'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'challenges' ? (
        <>
          <TouchableOpacity style={styles.newBtn} onPress={() => setShowNew(true)}>
            <Text variant="label" style={{ color: '#fff' }}>+ New Challenge</Text>
          </TouchableOpacity>

          {isLoading && <ActivityIndicator color={tokens.colors.brand.default} style={{ marginTop: tokens.spacing[4] }} />}

          {active.length > 0 && (
            <>
              <Text variant="label" color="secondary" style={styles.sectionTitle}>ACTIVE</Text>
              {active.map((c) => (
                <TouchableOpacity key={c.id} style={styles.card} onPress={() => router.push(`/challenge/${c.id}`)}>
                  <View style={styles.cardRow}>
                    <Text variant="label">vs {c.agent_id ?? 'Friend'}</Text>
                    <View style={[styles.statusBadge, { borderColor: c.status === 'active' ? tokens.colors.positive : tokens.colors.warning }]}>
                      <Text variant="caption" style={{ color: c.status === 'active' ? tokens.colors.positive : tokens.colors.warning }}>
                        {c.status}
                      </Text>
                    </View>
                  </View>
                  <Text variant="caption" color="secondary">
                    {DURATION_LABELS[c.duration]} · ${c.starting_balance.toLocaleString()} starting
                  </Text>
                  {c.ends_at && (
                    <Text variant="caption" color="secondary">
                      Ends {new Date(c.ends_at).toLocaleDateString()}
                    </Text>
                  )}
                  {c.invite_token && (
                    <Text variant="caption" style={{ color: tokens.colors.brand.default, marginTop: tokens.spacing[2] }}>
                      Share invite link →
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}

          {history.length > 0 && (
            <>
              <Text variant="label" color="secondary" style={styles.sectionTitle}>HISTORY</Text>
              {history.map((c) => (
                <TouchableOpacity key={c.id} style={styles.card} onPress={() => router.push(`/recap/${c.id}`)}>
                  <View style={styles.cardRow}>
                    <Text variant="label">vs {c.agent_id ?? 'Friend'}</Text>
                    <Text variant="caption" color="secondary">{c.status}</Text>
                  </View>
                  <Text variant="caption" color="secondary">
                    {DURATION_LABELS[c.duration]} · ${c.starting_balance.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {!isLoading && challenges.length === 0 && (
            <Text variant="body" color="secondary" style={styles.empty}>
              No challenges yet. Start one to compete!
            </Text>
          )}
        </>
      ) : (
        <>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>TOP 50 — ALL TIME</Text>
          {leaderboard.map((entry, i) => (
            <View key={i} style={styles.leaderRow}>
              <Text variant="label" style={styles.rank}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text variant="label">{entry.display_name}</Text>
              </View>
              <Text variant="mono" style={{ color: entry.return_pct >= 0 ? tokens.colors.positive : tokens.colors.negative }}>
                {entry.return_pct >= 0 ? '+' : ''}{entry.return_pct.toFixed(1)}%
              </Text>
            </View>
          ))}
        </>
      )}

      {/* New challenge modal */}
      <Modal visible={showNew} transparent animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalCard}>
            <Text variant="heading" style={{ marginBottom: tokens.spacing[4] }}>New Challenge</Text>

            <Text variant="label" color="secondary" style={{ marginBottom: tokens.spacing[2] }}>Challenge</Text>
            <View style={styles.durationRow}>
              {(['agent', 'friend'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.durationBtn, opponentType === t && styles.durationActive]}
                  onPress={() => setOpponentType(t)}
                >
                  <Text variant="label" style={opponentType === t ? { color: '#fff' } : { color: tokens.colors.text.secondary }}>
                    {t === 'agent' ? 'vs Agent' : 'vs Friend'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {opponentType === 'friend' && (
              <View style={{ marginTop: tokens.spacing[4] }}>
                <Text variant="label" color="secondary" style={{ marginBottom: tokens.spacing[2] }}>Friend's username</Text>
                <View style={{ flexDirection: 'row', gap: tokens.spacing[2] }}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={friendUsername}
                    onChangeText={setFriendUsername}
                    placeholder="Search by username"
                    placeholderTextColor={tokens.colors.text.muted}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.durationBtn, { paddingHorizontal: tokens.spacing[3] }]}
                    onPress={searchFriend}
                  >
                    <Text variant="label" color="secondary">Search</Text>
                  </TouchableOpacity>
                </View>
                {friendSearchResults.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[
                      styles.card,
                      { marginTop: tokens.spacing[2], padding: tokens.spacing[3] },
                      selectedFriend?.id === u.id && { borderColor: tokens.colors.brand.default, borderWidth: 1 },
                    ]}
                    onPress={() => setSelectedFriend(u)}
                  >
                    <Text variant="label">{u.display_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text variant="label" color="secondary" style={{ marginBottom: tokens.spacing[2], marginTop: tokens.spacing[4] }}>Duration</Text>
            <View style={styles.durationRow}>
              {(['1w', '1m'] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.durationBtn, duration === d && styles.durationActive]}
                  onPress={() => setDuration(d)}
                >
                  <Text variant="label" style={duration === d ? { color: '#fff' } : { color: tokens.colors.text.secondary }}>
                    {DURATION_LABELS[d]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text variant="label" color="secondary" style={{ marginBottom: tokens.spacing[2], marginTop: tokens.spacing[4] }}>
              Starting Balance ($)
            </Text>
            <TextInput
              style={styles.input}
              value={startingBalance}
              onChangeText={setStartingBalance}
              keyboardType="decimal-pad"
              placeholderTextColor={tokens.colors.text.muted}
            />

            <TouchableOpacity
              style={[styles.newBtn, (isCreating || (opponentType === 'friend' && !selectedFriend)) && { opacity: 0.6 }]}
              onPress={() => createChallenge()}
              disabled={isCreating || (opponentType === 'friend' && !selectedFriend)}
            >
              {isCreating ? <ActivityIndicator color="#fff" /> : <Text variant="label" style={{ color: '#fff' }}>Start Challenge</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNew(false)}>
              <Text variant="label" color="secondary">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.bg.primary },
  content: { padding: tokens.spacing[4] },
  pageTitle: { marginBottom: tokens.spacing[4] },
  tabs: { flexDirection: 'row', marginBottom: tokens.spacing[4], gap: tokens.spacing[3] },
  tabBtn: { paddingBottom: tokens.spacing[2], borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: tokens.colors.brand.default },
  newBtn: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[3],
    alignItems: 'center',
    marginBottom: tokens.spacing[4],
  },
  sectionTitle: { marginBottom: tokens.spacing[3], letterSpacing: 1 },
  card: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[3],
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[1] },
  statusBadge: {
    borderWidth: 1,
    borderRadius: tokens.radii.full,
    paddingHorizontal: tokens.spacing[2],
    paddingVertical: 2,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.default,
  },
  rank: { width: 32, color: tokens.colors.text.muted },
  empty: { textAlign: 'center', marginTop: tokens.spacing[8] },
  modal: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: tokens.colors.bg.secondary,
    borderTopLeftRadius: tokens.radii.xl,
    borderTopRightRadius: tokens.radii.xl,
    padding: tokens.spacing[6],
  },
  durationRow: { flexDirection: 'row', gap: tokens.spacing[2] },
  durationBtn: {
    flex: 1,
    padding: tokens.spacing[3],
    borderRadius: tokens.radii.md,
    backgroundColor: tokens.colors.bg.tertiary,
    alignItems: 'center',
  },
  durationActive: { backgroundColor: tokens.colors.brand.default },
  input: {
    backgroundColor: tokens.colors.bg.primary,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing[3],
    color: tokens.colors.text.primary,
    marginBottom: tokens.spacing[3],
  },
  cancelBtn: { padding: tokens.spacing[3], alignItems: 'center', marginTop: tokens.spacing[2] },
})
