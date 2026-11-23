# TraCuFb Bảo Duy v2.0 — Multi-Source Social Intelligence

Bộ công cụ tra cứu và phân tích liên kết công khai cho **Facebook, TikTok và YouTube** với kiến trúc **Dual-Engine** (tự động kết hợp Backend đa nguồn và Client Fallback chạy độc lập trên trình duyệt).

## Tính năng chính
- **Tự động nhận diện nền tảng** hoặc chọn thủ công theo tab (Facebook / TikTok / YouTube).
- **YouTube Pro Suite:** Trích xuất Video ID (Watch, Shorts, Live, Embed), lấy dữ liệu qua YouTube oEmbed + Noembed + YouTube Data API v3 (nếu cấu hình `YOUTUBE_API_KEY`), tải thumbnail HD/MaxRes, sao chép nhanh link nhúng.
- **TikTok Multi-Source:** Giải mã link rút gọn (`vt.tiktok.com`, `vm.tiktok.com`), lấy metadata qua TikTok oEmbed và TikWM Public API, xem thống kê lượt phát/tim/bình luận/chia sẻ.
- **Facebook Intelligence:** Bóc tách UID số, Username/Slug, Post/Reel/Video ID, chuẩn hóa link và tạo bộ liên kết truy cập nhanh (Trang chính, Giới thiệu, Kho ảnh, Kho video).
- **Lịch sử tra cứu cục bộ & cấu hình API trực tiếp trên giao diện.**

## Hướng dẫn chạy Backend (Tùy chọn để bật full đa nguồn)
```bash
cd api
npm install
npm start
```
Mở `index.html` trực tiếp trên trình duyệt hoặc deploy lên GitHub Pages / Vercel / Render.
