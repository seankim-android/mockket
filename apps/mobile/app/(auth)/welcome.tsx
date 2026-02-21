import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { tokens } from '@/design/tokens'
import { Text } from '@/components/primitives'

const STEPS = [0, 1, 2] as const

const bullets = [
  'Trade with $100k paper cash against live prices',
  'Challenge AI agents with real track records',
  'See exactly where you diverged and what it cost you',
]

export default function Welcome() {
  const [step, setStep] = useState(0)
  const router = useRouter()

  function advance() {
    if (step < 2) {
      setStep((prev) => prev + 1)
    } else {
      router.replace('/(auth)/sign-up')
    }
  }

  function skip() {
    if (step === 1) {
      setStep(2)
    } else {
      router.replace('/(auth)/sign-up')
    }
  }

  return (
    <View style={styles.container}>
      {/* Step indicator */}
      <View
        style={styles.dotRow}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden={true}
      >
        {STEPS.map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text variant="title" style={styles.title}>
              Mockket
            </Text>
            <Text variant="body" color="secondary" style={styles.body}>
              {'Outthink the AI.\nLearn why you lost.'}
            </Text>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContent}>
            <Text variant="title" style={styles.title}>
              How it works
            </Text>
            <View style={styles.bulletList}>
              {bullets.map((text) => (
                <View key={text} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text variant="body" color="secondary" style={styles.bulletText}>
                    {text}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <Text variant="title" style={styles.title}>
              Stay in the loop
            </Text>
            <Text variant="body" color="secondary" style={styles.body}>
              Marcus wants to send you trade tips and agent updates.
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={advance}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={step === 0 ? 'Get Started' : step === 1 ? 'Continue' : 'Allow Notifications'}
        >
          <Text variant="label" style={styles.ctaLabel}>
            {step === 0 ? 'Get Started' : step === 1 ? 'Continue' : 'Allow Notifications'}
          </Text>
        </TouchableOpacity>

        {(step === 1 || step === 2) && (
          <TouchableOpacity
            onPress={skip}
            activeOpacity={0.7}
            style={styles.skipTouchable}
            accessibilityRole="button"
            accessibilityLabel={step === 2 ? 'Not now' : 'Skip'}
          >
            <Text variant="label" color="secondary">
              {step === 2 ? 'Not Now' : 'Skip'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.primary,
    paddingHorizontal: tokens.spacing[6],
    paddingTop: tokens.spacing[16],
    paddingBottom: tokens.spacing[12],
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.spacing[2],
    marginBottom: tokens.spacing[12],
  },
  dot: {
    height: 8,
    borderRadius: tokens.radii.full,
  },
  dotActive: {
    width: 24,
    backgroundColor: tokens.colors.brand.default,
  },
  dotInactive: {
    width: 8,
    backgroundColor: tokens.colors.bg.tertiary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  stepContent: {
    gap: tokens.spacing[6],
  },
  title: {
    color: tokens.colors.text.primary,
  },
  body: {
    lineHeight: 26,
  },
  bulletList: {
    gap: tokens.spacing[5],
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing[3],
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: tokens.radii.full,
    backgroundColor: tokens.colors.brand.default,
    marginTop: 6,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
  },
  actions: {
    gap: tokens.spacing[4],
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    paddingVertical: tokens.spacing[4],
    alignItems: 'center',
  },
  ctaLabel: {
    color: tokens.colors.text.inverse,
  },
  skipTouchable: {
    paddingVertical: tokens.spacing[2],
  },
})
