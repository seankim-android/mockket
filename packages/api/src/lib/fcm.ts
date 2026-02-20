import axios from 'axios'

const FCM_URL = 'https://fcm.googleapis.com/fcm/send'

export async function sendPushNotification(token: string, title: string, body: string, data?: Record<string, string>) {
  try {
    await axios.post(FCM_URL, {
      to: token,
      notification: { title, body },
      data,
    }, {
      headers: {
        Authorization: `key=${process.env.FCM_SERVER_KEY}`,
      },
    })
  } catch (err) {
    console.error(`[fcm] Failed to send to token ${token.slice(0, 8)}...:`, err)
  }
}

export async function sendPushToUser(userId: string, title: string, body: string, data?: Record<string, string>, db?: any) {
  if (!db) return
  const { rows } = await db.query(
    `SELECT token FROM fcm_tokens WHERE user_id = $1`,
    [userId]
  )
  await Promise.allSettled(rows.map((r: any) => sendPushNotification(r.token, title, body, data)))
}
