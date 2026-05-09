# Phase 25 — Institutional Communication & Notification Infrastructure

**Date:** 2026-05-09
**Commit:** `TBD`
**Scope:** Communication hardening, announcement system, messaging safety, realtime security, observability

---

## 1. Executive Summary

Phase 25 transforms Xedu from an "institutional operations platform" into an "institutional communication operating system" by hardening existing communication infrastructure and introducing a new **Announcement** domain with institutional targeting, receipt tracking, and calm UX principles.

### What Was Built

| Feature | Status | Description |
|---------|--------|-------------|
| Schema migration | ✅ | Notification fields, GroupMessage hardening, Announcement model |
| Announcement system | ✅ | Backend module with audience targeting, read/ack tracking |
| Notification hardening | ✅ | senderId, readAt, category, priority, delivery tracking |
| Preference enforcement | ✅ | Per-channel and per-category preference checks |
| Messaging safety | ✅ | schoolId on GroupMessage, soft delete, unread tracking |
| Realtime security | ✅ | CORS restriction, token deny-list, rate limiting, room auth |
| Observability | ✅ | Storm detection, queue health, duplicate-send readiness |
| Audit trail | ✅ | Announcement and notification events logged |

---

## 2. Schema Changes

### 2.1 Notification Model Additions
```prisma
senderId    String?   // Who sent the notification
readAt      DateTime? // When recipient read it
category    NotificationCategory @default(system) // operational | alert | announcement | message | reminder | system
priority    String    @default("normal") // low | normal | urgent
expiresAt   DateTime? // Auto-expire old notices
```

### 2.2 GroupMessage Model Hardening
```prisma
schoolId    String    // Tenant isolation fix
isDeleted   Boolean   @default(false) // Soft delete
deletedAt   DateTime? // Soft delete timestamp
updatedAt   DateTime  @updatedAt
```

### 2.3 New Models

**Announcement**
```prisma
model Announcement {
  id            String   @id @default(uuid())
  schoolId      String
  branchId      String?
  createdById   String
  title         String
  body          String
  priority      AnnouncementPriority @default(normal)
  status        AnnouncementStatus   @default(draft)
  targetRoles   UserRole[]
  targetClassId String?
  targetBranchIds String[]
  scheduledAt   DateTime?
  expiresAt     DateTime?
  requireAck    Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**AnnouncementReceipt**
```prisma
model AnnouncementReceipt {
  id             String    @id @default(uuid())
  announcementId String
  userId         String
  isRead         Boolean   @default(false)
  readAt         DateTime?
  acknowledgedAt DateTime?
  createdAt      DateTime  @default(now())
  @@unique([announcementId, userId])
}
```

**NotificationDelivery**
```prisma
model NotificationDelivery {
  id             String              @id @default(uuid())
  notificationId String
  channel        NotificationChannel
  status         DeliveryStatus      @default(pending)
  attemptedAt    DateTime?
  deliveredAt    DateTime?
  failedAt       DateTime?
  errorMessage   String?
  retryCount     Int                 @default(0)
  createdAt      DateTime            @default(now())
}
```

### 2.4 New Enums
- `NotificationCategory`: `operational`, `alert`, `announcement`, `message`, `reminder`, `system`
- `AnnouncementPriority`: `low`, `normal`, `urgent`
- `AnnouncementStatus`: `draft`, `scheduled`, `active`, `expired`, `cancelled`
- `DeliveryStatus`: `pending`, `queued`, `sent`, `delivered`, `failed`, `cancelled`

---

## 3. Announcement System

### 3.1 Backend API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/announcements` | Director/VP | Create announcement with audience targeting |
| GET | `/announcements` | Admin | List all announcements (admin view) |
| GET | `/announcements/my` | Any | List my announcements with receipt status |
| GET | `/announcements/:id` | Any | Get announcement detail with receipt |
| POST | `/announcements/:id/read` | Any | Mark as read |
| POST | `/announcements/:id/acknowledge` | Any | Acknowledge (if required) |
| PATCH | `/announcements/:id` | Director/VP | Update draft only |
| DELETE | `/announcements/:id` | Director/VP | Cancel announcement |

### 3.2 Audience Targeting
- **Role-based**: `targetRoles: UserRole[]`
- **Branch-based**: `targetBranchIds: string[]`
- **Class-based**: `targetClassId` → resolves to students + parents of that class
- **Composite**: Combine role + branch + class filters

### 3.3 Receipt Tracking
- `AnnouncementReceipt` created for each audience member
- Tracks `isRead`, `readAt`, `acknowledgedAt`
- Supports `requireAck` for mandatory acknowledgements

---

## 4. Notification Infrastructure Hardening

### 4.1 senderId Tracking
All notifications now record who sent them:
- `send()` → `senderId: currentUser.sub`
- `broadcast()` → `senderId: currentUser.sub`
- `createInApp()` → `senderId` passed explicitly

### 4.2 readAt Timestamp
`markAsRead()` and `markAllAsRead()` now set `readAt` to the current timestamp.

### 4.3 Categorization
Notifications are categorized as:
- `operational` — standard workflow notices
- `alert` — requires attention
- `announcement` — institutional broadcasts
- `message` — direct messages
- `reminder` — scheduled reminders
- `system` — system-generated

### 4.4 Priority Levels
- `low` — informational, digest-friendly
- `normal` — standard operational notice
- `urgent` — requires attention

### 4.5 Preference Enforcement
```ts
shouldSendToChannel(prefs, channel, category): boolean
```
- Checks per-channel preferences (`inApp`, `email`, `sms`, `push`)
- Checks per-category preferences
- Respects user quiet hours (readiness)

### 4.6 Delivery Tracking
`NotificationDelivery` records:
- `status`: pending → queued → sent → delivered | failed
- `attemptedAt`, `deliveredAt`, `failedAt`
- `errorMessage` for failures
- `retryCount`

---

## 5. Messaging Safety Hardening

### 5.1 Tenant Isolation
- `GroupMessage.schoolId` added and populated on creation
- All group message queries filter by `schoolId`

### 5.2 Soft Delete
- `isDeleted` + `deletedAt` fields on `GroupMessage`
- `DELETE /messaging/groups/messages/:messageId` — soft delete only
- Only sender or admin can delete

### 5.3 Unread Tracking
- Uses `ConversationParticipant.lastReadAt`
- Unread count computed as: `messages.createdAt > participant.lastReadAt`

### 5.4 Cross-School Validation
- `addParticipant()` validates target user belongs to same school

---

## 6. Realtime Gateway Hardening

### 6.1 CORS Restriction
```ts
origin: (origin, callback) => {
  const allowed = process.env.ALLOWED_ORIGINS?.split(',');
  if (!origin || allowed.includes(origin)) callback(null, true);
  else callback(new Error('Not allowed by CORS'), false);
}
```

### 6.2 Token Deny-List Check
- `handleConnection()` checks Redis deny-list after JWT verify
- Disconnects revoked tokens

### 6.3 Global Session Revocation
- Checks `user_sessions:{userId}:revoked` marker
- Disconnects users who called `logout-all`

### 6.4 Rate Limiting
- `join:*` messages throttled to 10 per minute per socket
- In-memory timestamp tracking

### 6.5 Room-Join Authorization
- `join:school` — validates user belongs to school
- `join:branch` — validates user has branch access
- Rejects unauthorized joins

### 6.6 Unauthenticated Socket Handling
- Unauthenticated sockets are now disconnected immediately
- No lingering unauthenticated connections

---

## 7. Observability Safeguards

### 7.1 Notification Storm Detection
```ts
detectNotificationStorm(userId, windowMinutes = 60)
```
- Warns if > 50 notifications/hour to any single user
- Returns `{ count, isStorm }`

### 7.2 Queue Health Endpoint
`GET /notifications/health/queue`
- `totalCreated` — deliveries in last 24h
- `totalFailed` — failed deliveries
- `totalDelivered` — successful deliveries
- `failureRate` — percentage
- `isHealthy` — `failureRate < 20%`

### 7.3 Duplicate-Send Readiness
- Redis-based dedup infrastructure ready (`notification_dup:<hash>`)
- Hash: `recipientId + title + body + channel`
- 24h TTL

---

## 8. Audit Trail

### 8.1 Announcement Events
- `announcement:create` — sender, audience size, targeting filters
- `announcement:read` — reader, announcementId (implicit via receipt)
- `announcement:acknowledge` — acknowledger

### 8.2 Notification Events
- `notification:broadcast` — logged in service layer
- Delivery status tracked in `NotificationDelivery` table

---

## 9. Build Verification

```bash
cd apps/backend && npx tsc --noEmit   # ✅ PASS
cd apps/frontend && npx tsc --noEmit  # ✅ PASS
```

---

## 10. API Changes Summary

### New Endpoints
| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | `/announcements` | Director/VP | 5/60s | Create announcement |
| GET | `/announcements` | Admin | — | List announcements |
| GET | `/announcements/my` | Any | — | My announcements |
| GET | `/announcements/:id` | Any | — | Get announcement |
| POST | `/announcements/:id/read` | Any | — | Mark as read |
| POST | `/announcements/:id/acknowledge` | Any | — | Acknowledge |
| PATCH | `/announcements/:id` | Director/VP | — | Update draft |
| DELETE | `/announcements/:id` | Director/VP | — | Cancel |
| DELETE | `/messaging/groups/messages/:messageId` | Any | — | Soft delete group message |
| GET | `/notifications/health/queue` | Director/SA | — | Queue health |

### Modified Endpoints
| Method | Path | Change |
|--------|------|--------|
| POST | `/notifications` | Now records senderId, category, priority, delivery tracking |
| POST | `/notifications/broadcast` | Now enforces preferences, records senderId |
| POST | `/notifications/read/:id` | Now sets readAt timestamp |
| POST | `/notifications/read-all` | Now sets readAt timestamp |
| POST | `/messaging/groups/:groupId/messages` | Now sets schoolId on GroupMessage |
| GET | `/messaging/groups/:groupId/messages` | Now filters isDeleted: false |

---

## 11. Deferred to Phase 26+

| Item | Priority | Reason |
|------|----------|--------|
| Frontend announcement UI enhancement | Medium | Requires dedicated frontend phase |
| Frontend notification center redesign | Medium | Requires dedicated frontend phase |
| Push notification implementation (SEND_PUSH) | Low | Infrastructure not ready |
| SMS provider abstraction | Low | Current Infobip integration works |
| Full delivery pipeline overhaul per-channel | Low | Current BullMQ approach sufficient |
| Advanced audience segments (custom groups) | Low | Role/branch/class targeting sufficient |
| Message retention policies | Low | Not urgent for institutional use |
| Moderation system (reporting, blocking) | Low | Not urgent for institutional use |
| Display screen announcements | Low | Display module shows schedule only |
| Multi-language announcement localization | Low | Single language (Uzbek) currently |

---

## 12. Files Changed

```
apps/backend/prisma/schema.prisma
apps/backend/prisma/migrations/20260509120154_phase_25_communication/
apps/backend/src/modules/announcements/
apps/backend/src/modules/notifications/notifications.service.ts
apps/backend/src/modules/notifications/notifications.controller.ts
apps/backend/src/modules/messaging/messaging.service.ts
apps/backend/src/modules/messaging/messaging.controller.ts
apps/backend/src/modules/gateway/events.gateway.ts
apps/backend/src/modules/gateway/events.module.ts
apps/backend/src/app.module.ts
docs/COMMUNICATION_INFRASTRUCTURE_PHASE25.md
```
