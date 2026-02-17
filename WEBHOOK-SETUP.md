# Zoom to GoHighLevel Webhook Middleware

A Node.js backend server that handles Zoom webhook validation and forwards registration data to GoHighLevel (GHL) webhooks.

## 🎯 What This Does

This middleware solves the **Zoom + GHL webhook compatibility issue**:

- ✅ **Handles Zoom's challenge-response validation** (which GHL cannot do)
- ✅ **Receives Zoom registration events** (webinar/meeting registrations)
- ✅ **Forwards data to GHL webhook** in the correct format
- ✅ **Logs all events** for debugging

## 🏗️ Architecture

```
Zoom Webhook
    ↓
Node.js Middleware (this server)
    ↓
GoHighLevel Incoming Webhook
    ↓
GHL Automation/Contact Creation
```

## 📋 Prerequisites

- Node.js 14+ installed
- Zoom App with Webhook feature enabled
- GoHighLevel account with Incoming Webhook configured
- Public URL for your server (for production: use services like Railway, Render, Heroku, etc.)

## 🚀 Quick Setup

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Zoom Configuration
ZOOM_SECRET_TOKEN=your_zoom_secret_token_here
VERIFY_ZOOM_SIGNATURE=false

# GoHighLevel Configuration
GHL_WEBHOOK_URL=https://services.leadconnectorhq.com/webhooks/your_webhook_id
GHL_API_KEY=your_ghl_api_key_optional

# Server Configuration
PORT=3000
```

### Step 3: Get Your Credentials

#### Getting Zoom Secret Token:

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Navigate to **Your Apps** → Select your app
3. Go to **Feature** → **Webhook**
4. Copy the **Secret Token** (starts with something like `abc123...`)

#### Getting GHL Webhook URL:

1. Log in to GoHighLevel
2. Go to **Settings** → **Integrations** → **Incoming Webhooks**
3. Create a new webhook or use existing one
4. Copy the **Webhook URL** (looks like `https://services.leadconnectorhq.com/webhooks/...`)

### Step 4: Start the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

### Step 5: Configure Zoom Webhook

1. In Zoom App Marketplace → Your App → Webhook
2. Set **Event notification endpoint URL** to:
   ```
   https://your-domain.com/zoom-webhook
   ```
   (Replace with your actual server URL)
3. Click **Validate** ✅ (This will now work!)
4. Click **Add Events** and select:
   - `webinar.registration_created`
   - `meeting.registration_created` (optional)
5. Save

## 📡 Endpoints

### POST `/zoom-webhook`
Main webhook endpoint that receives Zoom events.

**Handles:**
- Zoom validation challenge (`endpoint.url_validation`)
- Registration events (`webinar.registration_created`, `meeting.registration_created`)

### GET `/health`
Health check endpoint. Returns server status.

### GET `/`
Root endpoint with service information.

## 📊 Data Flow

### Zoom Registration Event → GHL Format

**Zoom sends:**
```json
{
  "event": "webinar.registration_created",
  "payload": {
    "object": {
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1234567890",
      "city": "New York",
      "webinar_id": "123456789",
      "webinar_topic": "My Webinar"
    }
  }
}
```

**GHL receives:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "city": "New York",
  "source": "Zoom Webinar Registration",
  "tags": ["Zoom Registration", "webinar.registration_created"],
  "customFields": {
    "webinar_id": "123456789",
    "webinar_topic": "My Webinar",
    "registration_time": "2026-01-13T10:00:00.000Z"
  }
}
```

## 🔒 Security

### Signature Verification (Optional)

To enable Zoom signature verification, set in `.env`:
```env
VERIFY_ZOOM_SIGNATURE=true
```

This verifies that requests are actually from Zoom using HMAC SHA256.

### GHL API Key (Optional)

If your GHL webhook requires authentication, add:
```env
GHL_API_KEY=your_api_key
```

## 🚢 Deployment

### Option 1: Railway

1. Push code to GitHub
2. Connect to [Railway](https://railway.app/)
3. Add environment variables
4. Deploy

### Option 2: Render

1. Create new Web Service on [Render](https://render.com/)
2. Connect your repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables
6. Deploy

### Option 3: Heroku

```bash
heroku create your-app-name
heroku config:set ZOOM_SECRET_TOKEN=your_token
heroku config:set GHL_WEBHOOK_URL=your_url
git push heroku main
```

### Option 4: VPS (DigitalOcean, AWS EC2, etc.)

1. Install Node.js on server
2. Clone repository
3. Install PM2: `npm install -g pm2`
4. Start with PM2: `pm2 start server.js --name zoom-ghl-webhook`
5. Set up reverse proxy (Nginx) to forward requests
6. Configure SSL (Let's Encrypt)

## 🧪 Testing

### Test Validation Endpoint

```bash
curl -X POST http://localhost:3000/zoom-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "endpoint.url_validation",
    "payload": {
      "plainToken": "test123"
    }
  }'
```

Expected response:
```json
{
  "plainToken": "test123",
  "encryptedToken": "hashed_value"
}
```

### Test Health Check

```bash
curl http://localhost:3000/health
```

## 🐛 Troubleshooting

### Issue: Zoom validation fails

**Solution:**
- Check that `ZOOM_SECRET_TOKEN` is correct
- Ensure server is publicly accessible
- Check server logs for errors

### Issue: GHL not receiving data

**Solution:**
- Verify `GHL_WEBHOOK_URL` is correct
- Check server logs for forwarding errors
- Test GHL webhook URL manually with a POST request

### Issue: Server not starting

**Solution:**
- Check Node.js version: `node --version` (should be 14+)
- Verify all dependencies installed: `npm install`
- Check PORT is not already in use

### Issue: Events not being processed

**Solution:**
- Check Zoom webhook events are enabled:
  - `webinar.registration_created`
  - `meeting.registration_created`
- Verify webhook URL in Zoom matches your server endpoint
- Check server logs for incoming events

## 📝 Logging

The server logs all events to console:

- 🔐 Validation challenges
- 📨 Incoming events
- 📝 Registration processing
- 📤 GHL forwarding
- ❌ Errors

Check logs to debug issues.

## 🔧 Customization

### Modify GHL Payload Format

Edit the `forwardToGHL()` function in `server.js` to match your GHL webhook format:

```javascript
const ghlPayload = {
  // Add/remove fields as needed
  email: registrationData.email,
  firstName: registrationData.first_name,
  // ... your custom fields
};
```

### Add More Event Types

Add additional event handlers in the main webhook route:

```javascript
if (event === 'webinar.started') {
  await handleWebinarStarted(payload);
}
```

## 📚 Additional Resources

- [Zoom Webhook Documentation](https://marketplace.zoom.us/docs/api-reference/webhook-reference)
- [GoHighLevel API Documentation](https://highlevel.stoplight.io/docs/integrations)
- [Express.js Documentation](https://expressjs.com/)

## ✅ Checklist

Before going live:

- [ ] Environment variables configured
- [ ] Server running and accessible
- [ ] Zoom webhook URL validated
- [ ] Zoom events added (`webinar.registration_created`)
- [ ] GHL webhook URL tested
- [ ] Test registration sent
- [ ] Data received in GHL
- [ ] GHL automation configured

## 🎉 Success!

Once everything is set up:

1. ✅ Zoom validates your webhook URL
2. ✅ Registrations automatically flow to GHL
3. ✅ Contacts created/updated in GHL
4. ✅ GHL automations trigger (WhatsApp reminders, etc.)

---

**Need Help?** Check the logs, verify your configuration, and ensure all endpoints are publicly accessible.

