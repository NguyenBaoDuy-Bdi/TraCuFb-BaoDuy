// Set this to the HTTPS address where the Node API is deployed.
// Example: https://api.your-domain.com (do not put App Secret or access token here).
// After Render deploy: replace the value below with the service URL shown on Render.
const API_BASE = "https://YOUR-RENDER-SERVICE.onrender.com";
const apiConfigured = !API_BASE.includes("YOUR-BACKEND-HOST");

document.getElementById("year").textContent = new Date().getFullYear();
const input = document.getElementById("query");
const notice = document.getElementById("notice");
const profileBox = document.getElementById("fbProfile");

function runPublicSearch() {
  const value = input.value.trim();
  if (!value) {
    notice.textContent = "Vui lòng nhập tên, từ khóa hoặc đường dẫn Facebook.";
    input.focus();
    return;
  }
  const target = /^https?:\\/\\//i.test(value)
    ? value
    : "https://www.facebook.com/search/top/?q=" + encodeURIComponent(value);
  notice.textContent = "Đang mở Facebook. Chỉ kết quả công khai sẽ hiển thị tùy quyền truy cập của bạn.";
  window.open(target, "_blank", "noopener,noreferrer");
}
document.getElementById("searchBtn").addEventListener("click", runPublicSearch);
input.addEventListener("keydown", e => { if (e.key === "Enter") runPublicSearch(); });

document.getElementById("facebookLogin").addEventListener("click", () => {
  if (!apiConfigured) {
    notice.textContent = "Chưa cấu hình API_BASE. Mở script.js và thay bằng địa chỉ backend HTTPS đã triển khai.";
    return;
  }
  window.location.href = API_BASE.replace(/\\/$/, "") + "/auth/facebook";
});

document.getElementById("loadProfile").addEventListener("click", async () => {
  if (!apiConfigured) {
    notice.textContent = "Chưa cấu hình API_BASE trong script.js.";
    return;
  }
  notice.textContent = "Đang lấy hồ sơ Facebook từ backend…";
  try {
    const response = await fetch(API_BASE.replace(/\\/$/, "") + "/api/me", {
      credentials: "include"
    });
    if (response.status === 401) {
      notice.textContent = "Bạn chưa đăng nhập Facebook. Hãy nhấn “Đăng nhập Facebook” trước.";
      return;
    }
    if (!response.ok) throw new Error("API error");
    const result = await response.json();
    const user = result.data || {};
    profileBox.innerHTML = "";
    if (user.picture?.data?.url) {
      const img = document.createElement("img");
      img.src = user.picture.data.url;
      img.alt = "Ảnh đại diện Facebook";
      profileBox.appendChild(img);
    }
    const text = document.createElement("span");
    text.textContent = (user.name || "Facebook user") + (user.id ? " · ID: " + user.id : "");
    profileBox.appendChild(text);
    profileBox.hidden = false;
    notice.textContent = "Đã nhận thông tin do Facebook cấp quyền.";
  } catch {
    notice.textContent = "Không kết nối được API. Kiểm tra máy chủ, HTTPS, CORS và API_BASE.";
  }
});

if (new URLSearchParams(location.search).get("fb_login") === "success") {
  notice.textContent = "Đăng nhập Facebook thành công. Nhấn “Xem hồ sơ đã cấp quyền”.";
  history.replaceState({}, document.title, location.pathname);
}
