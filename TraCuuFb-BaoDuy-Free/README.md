# TraCuuFB - GitHub Pages

## Cách upload đúng vào repository `TraCuuFb`

1. Tải và giải nén file ZIP này trên máy tính.
2. Mở repository `TraCuuFb` trên GitHub.
3. Chọn **Add file → Upload files**.
4. Mở thư mục vừa giải nén, chọn TẤT CẢ file và thư mục bên trong (bao gồm `index.html`, `style.css`, `script.js`, `assets`, `.nojekyll`).
5. Kéo chúng vào trang Upload files của GitHub. Không kéo nguyên thư mục `tracuufb-website` để tránh tạo thêm một tầng thư mục.
6. Nhấn **Commit changes**.
7. Vào **Settings → Pages**; chọn **Deploy from a branch**, branch `main`, folder `/(root)`, rồi Save.
8. Chờ GitHub Pages hoàn tất triển khai. Địa chỉ dự kiến: https://nguyenhaoduy-bdi.github.io/TraCuuFb/

## Cấu trúc bắt buộc trong repository

`index.html` phải nằm ngay ở thư mục gốc, cùng cấp với `style.css`, `script.js` và thư mục `assets`.

## Lưu ý chức năng

Đây là website giao diện tĩnh. Nó không chạy các API riêng của Chrome Extension (ví dụ `chrome.cookies`, `chrome.storage`, content scripts hoặc service worker), nên chưa có chức năng tra cứu Facebook thực tế. Muốn triển khai tra cứu thật cần backend/API riêng, được xây dựng và bảo vệ phù hợp. Không yêu cầu người dùng nhập mật khẩu hoặc gửi cookie Facebook vào trang web.


## Cập nhật liên hệ và Google Search

- Website hiển thị tên **Bảo Duy** nổi bật và có nút liên hệ Facebook: https://www.facebook.com/share/1KUWFdqzpJ/ .
- Không có liên kết Telegram trong bộ website này.
- Đã thêm tiêu đề/mô tả SEO, canonical, Open Graph và chỉ thị `index, follow`.
- Đã thêm `robots.txt` và `sitemap.xml` cho Googlebot.

### Gửi website lên Google

1. Upload toàn bộ file trong ZIP lên thư mục gốc repository `TraCuuFb` (ghi đè file cũ), giữ `index.html`, `style.css`, `script.js` ở ngay thư mục gốc.
2. Đảm bảo GitHub Pages đang xuất bản từ branch `main`, folder `/(root)`.
3. Mở https://search.google.com/search-console/ và thêm thuộc tính URL-prefix `https://nguyenhaoduy-bdi.github.io/TraCuuFb/`.
4. Xác minh quyền sở hữu theo hướng dẫn của Search Console.
5. Trong Search Console, mở **Sitemaps** và gửi `https://nguyenhaoduy-bdi.github.io/TraCuuFb/sitemap.xml`.
6. Dùng **URL Inspection** kiểm tra URL trang chủ và chọn **Request indexing**.

Lưu ý: các thẻ SEO và sitemap giúp Google khám phá website, nhưng không đảm bảo website xuất hiện ngay hoặc được xếp hạng cao. Việc lập chỉ mục phụ thuộc Google.


## Chính sách miễn phí trên giao diện

- Giao diện website không có phương thức thanh toán, gói VIP hoặc mục nâng cấp trả phí.
- Website GitHub Pages hiện là giao diện tĩnh miễn phí; chức năng tra cứu thực tế chưa kết nối backend/API nên chưa hoạt động.
- Việc thay đổi giao diện này không thay đổi giá hoặc chính sách của dịch vụ bên thứ ba hay máy chủ/API khác.
