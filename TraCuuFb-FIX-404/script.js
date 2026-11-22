document.getElementById('year').textContent = new Date().getFullYear();
document.getElementById('searchBtn').addEventListener('click', () => {
  const value = document.getElementById('query').value.trim();
  const notice = document.getElementById('notice');
  if (!value) {
    notice.textContent = 'Vui lòng nhập đường dẫn hoặc nội dung trước.';
    return;
  }
  notice.textContent = 'Website hiện là bản giao diện tĩnh, chưa kết nối API tra cứu. Không có dữ liệu nào được gửi đi. Hãy cấu hình backend hợp lệ để bật chức năng này.';
});
