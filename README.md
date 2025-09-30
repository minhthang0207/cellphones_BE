# 🔗 CellphoneS Backend

Backend cho dự án **CellphoneS E-Commerce Website**.  
Xử lý API cho người dùng (user) và quản trị viên (admin), bao gồm quản lý sản phẩm, đơn hàng, thanh toán, nhắn tin realtime và xác thực.

---

## 🚀 Tính năng chính

- **Authentication & Authorization**: Đăng ký, đăng nhập, xác thực bằng JWT, quên mật khẩu
- **Quản lý sản phẩm**: Thêm, sửa, xóa, tìm kiếm, phân trang  
- **Quản lý giỏ hàng**: Thêm, xóa 
- **Quản lý danh sách yêu thích**: Thêm, xóa  
- **Quản lý bình luận trong các sản phẩm**: Thêm, sửa, xóa  
- **Quản lý đơn hàng**: Tạo đơn, cập nhật trạng thái vận chuyển  
- **Quản lý người dùng**: Xem danh sách, phân quyền  
- **Nhắn tin realtime**: Socket.IO giữa user và admin  
- **Thanh toán & Email**: Hỗ trợ gửi mail, xử lý giao dịch  

---

## 🏗️ Công nghệ sử dụng
- **Node.js** + Express (hoặc NestJS nếu bạn dùng Nest)  
- **Database**: MySQL (qua Sequelize ORM)  (Railway)
- **Authentication**: JWT  
- **Realtime**: Socket.IO  
- **Triển khai**: Render   

---

## ⚙️ Cài đặt & chạy dự án

### Yêu cầu môi trường
- Node.js >= 18  
- MySQL đã cài đặt sẵn hoặc sử dụng trên website railway

### Cách chạy local
```bash
# Clone dự án
git clone https://github.com/minhthang0207/cellphones_BE.git
cd cellphones_BE

# Cài đặt dependencies
npm install

# Tạo file .env và cấu hình
cp .env.example .env

# Chạy server
node app.js

```




