# API Endpoints — EV Charging Platform

## SERVICE: IAM Service

**Base path:** `/api/v1` | **Container:** `ev-iam` | **Port:** 3001

### [01] [POST] /api/v1/auth/register

- **Auth:** Public | **Roles:** —
- **Name:** Đăng ký tài khoản
- **Request (Body):**
  ```json
  {
    "email": "string (email format)",
    "password": "string (min 8 chars)",
    "fullName": "string (min 2 chars)",
    "phone": "string (optional, regex: ^\\+?[0-9]{9,15}$)",
    "dateOfBirth": "string (YYYY-MM-DD)"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": "uuid",
    "email": "string",
    "fullName": "string",
    "phone": "string",
    "dateOfBirth": "string",
    "roles": ["user"],
    "createdAt": "iso-date"
  }
  ```

### [02] [POST] /api/v1/auth/login

- **Auth:** Public | **Roles:** —
- **Name:** Đăng nhập, nhận JWT
- **Request (Body):**
  ```json
  {
    "email": "string (email format)",
    "password": "string",
    "mfaToken": "string (optional, 6 digits)"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "accessToken": "string (JWT)",
    "refreshToken": "string (JWT)",
    "expiresIn": "number (seconds)"
  }
  ```

### [03] [POST] /api/v1/auth/refresh

- **Auth:** Public | **Roles:** —
- **Name:** Làm mới Access Token
- **Request (Body):**
  ```json
  {
    "refreshToken": "string (JWT)"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "accessToken": "string (JWT)",
    "refreshToken": "string (JWT)"
  }
  ```

### [04] [POST] /api/v1/auth/logout

- **Auth:** Bearer | **Roles:** User/Admin
- **Name:** Đăng xuất, thu hồi session
- **Request (Body):**
  ```json
  {
    "sessionId": "uuid (optional)"
  }
  ```
- **Response (204 No Content):** Empty

### [05] [GET] /api/v1/auth/me

- **Auth:** Bearer | **Roles:** User/Admin
- **Name:** Lấy thông tin user hiện tại (từ JWT)
- **Request:** Empty
- **Response (200 OK):**
  ```json
  {
    "id": "uuid",
    "email": "string",
    "roles": ["string"]
  }
  ```

### [06] [PATCH] /api/v1/auth/change-password

- **Auth:** Bearer | **Roles:** User
- **Name:** Đổi mật khẩu
- **Request (Body):**
  ```json
  {
    "currentPassword": "string",
    "newPassword": "string (min 8 chars)"
  }
  ```
- **Response (204 No Content):** Empty

### [07] [GET] /api/v1/auth/sessions

- **Auth:** Bearer | **Roles:** User
- **Name:** Danh sách phiên đăng nhập
- **Request:** Empty
- **Response (200 OK):**
  ```json
  [
    {
      "id": "uuid",
      "ip": "string",
      "userAgent": "string",
      "createdAt": "iso-date"
    }
  ]
  ```

### [08] [DELETE] /api/v1/auth/sessions/:id

- **Auth:** Bearer | **Roles:** User
- **Name:** Thu hồi 1 session
- **Request (Path Params):**
  ```json
  {
    "id": "uuid"
  }
  ```
- **Response (204 No Content):** Empty

### [09] [DELETE] /api/v1/auth/sessions

- **Auth:** Bearer | **Roles:** User
- **Name:** Thu hồi tất cả session
- **Request:** Empty
- **Response (204 No Content):** Empty

### [10] [POST] /api/v1/auth/roles/assign

- **Auth:** Bearer | **Roles:** Admin
- **Name:** Gán role cho user
- **Request (Body):**
  ```json
  {
    "userId": "uuid",
    "roleName": "string",
    "expiresAt": "iso-date (optional)"
  }
  ```
- **Response (204 No Content):** Empty

### [11] [POST] /api/v1/auth/roles/revoke

- **Auth:** Bearer | **Roles:** Admin
- **Name:** Gỡ role khỏi user
- **Request (Body):**
  ```json
  {
    "userId": "uuid",
    "roleName": "string"
  }
  ```
- **Response (204 No Content):** Empty

### [12] [POST] /api/v1/auth/mfa/setup

- **Auth:** Bearer | **Roles:** User
- **Name:** Khởi tạo TOTP MFA
- **Request:** Empty
- **Response (200 OK):**
  ```json
  {
    "otpauth_url": "string (qrcode format)",
    "secret": "string"
  }
  ```

### [13] [POST] /api/v1/auth/mfa/verify

- **Auth:** Bearer | **Roles:** User
- **Name:** Xác minh & kích hoạt MFA
- **Request (Body):**
  ```json
  {
    "token": "string (6 chars)"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "backupCodes": ["string"]
  }
  ```

### [14] [POST] /api/v1/auth/mfa/disable

- **Auth:** Bearer | **Roles:** User
- **Name:** Tắt MFA
- **Request (Body):**
  ```json
  {
    "password": "string"
  }
  ```
- **Response (204 No Content):** Empty

### [15] [GET] /api/v1/users/me

- **Auth:** Bearer | **Roles:** User
- **Name:** Lấy profile đầy đủ
- **Request:** Empty
- **Response (200 OK):**
  ```json
  {
    "id": "uuid",
    "fullName": "string",
    "phone": "string",
    "avatarUrl": "string (url)",
    "address": "string",
    "dateOfBirth": "string (YYYY-MM-DD)",
    "createdAt": "iso-date"
  }
  ```

### [16] [PATCH] /api/v1/users/me

- **Auth:** Bearer | **Roles:** User
- **Name:** Cập nhật profile
- **Request (Body):**
  ```json
  {
    "avatarUrl": "string (optional, url format)",
    "address": "string (optional)"
  }
  ```
- **Response (200 OK):** Updated Profile JSON

### [17] [DELETE] /api/v1/users/me

- **Auth:** Bearer | **Roles:** User
- **Name:** Xóa mềm tài khoản
- **Request:** Empty
- **Response (204 No Content):** Empty

### [18] [GET] /api/v1/users/me/audit-log

- **Auth:** Bearer | **Roles:** User
- **Name:** Lịch sử thay đổi profile
- **Request (Query):**
  ```json
  {
    "limit": "number (optional, default 20)"
  }
  ```
- **Response (200 OK):**
  ```json
  [
    {
      "action": "string",
      "changedAt": "iso-date",
      "details": "object (optional)"
    }
  ]
  ```

### [19] [GET] /api/v1/users/me/vehicles

- **Auth:** Bearer | **Roles:** User
- **Name:** Danh sách xe của tôi
- **Request:** Empty
- **Response (200 OK):**
  ```json
  [
    {
      "id": "uuid",
      "brand": "string",
      "modelName": "string",
      "year": "number",
      "plateNumber": "string",
      "color": "string",
      "batteryCapacityKwh": "number",
      "macAddress": "string (nullable)",
      "vinNumber": "string (nullable)",
      "autochargeEnabled": "boolean",
      "isPrimary": "boolean"
    }
  ]
  ```

### [20] [POST] /api/v1/users/me/vehicles

- **Auth:** Bearer | **Roles:** User
- **Name:** Thêm xe mới
- **Request (Body):**
  ```json
  {
    "brand": "string",
    "modelName": "string",
    "year": "number",
    "plateNumber": "string",
    "color": "string",
    "batteryCapacityKwh": "number",
    "macAddress": "string (optional, format: XX:XX:XX...)",
    "vinNumber": "string (optional)"
  }
  ```
- **Response (201 Created):** Vehicle JSON

### [21] [PATCH] /api/v1/users/me/vehicles/:id

- **Auth:** Bearer | **Roles:** User
- **Name:** Cập nhật xe
- **Request (Path Params & Body):**
  ```json
  // Path Params
  {
    "id": "uuid"
  }
  // Body
  {
    "color": "string (optional)"
  }
  ```
- **Response (200 OK):** Updated Vehicle JSON

### [22] [DELETE] /api/v1/users/me/vehicles/:id

- **Auth:** Bearer | **Roles:** User
- **Name:** Xóa xe
- **Request (Path Params):**
  ```json
  {
    "id": "uuid"
  }
  ```
- **Response (204 No Content):** Empty

### [23] [PATCH] /api/v1/users/me/vehicles/:id/primary

- **Auth:** Bearer | **Roles:** User
- **Name:** Đặt xe mặc định
- **Request (Path Params):**
  ```json
  {
    "id": "uuid"
  }
  ```
- **Response (204 No Content):** Empty

### [24] [GET] /api/v1/users/me/vehicles/:id/audit-log

- **Auth:** Bearer | **Roles:** User
- **Name:** Lịch sử thay đổi xe
- **Request (Path Params & Query):**
  ```json
  // Path Params
  {
    "id": "uuid"
  }
  // Query
  {
    "limit": "number (optional)"
  }
  ```
- **Response (200 OK):**
  ```json
  [
    {
      "action": "string",
      "changedAt": "iso-date",
      "details": "object"
    }
  ]
  ```

### [25] [PATCH] /api/v1/users/me/vehicles/:id/autocharge-setup

- **Auth:** Bearer | **Roles:** User
- **Name:** Cấu hình AutoCharge
- **Request (Path Params & Body):**
  ```json
  // Path Params
  {
    "id": "uuid"
  }
  // Body
  {
    "macAddress": "string (optional)",
    "vinNumber": "string (optional)",
    "autochargeEnabled": "boolean (optional)"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "string",
    "vehicleId": "uuid"
  }
  ```

---

## SERVICE: Infrastructure Service (Station)

**Base path:** `/api/v1/stations` | **Container:** `ev-infrastructure` | **Port:** 3003

### [26] [GET] /api/v1/stations

- **Auth:** Public | **Roles:** —
- **Name:** Danh sách trạm sạc (phân trang)
- **Request (Query):**
  ```json
  {
    "cityId": "string (optional)",
    "status": "string (optional: ACTIVE, INACTIVE, MAINTENANCE)",
    "limit": "number (optional, default 20)",
    "offset": "number (optional, default 0)"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "address": "string",
        "latitude": "number",
        "longitude": "number",
        "status": "string",
        "totalChargers": "number",
        "availableChargers": "number"
      }
    ],
    "total": "number"
  }
  ```

### [27] [POST] /api/v1/stations

- **Auth:** Bearer | **Roles:** Admin
- **Name:** Tạo trạm sạc mới
- **Request (Body):**
  ```json
  {
    "name": "string",
    "address": "string",
    "cityId": "string",
    "latitude": "number (-90 to 90)",
    "longitude": "number (-180 to 180)",
    "ownerName": "string (optional)"
  }
  ```
- **Response (201 Created):** Station JSON

### [28] [GET] /api/v1/stations/:id

- **Auth:** Public | **Roles:** —
- **Name:** Chi tiết trạm
- **Request (Path Params):**
  ```json
  {
    "id": "uuid"
  }
  ```
- **Response (200 OK):** Station JSON + "chargers" array

### [29] [PATCH] /api/v1/stations/:id

- **Auth:** Bearer | **Roles:** Admin
- **Name:** Cập nhật thông tin trạm
- **Request (Path Params & Body):**
  ```json
  // Path Params
  {
    "id": "uuid"
  }
  // Body
  {
    "name": "string (optional)",
    "address": "string (optional)",
    "status": "string (optional)"
  }
  ```
- **Response (200 OK):** Updated Station JSON

### [30] [DELETE] /api/v1/stations/:id

- **Auth:** Bearer | **Roles:** Admin
- **Name:** Vô hiệu hóa trạm
- **Request (Path Params):**
  ```json
  {
    "id": "uuid"
  }
  ```
- **Response (204 No Content):** Empty

### [31] [POST] /api/v1/stations/:stationId/chargers

- **Auth:** Bearer | **Roles:** Admin
- **Name:** Thêm charger vào trạm
- **Request (Path Params & Body):**
  ```json
  // Path Params
  {
    "stationId": "uuid"
  }
  // Body
  {
    "name": "string",
    "externalId": "string (OCPP identifier)",
    "maxPowerKw": "number",
    "connectorType": "string (enum: CCS2, CHAdeMO, Type2)"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": "uuid",
    "stationId": "uuid",
    "name": "string",
    "externalId": "string",
    "maxPowerKw": "number",
    "connectorType": "string",
    "status": "AVAILABLE"
  }
  ```

### [32] [PATCH] /api/v1/stations/:stationId/chargers/:chargerId/status

- **Auth:** Bearer | **Roles:** Admin/Staff
- **Name:** Cập nhật trạng thái charger
- **Request (Path Params & Body):**
  ```json
  // Path Params
  {
    "stationId": "uuid",
    "chargerId": "uuid"
  }
  // Body
  {
    "status": "string (AVAILABLE, CHARGING, FAULTED, MAINTENANCE)"
  }
  ```
- **Response (200 OK):** Updated Charger JSON

### [33] [GET] /api/v1/stations/:stationId/chargers/:chargerId/pricing

- **Auth:** Public | **Roles:** —
- **Name:** Xem báo giá sạc
- **Request (Path Params & Query):**
  ```json
  // Path Params
  {
    "stationId": "uuid",
    "chargerId": "uuid"
  }
  // Query
  {
    "connectorType": "string",
    "startTime": "iso-date",
    "endTime": "iso-date"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "pricePerKwh": "number (VND)",
    "idleFeePerMinute": "number (VND)",
    "totalEstimateVnd": "number"
  }
  ```

### [34] [POST] /api/v1/stations/:stationId/chargers/:chargerId/pricing/calculate-session-fee

- **Auth:** Public | **Roles:** —
- **Name:** Tính phí session thực tế (internal)
- **Request (Path Params & Body):**
  ```json
  // Path Params
  {
    "stationId": "uuid",
    "chargerId": "uuid"
  }
  // Body
  {
    "connectorType": "string",
    "startTime": "iso-date",
    "kwhConsumed": "number",
    "idleMinutes": "number"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "energyFeeVnd": "number",
    "idleFeeVnd": "number",
    "totalVnd": "number"
  }
  ```

### [35] [GET] /api/v1/stations/pricing-rules

- **Auth:** Bearer | **Roles:** Admin/Staff
- **Name:** Danh sách pricing rules
- **Request (Query):**
  ```json
  {
    "stationId": "uuid (optional)",
    "activeOnly": "boolean (optional)"
  }
  ```
- **Response (200 OK):**
  ```json
  [
    {
      "id": "uuid",
      "stationId": "uuid",
      "connectorType": "string",
      "pricePerKwh": "number",
      "idleFeePerMinute": "number",
      "validFrom": "iso-date",
      "validTo": "iso-date (nullable)",
      "active": "boolean"
    }
  ]
  ```

### [36] [POST] /api/v1/stations/pricing-rules

- **Auth:** Bearer | **Roles:** Admin
- **Name:** Tạo pricing rule mới (TOU/Idle)
- **Request (Body):**
  ```json
  {
    "stationId": "uuid",
    "connectorType": "string",
    "validFrom": "iso-date",
    "validTo": "iso-date (optional)",
    "hourStart": "number (optional, 0-23)",
    "hourEnd": "number (optional, 0-23)",
    "dayMask": "number (optional, bitmask)",
    "pricePerKwh": "number",
    "idleGraceMinutes": "number (optional)",
    "idleFeePerMinute": "number (optional)",
    "label": "string (optional)"
  }
  ```
- **Response (201 Created):** Pricing Rule JSON

### [37] [PATCH] /api/v1/stations/pricing-rules/:ruleId

- **Auth:** Bearer | **Roles:** Admin
- **Name:** Cập nhật pricing rule
- **Request (Path Params & Body):**
  ```json
  // Path Params
  {
    "ruleId": "uuid"
  }
  // Body: Các field giống POST nhưng đều optional
  ```
- **Response (200 OK):** Updated Pricing Rule JSON

### [38] [PATCH] /api/v1/stations/pricing-rules/:ruleId/deactivate

- **Auth:** Bearer | **Roles:** Admin
- **Name:** Vô hiệu hóa pricing rule
- **Request (Path Params):**
  ```json
  {
    "ruleId": "uuid"
  }
  ```
- **Response (204 No Content):** Empty

---

## SERVICE: Session Service (Booking & Charging)

**Base paths:** `/api/v1/bookings`, `/api/v1/charging` | **Container:** `ev-session` | **Port:** 3004

### [39] [GET] /api/v1/bookings/availability

- **Auth:** Bearer | **Roles:** User
- **Name:** Xem lịch trống/bận theo ngày
- **Request (Query):**
  ```json
  {
    "chargerId": "uuid",
    "date": "iso-date (YYYY-MM-DD)",
    "stationId": "uuid (optional)",
    "connectorType": "string (optional)"
  }
  ```
- **Response (200 OK):**
  ```json
  [
    {
      "slot": "string (e.g. 08:00)",
      "isBooked": "boolean"
    }
  ]
  ```

### [40] [GET] /api/v1/bookings/me

- **Auth:** Bearer | **Roles:** User
- **Name:** Lịch đặt của tôi
- **Request (Query):**
  ```json
  {
    "limit": "number (optional, default 20)",
    "offset": "number (optional, default 0)"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "userId": "uuid",
        "chargerId": "uuid",
        "startTime": "iso-date",
        "endTime": "iso-date",
        "status": "string (PENDING_PAYMENT, CONFIRMED, COMPLETED, CANCELLED, EXPIRED)",
        "durationMinutes": "number",
        "qrToken": "string (nullable)",
        "depositAmount": "number",
        "createdAt": "iso-date"
      }
    ],
    "total": "number"
  }
  ```

### [41] [POST] /api/v1/bookings

- **Auth:** Bearer | **Roles:** User
- **Name:** Tạo booking mới (auto trừ tiền cọc)
- **Request (Body):**
  ```json
  {
    "chargerId": "uuid",
    "stationId": "uuid",
    "connectorType": "string",
    "startTime": "iso-date",
    "endTime": "iso-date"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": "uuid",
    "userId": "uuid",
    "chargerId": "uuid",
    "startTime": "iso-date",
    "endTime": "iso-date",
    "status": "string",
    "durationMinutes": "number",
    "qrToken": "string (nullable)",
    "depositAmount": "number",
    "createdAt": "iso-date"
  }
  ```

### [42] [GET] /api/v1/bookings/:id

- **Auth:** Bearer | **Roles:** User/Admin
- **Name:** Chi tiết booking
- **Request (Path Params):**
  ```json
  {
    "id": "uuid"
  }
  ```
- **Response (200 OK):** Booking JSON (giống item của /bookings/me)

### [43] [DELETE] /api/v1/bookings/:id

- **Auth:** Bearer | **Roles:** User
- **Name:** Hủy booking (hoàn tiền cọc 100%)
- **Request (Path Params & Body):**
  ```json
  // Path Params
  {
    "id": "uuid"
  }
  // Body
  {
    "reason": "string (optional)"
  }
  ```
- **Response (204 No Content):** Empty

### [44] [POST] /api/v1/bookings/queue

- **Auth:** Bearer | **Roles:** User
- **Name:** Vào hàng đợi khi trạm đầy
- **Request (Body):**
  ```json
  {
    "chargerId": "uuid",
    "connectorType": "string",
    "urgencyScore": "number (optional, default 0)"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "position": "number",
    "estimatedWaitMin": "number"
  }
  ```

### [45] [DELETE] /api/v1/bookings/queue/:chargerId

- **Auth:** Bearer | **Roles:** User
- **Name:** Rời hàng đợi
- **Request (Path Params):**
  ```json
  {
    "chargerId": "uuid"
  }
  ```
- **Response (204 No Content):** Empty

### [46] [GET] /api/v1/bookings/queue/:chargerId/position

- **Auth:** Bearer | **Roles:** User
- **Name:** Xem vị trí trong hàng đợi
- **Request (Path Params):**
  ```json
  {
    "chargerId": "uuid"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "position": "number",
    "estimatedWaitMin": "number"
  }
  ```

### [47] [POST] /api/v1/charging/start

- **Auth:** Bearer | **Roles:** User
- **Name:** Bắt đầu phiên sạc (có/không booking)
- **Request (Body):**
  ```json
  {
    "chargerId": "uuid",
    "bookingId": "uuid (optional)",
    "qrToken": "string (optional)",
    "startMeterWh": "number (optional)"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": "uuid",
    "userId": "uuid",
    "chargerId": "uuid",
    "bookingId": "uuid (nullable)",
    "startTime": "iso-date",
    "status": "string (STARTING, CHARGING)",
    "startMeterWh": "number",
    "createdAt": "iso-date"
  }
  ```

### [48] [POST] /api/v1/charging/stop/:id

- **Auth:** Bearer | **Roles:** User
- **Name:** Dừng phiên sạc (self-service)
- **Request (Path Params & Body):**
  ```json
  // Path Params
  {
    "id": "uuid"
  }
  // Body
  {
    "endMeterWh": "number (optional)",
    "reason": "string (optional)"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "id": "uuid",
    "status": "string (COMPLETED)",
    "startTime": "iso-date",
    "endTime": "iso-date",
    "totalKwh": "number",
    "totalCostVnd": "number",
    "stopReason": "string"
  }
  ```

### [49] [POST] /api/v1/charging/admin/stop/:id

- **Auth:** Bearer | **Roles:** Admin/Staff
- **Name:** Dừng phiên sạc khẩn cấp (admin)
- **Request (Path Params & Body):**
  ```json
  // Path Params
  {
    "id": "uuid"
  }
  // Body
  {
    "endMeterWh": "number (optional)",
    "reason": "string (optional)"
  }
  ```
- **Response (200 OK):** SessionDto JSON

### [50] [POST] /api/v1/charging/telemetry/:id

- **Auth:** Bearer | **Roles:** Admin/Staff
- **Name:** Nhập telemetry thủ công
- **Request (Path Params & Body):**
  ```json
  // Path Params
  {
    "id": "uuid"
  }
  // Body
  {
    "powerKw": "number",
    "meterWh": "number",
    "socPercent": "number",
    "voltageV": "number (optional)",
    "currentA": "number (optional)"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "status": "accepted"
  }
  ```

### [51] [GET] /api/v1/charging/session/:id

- **Auth:** Bearer | **Roles:** User
- **Name:** Chi tiết phiên sạc
- **Request (Path Params):**
  ```json
  {
    "id": "uuid"
  }
  ```
- **Response (200 OK):** SessionDto JSON

### [52] [GET] /api/v1/charging/charger/:chargerId/active

- **Auth:** Bearer | **Roles:** Admin/Staff
- **Name:** Session đang active của charger
- **Request (Path Params):**
  ```json
  {
    "chargerId": "uuid"
  }
  ```
- **Response (200 OK):** SessionDto JSON

### [53] [GET] /api/v1/charging/history

- **Auth:** Bearer | **Roles:** User
- **Name:** Lịch sử sạc
- **Request (Query):**
  ```json
  {
    "limit": "number (optional, default 20)",
    "offset": "number (optional, default 0)"
  }
  ```
- **Response (200 OK):** Array of SessionDto

---

## SERVICE: Billing Service (Payment & Wallet)

**Base path:** `/api/v1` | **Container:** `ev-billing` | **Port:** 3007

### [54] [POST] /api/v1/payments/create

- **Auth:** Bearer | **Roles:** User
- **Name:** Tạo VNPay payment URL
- **Request (Body):**
  ```json
  {
    "bookingId": "uuid",
    "amount": "number",
    "bankCode": "string (optional)",
    "ipAddr": "string (optional)"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "paymentUrl": "string (URL)",
    "txnRef": "string"
  }
  ```

### [55] [POST] /api/v1/payments/pay

- **Auth:** Bearer | **Roles:** User
- **Name:** Wallet-first orchestrator (ưu tiên ví, fallback VNPay)
- **Request (Headers & Body):**
  ```json
  // Headers
  {
    "Idempotency-Key": "string (UUID v4)"
  }
  // Body
  {
    "bookingId": "uuid",
    "amount": "number"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "string (SUCCESS or REDIRECT)",
    "method": "string (WALLET or VNPAY)",
    "paymentUrl": "string (optional, xuất hiện khi method=VNPAY)"
  }
  ```

### [56] [GET] /api/v1/payments/vnpay-return

- **Auth:** Public | **Roles:** —
- **Name:** VNPay IPN callback
- **Request (Query):**
  ```json
  {
    "vnp_Amount": "string",
    "vnp_BankCode": "string",
    "vnp_PayDate": "string",
    "vnp_ResponseCode": "string",
    "vnp_TmnCode": "string",
    "vnp_TransactionNo": "string",
    "vnp_TxnRef": "string",
    "vnp_SecureHash": "string"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": "boolean",
    "message": "string"
  }
  ```

### [57] [GET] /api/v1/payments/:id

- **Auth:** Bearer | **Roles:** User
- **Name:** Chi tiết giao dịch
- **Request (Path Params):**
  ```json
  {
    "id": "uuid"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "id": "uuid",
    "walletId": "uuid",
    "type": "string",
    "amount": "number",
    "currency": "string",
    "status": "string",
    "referenceId": "string",
    "createdAt": "iso-date"
  }
  ```

### [58] [POST] /api/v1/payments/:id/refund

- **Auth:** Bearer | **Roles:** Admin/Staff
- **Name:** Hoàn tiền giao dịch
- **Request (Path Params & Body):**
  ```json
  // Path Params
  {
    "id": "uuid"
  }
  // Body
  {
    "reason": "string"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "id": "uuid",
    "type": "string (REFUND)",
    "amount": "number",
    "status": "string (SUCCESS)",
    "referenceId": "string"
  }
  ```

### [59] [GET] /api/v1/wallet/balance

- **Auth:** Bearer | **Roles:** User
- **Name:** Số dư ví
- **Request:** Empty
- **Response (200 OK):**
  ```json
  {
    "walletId": "uuid",
    "balance": "number",
    "currency": "string (VND)"
  }
  ```

### [60] [POST] /api/v1/wallet/topup

- **Auth:** Bearer | **Roles:** User
- **Name:** Nạp tiền vào ví qua VNPay
- **Request (Body):**
  ```json
  {
    "amount": "number",
    "bankCode": "string (optional)",
    "ipAddr": "string (optional)"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "paymentUrl": "string"
  }
  ```

### [61] [POST] /api/v1/wallet/pay

- **Auth:** Bearer | **Roles:** User
- **Name:** Thanh toán trực tiếp từ ví
- **Request (Body):**
  ```json
  {
    "bookingId": "uuid",
    "amount": "number"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": "boolean",
    "newBalance": "number"
  }
  ```

### [62] [GET] /api/v1/transactions

- **Auth:** Bearer | **Roles:** User
- **Name:** Lịch sử giao dịch
- **Request (Query):**
  ```json
  {
    "limit": "number (optional)",
    "offset": "number (optional)"
  }
  ```
- **Response (200 OK):**
  ```json
  [
    {
      "id": "uuid",
      "walletId": "uuid",
      "type": "string (TOPUP, CHARGE, REFUND, ADJUSTMENT)",
      "amount": "number",
      "currency": "string",
      "status": "string (PENDING, SUCCESS, FAILED)",
      "referenceId": "string",
      "createdAt": "iso-date"
    }
  ]
  ```

---

## SERVICE: Notification Service

**Base paths:** `/api/v1/notifications`, `/api/v1/devices`, `/api/v1/preferences` | **Container:** `ev-notify` | **Port:** 3008

### [63] [GET] /api/v1/notifications

- **Auth:** Bearer | **Roles:** User
- **Name:** Danh sách thông báo (phân trang)
- **Request (Query):**
  ```json
  {
    "limit": "number (optional)",
    "unreadOnly": "boolean (optional)"
  }
  ```
- **Response (200 OK):**
  ```json
  [
    {
      "id": "uuid",
      "type": "string (SYSTEM, PAYMENT, BOOKING, ALERT)",
      "title": "string",
      "body": "string",
      "status": "string (UNREAD, READ)",
      "readAt": "iso-date (nullable)",
      "createdAt": "iso-date"
    }
  ]
  ```

### [64] [GET] /api/v1/notifications/unread

- **Auth:** Bearer | **Roles:** User
- **Name:** Thông báo chưa đọc
- **Request (Query):**
  ```json
  {
    "limit": "number (optional)"
  }
  ```
- **Response (200 OK):** Array of NotificationDto

### [65] [PATCH] /api/v1/notifications/:id/read

- **Auth:** Bearer | **Roles:** User
- **Name:** Đánh dấu đã đọc 1 thông báo
- **Request (Path Params):**
  ```json
  {
    "id": "uuid"
  }
  ```
- **Response (204 No Content):** Empty

### [66] [PATCH] /api/v1/notifications/read-all

- **Auth:** Bearer | **Roles:** User
- **Name:** Đánh dấu tất cả đã đọc
- **Request:** Empty
- **Response (200 OK):**
  ```json
  {
    "count": "number"
  }
  ```

### [67] [POST] /api/v1/devices/register

- **Auth:** Bearer | **Roles:** User
- **Name:** Đăng ký FCM token
- **Request (Body):**
  ```json
  {
    "platform": "string (ANDROID, IOS, WEB)",
    "pushToken": "string",
    "deviceName": "string (optional)"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "deviceId": "uuid"
  }
  ```

### [68] [DELETE] /api/v1/devices/:id

- **Auth:** Bearer | **Roles:** User
- **Name:** Hủy đăng ký thiết bị
- **Request (Path Params):**
  ```json
  {
    "id": "uuid"
  }
  ```
- **Response (204 No Content):** Empty

### [69] [GET] /api/v1/devices

- **Auth:** Bearer | **Roles:** User
- **Name:** Danh sách thiết bị đã đăng ký
- **Request:** Empty
- **Response (200 OK):**
  ```json
  [
    {
      "id": "uuid",
      "platform": "string",
      "deviceName": "string",
      "lastActiveAt": "iso-date"
    }
  ]
  ```

### [70] [GET] /api/v1/preferences

- **Auth:** Bearer | **Roles:** User
- **Name:** Lấy cài đặt thông báo
- **Request:** Empty
- **Response (200 OK):**
  ```json
  {
    "enablePush": "boolean",
    "enableEmail": "boolean",
    "enableSms": "boolean",
    "quietHoursStart": "string (HH:mm, nullable)",
    "quietHoursEnd": "string (HH:mm, nullable)"
  }
  ```

### [71] [PATCH] /api/v1/preferences

- **Auth:** Bearer | **Roles:** User
- **Name:** Cập nhật cài đặt thông báo
- **Request (Body):**
  ```json
  {
    "enablePush": "boolean (optional)",
    "enableEmail": "boolean (optional)",
    "enableSms": "boolean (optional)",
    "quietHoursStart": "string (optional, HH:mm)",
    "quietHoursEnd": "string (optional, HH:mm)"
  }
  ```
- **Response (200 OK):** Updated Preferences JSON

---

## SERVICE: Analytics Service

**Base path:** `/api/v1/analytics` | **Container:** `ev-analytics` | **Port:** 3002

### [72] [GET] /api/v1/analytics/system

- **Auth:** Bearer | **Roles:** Admin
- **Name:** KPI toàn platform (active sessions, revenue 30d, booking funnel)
- **Request:** Empty
- **Response (200 OK):**
  ```json
  {
    "activeSessions": "number",
    "revenue30d": "number",
    "newUsers30d": "number",
    "bookingFunnel": {
      "totalBookings": "number",
      "completed": "number",
      "cancelled": "number",
      "conversionRate": "number"
    }
  }
  ```

### [73] [GET] /api/v1/analytics/revenue

- **Auth:** Bearer | **Roles:** Admin
- **Name:** Doanh thu theo tháng/ngày
- **Request (Query):**
  ```json
  {
    "range": "string (DAILY, MONTHLY, YEARLY)",
    "stationId": "uuid (optional)",
    "days": "number (optional)"
  }
  ```
- **Response (200 OK):**
  ```json
  [
    {
      "period": "string",
      "totalRevenueVnd": "number"
    }
  ]
  ```

### [74] [GET] /api/v1/analytics/usage

- **Auth:** Bearer | **Roles:** Admin
- **Name:** Thống kê sử dụng trạm
- **Request (Query):**
  ```json
  {
    "stationId": "uuid (optional)",
    "days": "number (optional)"
  }
  ```
- **Response (200 OK):**
  ```json
  [
    {
      "stationId": "uuid",
      "totalSessions": "number",
      "totalKwh": "number",
      "utilizationRate": "number (0-100)"
    }
  ]
  ```

### [75] [GET] /api/v1/analytics/peak-hours

- **Auth:** Bearer | **Roles:** Admin
- **Name:** Giờ cao điểm + dự báo nhu cầu
- **Request (Query):**
  ```json
  {
    "stationId": "uuid (optional)",
    "lookbackDays": "number (optional)",
    "forecast": "boolean (optional)"
  }
  ```
- **Response (200 OK):**
  ```json
  [
    {
      "hour": "number (0-23)",
      "avgSessions": "number",
      "demandForecast": "number (optional)"
    }
  ]
  ```

### [76] [GET] /api/v1/analytics/users/:userId

- **Auth:** Bearer | **Roles:** Admin
- **Name:** Hành vi người dùng
- **Request (Path Params & Query):**
  ```json
  // Path Params
  {
    "userId": "uuid"
  }
  // Query
  {
    "days": "number (optional)"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "totalSessions": "number",
    "totalSpentVnd": "number",
    "favoriteStationId": "uuid",
    "averageChargeDurationMin": "number"
  }
  ```

### [77] [GET] /api/v1/analytics/stations/:stationId/metrics

- **Auth:** Bearer | **Roles:** Admin
- **Name:** Tóm tắt thống kê 1 trạm
- **Request (Path Params & Query):**
  ```json
  // Path Params
  {
    "stationId": "uuid"
  }
  // Query
  {
    "days": "number (optional)"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "revenue": "number",
    "energyDeliveredKwh": "number",
    "uptimePercent": "number",
    "faultCount": "number"
  }
  ```

### [78] [GET] /api/v1/analytics/dashboard

- **Auth:** Bearer | **Roles:** Admin
- **Name:** Dashboard tổng hợp (composite view)
- **Request:** Empty
- **Response (200 OK):**
  ```json
  {
    "latestKpi": {
      "activeSessions": "number",
      "revenue30d": "number",
      "newUsers30d": "number"
    },
    "revenue30d": [
      {
        "period": "string",
        "totalRevenueVnd": "number"
      }
    ],
    "peakHours": [
      {
        "hour": "number",
        "avgSessions": "number"
      }
    ],
    "topStations": [
      {
        "stationId": "uuid",
        "revenue": "number",
        "utilizationRate": "number"
      }
    ]
  }
  ```

---

## SERVICE: Telemetry Ingestion Service

**Base path:** `/api/v1/telemetry` | **Container:** `ev-telemetry` | **Port:** 3009

### [79] [POST] /api/v1/telemetry/ingest

- **Auth:** Public | **Roles:** —
- **Name:** Thu thập telemetry từ charger (body)
- **Request (Body):**
  ```json
  {
    "chargerId": "uuid",
    "sessionId": "uuid",
    "powerKw": "number (optional)",
    "currentA": "number (optional)",
    "voltageV": "number (optional)",
    "meterWh": "number (optional)",
    "socPercent": "number (optional, 0-100)",
    "temperatureC": "number (optional)",
    "errorCode": "string (optional)",
    "hardwareTimestamp": "iso-date (optional)"
  }
  ```
- **Response (202 Accepted):**
  ```json
  {
    "eventId": "uuid",
    "warnings": ["string"]
  }
  ```

### [80] [POST] /api/v1/telemetry/ingest/:chargerId/:sessionId

- **Auth:** Public | **Roles:** —
- **Name:** Thu thập telemetry (path params)
- **Request (Path Params & Body):**
  ```json
  // Path Params
  {
    "chargerId": "uuid",
    "sessionId": "uuid"
  }
  // Body
  {
    "powerKw": "number (optional)",
    "currentA": "number (optional)",
    "voltageV": "number (optional)",
    "meterWh": "number (optional)",
    "socPercent": "number (optional, 0-100)",
    "temperatureC": "number (optional)",
    "errorCode": "string (optional)",
    "hardwareTimestamp": "iso-date (optional)"
  }
  ```
- **Response (202 Accepted):**
  ```json
  {
    "eventId": "uuid",
    "warnings": ["string"]
  }
  ```

---

## SERVICE: OCPP Gateway Service

**Base path:** `/api/v1/ocpp` | **Container:** `ev-ocpp-gw` | **Port:** 3010 | **WebSocket:** `ws://localhost:3010/ocpp`

### [81] [GET] /api/v1/ocpp/health

- **Auth:** Public | **Roles:** —
- **Name:** Trạng thái OCPP Gateway + danh sách charger kết nối
- **Request:** Empty
- **Response (200 OK):**
  ```json
  {
    "status": "string (UP, DOWN)",
    "service": "ev-ocpp-gw",
    "connectedChargers": "number",
    "chargers": [
      {
        "id": "string",
        "connectedAt": "iso-date",
        "lastHeartbeat": "iso-date"
      }
    ]
  }
  ```

### [WS] ws://ev-ocpp-gw:3010/ocpp/:chargerId

- **Protocol:** OCPP 1.6 JSON WebSocket
- **Auth:** Header Authorization hoặc TLS client certificate
- **Messages:** BootNotification, Heartbeat, StatusNotification, StartTransaction, StopTransaction, MeterValues
