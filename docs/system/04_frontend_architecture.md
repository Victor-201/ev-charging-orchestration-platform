# THIẾT KẾ KIẾN TRÚC FRONTEND: EV CHARGING PLATFORM

## 1. WEB ADMIN (TRANG QUẢN TRỊ TRUNG TÂM)

Đây là trung tâm điều khiển (Control Center) dành cho Ban Quản Trị (Admin/Staff), nơi giám sát sức khỏe toàn bộ trạm sạc, quản lý tài chính và cấu hình hệ thống. Yêu cầu tải lượng dữ liệu lớn, vẽ biểu đồ phức tạp và cần độ ổn định tuyệt đối.

### 1.1. Công nghệ cốt lõi

- **Framework:** **Next.js (React)**. Đây là framework mạnh mẽ nhất cho các ứng dụng web cấp doanh nghiệp, hỗ trợ render linh hoạt (CSR/SSR) và quản lý route tối ưu.
- **Ngôn ngữ:** **TypeScript**. Đảm bảo strict-typing, hạn chế lỗi runtime khi làm việc với các object phức tạp trả về từ hệ thống 9 Microservices.
- **Data Fetching & State:** **TanStack Query (React Query)**. Đảm nhiệm việc caching dữ liệu, tự động đồng bộ (auto-refetch) trên background và quản lý state cho các thao tác gọi API RESTful (ví dụ: danh sách hóa đơn, log hệ thống).
- **Realtime:** Tích hợp WebSockets/Socket.io client để nhận luồng Telemetry (điện áp, nhiệt độ) từ trụ sạc gửi về.

### 1.2. Giao diện (UI/UX)

- **Styling:** **Tailwind CSS**. Tối ưu hóa dung lượng CSS, cho phép build UI cực nhanh và nhất quán.
- **Component Library:** **Shadcn UI**. Bộ thư viện UI headless hiện đại, mang lại giao diện tối giản, chuyên nghiệp cấp độ Enterprise (hỗ trợ sẵn Dark/Light Mode, Animation mượt mà) mà không bị nặng nề như các thư viện truyền thống.
- **Biểu đồ (Charts):** Recharts hoặc Chart.js để vẽ đồ thị phụ tải lưới điện, doanh thu và lưu lượng xe.

### 1.3. Tích hợp Bản đồ Trạm sạc (Free 100%)

- **Bản đồ nền (Map Tiles):** Sử dụng **OpenStreetMap (OSM)** - Nguồn dữ liệu bản đồ mã nguồn mở lớn nhất thế giới, miễn phí hoàn toàn.
- **Thư viện hiển thị:** **Leaflet.js** (thông qua wrapper `react-leaflet`). Nhẹ, tốc độ tải nhanh, dễ dàng plot hàng ngàn Marker (điểm trạm sạc) lên bản đồ.

### 1.4. Triển khai (Deployment)

- **Hosting:** **Vercel** hoặc **Cloudflare Pages**. Hỗ trợ CI/CD trực tiếp từ GitHub, miễn phí hoàn toàn, tích hợp sẵn CDN toàn cầu.

---

## 2. KIOSK / MÀN HÌNH TRỤ SẠC (SMART DISPLAY)

Màn hình cảm ứng được gắn trực tiếp trên mỗi trụ sạc phần cứng. Đặc thù của thiết bị này là tài nguyên giới hạn (thường chạy trên Raspberry Pi hoặc các vi điều khiển nhúng có màn hình), yêu cầu khởi động nhanh, chạy Full-screen (chế độ Kiosk) và phản hồi tương tác tức thì.

### 2.1. Công nghệ cốt lõi

- **Framework:** **React + Vite**. Vite cung cấp môi trường build và Hot Module Replacement (HMR) tốc độ ánh sáng. Việc dùng React thuần (Client-side Rendering) tạo ra gói bundle cực nhẹ, lý tưởng cho thiết bị nhúng.
- **Ngôn ngữ:** **TypeScript**. (Dễ dàng share các Interface/Type định nghĩa chung với Web Admin).
- **Kiến trúc App:** **PWA (Progressive Web App)**. Ứng dụng chạy trên trình duyệt Chromium nội bộ thiết bị ở chế độ Kiosk (ẩn thanh địa chỉ). Có khả năng cache resource tĩnh để khởi động ngay cả khi rớt mạng tạm thời.

### 2.2. Giao tiếp & Nghiệp vụ

- **Trạng thái phiên sạc (State Machine):** Render giao diện dựa trên 4 trạng thái từ Backend: `INIT`, `ACTIVE`, `STOPPED`, `BILLED`.
- **Realtime Socket:** Duy trì kết nối WebSocket bền vững với Kong Gateway để hiển thị `% Pin (SoC)`, `Số kWh đã sạc`, và `Chi phí tạm tính` thay đổi theo từng giây (giống cơ chế đồng hồ tính tiền taxi).
- **Tương tác cục bộ:** Hiển thị mã QR VNPay trên màn hình để người dùng vãng lai quét và thanh toán.

---

## 3. MOBILE APP DÀNH CHO USER (NGƯỜI DÙNG CUỐI)

Ứng dụng cài trên điện thoại thông minh của khách hàng. Yêu cầu trải nghiệm mượt mà, định vị GPS chính xác và quy trình UX (User Experience) tối giản, tiện lợi.

### 3.1. Công nghệ cốt lõi

- **Framework/Ngôn ngữ:** **Flutter (Dart)**. Giải pháp Cross-platform đỉnh cao nhất hiện nay. Render giao diện trực tiếp bằng engine Skia/Impeller giúp ứng dụng đạt tốc độ khung hình 60-120fps, mượt mà như app Native.
- **State Management:** **BLoC (Business Logic Component)** hoặc **Riverpod**. Tách biệt hoàn toàn luồng xử lý nghiệp vụ (gọi API, tính toán logic) ra khỏi tầng vẽ giao diện (UI). Giúp code dễ bảo trì khi app phình to.
- **Networking:** `dio` package hỗ trợ bắt interceptor cho JWT Token, tự động xử lý logic Refresh Token khi token hết hạn.

### 3.2. Bản đồ & Chỉ đường thời gian thực

- **Bản đồ nền:** Sử dụng package **`flutter_map`** kết hợp với nguồn dữ liệu **OpenStreetMap (OSM)**. Hỗ trợ hiển thị mượt mà trên cả Android và iOS.
- **Định vị (Location):** Package `geolocator` lấy GPS realtime của điện thoại.
- **Chỉ đường (Routing):** Tích hợp REST API của **OpenRouteService (ORS)**. Khi người dùng chọn trạm sạc, App gửi tọa độ `[A (User) -> B (Station)]` lên ORS. ORS sẽ trả về chuỗi tọa độ (Polyline) chỉ đường chi tiết.

### 3.3. Tích hợp Hệ sinh thái EV

- **Push Notification:** Tích hợp **Firebase Cloud Messaging (FCM)** nhận thông báo đẩy khi phiên sạc kết thúc hoặc khi trạm sạc đang đặt có biến động.
- **Thanh toán:** Tích hợp mở ứng dụng VNPay hoặc Webview để xác thực nạp tiền vào Internal Wallet. Quét mã QR trụ sạc bằng Camera để bắt đầu sạc.

---

## TỔNG KẾT KIẾN TRÚC TRIỂN KHAI

| Thành Phần          | Trách Nhiệm                    | Framework          | Map & Routing                    | Hosting / Build                    |
| :------------------ | :----------------------------- | :----------------- | :------------------------------- | :--------------------------------- |
| **Web Admin**       | Quản trị tổng thể, Analytics   | **Next.js (TS)**   | Leaflet + OSM                    | Vercel / Netlify                   |
| **Kiosk Trụ Sạc**   | Hiển thị SoC, QR Thanh toán    | **React + Vite**   | N/A                              | Local Device (Raspberry Pi/Tablet) |
| **User Mobile App** | Đặt chỗ, Chỉ đường, Ví điện tử | **Flutter (Dart)** | `flutter_map` + OpenRouteService | .APK / App Store                   |
