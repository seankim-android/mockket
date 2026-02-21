import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Text } from '@/components/primitives'
import { api } from '@/lib/api/client'
import { tokens } from '@/design/tokens'

interface Challenge {
  id: string
  agent_id: string | null
  opponent_user_id: string | null
  duration: string
  starting_balance: number
  status: string
  ends_at: string | null
  winner_id: string | null
  invite_token: string | null
}

export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const queryClient = useQueryClient()

  const { data: challenge, isLoading } = useQuery<Challenge>({
    queryKey: ['challenge', id],
    queryFn: () => api.get<Challenge>(`/challenges/${id}`),
  })

  const { data: standings } = useQuery({
    queryKey: ['challenge-standings', id],
    queryFn: () => api.get<{ userReturnPct: number; opponentReturnPct: number }>(`/challenges/${id}/standings`),
    enabled: challenge?.status === 'active',
    refetchInterval: 60_000,
  })

  const { mutate: forfeit, isPending: isForfeiting } = useMutation({
    mutationFn: () => api.post(`/challenges/${id}/forfeit`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenge', id] })
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
      router.replace('/(tabs)/challenges')
    },
  })

  function handleForfeit() {
    Alert.alert(
      'Forfeit challenge?',
      'This counts as a loss in your challenge history.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Forfeit', style: 'destructive', onPress: () => forfeit() },
      ]
    )
  }

  if (isLoading || !challenge) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.colors.brand.default} />
      </View>
    )
  }

  const isCompleted = challenge.status === 'completed' || challenge.status === 'forfeited'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="heading" style={styles.title}>
        vs {challenge.agent_id ?? 'Friend'}
      </Text>

      <View style={styles.card}>
        <Row label="Duration" value={challenge.duration} />
        <Row label="Starting balance" value={`$${challenge.starting_balance.toLocaleString()}`} />
        <Row label="Status" value={challenge.status} />
        {challenge.ends_at && (
          <Row label="Ends" value={new Date(challenge.ends_at).toLocaleDateString()} />
        )}
      </View>

      {standings && challenge.status === 'active' && (
        <View style={styles.standingsCard}>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>LIVE STANDINGS</Text>
          <View style={styles.standingsRow}>
            <View style={styles.standingsSide}>
              <Text variant="caption" color="secondary">You</Text>
              <Text variant="label" style={{
                color: standings.userReturnPct >= 0 ? tokens.colors.positive : tokens.colors.negative,
              }}>
                {standings.userReturnPct >= 0 ? '+' : ''}{standings.userReturnPct.toFixed(2)}%
              </Text>
            </View>
            <Text variant="caption" color="secondary">vs</Text>
            <View style={[styles.standingsSide, { alignItems: 'flex-end' }]}>
              <Text variant="caption" color="secondary">{challenge.agent_id ?? 'Friend'}</Text>
              <Text variant="label" style={{
                color: standings.opponentReturnPct >= 0 ? tokens.colors.positive : tokens.colors.negative,
              }}>
                {standings.opponentReturnPct >= 0 ? '+' : ''}{standings.opponentReturnPct.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>
      )}

      {challenge.invite_token && challenge.status === 'pending' && (
        <View style={styles.inviteCard}>
          <Text variant="label" style={{ marginBottom: tokens.spacing[2] }}>Invite a friend</Text>
          <Text variant="caption" color="secondary">
            Share this link: https://mockket.app/challenge/invite/{challenge.invite_token}
          </Text>
        </View>
      )}

      {isCompleted && (
        <TouchableOpacity
          style={styles.recapBtn}
          onPress={() => router.push(`/recap/${id}`)}
        >
          <Text variant="label" style={{ color: '#fff' }}>View Recap</Text>
        </TouchableOpacity>
      )}

      {challenge.status === 'active' && (
        <TouchableOpacity
          style={styles.forfeitBtn}
          onPress={handleForfeit}
          disabled={isForfeiting}
        >
          <Text variant="label" style={{ color: tokens.colors.negative }}>
            {isForfeiting ? 'Forfeiting…' : 'Forfeit challenge'}
          </Text>
        </TouchableOpacity>
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
  content: { padding: tokens.spacing[4], paddingTop: 60, paddingBottom: tokens.spacing[8] },
  centered: { flex: 1, backgroundColor: tokens.colors.bg.primary, alignItems: 'center', justifyContent: 'center' },
  title: { marginBottom: tokens.spacing[6] },
  card: { backgroundColor: tokens.colors.bg.secondary, borderRadius: tokens.radii.lg, padding: tokens.spacing[4], marginBottom: tokens.spacing[4] },
  inviteCard: { backgroundColor: tokens.colors.bg.secondary, borderRadius: tokens.radii.lg, padding: tokens.spacing[4], marginBottom: tokens.spacing[4], borderLeftWidth: 3, borderLeftColor: tokens.colors.brand.default },
  recapBtn: { backgroundColor: tokens.colors.brand.default, borderRadius: tokens.radii.lg, padding: tokens.spacing[4], alignItems: 'center', marginBottom: tokens.spacing[3] },
  standingsCard: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[3],
  },
  sectionTitle: { marginBottom: tokens.spacing[3], letterSpacing: 1 },
  standingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  standingsSide: { gap: tokens.spacing[1] },
  forfeitBtn: {
    borderWidth: 1,
    borderColor: tokens.colors.negative,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[3],
    alignItems: 'center',
    marginTop: tokens.spacing[4],
  },
})
