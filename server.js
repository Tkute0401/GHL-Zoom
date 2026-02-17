const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Import Models
const Contact = require('./models/Contact');
const ZoomEvent = require('./models/ZoomEvent');
const Settings = require('./models/Settings');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

/**
 * GHL Webhook Endpoint
 * Handles incoming data from GHL Workflows (Webhook Action)
 */
app.post('/ghl-webhook', async (req, res) => {
  try {
    const data = req.body;
    console.log('📨 Received GHL Webhook:', JSON.stringify(data.customData, null, 2));

    // Extract from customData if available (GHL Workflow Webhook Action structure)
    const payload = data.customData || data;
    let { contactId, email, phone, firstName, lastName, locationId, zoom_tag } = payload;

    // Sanitize email: Convert empty string to undefined to avoid unique index issues
    // 'undefined' means Mongoose won't include it in the update, avoiding conflicts with sparse indexes
    if (typeof email === 'string' && email.trim() === '') {
      email = undefined;
    }

    if (!email && !contactId) {
      console.warn('⚠️  GHL Webhook missing email or contactId');
      return res.status(400).json({ error: 'Missing email or contactId' });
    }

    // --- Global Tag Logic ---
    if (zoom_tag) {
      // Check current global tag
      const currentSetting = await Settings.findOne({ key: 'globalZoomTag' });

      if (!currentSetting || currentSetting.value !== zoom_tag) {
        console.log(`🔄 Global Tag Changed: "${currentSetting?.value}" -> "${zoom_tag}"`);
        await Settings.findOneAndUpdate(
          { key: 'globalZoomTag' },
          { value: zoom_tag, updatedAt: new Date() },
          { upsert: true, new: true }
        );
      }
    }
    // ------------------------

    // Upsert Contact in DB
    const update = {
      ghlContactId: contactId,
      email: email,
      phone: phone,
      firstName: firstName,
      lastName: lastName,
      locationId: locationId || process.env.GHL_LOCATION_ID,
      updatedAt: new Date()
    };

    // If contactId exists, we can also query by that (more robust)
    let contact;
    if (contactId) {
      contact = await Contact.findOneAndUpdate({ ghlContactId: contactId }, update, {
        new: true,
        upsert: true
      });
    } else {
      contact = await Contact.findOneAndUpdate({ email: email }, update, {
        new: true,
        upsert: true
      });
    }

    console.log('✅ Contact synced from GHL:', contact.email);
    res.status(200).json({ message: 'Contact synced' });

  } catch (error) {
    console.error('❌ Error processing GHL webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Zoom Webhook Endpoint
 */
app.post('/zoom-webhook', async (req, res) => {
  try {
    const { event, payload } = req.body;

    // Handle Zoom's URL validation challenge
    if (event === 'endpoint.url_validation') {
      const plainToken = payload?.plainToken;
      const zoomSecretToken = process.env.ZOOM_SECRET_TOKEN;

      if (!plainToken || !zoomSecretToken) {
        return res.status(400).json({ error: 'Missing token or configuration' });
      }

      const encryptedToken = crypto
        .createHmac('sha256', zoomSecretToken)
        .update(plainToken)
        .digest('hex');

      return res.json({ plainToken, encryptedToken });
    }

    console.log(`📨 Received Zoom event: ${event}`);

    // Verify Zoom signature
    if (process.env.VERIFY_ZOOM_SIGNATURE === 'true') {
      if (!verifyZoomSignature(req)) {
        console.error('❌ Invalid Zoom signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Idempotency Check
    // ⚠️ CRITICAL FIX: payload.object.uuid is the MEETING UUID, which is same for all registrants!
    // We must generate a unique ID for this specific *registration event*.
    let eventId = req.headers['x-zm-request-timestamp']; // Default fallback

    const meetingId = payload?.object?.id;
    // Extract email for logging & ID generation
    const registrantEmail = payload?.object?.registrant?.email || payload?.object?.email;

    if (meetingId && registrantEmail) {
      // Composite ID: MeetingID_Email_EventType
      // This ensures different people registering for same meeting are NOT treated as duplicates.
      eventId = `${meetingId}_${registrantEmail}_${event}`;
    } else if (payload?.object?.uuid) {
      // For non-registration events, Meeting UUID + Event Type might be enough
      // eventId = `${payload.object.uuid}_${event}`;
      // Actually, stick to timestamp/uuid for others to avoid breaking change
      eventId = payload.object.uuid;
    }

    if (eventId) {
      const existingEvent = await ZoomEvent.findOne({ eventId });
      if (existingEvent) {
        console.log('Duplicate event, skipping:', eventId);
        return res.status(200).json({ message: 'Duplicate event' });
      }
      await ZoomEvent.create({
        eventId,
        eventType: event,
        email: registrantEmail
      });
    }

    // Process registration
    if (event === 'webinar.registration_created' || event === 'meeting.registration_created') {
      await handleRegistrationEvent(payload, event);
    } else {
      console.log(`ℹ️  Event type ${event} received but not processed`);
    }

    res.status(200).json({ message: 'Webhook received' });

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle Zoom registration events
 */
async function handleRegistrationEvent(payload, eventType) {
  const objectData = payload?.object;
  if (!objectData) return;

  const registrant = objectData.registrant || objectData;
  const email = registrant.email;

  console.log(`📝 Processing registration for: ${email}`);

  try {
    // 1. Check Internal DB
    let contact = await Contact.findOne({ email });
    let ghlContactId = contact?.ghlContactId;

    // 2. If not in DB, Search in GHL
    if (!contact) {
      console.log('🔍 Contact not in DB, searching GHL...');
      let ghlContact = null;
      try {
        ghlContact = await searchGHLContact(email);
      } catch (err) {
        console.error('⚠️ Critical GHL Search Error:', err.message);
        // If 403, it's a permission error. We should NOT try to create, as it will likely fail or create dupes blindly.
        if (err.response?.status === 403) {
          console.error('🚨 PERMISSION DENIED: Check your GHL Access Token Scopes (contacts.readonly) and Location ID.');
        }
      }

      if (ghlContact) {
        console.log('✅ Found in GHL:', ghlContact.id);
        ghlContactId = ghlContact.id;
      } else {
        // 3. If not in GHL (and Search didn't explode with 403), Create Contact
        console.log('Mw Creating new GHL contact...');
        try {
          const newContact = await createGHLContact(registrant);
          ghlContactId = newContact.id;
          console.log('✅ Created in GHL:', ghlContactId);
        } catch (createErr) {
          console.error('❌ Failed to create GHL Contact:', createErr.response?.data || createErr.message);
          // If it failed because it exists (400), we missed it in search (maybe API lag or permission issue)
          if (createErr.response?.status === 400 && createErr.response?.data?.meta?.contactId) {
            console.log('⚠️ Contact actually exists (from 400 error), using ID:', createErr.response.data.meta.contactId);
            ghlContactId = createErr.response.data.meta.contactId;
          } else {
            // Cannot proceed without GHL ID
            throw createErr;
          }
        }
      }

      // 4. Save to DB (only if we have an ID)
      if (ghlContactId) {
        contact = await Contact.create({
          email,
          ghlContactId,
          firstName: registrant.first_name,
          lastName: registrant.last_name,
          phone: registrant.phone,
          locationId: process.env.GHL_LOCATION_ID
        });
      }
    }

    // 5. Get Global Tag
    const globalTagSetting = await Settings.findOne({ key: 'globalZoomTag' });
    const globalTag = globalTagSetting?.value || 'Zoom Registration';

    // 6. Apply Automation (Add Tags)
    const tags = [globalTag, eventType];
    console.log(`🏷️  Adding tags (Global: "${globalTag}") to contact ${ghlContactId}:`, tags);
    await addGHLTags(ghlContactId, tags);

    console.log('🎉 processing complete for:', email);

  } catch (error) {
    console.error('❌ Error in handleRegistrationEvent:', error.message);
    // Don't throw, just log so we don't crash the server loop? 
    // Actually, maybe we should throw if we want retry logic from Zoom side (500 sends retry)
    // But for now let's just log.
  }
}

// --- GHL API Helpers ---

const ghlAxios = axios.create({
  baseURL: 'https://services.leadconnectorhq.com',
  headers: {
    'Authorization': `Bearer ${process.env.GHL_ACCESS_TOKEN}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json'
  }
});

async function searchGHLContact(email) {
  try {
    const response = await ghlAxios.get('/contacts/', {
      params: { query: email }
    });
    // API returns { contacts: [...] }
    return response.data.contacts?.[0] || null;
  } catch (error) {
    // console.error('GHL Search Error:', error.response?.data || error.message);
    // Return null ONLY for 404 (not found). Throw others (403, 500)
    if (error.response?.status === 404) return null;
    throw error;
  }
}

async function createGHLContact(registrant) {
  const payload = {
    email: registrant.email,
    firstName: registrant.first_name,
    lastName: registrant.last_name,
    phone: registrant.phone,
    locationId: process.env.GHL_LOCATION_ID,
    source: 'Zoom Integration'
  };

  try {
    const response = await ghlAxios.post('/contacts/', payload);
    return response.data.contact;
  } catch (error) {
    console.error('GHL Create Error:', error.response?.data || error.message);
    throw error;
  }
}

async function addGHLTags(contactId, tags) {
  try {
    const response = await ghlAxios.post(`/contacts/${contactId}/tags`, {
      tags: tags
    });
    return response.data;
  } catch (error) {
    console.error('GHL Tag Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Verify Zoom webhook signature
 */
function verifyZoomSignature(req) {
  const signature = req.headers['x-zm-signature'];
  const timestamp = req.headers['x-zm-request-timestamp'];
  const zoomSecretToken = process.env.ZOOM_SECRET_TOKEN;

  if (!signature || !timestamp || !zoomSecretToken) return false;

  const message = `v0:${timestamp}:${JSON.stringify(req.body)}`;
  const hash = crypto.createHmac('sha256', zoomSecretToken).update(message).digest('hex');

  return signature === `v0=${hash}`;
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});


