import { useState } from 'react'
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Text } from '@/components/primitives'
import { api } from '@/lib/api/client'
import { tokens } from '@/design/tokens'

interface RecPreview {
  id: string
  agent_id: string
  ticker: string
  action: 'buy' | 'sell'
  quantity: number
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  expires_at: string
  created_at: string
}

interface RecRationale {
  rationale: string
  actedAt: string
}

const AGENT_NAMES: Record<string, string> = {
  'marcus-bull-chen': 'Marcus Bull Chen',
  'priya-sharma': 'Priya Sharma',
}

function getTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return hours > 0 ? `${hours}h ${minutes}m remaining` : `${minutes}m remaining`
}

export default function RecommendationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [rationale, setRationale] = useState<string | null>(null)

  const { data: rec, isLoading, error } = useQuery<RecPreview>({
    queryKey: ['recommendation', id],
    queryFn: () => api.get<RecPreview>(`/recommendations/${id}/preview`),
  })

  const { mutate: act, isPending: isActing } = useMutation({
    mutationFn: (action: 'approved' | 'rejected') =>
      api.patch(`/recommendations/${id}`, { action }),
    onSuccess: async (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['recommendation', id] })
      // Reveal rationale after action
      try {
        const r = await api.get<RecRationale>(`/recommendations/${id}/rationale`)
        setRationale(r.rationale)
      } catch {
        // ignore — rationale reveal is best-effort
      }
    },
  })

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.colors.brand.default} />
      </View>
    )
  }

  if (error || !rec) {
    return (
      <View style={styles.centered}>
        <Text variant="body" color="secondary">Recommendation not found.</Text>
      </View>
    )
  }

  const isExpired = rec.status === 'expired' || new Date(rec.expires_at) < new Date()
  const isActedOn = rec.status === 'approved' || rec.status === 'rejected'
  const agentName = AGENT_NAMES[rec.agent_id] ?? rec.agent_id

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="caption" color="secondary">{agentName}</Text>
        {isExpired ? (
          <View style={styles.expiredBadge}>
            <Text variant="caption" style={{ color: tokens.colors.text.muted }}>Expired</Text>
          </View>
        ) : (
          <Text variant="caption" color="secondary">{getTimeRemaining(rec.expires_at)}</Text>
        )}
      </View>

      {/* Recommendation card */}
      <View style={styles.card}>
        <Text variant="heading" style={styles.actionLabel}>
          {rec.action.toUpperCase()} {rec.quantity} {rec.ticker}
        </Text>
        <Text variant="caption" color="secondary" style={styles.agentLine}>
          Recommended by {agentName}
        </Text>
      </View>

      {/* Rationale reveal (post-action) */}
      {rationale && (
        <View style={styles.rationaleCard}>
          <Text variant="label" style={{ color: tokens.colors.brand.default, marginBottom: tokens.spacing[2] }}>
            {agentName}'s reasoning
          </Text>
          <Text variant="body" color="secondary">{rationale}</Text>
        </View>
      )}

      {/* Action buttons — hidden if expired or already acted */}
      {!isExpired && !isActedOn && !rationale && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.approveBtn, isActing && styles.btnDisabled]}
            onPress={() => act('approved')}
            disabled={isActing}
          >
            {isActing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text variant="label" style={{ color: '#fff' }}>Approve</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rejectBtn, isActing && styles.btnDisabled]}
            onPress={() => act('rejected')}
            disabled={isActing}
          >
            <Text variant="label" style={{ color: tokens.colors.negative }}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Already acted message */}
      {isActedOn && !rationale && (
        <Text variant="caption" color="secondary" style={styles.actedMessage}>
          You {rec.status} this recommendation.
        </Text>
      )}

      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text variant="label" color="secondary">Go back</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.primary,
    padding: tokens.spacing[4],
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    backgroundColor: tokens.colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing[4],
  },
  expiredBadge: {
    backgroundColor: tokens.colors.bg.tertiary,
    borderRadius: tokens.radii.full,
    paddingHorizontal: tokens.spacing[2],
    paddingVertical: tokens.spacing[1],
  },
  card: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[6],
    marginBottom: tokens.spacing[4],
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 28,
    marginBottom: tokens.spacing[2],
    textAlign: 'center',
  },
  agentLine: { textAlign: 'center' },
  rationaleCard: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[4],
    borderLeftWidth: 3,
    borderLeftColor: tokens.colors.brand.default,
  },
  actions: {
    gap: tokens.spacing[3],
    marginBottom: tokens.spacing[4],
  },
  approveBtn: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    alignItems: 'center',
  },
  rejectBtn: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.negative,
  },
  btnDisabled: { opacity: 0.5 },
  actedMessage: { textAlign: 'center', marginBottom: tokens.spacing[4] },
  back: { alignItems: 'center', padding: tokens.spacing[4] },
})
