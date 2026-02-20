import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import { Platform } from 'react-native'

const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!,
}

export function initPurchases() {
  Purchases.setLogLevel(LOG_LEVEL.ERROR)
  Purchases.configure({ apiKey: Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android })
}

export async function purchasePremium(packageId: 'monthly' | 'annual') {
  const offerings = await Purchases.getOfferings()
  const pkg = offerings.current?.availablePackages.find(p => p.identifier === packageId)
  if (!pkg) throw new Error('Package not found')
  return Purchases.purchasePackage(pkg)
}

export async function purchaseReset() {
  const offerings = await Purchases.getOfferings()
  const pkg = offerings.all['iap']?.availablePackages.find(p => p.identifier === 'reset')
  if (!pkg) throw new Error('Reset package not found')
  return Purchases.purchasePackage(pkg)
}
