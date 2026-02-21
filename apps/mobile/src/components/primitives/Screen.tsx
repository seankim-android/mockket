import { View, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { tokens } from '@/design/tokens'

interface ScreenProps {
  children: React.ReactNode
  style?: ViewStyle
}

export function Screen({ children, style }: ScreenProps) {
  const insets = useSafeAreaInsets()
  return (
    <View
      style={[
        { flex: 1, backgroundColor: tokens.colors.bg.primary, paddingTop: insets.top },
        style,
      ]}
    >
      {children}
    </View>
  )
}
