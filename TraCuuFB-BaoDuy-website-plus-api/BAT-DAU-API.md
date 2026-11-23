# Cách bật API — hướng dẫn ngắn cho người mới

Mã đã được ghép vào website. Bạn không cần sửa code backend.

## Bước 1 — Tạo máy chủ bằng Render
1. Đăng nhập/đăng ký Render: https://render.com/
2. Đưa toàn bộ file trong ZIP lên một GitHub repository mới (hoặc repo website hiện tại).
3. Trên Render chọn **New → Blueprint** và kết nối repository có file `render.yaml` ở thư mục gốc.
4. Render sẽ tạo service `tracuufb-baoduy-api`. Mở service, vào **Environment**, điền `META_APP_ID` và `META_APP_SECRET` của ứng dụng Meta. Không gửi App Secret cho người khác và không ghi vào file HTML.
5. Mở service, sao chép URL dạng `https://ten-service.onrender.com`. Đây là địa chỉ API của bạn.

## Bước 2 — Cấu hình Facebook Login
1. Mở https://developers.facebook.com/ và tạo Meta App, thêm sản phẩm Facebook Login.
2. Trong Facebook Login → Settings, điền **Valid OAuth Redirect URI** đúng chính xác:
   `https://TEN-SERVICE.onrender.com/auth/facebook/callback`
   (thay TEN-SERVICE bằng tên service Render vừa cấp).
3. Trong App settings, lấy App ID và App Secret, nhập vào Environment trên Render.
4. Lưu thay đổi và chờ Render deploy lại.

## Bước 3 — Điền đúng một dòng website
Mở file `script.js`, tìm dòng:
`const API_BASE = "https://YOUR-RENDER-SERVICE.onrender.com";`
Thay URL bên trong dấu ngoặc kép bằng URL Render vừa sao chép. Không thêm `/auth` hoặc `/api`.
Upload `index.html`, `script.js`, `style.css` và `assets/` lên GitHub Pages.

## Kiểm tra
Mở `https://TEN-SERVICE.onrender.com/health`. Nếu hiện JSON `ok: true`, máy chủ đã chạy.
Trên website, nhấn **Đăng nhập Facebook**, chấp thuận, rồi **Xem hồ sơ đã cấp quyền**.

## Lưu ý quan trọng
- GitHub Pages không chạy backend Node. Backend chạy riêng trên Render.
- Graph API chỉ trả dữ liệu được Meta cho phép và người dùng đã chấp thuận; không có API hợp pháp để đọc tùy ý dữ liệu riêng tư hoặc tìm tất cả tài khoản.
- Dịch vụ hosting miễn phí có thể ngủ khi không dùng và lần mở đầu có thể chậm.
