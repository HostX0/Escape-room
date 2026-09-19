# Escape Room Booking API v1

Base URL: `http://localhost:5000/api/v1`

## Seed Data (Branches/Rooms)

Run the SQL seed after schema:

```bash
npm run migrate --prefix escape-room-backend
```

This ensures active branches `Mansour` and `Jadriya`, each with `Room 1/2/3`.

## Customer Auth

- `POST /auth/register`
  - body: `{ full_name, phone, password }`
  - success: `201 { success:true, data:{ user, verification } }`
- `POST /auth/verify-phone`
  - body: `{ phone, code }`
  - success: `200 { success:true, data:{ verified } }`
- `POST /auth/login`
  - body: `{ phone, password }`
  - success: `200 { success:true, data:{ token, user } }`

## Public Customer Endpoints (No Room/Branch Exposure)

- `GET /public/themes`
  - success: `200 { success:true, data:{ themes:[{ id,name,description }] } }`

- `GET /public/themes/:themeId/availability?date=YYYY-MM-DD`
  - success:
    ```json
    {
      "success": true,
      "data": {
        "theme_id": 1,
        "date": "2026-02-15",
        "duration_min": 60,
        "slots": [
          {
            "start_at": "2026-02-15T17:00:00.000Z",
            "end_at": "2026-02-15T18:00:00.000Z",
            "schedule_id": 12
          }
        ]
      }
    }
    ```

- `POST /public/bookings` (customer bearer token)
  - body:
    ```json
    {
      "theme_id": 1,
      "start_at": "2026-02-15T17:00:00.000Z",
      "participants": [
        { "full_name": "Ali Hassan", "phone": "+9647700000000", "is_primary": true },
        { "full_name": "Omar Ali", "phone": "+9647711111111", "is_primary": false }
      ]
    }
    ```
  - success: `201 { success:true, data:{ booking, payment } }`
  - notes: room/branch picked internally, amount=`price_per_person_iqd*participants.length`

- `POST /public/bookings/:id/confirm` (customer bearer token)
  - success: `200 { success:true, data:{ booking:{ id,theme_id,start_at,end_at,amount_iqd,status } } }`

## Admin Endpoints

- `POST /admin/login`
  - body: `{ username, password }`
  - success: `200 { success:true, data:{ token, staff } }`

### Theme Management (`booking_agent`, `manager`)

- `GET /admin/themes`
- `POST /admin/themes` body: `{ name, description?, is_active? }`
- `PATCH /admin/themes/:id` body: `{ name?, description?, is_active? }`

### Branch/Room Lists (`booking_agent`, `manager`)

- `GET /admin/branches`
- `GET /admin/rooms?branch_id=1`

### Theme Schedule Management (`booking_agent`, `manager`)

- `POST /admin/theme-schedules` body: `{ room_id, theme_id, start_at, end_at }`
- `PATCH /admin/theme-schedules/:id` body: `{ room_id, theme_id, start_at, end_at }`
- `GET /admin/theme-schedules?date=YYYY-MM-DD&branch_id=1&room_id=2`
- `DELETE /admin/theme-schedules/:id`

### Bookings / Waivers (`booking_agent`, `manager`)

- `GET /admin/bookings?date=YYYY-MM-DD`
- `POST /admin/bookings/:id/arrive`
- `POST /admin/bookings/:id/no-show`
- `POST /admin/bookings/:id/generate-waivers`

### Payments / Reports (`accountant`, `manager`)

- `POST /admin/payments/:bookingId/mark-paid` body: `{ method: cash|pos|other, reference_no? }`
- `GET /admin/reports/daily?date=YYYY-MM-DD`

## Error Contract

- Validation/business/auth errors: `{ success:false, message:"..." }`
- PG overlap (`23P01`) => `409 { success:false, message:"Selected slot is no longer available" }`
- PG unique violation => `409` friendly message
- PG foreign key violation => `400` friendly message

