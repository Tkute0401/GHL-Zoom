# Zoom to GoHighLevel Webhook Middleware

A production-ready Node.js backend that bridges Zoom webhooks and GoHighLevel, solving the compatibility issue where Zoom's challenge-response validation cannot be handled directly by GHL webhooks.

## 🎯 Problem Solved

Zoom requires a **challenge-response validation** that GoHighLevel webhooks cannot perform. This middleware:

- ✅ Handles Zoom's validation challenge automatically
- ✅ Receives Zoom registration events (webinar/meeting)
- ✅ Forwards registration data to GoHighLevel in the correct format
- ✅ Includes security features (signature verification)
- ✅ Provides comprehensive logging

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

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

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

**Where to get credentials:**

- **Zoom Secret Token**: [Zoom App Marketplace](https://marketplace.zoom.us/) → Your App → Webhook → Secret Token
- **GHL Webhook URL**: GoHighLevel → Settings → Integrations → Incoming Webhooks

### 3. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### 4. Configure Zoom Webhook

1. Go to Zoom App Marketplace → Your App → Webhook
2. Set **Event notification endpoint URL** to:
   ```
   https://your-domain.com/zoom-webhook
   ```
   (For local testing, use [ngrok](https://ngrok.com/): `ngrok http 3000`)
3. Click **Validate** ✅ (This will now work!)
4. Click **Add Events** and select:
   - `webinar.registration_created`
   - `meeting.registration_created` (optional)
5. Save

## 📡 API Endpoints

- **POST `/zoom-webhook`** - Main webhook endpoint (receives Zoom events)
- **GET `/health`** - Health check endpoint
- **GET `/`** - Service information

## 📊 Data Flow

When someone registers for a Zoom webinar/meeting:

1. Zoom sends webhook to your server
2. Server validates the request (if enabled)
3. Server extracts registration data
4. Server forwards formatted data to GHL
5. GHL creates/updates contact and triggers automations

**Example Zoom payload → GHL format:**

```json
// Zoom sends:
{
  "event": "webinar.registration_created",
  "payload": {
    "object": {
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1234567890",
      "webinar_id": "123456789"
    }
  }
}

// GHL receives:
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "source": "Zoom Webinar Registration",
  "tags": ["Zoom Registration", "webinar.registration_created"],
  "customFields": {
    "webinar_id": "123456789",
    "webinar_topic": "My Webinar"
  }
}
```

## 🔒 Security

### Signature Verification

Enable Zoom signature verification in production:

```env
VERIFY_ZOOM_SIGNATURE=true
```

This verifies that requests are actually from Zoom using HMAC SHA256.

## 🚢 Deployment

### Option 1: Railway (Recommended)

1. Push code to GitHub
2. Connect to [Railway](https://railway.app/)
3. Add environment variables in Railway dashboard
4. Deploy automatically

### Option 2: Render

1. Create new Web Service on [Render](https://render.com/)
2. Connect your repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables
6. Deploy

### Option 3: VPS (DigitalOcean, AWS EC2, etc.)

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name zoom-ghl-webhook

# Save PM2 configuration
pm2 save
pm2 startup
```

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

## 📚 Documentation

- **[QUICK-START.md](./QUICK-START.md)** - Get started in 5 minutes
- **[WEBHOOK-SETUP.md](./WEBHOOK-SETUP.md)** - Detailed setup and configuration guide

## 🐛 Troubleshooting

### Zoom validation fails
- ✅ Check `ZOOM_SECRET_TOKEN` is correct
- ✅ Ensure server is publicly accessible
- ✅ Check server logs for errors

### GHL not receiving data
- ✅ Verify `GHL_WEBHOOK_URL` is correct
- ✅ Check server logs for forwarding errors
- ✅ Test GHL webhook URL manually

### Events not being processed
- ✅ Verify Zoom events are enabled (`webinar.registration_created`)
- ✅ Check webhook URL in Zoom matches your server
- ✅ Review server logs for incoming events

## 📝 Logging

The server logs all events to console:
- 🔐 Validation challenges
- 📨 Incoming events
- 📝 Registration processing
- 📤 GHL forwarding
- ❌ Errors

## 🔧 Customization

### Modify GHL Payload Format

Edit the `forwardToGHL()` function in `server.js` to match your GHL webhook format.

### Add More Event Types

Add additional event handlers in the main webhook route:

```javascript
if (event === 'webinar.started') {
  await handleWebinarStarted(payload);
}
```

## ✅ Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Server running and accessible
- [ ] Zoom webhook URL validated
- [ ] Zoom events added (`webinar.registration_created`)
- [ ] GHL webhook URL tested
- [ ] Test registration sent
- [ ] Data received in GHL
- [ ] GHL automation configured

## 🎉 Success Indicators

Once everything is set up:

1. ✅ Zoom validates your webhook URL
2. ✅ Registrations automatically flow to GHL
3. ✅ Contacts created/updated in GHL
4. ✅ GHL automations trigger (WhatsApp reminders, etc.)

## 📦 Dependencies

- **express** - Web server framework
- **axios** - HTTP client for forwarding to GHL
- **dotenv** - Environment variable management
- **crypto** - Built-in Node.js module for encryption

## 🔗 Resources

- [Zoom Webhook Documentation](https://marketplace.zoom.us/docs/api-reference/webhook-reference)
- [GoHighLevel API Documentation](https://highlevel.stoplight.io/docs/integrations)
- [Express.js Documentation](https://expressjs.com/)

## 📄 License

MIT

---

**Need Help?** Check the logs, verify your configuration, and ensure all endpoints are publicly accessible.

