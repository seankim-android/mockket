import axios from 'axios'

const FCM_URL = 'https://fcm.googleapis.com/fcm/send'

export async function sendPushNotification(token: string, title: string, body: string, data?: Record<string, string>) {
  await axios.post(FCM_URL, {
    to: token,
    notification: { title, body },
    data,
  }, {
    headers: {
      Authorization: `key=${process.env.FCM_SERVER_KEY}`,
    },
  })
}

export async function sendPushToUser(userId: string, title: string, body: string, data?: Record<string, string>, db?: any) {
  if (!db) return
  const { rows } = await db.query(
    `SELECT token FROM fcm_tokens WHERE user_id = $1`,
    [userId]
  )
  await Promise.all(rows.map((r: any) => sendPushNotification(r.token, title, body, data)))
}
