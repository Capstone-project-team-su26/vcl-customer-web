# AI Chat Proxy Server (Deploy Vercel / Local)

Mini server proxy bảo mật cho tính năng AI Chatbot của Vietnam Logistic.

## 🎯 Vấn đề được giải quyết
1. **Bảo mật API Key**: Thay vì cấu hình `VITE_CODEX_API_KEY` ở Frontend (bị lộ trong file JS và tab Network khi người dùng F12), API key được lưu an toàn trên Server/Vercel.
2. **Khắc phục triệt để lỗi CORS ("Failed to fetch")**: Trình duyệt gọi đến endpoint của proxy (`/api/chat`), proxy xử lý CORS đầy đủ và gọi tiếp đến OpenRouter phía server.
3. **Tự động Retry**: Tự động thử lại khi OpenRouter quá tải (lỗi concurrency limit / rate limit 429).

---

## 🚀 Cách 1: Deploy lên Vercel thành Project riêng (Khuyên dùng)

### Bước 1: Deploy lên Vercel
Mở terminal tại thư mục này (`ai-chat-proxy`):
```bash
cd ai-chat-proxy
npx vercel
```
Làm theo hướng dẫn trên màn hình để liên kết và deploy:
- Set up and deploy? **Y**
- Which scope? Chọn tài khoản Vercel của bạn
- Link to existing project? **N**
- Project name: `vietnamlogistic-ai-proxy` (hoặc tên tuỳ chọn)
- In which directory is your code located? `./`

### Bước 2: Cấu hình biến môi trường trên Vercel
Vào Vercel Dashboard -> Chọn project vừa tạo -> **Settings** -> **Environment Variables**:
- `CODEX_API_KEY`: Điền key OpenRouter (ví dụ: `sk-or-v1-b039545a...`)
- `CODEX_MODEL`: `google/gemini-2.5-flash` (hoặc model tuỳ chọn)

Sau đó redeploy hoặc chạy:
```bash
npx vercel --prod
```

### Bước 3: Lấy Endpoint điền vào Frontend
Sau khi deploy xong, bạn sẽ có domain Vercel, ví dụ:
👉 `https://vietnamlogistic-ai-proxy.vercel.app/api/chat`

Mở file `.env` của Frontend (`logictic-customer/.env`):
```env
# Điền endpoint vừa nhận được
VITE_CODEX_ENDPOINT=https://vietnamlogistic-ai-proxy.vercel.app/api/chat

# Bỏ trống API Key ở FE (đã được server bảo mật)
VITE_CODEX_API_KEY=
VITE_CODEX_MODEL=google/gemini-2.5-flash
```

---

## ⚡ Cách 2: Deploy chung vào chính project `logictic-customer` hiện tại
File serverless function `api/chat.js` đã được tích hợp sẵn trong thư mục `logictic-customer/api/chat.js`!
Khi deploy `logictic-customer` lên Vercel, endpoint sẽ tự động khả dụng tại:
👉 `https://logictic.site/api/chat` (hoặc relative `/api/chat` trên FE)

Trên Vercel Project Settings của `vietnamlogictic`:
- Thêm biến môi trường: `CODEX_API_KEY` = `sk-or-v1-...`
- Cập nhật biến môi trường: `VITE_CODEX_ENDPOINT` = `/api/chat`
- Bỏ biến `VITE_CODEX_API_KEY` trên FE để không bị lộ.

---

## 💻 Cách 3: Chạy Local độc lập (Express Server)

```bash
cd ai-chat-proxy
npm install
cp .env.example .env
# Điền CODEX_API_KEY vào file .env
npm start
```

Server sẽ chạy tại `http://localhost:3001/api/chat`.
Trên Frontend `.env`:
```env
VITE_CODEX_ENDPOINT=http://localhost:3001/api/chat
VITE_CODEX_API_KEY=
```
