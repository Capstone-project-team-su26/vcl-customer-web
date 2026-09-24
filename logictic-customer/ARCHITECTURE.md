# Kiến trúc `vcl-customer-ui`

Tài liệu này mô tả **cây thư mục thật sự đang có** và các quy tắc giữ cho nó không rối. Phần
"bắt đầu chạy dự án" nằm ở [`README.md`](./README.md).

---

## 1. Phân tầng và chiều import

Năm tầng, import chỉ được chảy **một chiều, từ trên xuống**:

```
        app/                (App.jsx, providers/, router/)
          │
          ▼
      features/             (auth, orders, consignment, purchase, …)
       ├─ pages/, components/   ← chỉ tầng này là giao diện
       └─ api/                  ← RANH GIỚI DỮ LIỆU
          │
          ▼
   layouts/   shared/       (khung dùng chung)   (api — gồm httpClient.js, hooks, utils, components)
          │
          ▼
       mocks/               (mockUtils.js + data/*.js — dữ liệu mẫu cho phần chưa nối backend)
```

Cụ thể:

| Quy tắc | Nghĩa là |
| --- | --- |
| `app` → `features` | Router biết mọi trang. Đây là tầng duy nhất được phép biết hết. |
| `features` → `layouts`, `shared` | Trang dùng lại header, footer, hàm API dùng chung, hook chung. |
| `shared` **không bao giờ** import `features` | `shared` phải xóa được một feature mà vẫn build. Nếu một hàm trong `shared` cần biết về nghiệp vụ ký gửi thì nó không thuộc về `shared`. |
| `features` → `features` **chỉ qua barrel** | Viết `@features/purchase`, không viết `@features/purchase/api/purchaseRequestApi`. |
| **Chỉ module `api/` được import `@/mocks/*` hoặc `@shared/api/httpClient`** | `pages/`, `components/`, `layouts/`, `hooks/` **không bao giờ** import thẳng từ `src/mocks/` hay gọi `httpClient` — chúng luôn đi qua hàm `api/` của feature. Bản sao `api/*.mock.js` cũng là module `api/`. Xem mục 5. |
| Trong cùng thư mục dùng `./Name` | Ngoài ra luôn dùng alias. Không `../../..` |

### Vì sao "chỉ qua barrel"

Barrel là `src/features/<tên>/index.js`. Nó là hợp đồng công khai của module: những gì export ra
đó là thứ module khác được dùng, phần còn lại là nội bộ và được tự do sắp xếp lại. Khi mọi import
đi qua barrel, đổi cấu trúc bên trong một feature chỉ phải sửa đúng một file.

```js
// Đúng
import { PurchaseRequestPendingList } from "@features/purchase";

// Sai — bám vào đường dẫn nội bộ của module khác
import PurchaseRequestPendingList from "@features/purchase/pages/PurchaseRequestPendingList/PurchaseRequestPendingList";
```

### Trạng thái thật hiện nay (những chỗ đang lệch chuẩn)

Cây này vừa được chuyển từ dự án gốc sang, nên quy tắc trên là **đích đến**, chưa phải hiện trạng.
Hai nhóm lệch đang tồn tại — code mới không được thêm vào danh sách này:

1. **Barrel đã có đủ, nhưng chưa ai import qua nó.** Cả 22 feature đều đã có `index.js`
   (`ls src/features/*/index.js | wc -l` → 22), trong khi **mọi** import chéo feature vẫn đang là
   đường dẫn sâu. Tự kiểm chứng:

   ```bash
   # Import chéo feature đang có, xếp theo tần suất
   grep -rhoE 'from "@features/[^"]+"' src | sort | uniq -c | sort -rn

   # Import đi qua barrel — hiện chưa có dòng nào
   grep -rhoE 'from "@features/[a-z-]+"' src | sort | uniq -c
   ```

   Nhiều nhất là `@features/consignment/api/consignmentApi` (trước đợt A là 19 chỗ; nay 8 chỗ trỏ
   bản thật và 10 chỗ trỏ bản sao `consignmentApi.mock` — ngoại lệ có chủ đích, xem mục 5),
   `@features/purchase/api/purchaseRequestApi` (17) và
   `@features/orders/constants/orderPaths` (bảng đường dẫn, cố ý import sâu để không kéo theo
   trang của module orders). Đây là việc dọn dần:
   mỗi lần chạm vào một file, đổi import của nó sang barrel. **Code mới thì bắt buộc dùng barrel
   ngay.**

2. **`shared` đang import ngược vào `features`** — đúng một chỗ:
   `src/shared/hooks/usePendingQuotationCounts.js` gọi `@features/consignment/api/consignmentApi`
   và `@features/purchase/api/purchaseRequestApi` để đếm số kiện chờ báo giá cho badge trên
   Sidebar. Đây là vi phạm rõ ràng của quy tắc "shared không biết features". Chỗ đúng của hook này
   là một feature (hoặc tách phần gọi API ra và truyền dữ liệu vào hook).

`src/layouts/` cũng gọi API của feature (`Sidebar.jsx` → `@features/auth/api/authService`,
`NotificationPanel.jsx` → `@features/notifications/api/notificationApi`). Cái này chấp nhận được:
layout nằm dưới `features` trong sơ đồ nhưng thực chất là khung ứng dụng, nó phải hiển thị tên
người dùng và chuông thông báo thật.

---

## 2. Các thư mục cấp cao

### `src/app/` — tầng lắp ráp

Không chứa logic nghiệp vụ. Chỉ nối các mảnh lại với nhau.

| Đường dẫn | Vai trò |
| --- | --- |
| `App.jsx` | `<AppProviders><AppRouter /></AppProviders>`. Hết. |
| `providers/AppProviders.jsx` | Gom mọi provider cấp app: `GoogleOAuthProvider`, antd `ConfigProvider`, MUI `ThemeProvider`. Font dùng chung (`"Times New Roman", Times, serif`) khai báo một lần ở đây cho cả antd lẫn MUI. |
| `router/paths.js` | Nguồn sự thật duy nhất cho mọi URL. |
| `router/publicRoutes.jsx` | Các `<Route>` công khai. |
| `router/dashboardRoutes.jsx` | Các `<Route>` sau đăng nhập. |
| `router/AppRouter.jsx` | `BrowserRouter` + ghép hai nhóm route lại. |
| `pages/NotFound/` | Trang 404 — thuộc về khung ứng dụng, không thuộc feature nào. |

### `src/features/` — nghiệp vụ

22 module, mỗi module là một mảng nghiệp vụ khép kín. Xem bảng route ở mục 6.

### `src/layouts/` — khung dùng chung

`MainLayout` (khung cho trang sau đăng nhập), `Sidebar`, `SiteHeader`, `HomeFooter`,
`HeroCarousel`, `NotificationPanel`. Đây là những mảnh xuất hiện ở nhiều trang và không thuộc về
riêng nghiệp vụ nào.

### `src/shared/` — dùng chung, phi nghiệp vụ

| Thư mục | Nội dung |
| --- | --- |
| `api/` | `httpClient.js` — axios instance dùng chung (base URL, token, quy tắc 401, đồng bộ giờ server; mục 5). `uploadImage.js`, `restrictedItemApi.js` — **đã nối API thật** (đợt A), kèm bản sao `uploadImage.mock.js`, `restrictedItemApi.mock.js` cho màn ngoài đợt A. `addressApi.js` (tỉnh/huyện/xã) — vẫn **mock**. `requestCancel.js`: hàm nhận diện lỗi hủy request, thay chỗ `axios.isCancel`, `httpClient` dùng lại. |
| `components/` | `AuthNotify`, `BackToHomeButton`, `FieldLabelTooltip`, `LogisticsLoading` |
| `config/` | `aiConfig.js` |
| `constants/` | `homeData.js` (nội dung tĩnh của trang chủ) |
| `hooks/` | `usePendingQuotationCounts.js` |
| `styles/` | `fonts.css` (đang dùng) và `legacy/` (cố ý không import — xem README) |
| `utils/` | `timeUtc.js` — chuẩn hóa mốc thời gian API trả về, kể cả khi thiếu hậu tố `Z` |

### `src/mocks/` — tầng dữ liệu mẫu

`mockUtils.js` + `data/` (14 file fixture). Dữ liệu cho các module `api/` chưa nối backend và
cho bản sao `*.mock.js`. Chi tiết ở mục 5 và
trong [`src/mocks/README.md`](./src/mocks/README.md).

### `src/assets/`

Ảnh và logo được `import` trực tiếp từ code (Vite băm tên file, thêm hash). File nào cần giữ
nguyên tên và truy cập bằng URL cố định thì để ở `public/` chứ không phải ở đây.

### `tools/`

| File | Vai trò |
| --- | --- |
| `migrate.mjs` | Script một lần đã dùng để chuyển cây cũ (`logictic-customer`) sang cây này và viết lại toàn bộ đường dẫn import. Giữ lại làm hồ sơ cho biết file nào đến từ đâu. **Không chạy nó nữa** — nó ghi đè file theo bảng ánh xạ cứng. |
| `verify-mocks.mjs` | Kiểm hợp đồng export của mọi module `api/` và kiểm module còn mock không gọi mạng. Chạy `npm run verify:mocks` (hoặc `node tools/verify-mocks.mjs <contract.json>`). Nạp thật từng module qua Vite nên alias `@/` hoạt động; thoát mã 1 nếu lệch. |
| `verify-api.mjs` | Kiểm **offline** các module đã nối API thật: chặn `http`/`https`/`net`/`tls`/`fetch`, thay adapter axios bằng adapter giả, chạy từng dòng I/O matrix của spec tích hợp đợt A. Chạy `npm run verify:api`; thoát mã 1 nếu có kịch bản FAIL hoặc request lọt ra mạng. |
| `api-contract.json` | Hợp đồng: với mỗi trong 23 module `api/` (gồm 4 bản sao `*.mock.js`), ghi danh sách tên export (tổng 106), có `export default` hay không, và cờ `realApi` cho module đã nối backend. |

ESLint đã bỏ qua thư mục `tools/`.

---

## 3. Giải phẫu một feature module

```
src/features/<tên>/
├─ index.js        Barrel — hợp đồng công khai của module
├─ api/            Ranh giới dữ liệu. Gọi httpClient (đã nối) hoặc đọc @/mocks/data
│                  (chưa nối); hợp đồng (tên export + shape trả về) như nhau — mục 5
├─ components/     Mảnh UI chỉ dùng trong module này
├─ pages/          Component gắn trực tiếp vào một <Route>
└─ constants/      Dữ liệu tĩnh của module
```

Không module nào có đủ cả bốn thư mục và **đó là bình thường** — chỉ tạo thư mục khi thực sự có
nội dung. Ví dụ thực tế trong cây:

- `blog`, `guides`, `policies` — chỉ có `pages/` (trang nội dung tĩnh).
- `notifications` — chỉ có `api/`, không có trang nào; layout gọi vào.
- `delivery`, `incidents`, `receiving`, `settlement`, `tracking` — có `api/` và `components/`,
  các khối của chúng được lắp vào tab của `/orders/:orderId` chứ không sở hữu route dashboard.
- `orders` — module điều hướng: `constants/orderPaths.js` (bảng URL cấp feature) và ba trang
  `CreateOrder`, `OrderList`, `OrderDetail`. Không sở hữu nghiệp vụ nào, chỉ bố cục và điều hướng.
- `warehouse` — **đã xoá** (khách không vận hành kho).

Quy ước file bên trong `pages/` và `components/`: **một thư mục cho một component**, chứa
`Component.jsx` và `Component.css` nằm cạnh nhau, JSX import CSS bằng `./Component.css`. CSS đi
theo component nên khi xóa component là xóa luôn style của nó, không để lại rác.

---

## 4. Routing được nối như thế nào

```
paths.js  ──►  publicRoutes.jsx  ──┐
   │                               ├──►  AppRouter.jsx  ──►  BrowserRouter
   └──────►  dashboardRoutes.jsx ──┘                            │
                                                                ▼
                                        <Route element={<MainLayout />}>
                                              MainLayout  ──►  <Outlet />
```

**Bước 1 — `src/app/router/paths.js`.** Khai báo mọi URL, không nơi nào khác. Hai object:
`PUBLIC_ROUTES` (khách chưa đăng nhập) và `DASHBOARD_ROUTES` (khách đã đăng nhập), gộp lại thành
`ROUTES` để component import một chỗ.

Route tĩnh là chuỗi. Route có tham số là **hàm với giá trị mặc định là chính pattern**:

```js
orderDetail: (orderId = ":orderId", tab = DEFAULT_ORDER_DETAIL_TAB) =>
  `/orders/${orderId}/${tab}`,
```

Nhờ vậy một khai báo phục vụ được cả hai phía: `<Route path={D.orderDetail(":orderId", ":tab")} />`
khi định nghĩa route, và `navigate(ROUTES.orderDetail(order.id, ORDER_DETAIL_TABS.quotation))` khi
điều hướng. Đổi URL ở `paths.js` là đổi cả hai cùng lúc.

Ngoài `PUBLIC_ROUTES` / `DASHBOARD_ROUTES` còn `LEGACY_DASHBOARD_ROUTES`: bảng URL của IA cũ, chỉ
dùng để khai báo route chuyển hướng. **Không thêm mục mới vào bảng đó.**

**Bước 2 — hai file route.** Mỗi file export một React fragment chứa các `<Route>`, import trang
bằng alias `@features/...` và lấy URL từ `paths.js` (đặt bí danh `P` cho public, `D` cho
dashboard).

Trang được import **tĩnh, không dùng `React.lazy`** — cố ý, vì cascade CSS phụ thuộc thứ tự
bundle. Chi tiết ở mục "Lưu ý" trong README. Hệ quả thực tế: **đừng sắp xếp lại các dòng import
trong hai file này.** Thêm mới thì thêm vào cuối nhóm đã có.

**Bước 3 — `AppRouter.jsx`.**

```jsx
<BrowserRouter>
  <Routes>
    {publicRoutes}                                   {/* phẳng, không layout */}
    <Route element={<MainLayout />}>{dashboardRoutes}</Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
</BrowserRouter>
```

Khác biệt duy nhất giữa hai nhóm là **có bị bọc trong `MainLayout` hay không**. Route công khai
tự dựng layout riêng (nhiều trang tự import `SiteHeader` + `HomeFooter`).

**Bước 4 — `MainLayout`.** Dựng `<Sidebar />` bên trái, một `<header>` chung ở trên, rồi render
`<Outlet />` bên trong `div.page-sub-content`. Header không nhận props: nó tự đọc
`useLocation().pathname` rồi tra bảng `PAGE_META` (khớp bằng `pathname.includes(match)`) để ra tiêu
đề và mô tả. Nghĩa là **thêm route dashboard mới mà quên thêm mục vào `PAGE_META` thì header sẽ
hiện tiêu đề mặc định "HỆ THỐNG VIETNAM LOGISTICS"** — không lỗi, chỉ sai chữ. `PAGE_META` được
duyệt theo thứ tự và lấy mục khớp đầu tiên, nên đường dẫn cụ thể (`/orders/mua-ho`) phải đứng
**trước** đường dẫn bao hàm nó (`/orders/`).

**Không có route guard.** Không có `<ProtectedRoute>` nào trong cây. Việc chặn xảy ra ở tầng HTTP:
API thật trả 401 body rỗng (JWT bị từ chối) thì interceptor của `httpClient` dọn phiên như nút
Đăng xuất của Sidebar rồi đưa về `/login`. 401 có `{ message }` là lỗi nghiệp vụ, chỉ báo lỗi.
`loginApi` / `googleLoginApi` chỉ nhận tài khoản role `Customer`.

---

## 5. Tầng dữ liệu — API thật (`httpClient`) và mock (`src/mocks/`)

Backend được nối **theo từng đợt**. Đợt A (17/09/2026) đã dựng lại `axios` +
`src/shared/api/httpClient.js` và nối đăng nhập / hồ sơ và đơn ký gửi của khách; phần còn lại vẫn
đọc `src/mocks/`. Đã nối: đăng nhập + đơn ký gửi (đợt A), báo giá + tiền cọc ký gửi (đợt B). Bảng
module nào đã nối: mục "Trạng thái nối API" trong [`README.md`](./README.md).

```
component (pages/, components/, layouts/)
        │  gọi hàm, KHÔNG biết dữ liệu từ đâu ra
        ▼
   api/ của feature          ← RANH GIỚI. 24 module (gồm 4 bản sao *.mock.js), 122 tên export.
        │
        ├─ đã nối  ──►  @shared/api/httpClient  ──►  backend (VITE_API_BASE_URL)
        │
        └─ còn mock ─►  src/mocks/  ──►  mockUtils.js  (delay, paginate, deepClone, …)
                                     └►  data/*.js     (14 file fixture)
```

Điểm mấu chốt: **mọi module `api/` giữ nguyên 100% tên export, thứ tự tham số và hình dạng dữ liệu
trả về**, dù thân hàm gọi backend hay đọc fixture. Hàm đã nối bóc envelope `{ message, data }` về
đúng shape mock từng trả, và ném lỗi nguyên dạng axios (`error.response.data`). Đổi tên export hay
đổi shape trả về của một hàm `api/` là làm hỏng component.

### `httpClient.js` — quy tắc HTTP ở một chỗ

- `baseURL` = `VITE_API_BASE_URL` (cắt `/` cuối), mặc định production `https://vcl.henrytech.cloud`;
  timeout 30 giây. `createHttpClient(config)` tạo instance riêng cùng interceptor (upload ảnh dùng
  timeout 120 giây).
- Request interceptor: `Authorization: Bearer <accessToken>` (đọc `sessionStorage` trước rồi
  `localStorage`); URL `/api/Auth/*` không gắn.
- Response thành công: `syncServerClock()` theo header `date` (đổi RFC 1123 sang `Date` trước).
- Response lỗi: lỗi huỷ ném lại không log; **401 body rỗng** → `sessionStorage.clear()`, xoá
  `accessToken` + `user` ở `localStorage`, phát sự kiện `storage`, `location.replace("/login")` nếu
  chưa ở đó. 401 có `{ message }` chỉ ném lỗi.
- Không đụng `window` / storage ở top-level (để `tools/` nạp qua Vite SSR).

### Bản sao `*.mock.js` cho màn ngoài đợt

Nối API thật một hàm dùng chung là mọi màn gọi hàm đó cũng gọi backend. Để màn chưa tới đợt (mua
hộ, kho của khách, Nhận hàng, chat, trang giá công khai) không trộn dữ liệu thật với dữ liệu mẫu,
bốn module có bản sao nguyên văn bản mock, và các màn đó import thẳng bản sao:
`consignment/api/consignmentApi.mock.js`, `pricing/api/pricingRuleService.mock.js`,
`shared/api/uploadImage.mock.js`, `shared/api/restrictedItemApi.mock.js`.

- Bản sao **không** được re-export qua barrel; màn ngoài đợt cũng không lấy hàm API qua barrel
  `@features/consignment` / `@features/pricing` (barrel trỏ bản thật). Đây là ngoại lệ có chủ đích
  của quy tắc "chỉ qua barrel" ở mục 1.
- Tới đợt của màn nào thì đổi import về file thật; bản sao hết người dùng thì xoá cùng mục của nó
  trong `tools/api-contract.json`.
- `tools/verify-api.mjs` kiểm import của các màn này và kiểm bản sao không gọi mạng.

### `mockUtils.js` — tiện ích dùng chung

Không chứa dữ liệu, chỉ chứa hành vi mà component đang trông đợi ở một lời gọi mạng.

| Nhóm | Hàm | Việc nó làm |
| --- | --- | --- |
| Độ trễ & hủy | `delay(ms?, signalOrOptions?)` | Chờ một nhịp (mặc định **220ms** — đủ để spinner kịp render một nhịp) rồi resolve; reject ngay nếu `AbortSignal` đã abort. Nhận cả `AbortSignal` trần lẫn `{ signal }` vì component truyền theo cả hai kiểu. |
| | `createCanceledError(message?)` | Ném lỗi đúng "chữ ký" axios: `name = "CanceledError"`, `code = "ERR_CANCELED"`. Thiếu một trong hai là mỗi lần rời trang giữa chừng lại bắn một toast đỏ vô cớ. |
| | `isCanceledError(error)` | Nhận diện `ERR_CANCELED` / `CanceledError` / `AbortError`. |
| Phân trang | `paginate(rows, { page \| pageNumber, size \| pageSize })` | Cắt trang theo quy ước **1-based** của backend cũ. Trả về đồng thời tên rút gọn (`items`, `total`, `page`, `size`, `totalPages`) **và** alias đúng tên field của API (`totalCount`, `pageNumber`, `pageSize`), vì một số nơi đọc theo tên API. |
| Bản sao | `deepClone(value)` | Fixture là singleton dùng chung cả phiên, nên mọi thứ trả ra ngoài đều phải là bản sao sâu — component mutate thoải mái cũng không làm hỏng fixture gốc. |
| Sinh mã | `nextId(prefix?)` | ID tăng dần trong phiên (`mock-0001`). |
| | `newUuid()` | GUID ngẫu nhiên cho bản ghi vừa tạo. |
| | `stableUuid(seed)` | **GUID tất định từ chuỗi seed.** Đây là cách các file fixture khác nhau tham chiếu chung một bản ghi mà không phải chép tay GUID: `stableUuid("consignment-order-01")` ở mọi module đều bằng nhau. |
| | `makeOrderCode(prefix, createdAt?, suffix?)` | Mã đơn đúng format backend: `VCL-20260712105447-295805`. |
| Thời gian | `nowIso()`, `isoDaysAgo(days?, hours?)` | ISO UTC. Fixture tĩnh nên viết ngày cứng; `isoDaysAgo` dành cho dữ liệu cần "tươi" theo lúc chạy (ví dụ chuông thông báo). |
| Tìm kiếm | `normalizeText(v)`, `normalizeStatus(v)`, `matchesKeyword(row, keyword, fields)` | Bỏ dấu + lowercase (đúng cách các trang danh sách chuẩn hóa từ khóa), và chuẩn hóa mã trạng thái về `UPPER_SNAKE`. |

Ngoài named export, file còn có một `export default` gom tất cả.

### `data/` — 14 file fixture

Số bản ghi dưới đây đếm trực tiếp từ file (nạp module rồi đo độ dài mảng), không phải ước lượng.

| File | Nội dung |
| --- | --- |
| `addresses.js` | Địa giới hành chính: **16 tỉnh/thành, 70 quận/huyện, 272 phường/xã**. Giữ nguyên shape **thô** kiểu `provinces.open-api.vn` (`snake_case`: `division_type`, `phone_code`, `province_code`, `district_code`) vì `addressApi` normalize từ shape đó. |
| `catalog.js` | Danh mục tra cứu dùng chung: **6 tuyến hàng, 4 phương án vận chuyển, 14 loại sản phẩm, 22 trạng thái ký gửi, 12 bảng giá dịch vụ, 15 quy tắc tính phí, 7 cấu hình thùng, 12 phụ phí, 18 mặt hàng cấm/hạn chế.** Ba nhóm mock (pricing / consignment / purchase) cùng đọc file này để báo giá trên đơn không lệch bảng giá trên màn hình dịch vụ. |
| `consignments.js` | **25 đơn ký gửi**, trải 16 trạng thái từ `PENDING_REVIEW` tới `COMPLETED` / `CANCELLED` / `REJECTED`. Là nguồn liên tính năng: warehouse, history, payment, receiving, delivery và settlement đều đọc lại từ đây. |
| `purchaseRequests.js` | **20 yêu cầu mua hộ**, kèm báo giá và danh sách sản phẩm. |
| `conversations.js` | **14 hội thoại CSKH / 58 tin nhắn.** |
| `deliveryRequests.js` | **18 phiếu giao hàng** chặng cuối. |
| `deliveryTracking.js` | **18 bản ghi tiến trình giao + 4 phiếu hoàn.** Không khai lại phiếu giao — lấy từ `deliveryRequests.js`, chỉ bổ sung trạng thái từng kiện, phí lưu kho và mốc khách xác nhận. |
| `inventories.js` | **20 kiện tồn kho + 20 bản chi tiết kiện.** |
| `warehouseReleases.js` | **16 phiếu xuất kho (WRO).** |
| `receivingNotes.js` | **12 phiếu tiếp nhận kho.** Chỉ dựng cho đơn đã thanh toán trở đi, để màn hình còn diễn được nhánh "chưa có phiếu". |
| `parcelTracking.js` | **18 bản ghi tra cứu vận đơn công khai.** |
| `payments.js` | **25 hồ sơ thanh toán**, một cho mỗi đơn ký gửi. |
| `notifications.js` | **22 thông báo, 9 chưa đọc.** |
| `users.js` | **16 tài khoản khách hàng.** `users[0]` là khách demo chính (`PRIMARY_USER`), cũng chính là `MOCK_CUSTOMER` của `consignments.js`. |

**Các file fixture nối với nhau bằng `stableUuid` chứ không bằng GUID chép tay.** Ví dụ phiếu giao,
tiến trình giao, thông báo và hồ sơ thanh toán đều dựng `orderId` từ đúng seed
`"consignment-order-XX"` / `"purchase-request-XX"` mà `consignments.js` / `purchaseRequests.js`
đang dùng. Sửa seed một bên mà quên bên kia là màn chi tiết rơi về nhánh fallback. Cùng lý do đó,
danh tính khách hàng chỉ có **một**: `MOCK_CUSTOMER` — nhiều trang lọc dữ liệu theo hồ sơ đang đăng
nhập, lệch một trường là danh sách rỗng.

Mỗi file fixture mở đầu bằng một khối comment liệt kê **đúng những field mà component thực sự đọc**
và các bẫy về shape. Đọc khối đó trước khi sửa dữ liệu.

### Module `api/` — ranh giới để cắm API thật

19 module gốc, chia đều giữa `src/features/*/api/` và `src/shared/api/` (cột "Fixture" là fixture
mà bản mock đọc; module **đã nối** chỉ còn đọc fixture cho các hàm chưa nối, bản sao `*.mock.js` của
nó đọc đúng fixture ghi trong bảng):

| Module `api/` | Fixture nó đọc |
| --- | --- |
| `features/auth/api/authService.js` | **đã nối** — không đọc fixture (`users` giờ chỉ còn phục vụ mock khác) |
| `features/chat/api/conversationApi.js` | `conversations` |
| `features/consignment/api/consignmentApi.js` | **đã nối** (trừ báo giá, phí lưu kho, đổi trạng thái) — `consignments`, `catalog`; bản sao `consignmentApi.mock.js` |
| `features/consignment/api/consignmentStatusApi.js` | **đã nối** — không đọc fixture |
| `features/consignment/api/aiOrderIntentApi.js` | `catalog`, `consignments`, `purchaseRequests` |
| `features/delivery/api/deliveryRequestApi.js` | **đã nối** (đợt C) — POST /api/delivery-requests, GET /{id} |
| `features/delivery/api/deliveryTrackingApi.js` | **đã nối** (đợt C) — delivery-tracking, customer-confirm |
| `features/delivery/api/destinationHandlingApi.js` | **đã nối** (đợt C) — destination-handling từng kiện |
| `features/incidents/api/parcelIncidentApi.js` | **đã nối** (đợt C) — sự cố, khiếu nại |
| `features/notifications/api/notificationApi.js` | `notifications` |
| `features/payment/api/orderPaymentApi.js` | `payments` |
| `features/pricing/api/pricingRuleService.js` | **đã nối** `getPricingRules`, `getPackageConfigurations`, `suggestPackageConfiguration`; phần còn lại đọc `catalog`; bản sao `pricingRuleService.mock.js` |
| `features/purchase/api/purchaseRequestApi.js` | `purchaseRequests`, `consignments`, `catalog` |
| `features/receiving/api/receivingNoteApi.js` | `receivingNotes` |
| `features/settlement/api/settlementApi.js` | **đã nối** (đợt C) — awaiting-settlement, settlement-preview |
| `features/tracking/api/publicParcelTrackingApi.js` | **đã nối** (đợt C) — GET /api/public/parcels/tracking |
| `features/tracking/api/orderTrackingApi.js` | **đã nối** (đợt C) — tracking danh sách/chi tiết, export-hold |
| `shared/api/attachmentApi.js` | **đã nối** (đợt C) — upload/danh sách/tải Blob giấy tờ |
| ~~`features/warehouse/api/inventoryApi.js`, `warehouseReleaseApi.js`~~ | **đã xoá** — khách không tự lập phiếu xuất / xem tồn kho kho nguồn theo nghiệp vụ mới |
| `shared/api/addressApi.js` | `addresses` |
| `shared/api/restrictedItemApi.js` | **đã nối**; bản sao `restrictedItemApi.mock.js` đọc `catalog` |
| `shared/api/uploadImage.js` | **đã nối**; bản sao `uploadImage.mock.js` đọc `catalog`, `consignments`, `purchaseRequests` |

Mỗi file còn mock mở đầu bằng khối comment **"CẮM API THẬT TRỞ LẠI"** ghi rõ endpoint cũ và những gì được
giữ nguyên; trong thân hàm, comment `/* API THẬT: axiosInstance.get(...) */` đứng ngay trên khối
đọc fixture. Nghĩa là hướng dẫn nối lại backend nằm **trong chính code**, không nằm rải rác ở tài
liệu. Các bước đầy đủ: xem mục "Trạng thái nối API" trong [`README.md`](./README.md).

Hai thứ trong `api/` **không** phải mock và không cần đụng tới khi cắm API thật: phần chuẩn hóa /
validate payload (thuần logic, ví dụ `buildCreateConsignmentRequest`, `normalizeAddressOption`,
`findArrayFromResult`) và các lớp chống lệch envelope.

### Quy tắc: component không bao giờ import thẳng `src/mocks/`

`pages/`, `components/`, `layouts/`, `hooks/` **luôn đi qua hàm `api/` của feature** (bản thật
hoặc bản sao `*.mock.js`). Lý do rất
thực tế: khoảnh khắc một component `import { consignments } from "@/mocks/data/consignments"` là
component đó không cắm lại API thật được nữa — nó bám vào fixture chứ không bám vào hợp đồng.
Xóa `src/mocks/` sẽ làm nó gãy, còn tầng `api/` thì vẫn thay được thân hàm mà không ai hay.

Tự kiểm chứng:

```bash
# Mọi kết quả PHẢI nằm trong một thư mục api/ (hoặc trong chính src/mocks/)
grep -rn "@/mocks" src/ | grep -v "^src/mocks/" | grep -v "/api/"
```

Hiện lệnh này không ra dòng nào.

### `verify-mocks.mjs` và `verify-api.mjs` — kiểm bằng máy

```bash
npm run verify:mocks
npm run verify:api
```

`verify-mocks.mjs` nạp thật từng module qua Vite (nên alias `@/` hoạt động) và kiểm: đủ tên export
theo `tools/api-contract.json`, đúng có/không `export default`, và với module **không** mang cờ
`realApi` (module còn mock, kể cả bản sao `*.mock.js`) thì phần **code thật** (đã bóc comment và
chuỗi) không có dấu vết `axios` / `fetch` / `httpClient` / `XMLHttpRequest` / `sendBeacon` /
`WebSocket` / `EventSource`. Sau đó soát trạng thái đơn ký gửi trong mock (19 mã đích) và chạy
**I/O matrix** của story 1 (spec-consignment-flow): nhãn/chuẩn hoá mã đơn, tiền cọc từ
`getDepositRate` và hệ số thể tích từ `getVolumetricDivisorRule` (cả nhánh thiếu rule) — các ca giá
chạy trên `pricingRuleService.mock.js` (bản thật đã nối API ở đợt B). Hiện trạng: **24/24 module đạt
hợp đồng, 122 tên export được soát.**

`verify-api.mjs` kiểm hành vi HTTP của module đã nối mà **không gọi mạng**: chặn
`http`/`https`/`net`/`tls`/`fetch` trước khi nạp module, nạp qua Vite SSR với `envDir` rỗng,
thay adapter axios bằng adapter giả, rồi chạy từng dòng I/O matrix của spec tích hợp đợt A (đăng
nhập, tài khoản không phải khách, hết phiên, 401 nghiệp vụ, dữ liệu form, tạo đơn, upload, danh
sách, lịch sử ký gửi — render SSR trang thật, chi tiết, huỷ, màn ngoài đợt A) và của đợt B (báo giá
+ `canCustomerAccept`, từ chối, xác nhận và tạo cọc payOS / chuyển khoản tay, poll
`GET /api/payments/status/{orderCode}`, tỷ lệ cọc `DEPOSIT_RATE`, lịch sử thanh toán, mua hộ vẫn trỏ
bản mock): **50/50 kịch bản, 0 request ra mạng.** Cả hai thoát mã 1 nếu lệch, nên cắm được vào CI.

### `requestCancel.js` — thay chỗ `axios.isCancel`

Sáu màn hình dùng `axios.isCancel(err)` để phân biệt "người dùng rời trang nên request bị hủy" với
"lỗi thật cần báo đỏ". Bản UI-only từng gỡ axios nên logic đó được giữ qua file này, nếu không mỗi lần hủy
request là một toast lỗi hiện lên vô cớ.

Cách giữ mà không sửa thân hàm: `src/shared/api/requestCancel.js` có `export default` hình dạng
`{ isCancel }`, nên sáu file chỉ đổi **đúng một dòng import**:

```js
import axios from "@shared/api/requestCancel";   // thay cho: import axios from "axios";
```

Sáu file đó: `ConsignmentList.jsx`, `ConsignmentListCheck.helpers.js`, `ConsignmentListDetail.jsx`,
`QuotationDetail.helpers.js`, `ConsignmentHistoryList.jsx`, `OrderPaymentHistory.jsx`.

`isCancel` ở đây nhận diện cả ba dạng: cờ `__CANCEL__` / `CanceledError` của axios, `AbortError`
của `fetch`/`AbortController`, và `CanceledError` do `mockUtils` ném ra. `httpClient` dùng lại chính
hàm này (`isCanceledRequest`), nên sáu file không cần đổi import.

### Lời gọi mạng ngoài `httpClient`

`src/features/marketing/components/FloatingChat/FloatingChat.jsx` `fetch` thẳng tới
`AI_CONFIG.endpoint` (trợ lý AI trong khung chat nổi). Nó không đi qua backend của mình, cũng
không đi qua `httpClient` hay tầng mock. Thiếu `VITE_CODEX_ENDPOINT` /
`VITE_CODEX_API_KEY` thì khung chat báo chưa cấu hình; phần còn lại của ứng dụng không bị ảnh
hưởng.

### Hệ quả cần biết

- **Thay đổi ở phần còn mock mất sau khi F5** (đánh dấu đã đọc thông báo, tạo yêu cầu mua hộ…) vì
  chỉ mutate mảng fixture trong bộ nhớ. Đăng nhập, hồ sơ, sổ địa chỉ và đơn ký gửi thì ghi thật vào
  backend.
- **Đồng bộ đồng hồ server chỉ chạy khi có response thật.** `httpClient` gọi `syncServerClock()`
  sau mỗi response thành công; trang chỉ dùng mock thì `getSyncedNowUtcIso()` /
  `getSyncedNowDate()` vẫn theo đồng hồ trình duyệt cho tới lần gọi API thật đầu tiên.
- **`vite.config.js` chỉ còn cấu hình alias, không có proxy dev.** `httpClient` gọi thẳng base URL
  tuyệt đối (kể cả upload ảnh), nên backend phải cho phép CORS từ origin của app (backend hiện
  `SetIsOriginAllowed(_ => true)`).

---

## 6. Feature nào sở hữu route nào

Bảng dưới đây suy ra từ `src/app/router/paths.js` cùng `publicRoutes.jsx` và `dashboardRoutes.jsx`.

### Route công khai (không có `MainLayout`)

| Feature | Route |
| --- | --- |
| `marketing` | `/` (LogisticsIntro), `/home`, `/about-us`, `/contact-us`, `/quotation-page` |
| `auth` | `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/otp-forgot` |
| `services` | `/consignment-service`, `/buy-for-me-service` |
| `pricing` | `/buy-for-me-pricing`, `/consignment-pricing`, `/pricing-calculator`, `/service-fees-pricing`, `/international-shipping-pricing` |
| `policies` | `/general-rules-policy`, `/shipping-policy`, `/payment-policy`, `/cancellation-refund-policy`, `/cargo-insurance-policy`, `/liability-disclaimer-policy`, `/privacy-policy`, `/ordering-policy` |
| `guides` | `/buy-for-me-guide`, `/consignment-guide`, `/create-order-guide`, `/payment-guide`, `/order-tracking-guide`, `/complaint-guide` |
| `blog` | `/logistics-news-blog`, `/international-shopping-experience-blog`, `/import-guide-blog`, `/shipping-knowledge-blog`, `/offers-announcements-blog` |
| `tracking` | `/order-lookup` (tra cứu công khai, API thật) |

Lưu ý: `/` render `LogisticsIntro`, còn trang chủ đầy đủ nằm ở `/home`.

### Route dashboard (bọc trong `MainLayout`)

Menu chỉ còn **8 mục phẳng**, không nhóm gập: Bảng điều khiển · Tạo đơn · Đơn ký gửi ·
Đơn mua hộ · Thanh toán · Trò chuyện với CSKH · Cấu hình tài khoản · Chính sách dịch vụ.

| Feature | Route |
| --- | --- |
| `dashboard` | `/customer/dashboard` — "việc cần làm": 3 thẻ đếm (báo giá chờ xác nhận · khoản chờ trả · đơn chờ xác nhận đã nhận), bấm vào mở danh sách đã lọc sẵn |
| `orders` | `/create-order/:tab` (một trang, chuyển đổi `ky-gui` / `mua-ho`), `/orders/ky-gui`, `/orders/mua-ho` (cùng một component `OrderList`, khoá sẵn loại đơn), `/orders/:orderId/:tab` (chi tiết đơn ký gửi, 5 tab) |
| `consignment` | không sở hữu route: `ConsignmentOrder` nhúng trong `/create-order/ky-gui`; `QuotationDetail` là tab `bao-gia`; `ConsignmentListDetail` là tab `kien-kho` |
| `purchase` | `/orders/mua-ho/:requestId`, `/orders/mua-ho/:requestId/bao-gia`; `ConsignmentBuyOrder` nhúng trong `/create-order/mua-ho` |
| `payment` | `/payment/:tab` — `can-thanh-toan` (nội dung từ `settlement`) và `lich-su` (nội dung từ `history`); `OrderPaymentHistory` là tab `thanh-toan` của một đơn |
| `chat` | `/customer-service-chat` |
| `profile` | `/settings/profile-config` |
| `service-policy` | `/settings/chinh-sach-dich-vu` |

`*` (404) do `src/app/pages/NotFound/` xử lý, không thuộc feature nào.

### Feature không sở hữu route nào

`settlement`, `history`, `tracking`, `delivery`, `incidents`, `receiving` và `notifications` chỉ
cung cấp trang/khối được lắp vào các tab ở trên. Đừng đi tìm route của chúng.

### Năm tab của `/orders/:orderId`

| Tab | Nội dung lắp từ |
| --- | --- |
| `hanh-trinh` | `TrackingStageBar` + `ExportHoldCard` + `OrderDeliveryCard` + `DeliveryTrackingCard` + `TrackingJourney` + `OrderTimelineCard` |
| `bao-gia` | `QuotationDetail` (prop `embedded`) — còn chờ khách duyệt thì nút xác nhận / từ chối nằm ngay đây |
| `thanh-toan` | `SettlementPreviewCard` + `StorageFeeCard` + `OrderPaymentHistory` (prop `embedded`) |
| `kien-kho` | `ConsignmentListDetail` (prop `embedded`, kèm `ReceivingNoteCard`) + `ParcelHandlingCard` |
| `su-co` | `OrderIncidentsCard` + `OrderPermitCard` |

Tab `hanh-trinh` và `su-co` **tự ẩn** khi đơn chưa có hành trình (chưa vào kho nguồn); URL trỏ
vào tab đang ẩn sẽ `Navigate` sang tab đầu tiên còn hiện.

### Chuyển hướng URL cũ (`LEGACY_DASHBOARD_ROUTES`)

Mọi URL của IA cũ đều còn sống dưới dạng `Navigate ... replace`, để link trong email, thông báo
đẩy và bookmark của khách không chết. Bảng ở `paths.js`; các chuyển hướng cần đọc tham số nằm ở
`src/app/router/redirects.jsx`.

| URL cũ | Đi đâu |
| --- | --- |
| `/consignments/:orderId` | `/orders/:orderId/kien-kho` |
| `/quotations/:orderId` | `/orders/:orderId/bao-gia` |
| `/tracking/:orderId` | `/orders/:orderId/hanh-trinh` |
| `/orders/:orderId/payments/history` | `/orders/:orderId/thanh-toan` |
| `/processing-orders`, `/tracking` | `/orders/ky-gui` |
| `/check-orders` | `/orders/ky-gui?stage=cho-bao-gia` |
| `/history/consignment` | `/payment/lich-su` **giữ nguyên query** — payOS trả khách về URL này |
| `/processing-orders/purchase-requests` | `/orders/mua-ho` |
| `/check-orders/buy-on-behalf` | `/orders/mua-ho?stage=cho-bao-gia` |
| `/history/buy-on-behalf`, `/history/buy-order` | `/orders/mua-ho?stage=hoan-tat` |
| `/processing-orders/purchase-requests/:id`, `/warehouse/purchase-detail/:id` | `/orders/mua-ho/:id` |
| `/check-orders/buy-on-behalf/:id` | `/orders/mua-ho/:id/bao-gia` |
| `/transaction-history`, `/history/**/payments`, `/purchase-requests/:id/payments*` | `/payment/lich-su` |
| `/create-order/consignment`, `/create-order/buy-orders` | `/create-order/ky-gui`, `/create-order/mua-ho` |
| `/warehouse/checkin`, `/warehouse/inventory`, `/warehouse/customs` | `/orders/mua-ho` |

### Màn đã xoá hẳn

Feature `warehouse` phía khách (`CheckinNhapKho`, `ThongQuanVn`, `MuaHoDetail`, `MuaHoTracking*`,
`WarehouseShared*`) — khách không vận hành kho, phần kiện/kho của đơn nằm ở tab `kien-kho`.
Cùng với đó: `ConsignmentList`, `ConsignmentListCheck`, `PurchaseRequestPendingList`,
`BuyForMeQuotationList` (bốn danh sách nhập vào `OrderList`), `OrderTrackingList`,
`OrderTrackingDetail`, `OrderJourneyCard` (nhập vào `/orders/ky-gui` và tab `hanh-trinh`),
`BuyOrderPaymentHistory` (nhập vào `/payment/lich-su`).
