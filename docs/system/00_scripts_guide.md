# Huong Dan Su Dung Scripts Trien Khai (Deployment Scripts)

Tai lieu nay huong dan toan bo bo cong cu tu dong hoa (Bash cho Backend va PowerShell cho Frontend) trong thu muc `deployment/scripts/` de quan ly **backend microservices** (Docker) va **frontend Flutter mobile app**.

> **Yeu cau chung:**
>
> - **Backend:** Ubuntu (WSL) voi Docker Engine duoc cai dat truc tiep ben trong (Native WSL - **Khong can Docker Desktop**).
> - **Frontend:** PowerShell 5.1+ (Windows) hoac PowerShell 7+ (`pwsh`)
> - Tat ca lenh chay tu **thu muc goc du an** (`ev-charging-orchestration-platform/`)
> - **Tien ich Auto-WSL:** Cac script backend co the chay truc tiep tu Git Bash/PowerShell tren Windows, he thong se tu dong chuyen huong vao WSL.

---

## PHAN 1 - BACKEND (Docker Microservices)

> **Yeu cau them:** Docker dang chay trong WSL (Ubuntu).

### Tong Quan

> 🌟 **Khuyen Nghi (Moi):** Ban nen su dung **Menu Tuong Tac** tai `deployment/scripts/menu.ps1` lam trung tam dieu khien chinh de thao tac 1-cham. Menu da duoc tich hop Auto-WSL va tu dong goi tat ca cac scripts ben duoi.

| Script                 | Muc dich                              | Tham so chinh          |
| ---------------------- | ------------------------------------- | ---------------------- |
| `menu.ps1`             | Menu tuong tac quan ly toan bo he thong| _(Chay tren PowerShell)_|
| `backend/start.sh`     | Khoi chay he thong Docker Compose     | `--rebuild`, `--ngrok` |
| `backend/stop.sh`      | Dung he thong + dung ngrok            | `--clean`              |
| `backend/reset.sh`     | Xoa sach + restart tu dau             | `--force`, `--ngrok`   |
| `backend/health-check.sh` | Kiem tra trang thai (Parallel Fast) | _(khong co)_           |
| `backend/logs.sh`      | Xem log container linh hoat           | `--service`, `--tail`  |
| `backend/tests.sh`     | Chay Unit & Parallel Smoke Test       | `--smoke`, `--all`     |
| `backend/validate-rabbitmq.sh` | Kiem tra Zero-Loss RabbitMQ DLQ | _(khong co)_           |
| `backend/clickhouse-check.sh`  | Kiem tra nhanh ClickHouse (Multi-Query) | _(khong co)_   |
| `database/seed-up.sh`          | Nap du lieu (Seed) vao Database         | `<service-name>`       |
| `database/seed-down.sh`        | Xoa du lieu (Clean) khoi Database       | `<service-name>`       |
| `database/seed-reset.sh`       | Xoa va Nap lai toan bo du lieu mau      | `<service-name>`       |

---

### 1.0. Huong Dan Thiet Lap Docker Native WSL (No Docker Desktop)

De he thong chay on dinh ma khong phu thuoc vao Docker Desktop (giup tiet kiem RAM va CPU), ban can cai dat Docker Engine truc tiep vao WSL:

1.  **Cai dat Docker Engine (trong WSL):**

    ```bash
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose-v2
    sudo usermod -aG docker $USER
    ```

    _(Tat va mo lai terminal WSL sau khi chay lenh nay)_

2.  **Ngat ket noi voi Windows Docker:**

    ```bash
    docker context use default
    ```

3.  **Tien ich Auto-WSL Redirection:**
    Ban co the chay script backend truc tiep tu **Git Bash, CMD hoac PowerShell** tren Windows. Script se tu dong:
    - Nhan dien moi truong Windows.
    - Dich duong dan hien tai sang WSL chuẩn.
    - Tu khoi dong Docker service (`sudo service docker start`) neu can.
    - Thuc thi toan bo logic ben trong WSL va tra ket qua ve terminal Windows.

---

---

### 1.1. Khoi Chay He Thong (`start.sh`)

Khoi chay toan bo ha tang (Docker containers, Volumes, Networks) va cho 18 containers chuyen sang trang thai `healthy`.
Mac dinh khong chay ngrok. Them `--ngrok` de bat tunnel.

```bash
# Chay tu WSL Terminal
./deployment/scripts/backend/start.sh              # Khoi dong binh thuong
./deployment/scripts/backend/start.sh --rebuild     # Force rebuild toan bo image
./deployment/scripts/backend/start.sh --ngrok       # Khoi dong + chay ngrok tunnel
```

**Quy trinh start.sh:**

1. Tat container cu (giai phong port)
2. Build image (neu `--rebuild`)
3. Khoi dong Docker Compose
4. _(Tuy chon - neu co `--ngrok`)_ Kill ngrok cu → khoi dong ngrok → xac nhan tunnel qua `localhost:4040`
5. Poll health check tung container, timeout 120 giay/container

> **Yeu cau ngrok (chi khi dung `--ngrok`):** Cai dat ngrok va dang nhap: `ngrok config add-authtoken <token>`
> Tai ve tai: https://ngrok.com/download

---

### 1.2. Dung He Thong (`stop.sh`)

```bash
./deployment/scripts/backend/stop.sh          # Dung containers + dung ngrok
./deployment/scripts/backend/stop.sh --clean   # Dung + XOA VINH VIEN tat ca Volumes
```

Script tu dong tat process `ngrok` neu dang chay.

---

### 1.3. Reset Toan He Thong (`reset.sh`)

```bash
./deployment/scripts/backend/reset.sh               # Hoi xac nhan [y/N]
./deployment/scripts/backend/reset.sh --force        # Khong hoi, thuc thi ngay
./deployment/scripts/backend/reset.sh --ngrok        # Reset + bat ngrok
./deployment/scripts/backend/reset.sh --force --ngrok  # Reset + bat ngrok khong hoi xac nhan
```

---

### 1.4. Kiem Tra Suc Khoe (`health-check.sh`)

```bash
./deployment/scripts/backend/health-check.sh
```

**Ket qua:**

- Kiem tra 11 HTTP endpoints (8 services + Kong + Kong Admin + RabbitMQ)
- Kiem tra ngrok tunnel qua `http://localhost:4040/api/tunnels`
- Kiem tra 18 containers (trang thai + health)
- In `N TOT  M LOI`, exit code `1` neu co loi

---

### 1.5. Xem Log Hệ Thống (`logs.sh`)

Script này hỗ trợ xem log từ Docker Compose một cách linh hoạt, cho phép lọc theo service, nhóm service (PG/Infra) hoặc giới hạn số dòng.

```bash
./deployment/scripts/backend/logs.sh                                  # Xem log toàn bộ hệ thống
./deployment/scripts/backend/logs.sh --pg                            # Xem log tất cả 6 database PostgreSQL
./deployment/scripts/backend/logs.sh --infra                         # Xem log hạ tầng (Redis, RMQ, CH, Kong)
./deployment/scripts/backend/logs.sh --app                           # Xem log tất cả microservices
./deployment/scripts/backend/logs.sh --service iam-service            # Xem log 1 service cụ thể
./deployment/scripts/backend/logs.sh --tail 500                       # Xem 500 dòng cuối của tất cả
```

**18 Container hỗ trợ:**

- **App (8):** `iam-service`, `analytics-service`, `ev-infrastructure-service`, `session-service`, `billing-service`, `notification-service`, `telemetry-ingestion-service`, `ocpp-gateway-service`
- **Infra (4):** `ev-kong`, `ev-redis`, `ev-rabbitmq`, `ev-clickhouse`
- **DB (6):** `ev-pg-iam`, `ev-pg-infra`, `ev-pg-session`, `ev-pg-billing`, `ev-pg-notify`, `ev-pg-analytics`

---

### 1.6. Hệ Thống Kiểm Thử (`tests.sh`)

Script này gộp chung cả Unit Test (kiểm tra code) và Smoke Test (kiểm tra API thực tế).

```bash
./deployment/scripts/backend/tests.sh                                  # Mặc định chạy toàn bộ Unit Test
./deployment/scripts/backend/tests.sh --unit --service iam-service     # Chỉ chạy Unit Test cho 1 service
./deployment/scripts/backend/tests.sh --smoke                          # Chạy Smoke Test kiểm tra API qua Gateway
./deployment/scripts/backend/tests.sh --all                            # Chạy cả Unit Test và Smoke Test
./deployment/scripts/backend/tests.sh --smoke --gateway "http://alt:8000" # Smoke test với gateway khác
```

**Chi tiết Smoke Test Endpoints:**

| Dịch vụ        | Endpoint                                       | Kết quả |
| -------------- | ---------------------------------------------- | ------- |
| IAM            | `POST /api/v1/auth/register` (thiếu body)      | `400`   |
| Infrastructure | `GET /api/v1/stations` (công cộng)             | `200`   |
| Session        | `POST /api/v1/bookings` (không token)          | `401`   |
| Billing        | `GET /api/v1/wallets/balance` (không token)    | `401`   |
| Notification   | `GET /api/v1/notifications` (không token)      | `401`   |
| Analytics      | `GET /api/v1/analytics/dashboard` (không token)| `401`   |
| Telemetry      | `POST /api/v1/telemetry/ingest` (thiếu body)   | `400`   |
| OCPP Gateway   | `GET /api/v1/ocpp/health`                      | `200`   |

> Script bo qua (`SKIP`) service chua co `node_modules` hoac chua co file `*.spec.ts`.

**Services duoc test:** `iam-service`, `ev-infrastructure-service`, `session-service`, `billing-service`, `notification-service`, `analytics-service`, `telemetry-ingestion-service`, `ocpp-gateway-service`

---

### 1.8. Validate RabbitMQ (`validate-rabbitmq.sh`)

```bash
./deployment/scripts/backend/validate-rabbitmq.sh
```

| Trang thai                | Y nghia                                           |
| ------------------------- | ------------------------------------------------- |
| `[V] VALIDATION PASSED`   | 100% messages da xu ly, khong mat du lieu         |
| `[!] PASSED WITH WARNING` | Khong mat message nhung con pending trong queue   |
| `[X] VALIDATION FAILED`   | Co message trong DLQ - can kiem tra consumer logs |

> **Credential mac dinh:** `ev_user:ev_secret` (cau hinh trong `deployment/docker/.env`)

---

### 1.9. Kiem Tra ClickHouse (`clickhouse-check.sh`)

```bash
./deployment/scripts/backend/clickhouse-check.sh
```

> Yeu cau: Docker daemon dang chay (Native WSL) va container `ev-clickhouse` ton tai.
> Script chay qua `docker exec clickhouse-client` (khong dung HTTP port).

**Cac muc kiem tra:**

| Muc           | Noi dung                                                    |
| ------------- | ----------------------------------------------------------- |
| [1] Container | `ev-clickhouse` trang thai Docker health                    |
| [2] Ping      | `SELECT 1` qua clickhouse-client                            |
| [3] Version   | `SELECT version()`                                          |
| [4] Database  | `ev_telemetry` da duoc tao chua                             |
| [5] Table     | `telemetry_logs` - row count, partitions, TTL               |
| [6] Service   | `http://localhost:3009/health` clickhouse connection status |

**Ket qua exit code:**

- `exit 0` - Tat ca OK (co the co CANH BAO)
- `exit 1` - Co loi nghiem trong (container down, service loi)

---

### 1.10. Quan Ly Du Lieu Mau (Seed Data)

Hai script `seed-up.sh` va `seed-down.sh` giup tu dong hoa qua trinh nap va xoa du lieu mau cho cac dich vu. Scripts se chay theo thu tu phu thuoc (IAM -> Infra -> Billing -> Session -> Analytics -> Notification).

```bash
# Nap du lieu mau cho toan bo he thong
./deployment/scripts/database/seed-up.sh

# Nap du lieu mau cho 1 dich vu cu the
./deployment/scripts/database/seed-up.sh iam-service

# Xoa toan bo du lieu mau (Rollback)
./deployment/scripts/database/seed-down.sh

# Xoa du lieu mau cho 1 dich vu cu the
./deployment/scripts/database/seed-down.sh iam-service

# Xoa va nap lai toan bo du lieu (Reset)
./deployment/scripts/database/seed-reset.sh

# Reset du lieu mau cho 1 dich vu cu the
./deployment/scripts/database/seed-reset.sh iam-service
```

> **Luu y:** Database Container phai dang chay truoc khi thuc hien nap du lieu. Du lieu se duoc chen truc tiep thong qua `psql` ben trong container.

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
# 1. Setup moi truong Flutter (PowerShell)
.\deployment\scripts\frontend\setup.ps1 -GenKeystore

# 2. Khoi dong backend (WSL Terminal)
./deployment/scripts/backend/start.sh

# 3. Xac nhan backend healthy (WSL Terminal)
./deployment/scripts/backend/health-check.sh

# 4. Chay app Flutter (PowerShell)
.\deployment\scripts\frontend\run.ps1
```

### Khoi dong voi Ngrok (thiet bi that)

```powershell
# Khoi dong backend + bat ngrok tunnel (WSL Terminal)
./deployment/scripts/backend/start.sh --ngrok

# Chay app Flutter - tu dong dung ngrok URL (PowerShell)
.\deployment\scripts\frontend\run.ps1
```

### Truoc khi demo / submit

```powershell
# Reset backend sach, build lai (WSL Terminal)
./deployment/scripts/backend/reset.sh --force

# Kiem tra khong mat event (WSL Terminal)
./deployment/scripts/backend/validate-rabbitmq.sh

# Chay backend test (WSL Terminal)
./deployment/scripts/backend/tests.sh

# Chay frontend test (PowerShell)
.\deployment\scripts\frontend\test.ps1 -Coverage

# Build AAB production (PowerShell)
.\deployment\scripts\frontend\build.ps1 -Target appbundle -Flavor prod -Release -Analyze

# Test qua ngrok (WSL Terminal)
./deployment/scripts/backend/tests.sh --smoke --gateway "https://impeditive-incredible-jordy.ngrok-free.dev"
```

### Debug backend loi (WSL Terminal)

```bash
./deployment/scripts/backend/health-check.sh          # Kiem tra container + HTTP
./deployment/scripts/backend/logs.sh --service ev-iam  # Xem log service loi
./deployment/scripts/backend/tests.sh --smoke         # Test routing qua Kong
./deployment/scripts/backend/reset.sh --force         # Reset neu khong fix duoc
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
