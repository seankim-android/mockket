import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { db } from '../db/client'

// Initialize once
if (getApps().length === 0) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error('[fcm] Missing required env var: FIREBASE_SERVICE_ACCOUNT')
    process.exit(1)
  }
  let serviceAccount: object
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  } catch {
    console.error('[fcm] FIREBASE_SERVICE_ACCOUNT is not valid JSON')
    process.exit(1)
  }
  initializeApp({ credential: cert(serviceAccount as any) })
  console.log('[fcm] Firebase Admin initialized')
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    await getMessaging().send({
      token,
      notification: { title, body },
      ...(data ? { data } : {}),
    })
  } catch (err) {
    console.error(`[fcm] Failed to send to token ${token.slice(0, 8)}...:`, err)
  }
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const { rows } = await db.query(
      `SELECT token FROM fcm_tokens WHERE user_id = $1`,
      [userId]
    )
    await Promise.allSettled(rows.map((r: { token: string }) => sendPushNotification(r.token, title, body, data)))
  } catch (err) {
    console.error(`[fcm] sendPushToUser failed for ${userId}:`, err)
  }
}
