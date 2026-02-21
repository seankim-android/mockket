import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { db } from '../db/client'

// Initialize once
if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)
  initializeApp({ credential: cert(serviceAccount) })
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
      data,
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
  const { rows } = await db.query(
    `SELECT token FROM fcm_tokens WHERE user_id = $1`,
    [userId]
  )
  await Promise.allSettled(rows.map((r: any) => sendPushNotification(r.token, title, body, data)))
}
