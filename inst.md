# GoHighLevel ↔ Zoom Integration via Node Server  
## (No Inbound Webhooks · No Premium Triggers · Fully Controlled)

---

## 1. Objective

Build a robust integration where:

- Zoom sends webinar registration events to a Node.js server
- GoHighLevel (GHL) sends contact context to Node using **Webhook Action (free)**
- Node server becomes the system of intelligence
- Contacts are:
  - matched from internal DB
  - or searched in GHL
  - or created in GHL if missing
- Tags and custom fields are updated via **GHL REST API**
- GHL workflows are triggered using **tags / custom fields**
- ❌ GHL Inbound Webhook trigger is NOT used (avoids premium cost)

---

## 2. High-Level Architecture

```

Zoom Webhook ───────────▶ Node Server
│
▼
Internal Database
│
GHL Workflow (Webhook Action) ─▶│
▼
GHL REST API (Contacts / Tags)
▼
GHL Workflow (FREE Triggers)

```

---

## 3. Key Design Principles

1. **Node server owns logic**
2. **GHL owns automation**
3. **No webhook enters GHL**
4. **contactId is the primary identifier**
5. **Email is fallback only**
6. **System must self-heal**
7. **Webhook order is NOT assumed**

---

## 4. Required Credentials

### Zoom
- Webhook Secret (for signature validation)

### GoHighLevel
- Location (Sub-account) API Key
- Location ID

---
## 6. Database Schema (Minimal & Sufficient)

create mongodb schema for contacts, zoom_registrations, zoom events

## 7. GHL → Node (Webhook Action)

### Purpose

* Send GHL contact context
* Provide resolved custom values (tags, metadata)

### Workflow Setup

Trigger (examples):

* Form Submitted
* Appointment Booked
* Tag Added

Action:

* Webhook (POST)

### Recommended Payload

```json
{
  "contactId": "{{contact.id}}",
  "email": "{{contact.email}}",
  "phone": "{{contact.phone}}",
  "locationId": "{{location.id}}",
  "zoom_tag": "{{custom_values.zoom_reg}}"
}
```

> `{{custom_values.zoom_reg}}` is resolved INSIDE GHL before sending.

---

## 8. Zoom → Node (Webhook)


---

## 9. Core Node Logic (Authoritative Flow)

### STEP 0: Idempotency Check

```js
if (db.zoomEventExists(event_id)) return 200;
```

---

### STEP 1: Check Internal DB (Fast Path)

```js
contact = db.findByEmail(email);
```

If found:

* contactId is available
* proceed to STEP 5

---

### STEP 2: Not in DB → Search in GHL

#### API

```
GET /contacts/?locationId=LOCATION_ID&query=email
```

If found:

* extract contactId
* store in DB
* proceed to STEP 5

---

### STEP 3: Not in GHL → Create Contact

#### API

```
POST /contacts/
```

```json
{
  "locationId": "LOCATION_ID",
  "email": "user@gmail.com",
  "firstName": "Rahul",
  "lastName": "Patil",
  "phone": "+919876543210",
  "source": "Zoom Webinar"
}
```

* Save returned `contactId` in DB

---

### STEP 4: Persist Mapping (Mandatory)

```sql
INSERT INTO contacts (contact_id, email, phone, location_id, created_from)
VALUES (...)
```

---

### STEP 5: Apply Automation via GHL API

#### A) Add Tag

add the tag "zoom_tag": "{{custom_values.zoom_reg}}" sent from ghl webhook to the contact


## 10. GHL Workflow (FREE)

### Trigger Options

* Tag Added → "zoom_tag": "{{custom_values.zoom_reg}}"


### Inside Workflow

* Send WhatsApp / Email
* Move pipeline stage
* Start follow-up sequences

---

## 11. Multiple Webinars Handling

* Same contact can attend unlimited webinars

## 12. Why This Architecture Works

✔ No GHL premium triggers
✔ Handles out-of-order webhooks
✔ Handles missing contacts
✔ Handles duplicate events
✔ Allows ops to change tags without redeploy
✔ Uses immutable identifiers
✔ Scales horizontally

---

## 13. Common Mistakes to Avoid

* ❌ Using GHL Inbound Webhook
* ❌ Depending only on email
* ❌ Hardcoding tag names in Node
* ❌ Assuming webhook order
* ❌ Not storing mappings
* ❌ Not handling retries

---

## 14. Security Checklist

* Validate Zoom webhook signatures
* Store API keys in env vars
* Rate-limit inbound webhooks
* Never expose GHL API key to frontend

---

## 15. Summary

* Node is the brain
* GHL is the automation engine
* Zoom is the event source
* contactId is king
* Custom Values stay in GHL
* No inbound webhook ever required

---

## Maintainer Notes

* Each GHL sub-account has its own API key
* Tags are string-based (auto-created)
* Custom field keys must match exactly