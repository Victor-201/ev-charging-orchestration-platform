# Hướng Dẫn Sử Dụng Scripts Triển Khai (Deployment Scripts)

Tài liệu này hướng dẫn cách sử dụng bộ công cụ tự động hóa PowerShell (`.ps1`) trong thư mục `deployment/scripts/` để khởi chạy, kiểm tra, dừng và reset toàn bộ hệ thống EV Charging Microservices.

> **Yêu cầu:** PowerShell 5.1+ (Windows) hoặc PowerShell 7+ (pwsh). Docker Desktop phải đang chạy.
> Nếu bị chặn bởi Execution Policy, chạy lệnh sau một lần: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

---

## Tổng Quan Các Scripts

| Script                  | Mục đích                                           | Tham số chính                  |
| ----------------------- | -------------------------------------------------- | ------------------------------ |
| `start.ps1`             | Khởi chạy toàn bộ hệ thống                         | `-Rebuild`                     |
| `stop.ps1`              | Dừng hệ thống                                      | `-Clean`                       |
| `reset.ps1`             | Xóa sạch và khởi chạy lại từ đầu                   | `-Force`                       |
| `health-check.ps1`      | Kiểm tra trạng thái tất cả containers và endpoints | _(không có)_                   |
| `logs.ps1`              | Xem log hệ thống linh hoạt (hỗ trợ nhiều terminal) | `-Service`, `-All`, `-AllApps` |
| `smoke-test.ps1`        | Test tích hợp qua API Gateway (Kong)               | `[GatewayUrl]`                 |
| `tests.ps1`             | Chạy Unit Test toàn bộ 8 microservices             | `-Coverage`, `-Pattern`        |
| `validate-rabbitmq.ps1` | Kiểm tra Zero-Loss messaging (RabbitMQ DLQ)        | _(không có)_                   |

---

## 1. Khởi Chạy Hệ Thống (`start.ps1`)

Khởi chạy toàn bộ hạ tầng (Docker containers, Volumes, Networks) và chờ cho đến khi 18 containers chuyển sang trạng thái `healthy`.

**Cú pháp:**

```powershell
.\deployment\scripts\start.ps1 [-Rebuild]
```

| Lệnh                                      | Mô tả                                               |
| ----------------------------------------- | --------------------------------------------------- |
| `.\deployment\scripts\start.ps1`          | Chạy bình thường (build image nếu có thay đổi)      |
| `.\deployment\scripts\start.ps1 -Rebuild` | Ép build lại toàn bộ image, bỏ qua Docker cache     |

Script tự động polling từng container, timeout tối đa **120 giây/container**.

---

## 2. Dừng Hệ Thống (`stop.ps1`)

Tắt hệ thống microservices một cách gọn gàng.

**Cú pháp:**

```powershell
.\deployment\scripts\stop.ps1 [-Clean]
```

| Lệnh                                   | Mô tả                                                          |
| -------------------------------------- | -------------------------------------------------------------- |
| `.\deployment\scripts\stop.ps1`        | Dừng containers, giữ nguyên Volumes (dữ liệu DB được bảo toàn) |
| `.\deployment\scripts\stop.ps1 -Clean` | Dừng và **XÓA VĨNH VIỄN** tất cả Volumes                       |

---

## 3. Reset Toàn Hệ Thống (`reset.ps1`)

"Nút hạt nhân" — xóa sạch toàn bộ hệ thống rồi tự động build và chạy lại từ đầu. Dùng khi hệ thống kẹt lỗi nặng hoặc cần một môi trường demo hoàn toàn mới.

**Cú pháp:**

```powershell
.\deployment\scripts\reset.ps1 [-Force]
```

Script sẽ hỏi xác nhận `[y/N]` trước khi thực thi. Tương đương chạy tuần tự:

```
stop.ps1 -Clean  →  start.ps1 -Rebuild
```

---

## 4. Kiểm Tra Sức Khỏe (`health-check.ps1`)

Đánh giá trạng thái thực tế của toàn hệ thống ở 2 cấp độ: **Docker Container Status** và **HTTP API Status**.

**Cú pháp:**

```powershell
.\deployment\scripts\health-check.ps1
```

**Kết quả:**

- Kiểm tra 18 containers (`ev-pg-*`, `ev-redis`, `ev-rabbitmq`, `ev-kong`, 8 app services).
- Gọi HTTP đến `/health` của 8 microservices, RabbitMQ UI và Kong Admin.
- In ra tổng kết `N OK / M FAIL`, trả về exit code `1` nếu có lỗi.

---

## 5. Xem Log Hệ Thống (`logs.ps1`)

Tiện ích xem log linh hoạt, hỗ trợ realtime (`-f`) theo dõi tất cả 18 container trong hệ thống (App, DB, Infra) cùng lúc trên các cửa sổ riêng biệt để dễ debug.

**Cú pháp:**

```powershell
.\deployment\scripts\logs.ps1 [-Service <tên>] [-All] [-AllApps] [-AllInfra] [-AllDb] [-AllSystemSplit] [-NoFollow] [-Tail <số_dòng>]
```

| Lệnh                                                      | Mô tả                                                                         |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `.\deployment\scripts\logs.ps1 -Service ev-kong`          | Xem realtime log 1 service trên terminal hiện tại                             |
| `.\deployment\scripts\logs.ps1 -Service ev-iam,ev-pg-iam` | Xem realtime nhiều service, tự động mở ra **các cửa sổ terminal riêng biệt**  |
| `.\deployment\scripts\logs.ps1 -AllApps`                  | Tự động mở **8 cửa sổ riêng biệt** cho 8 app services                         |
| `.\deployment\scripts\logs.ps1 -AllInfra`                 | Tự động mở **4 cửa sổ riêng biệt** cho hạ tầng (kong, redis, rmq, clickhouse) |
| `.\deployment\scripts\logs.ps1 -AllDb`                    | Tự động mở **6 cửa sổ riêng biệt** cho các database PostgreSQL                |
| `.\deployment\scripts\logs.ps1 -AllSystemSplit`           | Tự động mở **18 cửa sổ riêng biệt** cho TOÀN BỘ hệ thống!                     |
| `.\deployment\scripts\logs.ps1 -All`                      | Gộp tất cả log của toàn hệ thống chung vào 1 màn hình lớn                     |

_(Mặc định logs luôn ở dạng **realtime** (`-f` / follow) và hiển thị `100` dòng cuối. Bạn có thể dùng `-NoFollow` để chỉ in ra rồi dừng, hoặc `-Tail 500` để xem nhiều dòng hơn)_

**Danh sách 18 Container hỗ trợ:**

- **App (8):** `ev-iam`, `ev-analytics`, `ev-infrastructure`, `ev-session`, `ev-billing`, `ev-notify`, `ev-telemetry`, `ev-ocpp-gw`
- **Infra (4):** `ev-kong`, `ev-redis`, `ev-rabbitmq`, `ev-clickhouse`
- **DB (6):** `ev-pg-iam`, `ev-pg-infra`, `ev-pg-session`, `ev-pg-billing`, `ev-pg-notify`, `ev-pg-analytics`

---

## 6. Test Tích Hợp — Smoke Test (`smoke-test.ps1`)

Đóng vai trò như một client bên ngoài (Web/Mobile App). Gửi HTTP request qua API Gateway (Kong - `http://localhost:8000`) để đảm bảo routing và auth guard hoạt động đúng.

**Cú pháp:**

```powershell
.\deployment\scripts\smoke-test.ps1 [-Gateway <URL>]
```

| Lệnh                                                                 | Mô tả                                             |
| -------------------------------------------------------------------- | ------------------------------------------------- |
| `.\deployment\scripts\smoke-test.ps1`                                | Test qua gateway mặc định `http://localhost:8000` |
| `.\deployment\scripts\smoke-test.ps1 -Gateway "http://staging:8000"` | Test qua gateway tùy chỉnh                        |

**Các endpoint được test:**

| Service        | Endpoint                                     | Expected |
| -------------- | -------------------------------------------- | -------- |
| IAM            | `POST /api/v1/auth/register` (missing body)  | `400`    |
| IAM            | `POST /api/v1/auth/login` (missing creds)    | `400`    |
| IAM            | `GET /api/v1/users/me` (no token)            | `401`    |
| Infrastructure | `GET /api/v1/stations` (public list)         | `200`    |
| Session        | `POST /api/v1/bookings` (no token)           | `401`    |
| Session        | `POST /api/v1/charging/start` (no token)     | `401`    |
| Billing        | `GET /api/v1/wallets/balance` (no token)     | `401`    |
| Billing        | `POST /api/v1/payments/pay` (no token)       | `401`    |
| Notification   | `GET /api/v1/notifications` (no token)       | `401`    |
| Analytics      | `GET /api/v1/analytics/dashboard` (no token) | `401`    |
| Telemetry      | `POST /api/v1/telemetry/ingest` (missing body) | `400`  |
| OCPP Gateway   | `GET /api/v1/ocpp/health`                    | `200`    |
| Kong Admin     | `GET http://localhost:8001`                  | `200`    |
| RabbitMQ UI    | `GET http://localhost:15672`                 | `200`    |

---

## 7. Chạy Unit Test (`tests.ps1`)

Duyệt qua toàn bộ 8 thư mục backend microservices, chạy `jest` trên từng dịch vụ, và tổng hợp báo cáo Pass/Fail.

**Cú pháp:**

```powershell
.\deployment\scripts\tests.ps1 [-Coverage] [-Pattern <TenFile>]
```

| Lệnh                                                | Mô tả                               |
| --------------------------------------------------- | ----------------------------------- |
| `.\deployment\scripts\tests.ps1`                    | Chạy toàn bộ Unit Test Suite        |
| `.\deployment\scripts\tests.ps1 -Coverage`          | Chạy kèm báo cáo Code Coverage      |
| `.\deployment\scripts\tests.ps1 -Pattern "booking"` | Chạy chỉ các file test khớp pattern |

> **Lưu ý:** Script bỏ qua (`SKIP`) các service chưa cài `node_modules` hoặc chưa có file `*.spec.ts`.

**Danh sách services được test:**

```
iam-service
ev-infrastructure-service
session-service
billing-service
notification-service
analytics-service
telemetry-ingestion-service
ocpp-gateway-service
```

---

## 8. Kiểm Tra Zero-Loss RabbitMQ (`validate-rabbitmq.ps1`)

Truy vấn RabbitMQ Management API để đảm bảo không có message nào bị mất — tất cả queue rỗng và các Dead Letter Queue (DLQ) không có message.

**Cú pháp:**

```powershell
.\deployment\scripts\validate-rabbitmq.ps1
```

**Kết quả có thể:**

| Trạng thái                | Ý nghĩa                                           |
| ------------------------- | ------------------------------------------------- |
| `[V] VALIDATION PASSED`   | 100% messages đã được xử lý, không mất dữ liệu    |
| `[!] PASSED WITH WARNING` | Không mất message nhưng còn pending trong queue   |
| `[X] VALIDATION FAILED`   | Có message trong DLQ — cần kiểm tra consumer logs |

> **Credential mặc định:** `ev_user:ev_secret` (cấu hình trong `deployment/docker/.env`)

---

## Luồng Làm Việc Khuyên Dùng

### Khởi động dự án lần đầu

```powershell
# 1. Khởi chạy toàn bộ hệ thống (build images)
.\deployment\scripts\start.ps1

# 2. Xác nhận tất cả services healthy
.\deployment\scripts\health-check.ps1

# 3. Chạy smoke test để đảm bảo routing đúng
.\deployment\scripts\smoke-test.ps1
```

### Trước khi demo / submit

```powershell
# Reset sạch dữ liệu, build lại toàn bộ image không cần hỏi
.\deployment\scripts\reset.ps1 -Force

# Kiểm tra không mất event
.\deployment\scripts\validate-rabbitmq.ps1

# Chạy unit test toàn bộ
.\deployment\scripts\tests.ps1
```

### Debug hệ thống bị lỗi

```powershell
# Xem trạng thái từng container và HTTP endpoint
.\deployment\scripts\health-check.ps1

# Xem log của một service cụ thể
docker logs ev-iam --tail 50

# Reset và khởi động lại nếu không fix được
.\deployment\scripts\reset.ps1
```

---

## Cổng Mạng Hệ Thống

| Service                | URL                            | Ghi chú                      |
| ---------------------- | ------------------------------ | ---------------------------- |
| Kong Gateway (API)     | `http://localhost:8000`        | Tất cả API client đi qua đây |
| Kong Admin             | `http://localhost:8001`        | Quản lý routes/plugins       |
| RabbitMQ UI            | `http://localhost:15672`       | Credentials: `guest/guest`   |
| IAM Service            | `http://localhost:3001/health` |                              |
| Analytics Service      | `http://localhost:3002/health` |                              |
| Infrastructure Service | `http://localhost:3003/health` |                              |
| Session Service        | `http://localhost:3004/health` |                              |
| Billing Service        | `http://localhost:3007/health` |                              |
| Notification Service   | `http://localhost:3008/health` |                              |
| Telemetry Service      | `http://localhost:3009/health` |                              |
| OCPP Gateway           | `http://localhost:3010/health` |                              |
