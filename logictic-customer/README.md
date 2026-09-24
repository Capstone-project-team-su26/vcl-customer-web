# Việt Nam Logictic — Giao diện khách hàng (`vcl-customer-ui`)

> **Đây là bản NỐI API TỪNG ĐỢT.** Đợt A (17/09/2026) đã dựng lại tầng HTTP (`axios` +
> `src/shared/api/httpClient.js`) và nối backend production cho **đăng nhập / hồ sơ và đơn ký gửi
> của khách** (dữ liệu form, tạo đơn, danh sách, chi tiết, huỷ). Các phần còn lại — báo giá, thanh
> toán, phiếu nhập kho, mua hộ, kho, chat, thông báo, trang giá công khai — **vẫn đọc dữ liệu mẫu**
> trong `src/mocks/`. Mọi module `api/` giữ nguyên 100% tên export, chữ ký hàm và hình dạng dữ
> liệu trả về, nên component không phải viết lại.
>
> Hệ quả thực tế: `npm install && npm run dev` gọi thẳng backend **production**
> (`https://vcl.henrytech.cloud`) nếu không có `.env`. Phải đăng nhập bằng **tài khoản khách thật**
> (role `Customer`); tài khoản nhân viên bị chặn. Hết phiên (401) là tự về `/login`.
>
> Danh sách module nào đã nối, module nào còn mock: mục [Trạng thái nối API](#trạng-thái-nối-api).

Ứng dụng web dành cho **khách hàng** của Việt Nam Logictic. Khách dùng nó để:

- **Mua hộ** — gửi yêu cầu mua hàng từ các website nước ngoài, nhận báo giá, xác nhận và thanh toán.
- **Ký gửi** — khai báo kiện hàng gửi về kho VCL, theo dõi báo giá và chi phí.
- **Vận chuyển quốc tế** — theo dõi nhập kho, lưu kho, thông quan, xuất kho và giao hàng cuối.

Ngoài phần đăng nhập còn có toàn bộ mặt tiền công khai: trang giới thiệu, bảng giá, chính sách,
hướng dẫn, blog, tra cứu đơn và khung chat CSKH.

### Điều hướng sau đăng nhập

Menu **8 mục phẳng**, không nhóm gập:

| Mục menu | URL | Nội dung |
| --- | --- | --- |
| Bảng điều khiển | `/customer/dashboard` | "Việc cần làm": 3 thẻ đếm (báo giá chờ xác nhận · khoản chờ trả · đơn chờ xác nhận đã nhận), bấm vào mở danh sách đã lọc sẵn |
| Tạo đơn | `/create-order/ky-gui`, `/create-order/mua-ho` | Một trang, đổi loại đơn ngay tại chỗ |
| Đơn ký gửi | `/orders/ky-gui` | Chip lọc giai đoạn + ô tìm mã đơn; mỗi dòng nêu rõ việc khách cần làm |
| Đơn mua hộ | `/orders/mua-ho` | Cùng component danh sách, khoá sẵn loại đơn |
| Thanh toán | `/payment/can-thanh-toan`, `/payment/lich-su` | Khoản đang chờ trả và lịch sử giao dịch |
| Trò chuyện với CSKH | `/customer-service-chat` | |
| Cấu hình tài khoản | `/settings/profile-config` | |
| Chính sách dịch vụ | `/settings/chinh-sach-dich-vu` | |

**Một đơn ký gửi = một trang, năm tab**: `/orders/:orderId/:tab` với `tab` ∈ `hanh-trinh` ·
`bao-gia` · `thanh-toan` · `kien-kho` · `su-co` (mặc định `hanh-trinh`). Toàn bộ URL của IA cũ
(`/processing-orders`, `/check-orders`, `/tracking`, `/consignments/:id`, `/quotations/:id`,
`/history/*`, `/transaction-history`, `/warehouse/*`…) đều chuyển hướng sang chỗ mới — bảng đầy đủ
ở [`ARCHITECTURE.md`](./ARCHITECTURE.md) mục 6.

Stack: **React 19 + Vite 8, JavaScript thuần** (không TypeScript), `react-router-dom` v7,
Ant Design + MUI, `axios` cho các module đã nối backend; phần chưa nối đọc `src/mocks/`.

---

## Bắt đầu nhanh

Cần Node.js đủ mới để chạy Vite 8 (Node 20 trở lên).

```bash
npm install
npm run dev               # server dev của Vite — gọi backend theo VITE_API_BASE_URL
```

**Base URL mặc định là production** (`https://vcl.henrytech.cloud`). Chạy dev không có `.env` là
đăng nhập, tạo đơn, huỷ đơn, **xác nhận báo giá và tạo khoản cọc trên dữ liệu thật**. Muốn trỏ môi
trường khác thì đặt `VITE_API_BASE_URL` trong `.env` (xem mục "Biến môi trường"). Phần chưa nối (mua
hộ, kho, chat, phiếu nhập kho…) vẫn lấy dữ liệu sẵn trong `src/mocks/data/`.

Các lệnh còn lại:

| Lệnh | Việc nó làm |
| --- | --- |
| `npm run dev` | Chạy dev server (HMR). |
| `npm run build` | Build production ra thư mục `dist/`. **`.env` cục bộ được nhúng vào bundle** — kiểm `VITE_API_BASE_URL` trước khi build để deploy. |
| `npm run preview` | Chạy thử bản `dist/` đã build. |
| `npm run lint` | ESLint toàn dự án (`dist/` và `tools/` được bỏ qua). |
| `npm run verify:mocks` | Kiểm hợp đồng export của mọi module `api/` và tầng mock (xem dưới). |
| `npm run verify:api` | Kiểm **offline** các module đã nối API thật (xem dưới). Không gọi mạng. |

`verify:mocks` (`tools/verify-mocks.mjs`, nhận thêm đường dẫn file hợp đồng khác làm tham số) nạp
thật từng module `api/` qua Vite và kiểm: đủ tên export theo `tools/api-contract.json`, đúng
có/không `export default`, và với module **còn mock** (kể cả bản sao `*.mock.js`) thì không có dấu
vết gọi mạng (`axios`, `fetch`, `httpClient`, `XMLHttpRequest`, `WebSocket`, `EventSource`…). Module
đã nối API thật mang cờ `"realApi": true` trong hợp đồng nên bỏ qua bước quét mạng. Sau đó chạy
I/O matrix trạng thái đơn / tiền cọc / hệ số thể tích trên bản mock. Hiện trạng: **24/24 module
đạt hợp đồng, 122 tên export được soát.**

`verify:api` (`tools/verify-api.mjs`) chặn `http`/`https`/`net`/`tls`/`fetch` của Node trước khi
nạp module, thay adapter axios bằng adapter giả trả response mẫu bám code backend, rồi chạy từng
dòng I/O matrix của spec tích hợp đợt A (đăng nhập, chặn tài khoản không phải khách, hết phiên,
401 nghiệp vụ, dữ liệu form, tạo đơn, upload, danh sách, lịch sử, chi tiết, huỷ, màn ngoài đợt A
vẫn dùng mock) và của đợt B (lấy báo giá, từ chối, xác nhận + cọc payOS / chuyển khoản tay, poll
trạng thái thanh toán, tỷ lệ cọc, lịch sử thanh toán, mua hộ vẫn trỏ mock). Hiện trạng: **50/50
kịch bản đạt, 0 request ra mạng.** Thoát mã 1 nếu có kịch bản FAIL hoặc có request lọt ra mạng.

Về `.env`: app **chạy được khi không có `.env`** (khi đó gọi production). `.env` và mọi `.env.*` đã
nằm trong `.gitignore`; chỉ `.env.example` được commit. Sau khi sửa `.env` phải khởi động lại
`npm run dev` — Vite chỉ đọc biến môi trường lúc khởi động.

Deploy dạng SPA: `vercel.json` rewrite mọi đường dẫn về `/index.html`, nếu không thì
truy cập thẳng vào một URL con (ví dụ `/orders/ky-gui`) sẽ ra 404 của hosting.

---

## Biến môi trường

Tất cả biến đọc được từ trình duyệt đều phải có tiền tố `VITE_`. **Mọi giá trị ở đây đều bị nhúng
vào bundle và ai cũng xem được** — không đặt bí mật thật vào đây.

Danh sách dưới đây là **toàn bộ** biến còn được đọc trong `src/`. Tự kiểm chứng bất cứ lúc nào:

```bash
grep -rn "import.meta.env" src/
```

Hiện lệnh đó cho ra đúng 8 dòng, thuộc 3 nhóm biến `VITE_CODEX_*`, `VITE_GOOGLE_CLIENT_ID` và
`VITE_API_BASE_URL`.

| Biến | Đọc ở đâu | Thiếu thì sao |
| --- | --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | `src/app/providers/AppProviders.jsx`, `src/features/auth/pages/Login/Login.jsx` | `AppProviders` rơi về chuỗi `"placeholder"`, và `Login.jsx` coi cả chuỗi rỗng lẫn `"placeholder"` là chưa cấu hình → **widget `<GoogleLogin>` thật bị thay bằng một nút dự phòng** mở modal dán tay `idToken`. Đăng nhập bằng email/mật khẩu vẫn chạy bình thường. |
| `VITE_CODEX_ENDPOINT` | `src/shared/config/aiConfig.js` | Không có giá trị mặc định (bằng `""`). Thiếu → `isAiConfigured()` trả `false`, `FloatingChat` báo "Trợ lý AI chưa được cấu hình". |
| `VITE_CODEX_API_KEY` | `src/shared/config/aiConfig.js` | Như trên. Đây là điều mong muốn — xem mục "Lưu ý" bên dưới. |
| `VITE_CODEX_MODEL` | `src/shared/config/aiConfig.js` | Rơi về `gpt-5.4-mini`. |
| `VITE_API_BASE_URL` | `src/shared/api/httpClient.js` (base URL của mọi lời gọi API thật, kể cả upload ảnh); `src/features/purchase/api/purchaseRequestApi.js` (`getSepayCheckoutPageUrl`), `src/features/consignment/pages/QuotationDetail/QuotationDetail.helpers.js` (`resolveSePayCheckoutUrl`) | `httpClient` rơi về **production `https://vcl.henrytech.cloud`** (dấu `/` cuối bị cắt). Hai chỗ SePay là nhánh dự phòng "API trả về đường dẫn checkout TƯƠNG ĐỐI" của luồng còn mock, và **vẫn rơi về `https://api-vcl.zushin.io.vn`** khi biến bỏ trống — sẽ xử lý khi nối thanh toán (đợt B). |

Ba biến `VITE_CODEX_*` phục vụ trợ lý AI trong khung chat nổi
(`src/features/marketing/components/FloatingChat/FloatingChat.jsx`). `FloatingChat.jsx` `fetch`
thẳng tới `AI_CONFIG.endpoint`, không đi qua backend VCL và không đi qua `httpClient`. Thiếu chúng
thì phần còn lại của ứng dụng vẫn chạy, chỉ mỗi khung chat AI báo chưa cấu hình.

### Hai biến không còn được đọc

| Biến | Trước đây đọc ở | Hiện trạng |
| --- | --- | --- |
| `VITE_API_ADDRESS_URL` | `src/shared/api/addressApi.js` | `addressApi.js` vẫn là mock, đọc `src/mocks/data/addresses.js` (16 tỉnh / 70 quận-huyện / 272 phường-xã) thay vì `fetch` sang `provinces.open-api.vn`. |
| `VITE_UPLOAD_API_BASE_URL` | `src/shared/api/uploadImage.js` | `uploadImage.js` đã nối API thật nhưng dùng chung base URL của `httpClient` (`createHttpClient`), không đọc biến riêng. |

---

## Cấu trúc thư mục

```
vcl-customer-ui/
├─ index.html                 Điểm vào HTML, nạp /src/main.jsx
├─ vite.config.js             Chỉ còn cấu hình alias import (proxy dev đã bỏ cùng tầng HTTP)
├─ jsconfig.json              Cùng bộ alias, để IDE nhảy định nghĩa được
├─ eslint.config.js           Bỏ qua dist/ và tools/
├─ vercel.json                Rewrite SPA về index.html
├─ public/                    File tĩnh phục vụ nguyên trạng (favicon.svg, icons.svg)
├─ tools/
│  ├─ migrate.mjs             Script một lần đã chuyển cây cũ sang cây này; không chạy khi phát triển
│  ├─ verify-mocks.mjs        Kiểm hợp đồng export + module còn mock không gọi mạng (npm run verify:mocks)
│  ├─ verify-api.mjs          Kiểm offline module đã nối API thật, chặn mọi request mạng (npm run verify:api)
│  └─ api-contract.json       Hợp đồng export của 26 module api/ (158 tên, cờ realApi) — đầu vào của verify-mocks
└─ src/
   ├─ main.jsx                Mount React, nạp @shared/styles/fonts.css
   ├─ app/                    Tầng "ứng dụng": chỉ lắp ráp, không chứa logic nghiệp vụ
   │  ├─ App.jsx              AppProviders bọc AppRouter
   │  ├─ providers/           Provider cấp app (Google OAuth, antd ConfigProvider, MUI Theme)
   │  ├─ router/              paths.js, publicRoutes.jsx, dashboardRoutes.jsx, redirects.jsx,
   │  │                       AppRouter.jsx
   │  └─ pages/               Trang thuộc về khung app, không thuộc feature nào (NotFound)
   ├─ features/               Mỗi thư mục con là một mảng nghiệp vụ (auth, orders, consignment,
   │                          purchase, …). `orders` là module điều hướng: tạo đơn, danh sách
   │                          đơn và trang chi tiết đơn chia tab
   ├─ layouts/                Khung dùng chung: MainLayout, Sidebar, SiteHeader, HomeFooter,
   │                          HeroCarousel, NotificationPanel
   ├─ mocks/                  Dữ liệu mẫu cho phần chưa nối backend (xem src/mocks/README.md)
   │  ├─ mockUtils.js         delay/paginate/deepClone/nextId/stableUuid/makeOrderCode…
   │  └─ data/                14 file fixture (consignments, purchaseRequests, catalog, …)
   ├─ shared/                 Dùng được ở mọi nơi, không gắn với nghiệp vụ cụ thể
   │  ├─ api/                 httpClient.js (axios instance + interceptor token / 401 / giờ server),
   │  │                       uploadImage + restrictedItemApi (API thật; bản sao *.mock.js cho màn
   │  │                       ngoài đợt A), addressApi (mock), requestCancel.js (thay axios.isCancel)
   │  ├─ components/          AuthNotify, BackToHomeButton, FieldLabelTooltip, LogisticsLoading
   │  ├─ config/              aiConfig.js
   │  ├─ constants/           homeData.js
   │  ├─ hooks/               usePendingQuotationCounts.js
   │  ├─ styles/              fonts.css (đang dùng) + legacy/ (KHÔNG được import — xem "Lưu ý")
   │  └─ utils/               timeUtc.js (chuẩn hóa thời gian UTC giữa API và trình duyệt)
   └─ assets/                 Ảnh/logo được import trực tiếp từ code
```

**`src/shared/api/httpClient.js` đã được dựng lại** (đợt A). Module `api/` nào còn mock thì comment
"API THẬT: axiosInstance…" trong đó vẫn là **hướng dẫn nối**, không phải mô tả hiện trạng — xem
mục [Trạng thái nối API](#trạng-thái-nối-api).

Quy ước bên trong: **một component = một thư mục**, chứa `Component.jsx` và `Component.css`
nằm cạnh nhau. File JSX import CSS của chính nó bằng `./Component.css`.

Chi tiết luồng import, giải phẫu một feature và bảng route: xem [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Thêm một trang mới

Đúng bốn bước, theo thứ tự:

**1. Tạo thư mục trang và hai file.**

```
src/features/<feature>/pages/TenTrang/
   TenTrang.jsx
   TenTrang.css
```

Trong `TenTrang.jsx` import CSS cùng thư mục bằng đường dẫn tương đối:

```jsx
import "./TenTrang.css";

export default function TenTrang() { … }
```

**2. Khai báo URL trong `src/app/router/paths.js`.**

Không viết chuỗi URL thẳng vào `<Link>` hay `navigate()`. Thêm khóa vào `PUBLIC_ROUTES`
(trang công khai) hoặc `DASHBOARD_ROUTES` (trang sau đăng nhập):

```js
tenTrang: "/ten-trang",

// Route có tham số thì viết dạng hàm, mặc định trả về đúng pattern của router:
tenTrangDetail: (orderId = ":orderId") => `/ten-trang/${orderId}`,
```

Khai báo dạng hàm là lý do một chỗ vừa dùng được cho `<Route path={D.tenTrangDetail()} />`
vừa dùng được cho `navigate(ROUTES.tenTrangDetail(order.id))`.

**3. Gắn `<Route>` vào file route tương ứng.**

- Trang công khai → `src/app/router/publicRoutes.jsx`
- Trang sau đăng nhập (có sidebar + header) → `src/app/router/dashboardRoutes.jsx`

```jsx
import TenTrang from "@features/<feature>/pages/TenTrang/TenTrang";

<Route path={P.tenTrang} element={<TenTrang />} />
```

Thêm import vào **đúng nhóm** đã có sẵn và **không xáo trộn thứ tự import cũ** — thứ tự đó
quyết định thứ tự nạp CSS (xem "Lưu ý").

**4. Export trang qua barrel của feature.**

`src/features/<feature>/index.js`:

```js
export { default as TenTrang } from "./pages/TenTrang/TenTrang";
```

Barrel là cửa duy nhất để module khác dùng lại trang này. **Cả 22 feature đều đã có `index.js`**
(`ls src/features/*/index.js`), nên bước này không bao giờ được bỏ. Nếu bạn tạo feature hoàn toàn
mới thì viết barrel theo mẫu của `src/features/auth/index.js`.

Từ nơi khác, import qua barrel chứ không trỏ sâu vào trong module:

```jsx
import { TenTrang } from "@features/<feature>";
```

---

## Alias import

Cấu hình ở **hai chỗ** và phải luôn giống nhau: `vite.config.js` (để build chạy) và
`jsconfig.json` (để IDE nhảy định nghĩa, autocomplete). Sửa một chỗ nhớ sửa chỗ kia.

| Alias | Trỏ tới | Dùng cho |
| --- | --- | --- |
| `@app/*` | `src/app/*` | App shell, router, provider |
| `@features/*` | `src/features/*` | Module nghiệp vụ |
| `@layouts/*` | `src/layouts/*` | Khung layout dùng chung |
| `@shared/*` | `src/shared/*` | Tiện ích, hook, component, API dùng chung |
| `@assets/*` | `src/assets/*` | Ảnh, logo |
| `@/*` | `src/*` | Lối thoát cuối, hạn chế dùng |

**Quy tắc: không dùng `../../..`, luôn dùng alias.** Ngoại lệ duy nhất là file cùng thư mục —
`./Component.css`, `./Component` — vì chúng di chuyển cùng nhau nên đường dẫn tương đối
không bao giờ gãy.

```jsx
// Đúng
import Sidebar from "@layouts/Sidebar/Sidebar";
import { AI_CONFIG } from "@shared/config/aiConfig";
import "./Home.css";

// Sai
import Sidebar from "../../../layouts/Sidebar/Sidebar";
```

---

## Trạng thái nối API

Việc nối backend đi **theo từng đợt**, mỗi đợt thay thân hàm của một nhóm module `api/`. Hướng dẫn
ghép API phía backend: `vcl-BE/huong-dan-ghep-api/api-ky-gui-1.md`. Khi guide lệch code backend
thì ghép theo **code backend**.

### Nguyên tắc bao trùm

**Hợp đồng nằm ở tầng `api/`, không nằm ở component.** Component chỉ biết: gọi một hàm tên như
vậy, với tham số theo thứ tự như vậy, nhận về dữ liệu hình dạng như vậy. Mock đang giữ đúng ba
điều đó; API thật cũng phải giữ đúng ba điều đó. Được phép thay **thân hàm**, không được đổi tên
export, thứ tự tham số, hay hình dạng dữ liệu trả về.

Điểm dễ sai nhất: **các hàm `api/` trả về phần thân đã bóc envelope** (tương đương `response.data`
của axios, nhiều chỗ còn bóc thêm lớp `{ message, data }`), **không phải object response của
axios**. Lỗi HTTP thì ném **nguyên dạng axios** để component đọc `error.response.data.message` /
`title` / `errors`.

### Đợt C (18/09/2026) — xuất kho → hàng về Việt Nam (phía khách): ĐÃ NỐI

Tài liệu: `vcl-migration/huong-dan-ghep-api/api-xuat-kho.md` (J, K, L) và `api-hang-ve-viet-nam.md`
(B–H). Từ đợt gộp IA, các màn này không còn URL riêng: danh sách theo dõi nhập vào **Đơn ký gửi**
`/orders/ky-gui`, còn mọi việc của khách sau khi hàng tới kho nằm trong năm tab của
`/orders/:orderId` (`hanh-trinh` · `bao-gia` · `thanh-toan` · `kien-kho` · `su-co`).

| Module | API thật |
| --- | --- |
| `features/tracking/api/orderTrackingApi.js` | `GET /api/orders/consignments/tracking` (`stage`, `search`, `includeFinished`), `GET /{orderId}/tracking`, `PUT /{orderId}/export-hold` |
| `features/tracking/api/publicParcelTrackingApi.js` | `GET /api/public/parcels/tracking?code=` (tra cứu công khai `/order-lookup`) |
| `shared/api/attachmentApi.js` | `POST /api/attachments` (multipart; khách: `ORDER`+`PERMIT`, `INCIDENT`+`INCIDENT_PHOTO`), `GET /api/attachments`, tải Blob `/{id}/download` kèm token |
| `features/delivery/api/destinationHandlingApi.js` | `GET\|PUT /api/orders/consignments/{id}/destination-handling` |
| `features/delivery/api/deliveryRequestApi.js` | `POST /api/delivery-requests`, `GET /api/delivery-requests/{id}` |
| `features/delivery/api/deliveryTrackingApi.js` | `GET /api/orders/{id}/delivery-tracking`, `PUT /api/orders/consignments/{id}/customer-confirm` |
| `features/settlement/api/settlementApi.js` | `GET /api/orders/awaiting-settlement`, `GET /api/orders/{id}/settlement-preview` |
| `features/incidents/api/parcelIncidentApi.js` | `GET /api/parcel-incidents?orderId=`, `GET /{id}`, `POST /{id}/customer-response`, `POST /api/orders/consignments/{id}/complaints` |
| `features/payment/api/orderPaymentApi.js` | thêm `GET /api/orders/{id}/storage-fee`; `findPayablePayment` chọn khoản `FINAL_PAYMENT` / `STORAGE_FEE` / `REDELIVERY_FEE` đang chờ trả; `resolveCheckoutUrl` ghép base URL cho link SePay tương đối |
| `features/consignment/api/consignmentApi.js` | `getStorageFeeEstimateApi` → `GET /api/storage-fee/estimate` |

Đã xoá (thừa theo nghiệp vụ mới — khách không tự lập phiếu xuất kho, không xem tồn kho kho nguồn):
`warehouse/api/inventoryApi.js`, `warehouse/api/warehouseReleaseApi.js`, các màn `/warehouse/storage`,
`/warehouse/export`, `/warehouse/inventory/:shipmentId`, `/warehouse/consignment-detail/:id`,
`/warehouse/delivery/:orderId`, `/warehouse/receipts*`, `/receive-goods` (dựng trên
`GET /api/delivery-requests` chỉ dành cho nhân viên), `receivingNoteApi.mock.js` và fixture
`inventories`, `warehouseReleases`, `deliveryRequests`, `deliveryTracking`, `parcelTracking`,
`receivingNotes`, `payments`. Đợt gộp IA xoá nốt phần còn lại của feature `warehouse`
(`/warehouse/checkin`, `/warehouse/inventory`, `/warehouse/customs`, `/warehouse/purchase-detail/:id`):
khách không vận hành kho, thông tin kiện/kho của đơn nằm ở tab `kien-kho`.

### Đợt A (17/09/2026) — đăng nhập và đơn ký gửi: ĐÃ NỐI

| Module | Hàm gọi API thật | Còn mock trong cùng file |
| --- | --- | --- |
| `features/auth/api/authService.js` | cả 9 hàm: `POST /api/Auth/login`, `/google`, `/customer/register`, `/customer/verify-otp`, `/customer/resend-otp`, `/forgot-password`, `/reset-password`; `GET\|PUT /api/customer/profile` | — |
| `features/consignment/api/consignmentApi.js` | routes, shipping-options, product-types, validate-items, tạo đơn, danh sách, chi tiết, huỷ, sổ địa chỉ | `updateConsignmentStatusApi` (báo giá đã nối ở đợt B, phí lưu kho ở đợt C) |
| `features/consignment/api/consignmentStatusApi.js` | `GET /api/orders/consignments/statuses` | — |
| `features/pricing/api/pricingRuleService.js` | `getPricingRules` (`?orderType=CONSIGNMENT`, kéo theo `getVolumetricDivisorRule`), `getPackageConfigurations`, `suggestPackageConfiguration` | `getServicePricings`, `getServicePricingById`, `getAdditionalServiceFees` (`getDepositRate` đã nối ở đợt B) |
| `shared/api/uploadImage.js` | `POST /api/uploads/images` (field `files`; chặn trước khi gửi: chỉ JPG/PNG/WEBP, mỗi ảnh ≤ 5MB, ≤ 10 ảnh) | — |
| `shared/api/restrictedItemApi.js` | `GET /api/restricted-items` (chưa có token thì trả `[]`, không gọi) | — |

Những điểm ghép theo backend cần nhớ:

- **Chỉ tài khoản role `Customer` đăng nhập được.** Backend cấp token cho mọi role; `loginApi` /
  `googleLoginApi` ném lỗi 403 "Tài khoản này không dùng được cho ứng dụng khách hàng." nên
  `Login.jsx` không lưu token. Lỗi mạng / timeout ở mọi hàm auth mang câu "Không kết nối được máy
  chủ. Vui lòng thử lại." thay vì rơi về "sai mật khẩu".
- **Tạo đơn luôn đóng thùng gỗ:** `buildCreateConsignmentRequest` ép `requiresWoodenCrate: true` và
  chặn (trước khi gọi mạng) dòng nào thiếu `packageConfigurationId`. `productType` gửi đi là `id`
  loại hàng của `/api/product-types`; `route` gửi nguyên tên hiển thị backend trả.
- **Danh sách đơn chỉ gửi tham số backend nhận:** `pageNumber`, `pageSize`, `status`, `searchCode`
  (lấy từ `search` / `keyword` / `q`) và luôn `orderType=CONSIGNMENT`. `searchCode` chỉ khớp mã
  `VCL-`; backend chưa lọc được theo ngày hay tên. Vì vậy trang Lịch sử ký gửi khoá ô lọc ngày và ô
  tìm kiếm ghi "Tìm theo mã VCL-...".
- **Chi tiết đơn** chỉ nhận GUID: id khác (ví dụ mã `VCL-`) báo 404 "Không tìm thấy đơn ký gửi."
  ngay tại chỗ.
- **Huỷ đơn** luôn gửi body: `{ cancelReason }`, hoặc `{}` khi không có lý do.
- **Nhãn trạng thái:** mã chuẩn (khoá của `ORDER_STATUS_LABELS`) dùng nhãn trong
  `consignment/constants/orderStatus.js` và sắp theo `ORDER_STATUS_ORDER`; mã lạ giữ nhãn backend,
  xếp cuối.

### Đợt B (18/09/2026) — báo giá và tiền cọc đơn ký gửi: ĐÃ NỐI

Bám `vcl-BE/huong-dan-ghep-api/api-ky-gui-1.md` bước 4–5 và code `QuotationController`,
`ConsignmentPaymentService`, `OrderPaymentController`, `AdditionalServiceFeeController`.

| Module | Hàm gọi API thật | Còn mock trong cùng file |
| --- | --- | --- |
| `features/consignment/api/consignmentApi.js` | `getOrderQuotationApi` → `GET /api/orders/{orderId}/quotation`; `rejectConsignmentQuotationApi` → `PUT /api/quotations/{id}/reject`; `confirmAndPayConsignmentQuotationApi` → `PUT /api/quotations/{id}/confirm-and-pay`; `getConsignmentPaymentStatusApi` → `GET /api/payments/status/{orderCode}` | `getStorageFeeEstimateApi`, `updateConsignmentStatusApi` |
| `features/payment/api/orderPaymentApi.js` | `GET /api/orders/{orderId}/payments` và `/payments/history` (hai hàm `*ListApi` rút mảng từ kết quả) | — |
| `features/pricing/api/pricingRuleService.js` | `getDepositRate` → `GET /api/additional-service-fees?activeOnly=true`, lọc `feeCode = DEPOSIT_RATE` | `getServicePricings`, `getServicePricingById`, `getAdditionalServiceFees` |
| `features/payment/utils/consignmentPaymentReturn.js` (mới) | không gọi API: lưu / đọc khoản cọc đang chờ trong `sessionStorage` (`vcl_pending_consignment_payment`), đọc query payOS, vòng poll trạng thái | — |

Những điểm ghép theo backend cần nhớ:

- **Chỉ `canCustomerAccept === true` mới hiện nút "Xác nhận & thanh toán".** Báo giá `DRAFT` là bản
  tạm tính, chỉ để xem — endpoint `PUT /api/quotations/{id}/accept` đã bị gỡ khỏi backend nên FE
  không gọi. Nút "Từ chối" chỉ hiện với báo giá `PENDING` (backend chỉ nhận từ chối ở trạng thái
  này) và bắt buộc có lý do.
- **Khách chỉ chọn payOS hoặc chuyển khoản tay (`OFFLINE`).** SePay bị ẩn vì production chưa cấu
  hình khoá webhook SePay. Mọi `paymentMethod` khác `OFFLINE`/`SEPAY` đều được backend coi là payOS.
- **Số tiền cọc luôn lấy từ response `confirm-and-pay`** (`amount`, `depositRate`,
  `totalBillAmount`) hoặc từ lịch sử thanh toán — FE không tự nhân tổng báo giá với tỷ lệ cọc.
  Trước khi xác nhận, hộp thoại chỉ hiện con số **tạm tính** từ `getDepositRate` (thiếu cấu hình thì
  50%, giống `ConsignmentPaymentService.DefaultDepositRate`).
- **payOS bỏ qua `returnUrl` / `cancelUrl`**: backend luôn trả khách về
  `https://logictic.site/history/consignment` (hoặc `http://localhost:5173/...` khi `returnUrl` chứa
  `localhost`/`5173`/`3000`), kèm query `?code=&id=&cancel=&status=&orderCode=`. FE vẫn gửi hai URL
  này (`${window.location.origin}/history/consignment`) để backend chọn đúng domain.
- **Chờ tiền là việc của webhook.** FE không gọi API nào để đổi trạng thái đơn: sau khi khách quay
  về, trang Lịch sử ký gửi poll `GET /api/payments/status/{orderCode}` mỗi 4 giây, tối đa 2 phút;
  `PAID` → báo thành công và tải lại danh sách, 404 → dừng, hết giờ → "Đang chờ xác nhận thanh
  toán". Query payOS được gỡ khỏi URL ngay sau khi xử lý.
- **`OFFLINE`**: `checkoutUrl = null`, `paymentStatus = PENDING_RECONCILIATION`; màn báo giá hiện số
  tiền, nội dung chuyển khoản chứa mã `VCL-` và nhắc chờ Admin xác nhận. Tỷ lệ cọc 0% thì
  `amount = 0`, `orderCode = 0`, `paymentStatus = PAID` ngay.
- **Trạng thái thanh toán**: lịch sử thanh toán chuẩn hoá `PENDING | SUCCESS | FAILED | CANCELED`,
  mã khác giữ nguyên — `PENDING_RECONCILIATION` ("Chờ đối soát") và `RECEIVED_UNALLOCATED` ("Đã
  nhận, chưa phân bổ") có nhãn riêng. Nút "Tiếp tục thanh toán" chỉ hiện với khoản `PENDING` còn
  `checkoutUrl`.
- **401/403 nghiệp vụ**: màn báo giá chỉ báo "hết phiên" khi 401 có body rỗng (httpClient đã dọn
  phiên và chuyển `/login`); 401/403 có `{ message }` thì hiện message. Đơn chưa có báo giá (404)
  hiện màn "Chưa có báo giá", không phải màn lỗi.
- **Luồng mua hộ giữ nguyên mock**: `QuotationPaymentConfirmDialog` dùng chung có prop mặc định
  (`paymentMethodOptions`, `defaultMethod`, `loadDepositRate` = `pricingRuleService.mock`); màn ký
  gửi truyền tuỳ chọn payOS / chuyển khoản và tỷ lệ cọc thật.

### `httpClient.js` — một chỗ duy nhất cho quy tắc HTTP

`src/shared/api/httpClient.js`:

- `baseURL` = `VITE_API_BASE_URL` (cắt `/` cuối), mặc định `https://vcl.henrytech.cloud`; timeout
  30 giây. `createHttpClient(config)` tạo instance riêng mà vẫn cùng interceptor (upload dùng
  timeout 120 giây).
- Request: gắn `Authorization: Bearer <accessToken>`, đọc `sessionStorage` trước rồi
  `localStorage`. URL `/api/Auth/*` **không** gắn.
- Response thành công: đồng bộ lệch giờ bằng header `date` (`syncServerClock`, header RFC 1123 được
  đổi sang `Date` trước).
- Response lỗi: lỗi huỷ ném lại, không log. **Chỉ 401 có body rỗng** (JWT bị từ chối) mới là hết
  phiên: dọn phiên y như nút Đăng xuất của Sidebar (`sessionStorage.clear()`, xoá `accessToken` +
  `user` ở `localStorage`) rồi `window.location.replace("/login")` nếu chưa ở trang đó. 401 có
  `{ message }` là lỗi nghiệp vụ (ví dụ không phải chủ đơn): chỉ ném lỗi.
- Export `isCanceledRequest`. File không đụng `window` / storage ở top-level để `tools/` nạp được
  qua Vite SSR.

### Màn ngoài đợt A dùng bản sao `*.mock.js`

Một hàm dùng chung (ví dụ `getConsignmentsApi`, `getPricingRules`, `uploadImages`) mà nối API thật
thì mọi màn gọi nó cũng gọi backend — kể cả màn chưa tới đợt, gây trộn dữ liệu thật và dữ liệu mẫu.
Nên bốn module có bản sao nguyên văn bản mock trước khi nối:

| Bản sao | Màn đang import |
| --- | --- |
| `features/consignment/api/consignmentApi.mock.js` | `FloatingChat`, chat CSKH (`CustomerServiceChat.constants`), mua hộ (`ConsignmentBuyOrder`, `PurchaseRequestDetail`) |
| `features/pricing/api/pricingRuleService.mock.js` | mua hộ (`PackageOptionalServicesS1`, và mặc định của `QuotationPaymentConfirmDialog`), `FloatingChat`, trang giá công khai (`InternationalShippingPricing`, `ConsignmentPricing`, `PricingCalculator`, `QuotationPage`, `ConsignmentService`) |
| `shared/api/uploadImage.mock.js` | mua hộ (`ConsignmentBuyOrder.helpers`), chat CSKH (`CustomerServiceChat`) |
| `shared/api/restrictedItemApi.mock.js` | `FloatingChat` |

Quy ước: import thẳng đường dẫn `…/api/<module>.mock` — **không re-export bản mock qua barrel**,
và màn ngoài đợt không lấy hàm API qua barrel `@features/consignment` / `@features/pricing` (barrel
trỏ bản thật). Tới đợt của màn nào thì đổi import của màn đó về file thật; khi không còn ai import
một bản sao thì xoá nó cùng mục tương ứng trong `tools/api-contract.json`.

### Nối các module còn lại

Danh sách đầy đủ nằm trong `tools/api-contract.json`. Với mỗi hàm:

1. Import `httpClient` (hoặc `createHttpClient`) từ `@shared/api/httpClient`. Chỉ bỏ import
   `@/mocks/…` khi không còn hàm nào trong file dùng tới.
2. Thay khối `await delay(...)` + đọc fixture bằng đúng lời gọi ghi ở comment `/* API THẬT: … */`
   ngay phía trên (đối chiếu lại code backend — comment có thể đã cũ), rồi trả phần thân đã bóc
   envelope về đúng shape mock đang trả.
3. **Giữ nguyên phần logic thuần**: chuẩn hóa payload (`buildCreateConsignmentRequest`,
   `validateConsignmentItemsApi`…), normalize option địa chỉ (`normalizeAddressOption`), lớp chống
   lệch envelope (`findArrayFromResult`), validate mã vận đơn trong `publicParcelTrackingApi.js`.
4. Nếu hàm dùng chung với màn chưa tới đợt: đổi import của màn đó sang bản sao `*.mock.js` trước.
5. Gắn `"realApi": true` cho file trong `tools/api-contract.json` (bỏ khỏi quét mạng của
   `verify:mocks`) và thêm kịch bản offline vào `tools/verify-api.mjs`.

Vài trường hợp cần đọc kỹ comment đầu file trước khi sửa:

| File | Điểm riêng |
| --- | --- |
| `src/shared/api/addressApi.js` | Không gọi backend của mình mà gọi API tỉnh/huyện/xã bên ngoài. Cần dựng lại `requestJson()` trỏ vào `VITE_API_ADDRESS_URL` (mặc định `https://provinces.open-api.vn/api/v1`) và map lại 7 endpoint `"/p/"`, `"/p/{code}?depth="`, `"/d/{code}?depth="`, `"/w/{code}"`, `"/p/search/"`, `"/d/search/"`, `"/w/search/"`. |
| `src/features/purchase/api/purchaseRequestApi.js` | Endpoint SePay trả **HTML thô**, không phải JSON (`responseType: "text"`). Nhánh dựng URL checkout tương đối vẫn rơi về `https://api-vcl.zushin.io.vn` (bản ký gửi đã đổi sang `API_BASE_URL`). |
| `src/features/chat/api/conversationApi.js` | Cùng một cái bẫy: nơi gọi làm `result?.data ?? result`, nên object trả về không được mang khóa `data` ở cấp cao nhất. |

**Không xoá `src/mocks/`** cho tới khi không còn module nào đọc nó:

```bash
grep -rn "@/mocks" src/ | grep -v "^src/mocks/"     # phải không còn kết quả nào mới được xoá
```

### `src/shared/api/requestCancel.js`

File này ra đời để thay `axios.isCancel`. Bốn file vẫn viết `axios.isCancel(err)` nhưng import từ
`@shared/api/requestCancel` (default export có hình dạng `{ isCancel }`):

```
src/features/consignment/pages/ConsignmentListDetail/ConsignmentListDetail.jsx
src/features/consignment/pages/QuotationDetail/QuotationDetail.helpers.js
src/features/history/pages/ConsignmentHistoryList/ConsignmentHistoryList.jsx
src/features/payment/pages/OrderPaymentHistory/OrderPaymentHistory.jsx
```

**Giữ nguyên file**: `isCancel` của nó nhận diện cả cờ `__CANCEL__` / `CanceledError` của axios lẫn
`AbortError` của `fetch`, nên vẫn đúng với API thật; `httpClient` cũng dùng chính hàm này.

---

## Lưu ý

Những điều dưới đây trông giống lỗi hoặc giống thứ nên dọn, nhưng **cố ý để nguyên**. Đọc trước
khi "sửa".

### 1. `src/shared/styles/legacy/` cố ý không được import

Thư mục chứa `index-legacy.css` và `app-legacy.css`, sao chép nguyên văn từ `src/index.css` và
`src/App.css` của dự án gốc. Ở dự án gốc **không file nào import chúng** — chúng đã chết từ đó.

Chúng khai báo selector toàn cục (`:root`, `body`, `*`). Import chúng bây giờ sẽ đổi font và màu
của **toàn bộ** ứng dụng. Giữ lại chỉ để tra cứu giá trị cũ. Muốn dùng thì phải chủ động đọc, đối
chiếu từng khai báo rồi mới nối vào — còn không thì xóa hẳn. Đừng import "cho chắc".

Font đang dùng thật sự là `src/shared/styles/fonts.css` (nạp ở `src/main.jsx`), cộng với
`fontFamily` đặt trong `AppProviders.jsx` cho MUI và Ant Design.

### 2. Route được import tĩnh (eager), không `lazy()` — cố ý

`publicRoutes.jsx` và `dashboardRoutes.jsx` import thẳng mọi trang ở đầu file, không dùng
`React.lazy` + `Suspense`.

Lý do: khoảng **30 file CSS trong `src/` khai báo selector toàn cục** (`:root`, `body`, `html`,
`*`) — 27 trong số đó là stylesheet của trang. Cascade của CSS phụ thuộc vào thứ tự nạp, mà thứ tự
nạp lại phụ thuộc vào thứ tự import trong bundle. Tách code-splitting sẽ đổi thứ tự đó và
**đổi giao diện** một cách khó lần ra.

Kiểm chứng nhanh:

```bash
# 30 file CSS khai báo selector toàn cục…
grep -rlE "^\s*(:root|body|html|\*)\s*[,{]" --include="*.css" src | wc -l
# …27 trong số đó là stylesheet của trang
grep -rlE "^\s*(:root|body|html|\*)\s*[,{]" --include="*.css" src | grep -c "/pages/"
```

Muốn bật lazy loading thì phải dọn CSS toàn cục trước, không phải đổi cách import trước.

### 3. `CommitmentsSection` và `ServiceStrip` là code chết, đường dẫn import đã được sửa

`src/features/marketing/components/CommitmentsSection/` và
`src/features/marketing/components/ServiceStrip/` **không được trang nào render**
(`grep -rn "ServiceStrip" src/` chỉ ra chính nó).

Ở dự án gốc cả hai import `homeData` qua `"../../../pages/HomePage/data/homeData"` — một đường dẫn
**không tồn tại** (file thật nằm ở `src/utils/data/homeData.js`). Vì không ai import hai component
này nên bundler không bao giờ chạm tới và lỗi không lộ ra.

Khi chuyển sang cây mới, import được trỏ lại về `@shared/constants/homeData` để cây build được.
Đây là thay đổi duy nhất so với bản gốc ở hai file đó — mở
`CommitmentsSection/CommitmentsSection.jsx` và `ServiceStrip/ServiceStrip.jsx` sẽ thấy ngay dòng
import ở đầu file. Giao diện không đổi vì không nơi nào render chúng.

### 4. `Home.jsx` render `AIAutomationSection` hai lần — lỗi được giữ nguyên

Trong `src/features/marketing/pages/Home/Home.jsx`:

```jsx
import CommitmentsSection from "@features/marketing/components/AIAutomationSection/AIAutomationSection";
…
import AIAutomationSection from "@features/marketing/components/AIAutomationSection/AIAutomationSection";
```

Biến tên là `CommitmentsSection` nhưng trỏ vào module `AIAutomationSection`. Kết quả: trang chủ
render `AIAutomationSection` **hai lần** (dòng 371 và 374), còn `CommitmentsSection` thật thì
không bao giờ xuất hiện.

Bản gốc cũng đúng y như vậy. Lỗi được giữ **nguyên văn** để giao diện khớp bản gốc từng pixel.
Sửa nó là đổi trang chủ — chỉ làm khi có yêu cầu rõ ràng, và phải sửa cả hai file cùng lúc.

### 5. API key AI: literal đã gỡ, nhưng key cũ vẫn cần được thu hồi

Bản gốc nhúng thẳng một API key thật vào `src/shared/config/aiConfig.js`, và
`FloatingChat.jsx` lặp lại **đúng chuỗi đó** lần thứ hai làm fallback.

Hiện tại **cả hai literal đã bị gỡ**. `aiConfig.js` chỉ còn đọc từ biến môi trường:

```js
export const AI_CONFIG = {
  endpoint: import.meta.env.VITE_CODEX_ENDPOINT || "",
  apiKey: import.meta.env.VITE_CODEX_API_KEY || "",
  …
};

export const isAiConfigured = () =>
  Boolean(AI_CONFIG.endpoint && AI_CONFIG.apiKey);
```

`FloatingChat.jsx` kiểm tra trước khi gọi và ném lỗi rõ ràng ("Thiếu `VITE_CODEX_ENDPOINT` hoặc
`VITE_CODEX_API_KEY`") thay vì im lặng dùng key nhúng sẵn. Kiểm chứng bằng
`grep -rn "sk-[A-Za-z0-9]\{20,\}" src/` — hiện không còn kết quả nào.

**Việc còn lại chưa làm được từ trong repo: thu hồi và xoay (rotate) key cũ ở phía nhà cung cấp.**
Key đó đã nằm trong mã nguồn và trong các bản build đã phát hành, nên phải coi là đã lộ, kể cả sau
khi xóa khỏi source. Xóa dòng code không thu hồi được một cái key.

Đừng đặt lại giá trị mặc định vào `aiConfig.js`, kể cả để "chạy tạm" — mọi biến `VITE_*` đều bị
nhúng vào bundle và người dùng cuối đọc được. Về lâu dài, một khóa thật sự bí mật thì không nên
nằm ở frontend chút nào: nên chuyển lời gọi Codex qua backend proxy để trình duyệt không bao giờ
nhìn thấy khóa.

### 6. Không có route guard — kiểm soát truy cập nằm ở `httpClient`

Cây này **không có route guard nào** (không có `<ProtectedRoute>`). Mở thẳng `/customer/dashboard`
khi chưa đăng nhập thì các lời gọi API thật trả 401 body rỗng và interceptor của `httpClient` dọn
phiên rồi đưa về `/login`. Đó là chỗ duy nhất chặn truy cập; đừng thêm nhánh "rơi về tài khoản
demo" vào các module đã nối.

`loginApi` / `googleLoginApi` gọi backend thật và **chỉ nhận role `Customer`**. Các màn còn mock
(mua hộ, kho, chat…) vẫn mutate fixture trong bộ nhớ nên thay đổi ở đó **mất sau khi F5**; dữ liệu
đơn ký gửi, hồ sơ và sổ địa chỉ thì ghi thật vào backend.
