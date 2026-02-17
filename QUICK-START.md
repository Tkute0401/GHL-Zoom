# 🚀 Quick Start Guide

Get your Zoom → GHL webhook running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create .env File

Copy `.env.example` to `.env` and fill in your credentials:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Mac/Linux
cp .env.example .env
```

Then edit `.env` with your actual values:

```env
ZOOM_SECRET_TOKEN=abc123xyz...          # From Zoom App Marketplace
GHL_WEBHOOK_URL=https://services...    # From GoHighLevel
PORT=3000
```

## Step 3: Start Server

```bash
npm start
```

You should see:
```
🚀 Server running on port 3000
📡 Webhook endpoint: http://localhost:3000/zoom-webhook
```

## Step 4: Test Locally (Optional)

Use [ngrok](https://ngrok.com/) to expose your local server:

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

## Step 5: Configure Zoom

1. Go to Zoom App Marketplace → Your App → Webhook
2. Set **Event notification endpoint URL** to:
   ```
   https://your-domain.com/zoom-webhook
   ```
   (Use ngrok URL for testing, or your production URL)
3. Click **Validate** ✅
4. Add Events:
   - ✅ `webinar.registration_created`
   - ✅ `meeting.registration_created` (optional)
5. Save

## Step 6: Test It!

1. Register someone for your Zoom webinar
2. Check server logs - you should see:
   ```
   📨 Received Zoom event: webinar.registration_created
   📝 Processing registration: { email: '...', ... }
   📤 Forwarding to GHL: ...
   ✅ Successfully forwarded to GHL
   ```
3. Check GoHighLevel - contact should be created!

## 🎉 Done!

Your webhook is now live! Every Zoom registration will automatically flow to GHL.

---

**Need detailed setup?** See [WEBHOOK-SETUP.md](./WEBHOOK-SETUP.md)

**Having issues?** Check the Troubleshooting section in WEBHOOK-SETUP.md

