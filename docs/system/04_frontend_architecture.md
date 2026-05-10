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

Ứng dụng cài đặt trên điện thoại thông minh của khách hàng xe điện. Yêu cầu tiên quyết là trải nghiệm UX mượt mà, khả năng tương tác với bản đồ thời gian thực (Real-time Mapping), nhận thông báo tức thời (Push Notification) và xử lý giao dịch an toàn.

### 3.1. Nền tảng & Công nghệ Cốt lõi (Core Stack)

- **Ngôn ngữ & Framework:** **Flutter (Dart)**. Đây là framework Cross-platform (chạy trên cả iOS & Android) mạnh mẽ và phổ biến nhất hiện nay do Google phát triển. Nhờ cơ chế biên dịch trực tiếp sang mã máy (Native ARM code) và render qua engine đồ họa **Impeller/Skia**, Flutter đảm bảo ứng dụng đạt tốc độ 60-120fps, xử lý mượt mà các animation và thao tác vuốt chạm trên bản đồ số phức tạp mà không bị giật lag.
- **State Management:** Sử dụng kiến trúc **BLoC (Business Logic Component)**. Đây là pattern tiêu chuẩn công nghiệp giúp tách bạch hoàn toàn luồng nghiệp vụ (Business Logic) và giao diện (UI). Đảm bảo tính mở rộng cao và dễ dàng quản lý trạng thái luồng dữ liệu (Data Stream) khi kết nối qua WebSockets và APIs.
- **Networking & Bảo mật:** Sử dụng package **`dio`** kết hợp Interceptor để quản lý JWT Bearer Token, tự động chèn header và xử lý cơ chế làm mới phiên làm việc (Refresh Token) một cách liền mạch, an toàn.

### 3.2. Quản lý Bản đồ & Tọa độ Địa lý (GIS & Mapping)

- **Render Bản đồ nền (Tile Map):** Tích hợp **`flutter_map`** kết hợp với hệ thống bản đồ mở **OpenStreetMap (OSM)**. Cung cấp khả năng hiển thị chi tiết mạng lưới đường phố và vị trí các trạm sạc đang có trạng thái (Available/Charging/Faulted) theo thời gian thực.
- **Định vị & Chỉ đường (Routing):**
  - Sử dụng package `geolocator` để truy xuất tọa độ GPS (vĩ độ, kinh độ) hiện tại của thiết bị khách hàng.
  - Tích hợp dịch vụ **OpenRouteService (ORS) API** để vạch tuyến đường. Khi khách hàng chọn trạm sạc, hệ thống tự động gọi API từ điểm A (User) đến điểm B (Station), thuật toán của ORS phân tích và vẽ trả về chuỗi tọa độ (Polyline) để hiển thị lộ trình chỉ dẫn tối ưu nhất trực tiếp trên giao diện bản đồ.

### 3.3. Tích hợp Dịch vụ Bên thứ ba (3rd-Party Integrations)

- **Cổng thanh toán điện tử (Payment Gateway):** Tích hợp thư viện `url_launcher` kết hợp Deep Linking để kết nối với hệ thống thanh toán **VNPay**. Hỗ trợ tạo URL thanh toán an toàn với mã băm (Hash) chuẩn SHA-256 từ phía Backend, điều hướng người dùng sang app ngân hàng/VNPay để nạp tiền vào Ví điện tử (Internal Wallet), sau đó tự động điều hướng ngược lại (Return URL) về ứng dụng để cập nhật số dư thành công.
- **Thông báo đẩy (Push Notification):** Tích hợp dịch vụ đám mây **Firebase Cloud Messaging (FCM)**. Khi luồng xử lý bất đồng bộ từ hệ thống Backend hoàn tất (ví dụ: *Kết thúc phiên sạc*, *Đến lượt sạc trong hàng đợi*, *Cập nhật công nợ*), Backend sẽ bắn tín hiệu qua FCM để đẩy thông báo Real-time trực tiếp lên màn hình thiết bị của người dùng, giúp nắm bắt trạng thái tức thời mà không cần mở app.
- **Tương tác thiết bị phần cứng (Hardware):** Tích hợp package `mobile_scanner` để tận dụng phần cứng Camera, hỗ trợ tính năng quét mã QR Code trên trụ sạc vật lý, từ đó định danh trụ và kích hoạt luồng "Bắt đầu phiên sạc".

---

## TỔNG KẾT KIẾN TRÚC TRIỂN KHAI

| Thành Phần          | Trách Nhiệm                    | Framework          | Map & Routing                    | Hosting / Build                    |
| :------------------ | :----------------------------- | :----------------- | :------------------------------- | :--------------------------------- |
| **Web Admin**       | Quản trị tổng thể, Analytics   | **Next.js (TS)**   | Leaflet + OSM                    | Vercel / Netlify                   |
| **Kiosk Trụ Sạc**   | Hiển thị SoC, QR Thanh toán    | **React + Vite**   | N/A                              | Local Device (Raspberry Pi/Tablet) |
| **User Mobile App** | Đặt chỗ, Chỉ đường, Ví điện tử | **Flutter (Dart)** | `flutter_map` + OpenRouteService | .APK / App Store                   |
