import { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Text } from '@/components/primitives'
import { api } from '@/lib/api/client'
import { tokens } from '@/design/tokens'

interface AgentDetail {
  id: string
  name: string
  shortName: string
  strategy: string
  riskLevel: string
  assetClasses: string[]
  rebalanceInterval: string
  tradeLog: Array<{
    id: string
    ticker: string
    action: string
    quantity: number
    price_at_execution: number
    rationale: string
    executed_at: string
  }>
}

interface AgentHire {
  id: string
  agent_id: string
  allocated_cash: number
  mode: string
  is_paused: boolean
}

interface Portfolio {
  cash: number
  holdings: unknown[]
}

export default function AgentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showHireForm, setShowHireForm] = useState(false)
  const [allocation, setAllocation] = useState('')
  const [hireError, setHireError] = useState<string | null>(null)

  const { data: agent, isLoading } = useQuery<AgentDetail>({
    queryKey: ['agent', id],
    queryFn: () => api.get<AgentDetail>(`/agents/${id}`),
  })

  const { data: hires = [] } = useQuery<AgentHire[]>({
    queryKey: ['agent-hires'],
    queryFn: () => api.get<AgentHire[]>('/agent-hires'),
  })

  const { data: portfolio } = useQuery<Portfolio>({
    queryKey: ['portfolio'],
    queryFn: () => api.get<Portfolio>('/portfolio'),
  })

  const currentHire = hires.find((h) => h.agent_id === id)

  const { mutate: hire, isPending: isHiring } = useMutation({
    mutationFn: (allocatedCash: number) =>
      api.post('/agent-hires', { agentId: id, allocatedCash, mode: 'advisory' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-hires'] })
      setShowHireForm(false)
      setAllocation('')
      setHireError(null)
    },
    onError: (err: any) => setHireError(err.message ?? 'Failed to hire agent'),
  })

  const { mutate: fire, isPending: isFiring } = useMutation({
    mutationFn: () => api.delete(`/agent-hires/${currentHire!.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-hires'] }),
  })

  function handleHire() {
    const amt = parseFloat(allocation)
    const maxAlloc = portfolio ? portfolio.cash * 0.5 : Infinity
    if (isNaN(amt) || amt < 1000) {
      setHireError('Minimum allocation is $1,000')
      return
    }
    if (portfolio && amt > maxAlloc) {
      setHireError(`Maximum allocation is $${maxAlloc.toFixed(0)} (50% of cash)`)
      return
    }
    hire(amt)
  }

  if (isLoading || !agent) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.colors.brand.default} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text variant="heading" style={styles.name}>{agent.name}</Text>
      <Text variant="body" color="secondary" style={styles.strategy}>{agent.strategy}</Text>

      {/* Meta badges */}
      <View style={styles.badges}>
        <View style={styles.badge}>
          <Text variant="caption" color="secondary">{agent.riskLevel} risk</Text>
        </View>
        <View style={styles.badge}>
          <Text variant="caption" color="secondary">{agent.assetClasses.join(', ')}</Text>
        </View>
        <View style={styles.badge}>
          <Text variant="caption" color="secondary">{agent.rebalanceInterval}</Text>
        </View>
      </View>

      {/* Current hire status */}
      {currentHire && (
        <View style={styles.hireStatus}>
          <View>
            <Text variant="label" style={{ color: tokens.colors.brand.default }}>
              {currentHire.is_paused ? 'Paused' : 'Active'} · {currentHire.mode}
            </Text>
            <Text variant="caption" color="secondary">
              ${currentHire.allocated_cash.toLocaleString()} allocated
            </Text>
          </View>
          <TouchableOpacity
            style={styles.fireBtn}
            onPress={() => fire()}
            disabled={isFiring}
          >
            <Text variant="caption" style={{ color: tokens.colors.negative }}>
              {isFiring ? 'Removing...' : 'Remove'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Hire button / form */}
      {!currentHire && !showHireForm && (
        <TouchableOpacity style={styles.hireBtn} onPress={() => setShowHireForm(true)}>
          <Text variant="label" style={{ color: '#fff' }}>Hire {agent.shortName}</Text>
        </TouchableOpacity>
      )}

      {!currentHire && showHireForm && (
        <View style={styles.hireForm}>
          <Text variant="label" style={styles.formTitle}>Allocate funds</Text>
          <Text variant="caption" color="secondary" style={{ marginBottom: tokens.spacing[3] }}>
            Min $1,000 · Max 50% of cash
            {portfolio ? ` ($${(portfolio.cash * 0.5).toFixed(0)})` : ''}
          </Text>
          <TextInput
            style={styles.input}
            value={allocation}
            onChangeText={setAllocation}
            keyboardType="decimal-pad"
            placeholder="1000"
            placeholderTextColor={tokens.colors.text.muted}
          />
          {hireError && (
            <Text variant="caption" style={{ color: tokens.colors.negative, marginBottom: tokens.spacing[2] }}>
              {hireError}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.hireBtn, isHiring && { opacity: 0.6 }]}
            onPress={handleHire}
            disabled={isHiring}
          >
            {isHiring
              ? <ActivityIndicator color="#fff" />
              : <Text variant="label" style={{ color: '#fff' }}>Confirm</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowHireForm(false)}>
            <Text variant="label" color="secondary">Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Trade log */}
      {agent.tradeLog && agent.tradeLog.length > 0 && (
        <>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>Trade Log</Text>
          {agent.tradeLog.slice(0, 10).map((trade) => (
            <View key={trade.id} style={styles.tradeRow}>
              <View style={styles.tradeLeft}>
                <Text variant="label">
                  {trade.action.toUpperCase()} {trade.quantity} {trade.ticker}
                </Text>
                <Text variant="caption" color="secondary">
                  at ${Number(trade.price_at_execution).toFixed(2)}
                </Text>
                {trade.rationale ? (
                  <Text variant="caption" color="secondary" style={styles.rationale}>
                    "{trade.rationale}"
                  </Text>
                ) : null}
              </View>
              <Text variant="caption" color="secondary">
                {new Date(trade.executed_at).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.bg.primary },
  content: { padding: tokens.spacing[4], paddingTop: 60 },
  centered: {
    flex: 1,
    backgroundColor: tokens.colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { marginBottom: tokens.spacing[2] },
  strategy: { marginBottom: tokens.spacing[4] },
  badges: { flexDirection: 'row', gap: tokens.spacing[2], marginBottom: tokens.spacing[6], flexWrap: 'wrap' },
  badge: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.full,
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[1],
  },
  hireStatus: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing[4],
  },
  fireBtn: {
    borderWidth: 1,
    borderColor: tokens.colors.negative,
    borderRadius: tokens.radii.md,
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[2],
  },
  hireBtn: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    alignItems: 'center',
    marginBottom: tokens.spacing[4],
  },
  hireForm: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[4],
  },
  formTitle: { marginBottom: tokens.spacing[2] },
  input: {
    backgroundColor: tokens.colors.bg.primary,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing[3],
    color: tokens.colors.text.primary,
    fontSize: 20,
    marginBottom: tokens.spacing[3],
  },
  cancelBtn: { padding: tokens.spacing[3], alignItems: 'center' },
  sectionTitle: {
    marginTop: tokens.spacing[6],
    marginBottom: tokens.spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.default,
  },
  tradeLeft: { flex: 1, marginRight: tokens.spacing[3] },
  rationale: { marginTop: tokens.spacing[1], fontStyle: 'italic' },
})
