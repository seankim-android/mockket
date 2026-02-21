import cron from 'node-cron'
import { db } from '../db/client'
import { sendPushToUser } from '../lib/fcm'

const BRIEFS: Record<string, string[]> = {
  'marcus-bull-chen': [
    'Volume pre-market on $NVDA. Watching the open.',
    'Momentum setting up nicely. Ready for the bell.',
    'Aggressive session incoming. Buckle up.',
  ],
  'priya-sharma': [
    'Nothing new to do today. Patience is the position.',
    'Earnings season continues. Staying disciplined.',
    "Markets open in 15. I'll be watching, not rushing.",
  ],
}

async function sendMorningBriefs() {
  const { rows: hires } = await db.query(
    `SELECT ah.user_id, ah.agent_id, np.morning_briefs
     FROM agent_hires ah
     JOIN notification_prefs np ON np.user_id = ah.user_id
     WHERE ah.is_active = TRUE AND ah.is_paused = FALSE
       AND np.morning_briefs = TRUE`
  )

  for (const hire of hires) {
    try {
      const briefs = BRIEFS[hire.agent_id]
      if (!briefs) continue
      const brief = briefs[Math.floor(Math.random() * briefs.length)]
      const agentName = hire.agent_id === 'marcus-bull-chen' ? 'Marcus' : 'Priya'

      await sendPushToUser(hire.user_id, `${agentName} — market open`, brief)
    } catch (err) {
      console.error(`[morning-briefs] Failed for hire ${hire.agent_id}/${hire.user_id}:`, err)
    }
  }
}

// 9:15am ET weekdays
export function startMorningBriefCron() {
  cron.schedule('15 9 * * 1-5', async () => {
    try {
      await sendMorningBriefs()
    } catch (err) {
      console.error('[morning-briefs] Cron failed:', err)
    }
  }, { timezone: 'America/New_York' })
}
