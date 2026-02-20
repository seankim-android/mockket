import { View, ViewProps } from 'react-native'
import { tokens } from '@/design/tokens'

interface StackProps extends ViewProps {
  direction?: 'row' | 'column'
  gap?: keyof typeof tokens.spacing
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch'
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
}

export function Stack({
  direction = 'column',
  gap = 0,
  align,
  justify,
  style,
  ...props
}: StackProps) {
  return (
    <View
      style={[
        {
          flexDirection: direction,
          gap: tokens.spacing[gap],
          alignItems: align,
          justifyContent: justify,
        },
        style,
      ]}
      {...props}
    />
  )
}
