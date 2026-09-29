// Sends a signed sample LINE webhook to the running relay.
//   npm run send:test               -> http://127.0.0.1:<PORT><WEBHOOK_PATH>
//   npm run send:test -- --dup      -> send the same event twice (second one must be dropped)
//   npm run send:test -- https://relay.example.com/webhook/line
const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { loadConfig } = require('../src/config');
const { sign } = require('../src/signature');

async function main() {
  const config = loadConfig();
  const args = process.argv.slice(2);
  const target =
    args.find((a) => /^https?:\/\//.test(a)) ||
    `http://127.0.0.1:${config.port}${config.webhookPath}`;
  const times = args.includes('--dup') ? 2 : 1;

  const body = JSON.stringify({
    destination: 'Uportal-line-test',
    events: [
      {
        type: 'message',
        mode: 'active',
        timestamp: Date.now(),
        webhookEventId: `PORTALLINETEST${Date.now()}`,
        deliveryContext: { isRedelivery: false },
        source: { type: 'user', userId: 'Uportal-line-test' },
        replyToken: '00000000000000000000000000000000',
        message: { id: String(Date.now()), type: 'text', text: 'ทดสอบจาก portal-line' },
      },
    ],
  });

  for (let i = 1; i <= times; i++) {
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-line-signature': sign(config.channelSecret, body) },
      body,
    });
    console.log(`#${i} ${target} -> ${res.status} ${await res.text()}`);
  }
  console.log('ดูผลการ forward ได้ใน log (logs/<วันที่>.log หรือ GET /admin/logs)');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
