# TraCuuFB-BaoDuy: API khởi đầu (Meta Graph API chính thức)

Gói này tạo backend đăng nhập Facebook và trả về dữ liệu hồ sơ **chính người dùng đã đồng ý đăng nhập**. Đây không phải API tìm kiếm mọi tài khoản Facebook hoặc xem dữ liệu riêng tư.

## Endpoint
- `GET /health` — kiểm tra máy chủ.
- `GET /auth/facebook` — chuyển sang Facebook Login.
- `GET /auth/facebook/callback` — OAuth callback.
- `GET /api/me` — trả về `id`, `name`, `picture` theo quyền được cấp.
- `POST /auth/logout` — xóa session.

## Chạy thử
1. Cài Node.js 20+.
2. Sao chép `.env.example` thành `.env`, điền cấu hình Meta Developer.
3. Chọn phiên bản Graph API hiện hành từ tài liệu Meta và đặt `GRAPH_API_VERSION` theo phiên bản trong tài liệu Meta (hiện tài liệu hiển thị v27.0; kiểm tra lại khi triển khai).
4. `npm install`
5. `npm start`

## Thiết lập Meta
- Tạo ứng dụng tại Meta for Developers và bật Facebook Login.
- Cấu hình Valid OAuth Redirect URI chính xác bằng `META_REDIRECT_URI`.
- Đặt App Secret chỉ trong biến môi trường backend. Không đưa secret hoặc access token vào HTML, GitHub hay trình duyệt.
- Với deploy HTTPS, đặt `NODE_ENV=production`, `SESSION_SECRET` đủ dài, và cập nhật `SITE_ORIGIN`, callback URL, CORS.
- Đối với production, dùng session store bền vững (không dùng MemoryStore mặc định) và kiểm tra domain/cookie/cross-origin.

## Giới hạn API Facebook
Graph API không cho phép tra cứu tùy ý mọi người dùng bằng tên/URL Facebook. Các trường dữ liệu chỉ khả dụng theo API, quyền được Meta duyệt và sự đồng ý của người dùng. Không thu thập mật khẩu, cookie, token người khác hoặc cố truy cập hồ sơ riêng tư.

Website hiện chạy GitHub Pages (tĩnh), nên không thể chạy backend Node trực tiếp trên Pages. Deploy thư mục này lên máy chủ Node hỗ trợ HTTPS (ví dụ dịch vụ hosting Node), sau đó cấu hình website gọi backend URL. Không có API key/tài khoản Meta trong file gốc nên chưa thể kết nối live cho đến khi bạn tạo và cấu hình Meta App.
