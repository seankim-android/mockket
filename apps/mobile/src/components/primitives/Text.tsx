import { Text as RNText, TextProps } from 'react-native'
import { tokens } from '@/design/tokens'

type Variant = 'body' | 'label' | 'caption' | 'heading' | 'title' | 'mono'
type TextColor = keyof typeof tokens.colors.text

interface Props extends TextProps {
  variant?: Variant
  color?: TextColor
}

const variantStyles: Record<Variant, object> = {
  title: {
    fontSize: tokens.fontSize['3xl'],
    fontWeight: tokens.fontWeight.bold,
    lineHeight: tokens.fontSize['3xl'] * tokens.lineHeight.tight,
  },
  heading: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.semibold,
  },
  body: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.regular,
  },
  label: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
  },
  caption: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.regular,
  },
  mono: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.mono,
  },
}

export function Text({ variant = 'body', color = 'primary', style, ...props }: Props) {
  return (
    <RNText
      style={[
        { color: tokens.colors.text[color] },
        variantStyles[variant],
        style,
      ]}
      {...props}
    />
  )
}
