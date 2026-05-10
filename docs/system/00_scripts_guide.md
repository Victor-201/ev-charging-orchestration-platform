# Huong Dan Su Dung Scripts Trien Khai (Deployment Scripts)

Tai lieu nay huong dan toan bo bo cong cu tu dong hoa PowerShell (`.ps1`) trong thu muc `deployment/scripts/` de quan ly **backend microservices** (Docker) va **frontend Flutter mobile app**.

> **Yeu cau chung:**
>
> - PowerShell 5.1+ (Windows) hoac PowerShell 7+ (`pwsh`)
> - Neu bi chan boi Execution Policy, chay mot lan: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
> - Tat ca lenh chay tu **thu muc goc du an** (`ev-charging-orchestration-platform/`)

---

## PHAN 1 - BACKEND (Docker Microservices)

> **Yeu cau them:** Docker Desktop dang chay.

### Tong Quan

| Script                  | Muc dich                              | Tham so chinh                  |
| ----------------------- | ------------------------------------- | ------------------------------ |
| `start.ps1`             | Khoi chay he thong Docker Compose     | `-Rebuild`, `-Ngrok`           |
| `stop.ps1`              | Dung he thong + dung ngrok            | `-Clean`                       |
| `reset.ps1`             | Xoa sach + restart tu dau             | `-Force`                       |
| `health-check.ps1`      | Kiem tra trang thai services + ngrok  | _(khong co)_                   |
| `logs.ps1`              | Xem log container linh hoat           | `-Service`, `-All`, `-AllApps` |
| `smoke-test.ps1`        | Test tich hop qua API Gateway         | `-Gateway <URL>`               |
| `tests.ps1`             | Chay Unit Test 8 microservices        | `-Coverage`, `-Pattern`        |
| `validate-rabbitmq.ps1` | Kiem tra Zero-Loss RabbitMQ DLQ       | _(khong co)_                   |
| `clickhouse-check.ps1`  | Kiem tra nhanh ClickHouse + telemetry | `-Url`, `-Detail`              |

---

### 1.1. Khoi Chay He Thong (`start.ps1`)

Khoi chay toan bo ha tang (Docker containers, Volumes, Networks) va cho 18 containers chuyen sang trang thai `healthy`.
Mac dinh khong chay ngrok. Them `-Ngrok` de bat tunnel.

**Ngrok static domain:** `https://impeditive-incredible-jordy.ngrok-free.dev`

```powershell
.\deployment\scripts\backend\start.ps1              # Khoi dong binh thuong (khong ngrok)
.\deployment\scripts\backend\start.ps1 -Rebuild     # Force rebuild toan bo image
.\deployment\scripts\backend\start.ps1 -Ngrok       # Khoi dong + chay ngrok tunnel
.\deployment\scripts\backend\start.ps1 -Rebuild -Ngrok  # Rebuild va chay ngrok
```

**Quy trinh start.ps1:**

1. Tat container cu (giai phong port)
2. Build image (neu `-Rebuild`)
3. Khoi dong Docker Compose
4. _(Tuy chon - neu co `-Ngrok`)_ Kill ngrok cu → khoi dong ngrok → xac nhan tunnel qua `localhost:4040`
5. Poll health check tung container, timeout 120 giay/container

> **Yeu cau ngrok (chi khi dung `-Ngrok`):** Cai dat ngrok va dang nhap: `ngrok config add-authtoken <token>`
> Tai ve tai: https://ngrok.com/download

---

### 1.2. Dung He Thong (`stop.ps1`)

```powershell
.\deployment\scripts\backend\stop.ps1          # Dung containers + dung ngrok, giu volumes
.\deployment\scripts\backend\stop.ps1 -Clean   # Dung + XOA VINH VIEN tat ca Volumes
```

Script tu dong tat process `ngrok` neu dang chay.

---

### 1.3. Reset Toan He Thong (`reset.ps1`)

"Nut hat nhan" - xoa sach + build lai + chay lai tu dau. Tuong duong `stop.ps1 -Clean -> start.ps1 -Rebuild`.

```powershell
.\deployment\scripts\backend\reset.ps1          # Hoi xac nhan [y/N]
.\deployment\scripts\backend\reset.ps1 -Force   # Khong hoi, thuc thi ngay
```

---

### 1.4. Kiem Tra Suc Khoe (`health-check.ps1`)

Danh gia trang thai o 2 cap: Docker Container Status + HTTP API Status. Kiem tra them ngrok tunnel.

```powershell
.\deployment\scripts\backend\health-check.ps1
```

**Ket qua:**

- Kiem tra 11 HTTP endpoints (8 services + Kong + Kong Admin + RabbitMQ)
- Kiem tra ngrok tunnel qua `http://localhost:4040/api/tunnels`
- Kiem tra 18 containers (trang thai + health)
- In `N TOT  M LOI`, exit code `1` neu co loi

---

### 1.5. Xem Log He Thong (`logs.ps1`)

```powershell
.\deployment\scripts\backend\logs.ps1 -Service ev-iam            # 1 service, terminal hien tai
.\deployment\scripts\backend\logs.ps1 -Service ev-iam,ev-pg-iam  # Nhieu services -> nhieu cua so
.\deployment\scripts\backend\logs.ps1 -AllApps                   # 8 cua so cho 8 app services
.\deployment\scripts\backend\logs.ps1 -AllInfra                  # 4 cua so (kong, redis, rmq, ch)
.\deployment\scripts\backend\logs.ps1 -AllDb                     # 6 cua so PostgreSQL
.\deployment\scripts\backend\logs.ps1 -AllSystemSplit            # 18 cua so toan bo he thong
.\deployment\scripts\backend\logs.ps1 -All                       # Gop tat ca vao 1 man hinh
.\deployment\scripts\backend\logs.ps1 -Service ev-iam -NoFollow  # In roi dung
.\deployment\scripts\backend\logs.ps1 -Service ev-iam -Tail 500  # 500 dong cuoi
```

**18 Container ho tro:**

- **App (8):** `ev-iam`, `ev-analytics`, `ev-infrastructure`, `ev-session`, `ev-billing`, `ev-notify`, `ev-telemetry`, `ev-ocpp-gw`
- **Infra (4):** `ev-kong`, `ev-redis`, `ev-rabbitmq`, `ev-clickhouse`
- **DB (6):** `ev-pg-iam`, `ev-pg-infra`, `ev-pg-session`, `ev-pg-billing`, `ev-pg-notify`, `ev-pg-analytics`

---

### 1.6. Smoke Test (`smoke-test.ps1`)

Dong vai client ben ngoai, gui HTTP qua API Gateway (Kong) de kiem tra routing va auth guard.

```powershell
.\deployment\scripts\backend\smoke-test.ps1                                # Gateway mac dinh localhost:8000
.\deployment\scripts\backend\smoke-test.ps1 -Gateway "http://staging:8000" # Gateway tuy chinh
# Test qua ngrok (thiet bi that)
.\deployment\scripts\backend\smoke-test.ps1 -Gateway "https://impeditive-incredible-jordy.ngrok-free.dev"
```

**Endpoints duoc test:**

| Service        | Endpoint                                       | Expected |
| -------------- | ---------------------------------------------- | -------- |
| IAM            | `POST /api/v1/auth/register` (missing body)    | `400`    |
| IAM            | `POST /api/v1/auth/login` (missing creds)      | `400`    |
| IAM            | `GET /api/v1/users/me` (no token)              | `401`    |
| Infrastructure | `GET /api/v1/stations` (public)                | `200`    |
| Session        | `POST /api/v1/bookings` (no token)             | `401`    |
| Session        | `POST /api/v1/charging/start` (no token)       | `401`    |
| Billing        | `GET /api/v1/wallets/balance` (no token)       | `401`    |
| Billing        | `POST /api/v1/payments/pay` (no token)         | `401`    |
| Notification   | `GET /api/v1/notifications` (no token)         | `401`    |
| Analytics      | `GET /api/v1/analytics/dashboard` (no token)   | `401`    |
| Telemetry      | `POST /api/v1/telemetry/ingest` (missing body) | `400`    |
| OCPP Gateway   | `GET /api/v1/ocpp/health`                      | `200`    |
| Kong Admin     | `GET http://localhost:8001`                    | `200`    |
| RabbitMQ UI    | `GET http://localhost:15672`                   | `200`    |

---

### 1.7. Unit Test (`tests.ps1`)

Duyet qua 8 thu muc backend, chay `jest`, tong hop Pass/Fail.

```powershell
.\deployment\scripts\backend\tests.ps1                     # Toan bo test suite
.\deployment\scripts\backend\tests.ps1 -Coverage           # Kem bao cao code coverage
.\deployment\scripts\backend\tests.ps1 -Pattern "booking"  # Chi test file khop pattern
```

> Script bo qua (`SKIP`) service chua co `node_modules` hoac chua co file `*.spec.ts`.

**Services duoc test:** `iam-service`, `ev-infrastructure-service`, `session-service`, `billing-service`, `notification-service`, `analytics-service`, `telemetry-ingestion-service`, `ocpp-gateway-service`

---

### 1.8. Validate RabbitMQ (`validate-rabbitmq.ps1`)

Truy van RabbitMQ Management API - dam bao khong co message bi mat, DLQ rong.

```powershell
.\deployment\scripts\backend\validate-rabbitmq.ps1
```

| Trang thai                | Y nghia                                           |
| ------------------------- | ------------------------------------------------- |
| `[V] VALIDATION PASSED`   | 100% messages da xu ly, khong mat du lieu         |
| `[!] PASSED WITH WARNING` | Khong mat message nhung con pending trong queue   |
| `[X] VALIDATION FAILED`   | Co message trong DLQ - can kiem tra consumer logs |

> **Credential mac dinh:** `ev_user:ev_secret` (cau hinh trong `deployment/docker/.env`)

---

### 1.9. Kiem Tra ClickHouse (`clickhouse-check.ps1`)

Kiem tra nhanh toan bo stack ClickHouse: ket noi, database, table, row count, partition, TTL, container health, va trang thai ket noi tu `telemetry-service`.

```powershell
# Kiem tra mac dinh (localhost:8123)
.\deployment\scripts\backend\clickhouse-check.ps1

# Chi dinh URL tuy chinh (vi du dung Docker internal)
.\deployment\scripts\backend\clickhouse-check.ps1 -Url http://localhost:8123

# Hien thi them schema cot cua bang telemetry_logs
.\deployment\scripts\backend\clickhouse-check.ps1 -Detail
```

**Cac muc kiem tra:**

| Muc           | Noi dung                                                    |
| ------------- | ----------------------------------------------------------- |
| [1] Ping      | `GET /ping` -> phai phan hoi `Ok`                           |
| [2] Version   | SELECT version()                                            |
| [3] Database  | `ev_telemetry` da duoc tao chua                             |
| [4] Table     | `telemetry_logs` - row count, partitions, TTL               |
| [5] Container | `ev-clickhouse` trang thai Docker health                    |
| [6] Service   | `http://localhost:3009/health` clickhouse connection status |

**Ket qua exit code:**

- `exit 0` - Tat ca OK (co the co CANH BAO)
- `exit 1` - Co loi nghiem trong (khong ket noi duoc, container down)

---

## PHAN 2 - FRONTEND (Flutter Mobile App)

> **Yeu cau them:** Flutter SDK da cai dat va trong `PATH`.

### Tong Quan

| Script      | Muc dich                        | Tham so chinh                                          |
| ----------- | ------------------------------- | ------------------------------------------------------ |
| `setup.ps1` | Thiet lap moi truong lan dau    | `-GenKeystore`, `-SkipDoctor`                          |
| `run.ps1`   | Chay app tren thiet bi/emulator | `-Flavor`, `-Device`, `-ApiUrl`, `-Release`            |
| `build.ps1` | Build APK / AAB / IPA           | `-Target`, `-Flavor`, `-Release`, `-Analyze`, `-Clean` |
| `test.ps1`  | Chay unit test + coverage       | `-Coverage`, `-Filter`, `-Widget`                      |

---

### 2.1. Thiet Lap Moi Truong (`setup.ps1`)

Chay **mot lan duy nhat** khi clone du an hoac cai may moi.

```powershell
.\deployment\scripts\frontend\setup.ps1                # Kiem tra moi truong + pub get
.\deployment\scripts\frontend\setup.ps1 -GenKeystore   # Tao Android signing keystore
.\deployment\scripts\frontend\setup.ps1 -SkipDoctor    # Bo qua flutter doctor
```

**Cac buoc script thuc hien:**

1. Kiem tra Flutter SDK version
2. Chay `flutter doctor -v` (tru khi `-SkipDoctor`)
3. Chay `flutter pub get`
4. Kiem tra ADB + thiet bi ket noi
5. Kiem tra `google-services.json` (Firebase)
6. Kiem tra `android/key.properties` (signing)
7. _(Tuy chon)_ Tao keystore release bang `keytool`

> **Bao mat:** `android/key.properties` va `*.keystore` da duoc them vao `.gitignore`. **Khong commit len git.**

---

### 2.2. Chay App (`run.ps1`)

Script **tu dong phat hien ngrok URL** (uu tien dung ngrok khi chay dev) thay cho localhost.

```powershell
# Chay dev - tu dong dung ngrok URL neu ngrok dang chay
.\deployment\scripts\frontend\run.ps1

# Chi dinh API URL (thiet bi that + backend local)
.\deployment\scripts\frontend\run.ps1 -ApiUrl http://192.168.1.100:8000

# Dung ngrok URL co dinh
.\deployment\scripts\frontend\run.ps1 -ApiUrl https://impeditive-incredible-jordy.ngrok-free.dev

# Emulator Android (10.0.2.2 = localhost may tinh)
.\deployment\scripts\frontend\run.ps1 -ApiUrl http://10.0.2.2:8000

# Chi dinh device ID cu the
.\deployment\scripts\frontend\run.ps1 -Device 5137bf8c

# Chay release mode
.\deployment\scripts\frontend\run.ps1 -Flavor staging -Release
```

**Flavors & Application ID:**

| Flavor    | Application ID                           | API URL mac dinh                             |
| --------- | ---------------------------------------- | -------------------------------------------- |
| `dev`     | `com.evcharging.ev_charging_app.dev`     | Auto-detect ngrok -> `http://localhost:8000` |
| `staging` | `com.evcharging.ev_charging_app.staging` | `http://staging.ev-charging.local:8000`      |
| `prod`    | `com.evcharging.ev_charging_app`         | `https://api.ev-charging.vn`                 |

> **Uu tien API URL khi flavor=dev:**
>
> 1. Tham so `-ApiUrl` (neu truyen vao)
> 2. Ngrok tunnel (tu dong lay qua `http://localhost:4040/api/tunnels`)
> 3. `http://localhost:8000` (fallback)

---

### 2.3. Build App (`build.ps1`)

```powershell
# APK debug (dev)
.\deployment\scripts\frontend\build.ps1

# APK release staging voi analyze
.\deployment\scripts\frontend\build.ps1 -Target apk -Flavor staging -Release -Analyze

# AAB production release - upload len Google Play Console
.\deployment\scripts\frontend\build.ps1 -Target appbundle -Flavor prod -Release

# Build sach tu dau
.\deployment\scripts\frontend\build.ps1 -Target apk -Flavor dev -Clean
```

| Tham so    | Gia tri                       | Mo ta                                        |
| ---------- | ----------------------------- | -------------------------------------------- |
| `-Target`  | `apk` \| `appbundle` \| `ipa` | Loai artifact dau ra                         |
| `-Flavor`  | `dev` \| `staging` \| `prod`  | Build flavor                                 |
| `-Release` | switch                        | Bat minify + shrink + obfuscate              |
| `-Analyze` | switch                        | Chay `flutter analyze` truoc khi build       |
| `-Clean`   | switch                        | Chay `flutter clean` + `pub get` truoc       |
| `-ApiUrl`  | string                        | Ghi de API URL (mac dinh: auto-detect ngrok) |

**Voi `-Release`:**

- `--obfuscate` + `--split-debug-info=build/debug-info/<flavor>/`
- Signing tu `android/key.properties`
- Artifact: `build/app/outputs/bundle/<flavor>Release/*.aab`

---

### 2.4. Chay Test (`test.ps1`)

```powershell
.\deployment\scripts\frontend\test.ps1                      # Tat ca unit tests
.\deployment\scripts\frontend\test.ps1 -Coverage            # Bao cao coverage
.\deployment\scripts\frontend\test.ps1 -Filter "Booking"    # Chi test khop ten
.\deployment\scripts\frontend\test.ps1 -Widget              # Bao gom widget tests
.\deployment\scripts\frontend\test.ps1 -Coverage -Widget -Filter "Auth"
```

**Coverage report:** `coverage/lcov.info` - in % dong duoc cover. HTML report: `choco install lcov` -> `coverage/html/index.html`

---

## Luong Lam Viec Khuyen Dung

### Khoi dong du an lan dau (Full Stack)

```powershell
# 1. Setup moi truong Flutter
.\deployment\scripts\frontend\setup.ps1 -GenKeystore

# 2. Khoi dong backend (khong ngrok)
.\deployment\scripts\backend\start.ps1

# 3. Xac nhan backend healthy
.\deployment\scripts\backend\health-check.ps1

# 4. Chay app Flutter (localhost hoac emulator)
.\deployment\scripts\frontend\run.ps1
```

### Khoi dong voi Ngrok (thiet bi that)

```powershell
# Khoi dong backend + bat ngrok tunnel
.\deployment\scripts\backend\start.ps1 -Ngrok

# Chay app Flutter - tu dong dung ngrok URL
.\deployment\scripts\frontend\run.ps1
```

### Truoc khi demo / submit

```powershell
# Reset backend sach, build lai
.\deployment\scripts\backend\reset.ps1 -Force

# Kiem tra khong mat event
.\deployment\scripts\backend\validate-rabbitmq.ps1

# Chay backend test
.\deployment\scripts\backend\tests.ps1

# Chay frontend test
.\deployment\scripts\frontend\test.ps1 -Coverage

# Build AAB production
.\deployment\scripts\frontend\build.ps1 -Target appbundle -Flavor prod -Release -Analyze

# Test qua ngrok (can chay start.ps1 -Ngrok truoc)
.\deployment\scripts\backend\smoke-test.ps1 -Gateway "https://impeditive-incredible-jordy.ngrok-free.dev"
```

### Debug backend loi

```powershell
.\deployment\scripts\backend\health-check.ps1          # Kiem tra container + HTTP + ngrok
.\deployment\scripts\backend\logs.ps1 -Service ev-iam  # Xem log service loi
.\deployment\scripts\backend\smoke-test.ps1            # Test routing qua Kong
.\deployment\scripts\backend\reset.ps1                 # Reset neu khong fix duoc
```

### Debug frontend loi

```powershell
flutter devices                                                                    # Kiem tra thiet bi
.\deployment\scripts\frontend\test.ps1                                    # Chay unit tests
.\deployment\scripts\frontend\run.ps1 -ApiUrl http://10.0.2.2:8000       # Chay tren emulator
.\deployment\scripts\frontend\run.ps1 -ApiUrl https://impeditive-incredible-jordy.ngrok-free.dev
flutter analyze                                                                    # Kiem tra loi code
```

---

## Cong Mang & Endpoints

### Backend

| Service                | URL                                                  | Ghi chu                      |
| ---------------------- | ---------------------------------------------------- | ---------------------------- |
| Kong Gateway (API)     | `http://localhost:8000`                              | Tat ca API client di qua day |
| Ngrok Tunnel           | `https://impeditive-incredible-jordy.ngrok-free.dev` | Public URL cho thiet bi that |
| Ngrok Dashboard        | `http://localhost:4040`                              | Xem request log ngrok        |
| Kong Admin             | `http://localhost:8001`                              | Quan ly routes/plugins       |
| RabbitMQ UI            | `http://localhost:15672`                             | Credentials: `guest/guest`   |
| IAM Service            | `http://localhost:3001/health`                       |                              |
| Analytics Service      | `http://localhost:3002/health`                       |                              |
| Infrastructure Service | `http://localhost:3003/health`                       |                              |
| Session Service        | `http://localhost:3004/health`                       |                              |
| Billing Service        | `http://localhost:3007/health`                       |                              |
| Notification Service   | `http://localhost:3008/health`                       |                              |
| Telemetry Service      | `http://localhost:3009/health`                       |                              |
| OCPP Gateway           | `http://localhost:3010/health`                       |                              |

### Frontend - API URL theo moi truong

| Moi truong        | Thiet bi that                                        | Emulator Android       |
| ----------------- | ---------------------------------------------------- | ---------------------- |
| Dev (khuyen dung) | `https://impeditive-incredible-jordy.ngrok-free.dev` | `http://10.0.2.2:8000` |
| Dev (LAN)         | `http://192.168.x.x:8000`                            | `http://10.0.2.2:8000` |
| Staging           | `http://staging.ev-charging.local:8000`              | -                      |
| Production        | `https://api.ev-charging.vn`                         | -                      |
