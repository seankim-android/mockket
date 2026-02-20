import { View, ViewProps } from 'react-native'

export function Box({ style, ...props }: ViewProps) {
  return <View style={style} {...props} />
}
