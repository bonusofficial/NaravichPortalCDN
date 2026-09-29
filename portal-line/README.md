# Portal LINE — ระบบรวมแจ้งเตือน LINE

LINE Official Account ตั้ง Webhook URL ได้แค่ 1 อัน ตัวนี้เป็นตัวกลางรับ webhook จาก LINE แล้วกระจายต่อไปยังหลายเว็บ (ตั้งไว้ 3 เว็บ เพิ่มได้) โดยตั้งค่าทั้งหมดใน `.env`

```text
LINE ──POST──▶ portal-line ──┬──▶ website1
               (ตรวจ signature, ├──▶ website2
                กันซ้ำ, log)   └──▶ website3   (retry + timeout แยกกันต่อเว็บ)
```

| ความต้องการ | ทำอย่างไร |
| --- | --- |
| รับ Webhook และ Forward ไปหลาย URL | `POST /webhook/line` ตอบ LINE 200 ทันที แล้วยิงต่อทุกปลายทางพร้อมกันเบื้องหลัง |
| ตั้งค่าปลายทางได้ | `DEST_n_URL`, `DEST_n_NAME`, `DEST_n_HEADERS`, `DEST_n_TIMEOUT_MS` ใน `.env` |
| รองรับ JSON | รับ/ส่งเป็น `application/json`, body ที่ไม่ใช่ JSON ของ LINE ตอบ 400, header เพิ่มเติมตั้งเป็น JSON ได้ |
| เปิด/ปิดปลายทางได้ | `DEST_n_ENABLED=true/false` แล้ว restart |
| มี Log | ไฟล์ JSON รายวันใน `logs/` + ดูผ่าน `GET /admin/logs` |
| ตรวจ Signature | ตรวจ `x-line-signature` (HMAC-SHA256 ด้วย Channel secret) ไม่ผ่านตอบ 401 และไม่ส่งต่อ |
| มี Retry | ลองใหม่เมื่อเชื่อมต่อไม่ได้/timeout/5xx/408/425/429 แบบรอเพิ่มเท่าตัว (1s, 2s, 4s) |
| มี Timeout | `FORWARD_TIMEOUT_MS` ต่อครั้ง (ปรับรายเว็บได้) เว็บช้าเว็บเดียวไม่ถ่วงเว็บอื่น |
| ป้องกันการยิงข้อมูลซ้ำ | จำ `webhookEventId` ไว้ `DEDUP_TTL_SECONDS` event ซ้ำหรือเก่ากว่านั้นจะไม่ถูกส่งต่อ |

## ติดตั้งและรัน

ต้องใช้ Node.js 20 ขึ้นไป

```bash
cd portal-line
npm install
cp .env.example .env   # แล้วแก้ค่าใน .env
npm start
```

โหมดพัฒนา (restart อัตโนมัติเมื่อแก้โค้ด): `npm run dev`

## ตั้งค่า `.env`

| ตัวแปร | ค่าเริ่มต้น | ความหมาย |
| --- | --- | --- |
| `LINE_CHANNEL_SECRET` | — (จำเป็น) | Channel secret จาก LINE Developers Console > Basic settings |
| `HOST` / `PORT` | `0.0.0.0` / `3100` | ที่อยู่ที่ server ฟัง (หลัง nginx ใช้ `127.0.0.1`) |
| `WEBHOOK_PATH` | `/webhook/line` | path ที่รับ webhook |
| `DEST_n_URL` | — | URL ปลายทาง (`n` = 1, 2, 3, …) ใส่ว่าง = ไม่ใช้ |
| `DEST_n_NAME` | `destn` | ชื่อที่แสดงใน log |
| `DEST_n_ENABLED` | `true` | เปิด/ปิดปลายทาง |
| `DEST_n_HEADERS` | ว่าง | header เพิ่มเติมแบบ JSON เช่น `{"Authorization":"Bearer xxx"}` |
| `DEST_n_TIMEOUT_MS` | `FORWARD_TIMEOUT_MS` | timeout เฉพาะปลายทางนี้ |
| `FORWARD_TIMEOUT_MS` | `5000` | timeout ต่อการยิง 1 ครั้ง |
| `FORWARD_MAX_RETRIES` | `3` | จำนวนครั้งที่ลองใหม่ (3 = ยิงสูงสุด 4 ครั้ง) |
| `FORWARD_RETRY_BASE_MS` | `1000` | เวลารอก่อน retry ครั้งแรก แล้วเพิ่มเท่าตัว |
| `DEDUP_TTL_SECONDS` | `86400` | ช่วงเวลาที่จำ event ไว้กันซ้ำ |
| `LOG_DIR` | `./logs` | โฟลเดอร์ log |
| `LOG_RETENTION_DAYS` | `14` | ลบไฟล์ log ที่เก่ากว่านี้อัตโนมัติ |
| `LOG_PAYLOAD` | `false` | `true` = เก็บ payload เต็ม (มีข้อความและ userId ลูกค้า เปิดเฉพาะตอน debug) |
| `ADMIN_TOKEN` | ว่าง | token สำหรับ `/admin/*` (ว่าง = ปิด) |

ค่าผิดรูปแบบ (URL ผิด, JSON ของ header ผิด, ชื่อซ้ำ ฯลฯ) server จะไม่ยอมเริ่มและบอกว่าตัวแปรไหนผิด

**เปิด/ปิดหรือเปลี่ยนปลายทาง:** แก้ `.env` แล้ว restart (`sudo systemctl restart portal-line`) ตอนหยุดระบบจะรองานที่กำลัง retry ให้เสร็จก่อนสูงสุด 30 วินาที

## ตั้งค่าฝั่ง LINE

1. LINE Developers Console > Messaging API > Webhook URL = `https://<โดเมน>/webhook/line`
2. เปิด **Use webhook** แล้วกด **Verify** (ต้องได้ Success; คำขอ Verify ไม่ถูกส่งต่อไปยังเว็บปลายทาง)
3. แนะนำเปิด **Webhook redelivery** ถ้า portal-line ล่มชั่วคราว LINE จะส่งซ้ำให้ และระบบกันซ้ำจะไม่ส่งต่อ event ที่เคยส่งแล้ว

## สิ่งที่เว็บปลายทางได้รับ

- Body เป็น JSON รูปแบบเดียวกับที่ LINE ส่งมา และ header `x-line-signature` ที่ถูกต้อง เว็บที่เคยรับ webhook จาก LINE ตรง ๆ (เช่นใช้ LINE SDK middleware) **ใช้ได้เลยไม่ต้องแก้โค้ด** แค่ใช้ Channel secret ตัวเดียวกัน
- ถ้าใน batch มีบาง event ซ้ำ ระบบจะตัด event ที่ซ้ำออกและเซ็น signature ใหม่ด้วย Channel secret เดิม
- Header เพิ่มเติม: `x-portal-line-delivery` (id สำหรับค้นใน log), `x-portal-line-attempt` (ครั้งที่ยิง), และ `DEST_n_HEADERS`
- ตอบ `2xx` = สำเร็จ | `5xx`/`408`/`425`/`429`/timeout/เชื่อมต่อไม่ได้ = retry | `4xx` อื่น ๆ และ `3xx` = ล้มเหลวทันที (ไม่ retry) ปลายทางควรตอบ 200 เร็ว ๆ แล้วค่อยประมวลผลเบื้องหลัง

> ⚠️ **replyToken ใช้ได้ครั้งเดียว** ถ้าหลายเว็บพยายาม reply ด้วย token เดียวกัน จะสำเร็จแค่เว็บแรก ควรกำหนดให้มีเว็บเดียวที่ตอบกลับด้วย reply API ส่วนเว็บอื่นใช้ push API หรือแค่บันทึกข้อมูล

## Log

เขียนเป็น JSON บรรทัดละ 1 รายการลง `logs/YYYY-MM-DD.log` (และ stdout/journald)

| event | เมื่อไร |
| --- | --- |
| `webhook.received` | รับ webhook ที่ signature ถูก: จำนวน event, ใหม่/ซ้ำ/เก่า, `eventIds`, ส่งต่อไปที่ไหน |
| `webhook.rejected` | signature ไม่ถูก (`invalid_signature`) หรือ body ไม่ใช่ JSON ของ LINE (`invalid_json`) พร้อม IP |
| `forward.success` | ส่งถึงปลายทางแล้ว: status, จำนวนครั้ง, เวลาที่ใช้ |
| `forward.retry` | ส่งไม่สำเร็จ กำลังรอลองใหม่: status/error และเวลารอ |
| `forward.failed` | ล้มเหลวถาวร: status/error และ response ของปลายทาง 300 ตัวอักษรแรก |

ดูผ่าน API (ต้องตั้ง `ADMIN_TOKEN`):

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" "http://127.0.0.1:3100/admin/logs?limit=50"
curl -H "Authorization: Bearer $ADMIN_TOKEN" "http://127.0.0.1:3100/admin/logs?level=error"
curl -H "Authorization: Bearer $ADMIN_TOKEN" "http://127.0.0.1:3100/admin/status"
```

`/admin/status` แสดงปลายทาง (เปิด/ปิด, URL แบบซ่อน query string) และสถิติ: รับ/ปฏิเสธ/ซ้ำ/ส่งสำเร็จ/ล้มเหลว นับตั้งแต่ start ล่าสุด

## ทดสอบ

```bash
npm test                          # unit + integration test ทั้งหมด
npm run send:test                 # ยิง webhook ตัวอย่าง (เซ็นด้วย secret ใน .env) เข้า server ที่รันอยู่
npm run send:test -- --dup        # ยิง event เดิม 2 รอบ รอบที่ 2 ต้องไม่ถูกส่งต่อ
```

`send:test` จะส่งข้อความ "ทดสอบจาก portal-line" ไปถึงทุกเว็บปลายทางจริง

## Deploy (Ubuntu + systemd + nginx)

```bash
sudo useradd --system --home /opt/portal-line --shell /usr/sbin/nologin portal-line
sudo mkdir -p /opt/portal-line/logs
# คัดลอกโค้ดไป /opt/portal-line แล้ว
cd /opt/portal-line && npm ci --omit=dev
sudo cp .env.example .env && sudo nano .env
sudo chown -R portal-line:portal-line /opt/portal-line && sudo chmod 600 /opt/portal-line/.env
sudo cp deploy/portal-line.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now portal-line
journalctl -u portal-line -f
```

nginx (LINE บังคับ HTTPS จึงต้องมี TLS) — เปิดเฉพาะ path webhook ส่วน `/admin/*` เรียกจากในเครื่องผ่าน SSH:

```nginx
location = /webhook/line {
    proxy_pass http://127.0.0.1:3100;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## ข้อจำกัด

- คิว retry และรายการกันซ้ำเก็บในหน่วยความจำ ถ้าปิดระบบแล้ว retry ยังไม่เสร็จใน 30 วินาที หรือเครื่องดับกะทันหัน งานที่ค้างจะหายและถูกบันทึกเป็น `abandoned` ใน log
- LINE ไม่ส่งซ้ำ event ที่ตอบ 200 ไปแล้ว การจำในหน่วยความจำจึงพอสำหรับกันซ้ำ แต่ถ้ารันหลาย instance พร้อมกัน แต่ละตัวจะกันซ้ำแยกกัน
