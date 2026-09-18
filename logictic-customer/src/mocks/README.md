# `src/mocks/` — tầng dữ liệu mẫu

Thư mục này là **chỗ backend từng đứng**. Dự án `vcl-customer-ui` hiện là bản giao diện thuần
(UI-only): tầng HTTP thật đã bị gỡ (`axios` không còn trong `package.json`,
`src/shared/api/httpClient.js` đã bị xóa), và 19 module `api/` đọc dữ liệu từ đây thay vì gọi
server.

```
src/mocks/
├─ mockUtils.js      Tiện ích dùng chung: độ trễ, hủy request, phân trang, sinh mã…
└─ data/             14 file fixture — dữ liệu thật sự của ứng dụng
```

Bối cảnh đầy đủ (sơ đồ phân tầng, danh sách module `api/`, cách cắm API thật trở lại):
xem mục 5 của [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) và mục "Cắm API thật trở lại" trong
[`../../README.md`](../../README.md).

---

## Quy tắc số một

**Component không bao giờ import thẳng từ `src/mocks/`.** `pages/`, `components/`, `layouts/`,
`hooks/` luôn đi qua hàm `api/` của feature. Chỉ 19 module `api/` được phép chạm vào thư mục này.

```bash
# Phải không ra dòng nào
grep -rn "@/mocks" src/ | grep -v "^src/mocks/" | grep -v "/api/"
```

Lý do: khoảnh khắc một component bám vào fixture là nó không cắm lại API thật được nữa. Tầng `api/`
thì thay được thân hàm mà không ai hay.

---

## Quy tắc số hai — cảnh báo quan trọng nhất

**Đổi tên export, thứ tự tham số hay hình dạng dữ liệu trả về của một module `api/` sẽ làm hỏng
component — và component thì KHÔNG được sửa.**

Cả bản UI-only được dựng trên đúng một lời hứa: gỡ backend mà không đụng một dòng giao diện nào.
Lời hứa đó chỉ đứng vững khi tầng `api/` giữ nguyên hợp đồng cũ. Vài cái bẫy có thật, đã ghi trong
comment đầu các file mock:

- Mock trả **phần thân đã bóc envelope** (tương đương `response.data`), không phải object response.
  Nhiều nơi còn bóc thêm một lớp `response.data.data ?? response.data`.
- Nhiều màn hình làm `result?.data ?? result`, nên object trả về **không được có khóa `data`** ở
  cấp cao nhất (`conversations`, `parcelTracking`, `inventories`).
- Bỏ `export default` của một module là gãy barrel `index.js` của feature đó.

Có script kiểm bằng máy — chạy trước khi commit:

```bash
node tools/verify-mocks.mjs
```

Nó soát 19 module theo `tools/api-contract.json` (86 tên export) và bảo đảm không còn dấu vết gọi
mạng. Thoát mã 1 nếu lệch.

---

## `mockUtils.js`

Không chứa dữ liệu, chỉ chứa hành vi mà component đang trông đợi ở một lời gọi mạng.

| Hàm | Việc nó làm |
| --- | --- |
| `delay(ms?, signalOrOptions?)` | Chờ một nhịp (mặc định **220ms**) rồi resolve; reject ngay nếu `AbortSignal` đã abort. Nhận cả `AbortSignal` trần lẫn `{ signal }`. |
| `createCanceledError(message?)` | Lỗi hủy đúng chữ ký axios: `name = "CanceledError"`, `code = "ERR_CANCELED"`. |
| `isCanceledError(error)` | Nhận diện `ERR_CANCELED` / `CanceledError` / `AbortError`. |
| `paginate(rows, options?)` | Cắt trang **1-based**. Trả về `items`, `total`, `page`, `size`, `totalPages` và alias đúng tên API: `totalCount`, `pageNumber`, `pageSize`. Nhận `page`/`pageNumber` và `size`/`pageSize`. |
| `deepClone(value)` | Bản sao sâu. Fixture là singleton dùng chung cả phiên nên mọi thứ trả ra ngoài đều phải clone. |
| `nextId(prefix?)` | ID tăng dần trong phiên: `mock-0001`. |
| `newUuid()` | GUID ngẫu nhiên. |
| `stableUuid(seed)` | **GUID tất định từ seed** — cách các fixture tham chiếu chung một bản ghi mà không chép tay GUID. |
| `makeOrderCode(prefix, createdAt?, suffix?)` | Mã đơn đúng format backend: `VCL-20260712105447-295805`. |
| `nowIso()` | ISO UTC hiện tại. |
| `isoDaysAgo(days?, hours?)` | ISO UTC lùi/tiến so với hiện tại, cho dữ liệu cần "tươi" theo lúc chạy. |
| `normalizeText(v)` | Bỏ dấu + lowercase + trim — đúng cách các trang danh sách chuẩn hóa từ khóa. |
| `normalizeStatus(v)` | Trim + `UPPER_SNAKE`. |
| `matchesKeyword(row, keyword, fields)` | Ghép các field lại rồi khớp từ khóa đã chuẩn hóa. |

Ngoài named export còn có một `export default` gom tất cả.

---

## `data/` — 14 file fixture

Số bản ghi dưới đây đếm trực tiếp từ file (nạp module rồi đo độ dài mảng).

| File | Bản ghi | Dùng bởi |
| --- | --- | --- |
| `addresses.js` | **16** tỉnh/thành, **70** quận/huyện, **272** phường/xã | `shared/api/addressApi.js` |
| `catalog.js` | **6** tuyến hàng, **4** phương án vận chuyển, **14** loại sản phẩm, **19** trạng thái đơn ký gửi (mã đích), **12** bảng giá dịch vụ, **26** quy tắc tính phí (một danh mục duy nhất: phụ phí, cọc, hệ số thể tích, phí tất toán), **7** cấu hình thùng (kiêm phí thùng gỗ theo cỡ), giới hạn khai báo trên từng tuyến, **18** mặt hàng cấm/hạn chế | `pricingRuleService`, `consignmentApi`, `consignmentStatusApi`, `purchaseRequestApi`, `restrictedItemApi`, `uploadImage`, `aiOrderIntentApi` |
| `consignments.js` | **25** đơn ký gửi (trải 16 trạng thái, từ `PENDING_REVIEW` tới `COMPLETED` / `CANCELLED` / `REJECTED`) | `consignmentApi` và 5 module khác |
| `purchaseRequests.js` | **20** yêu cầu mua hộ, kèm báo giá và danh sách sản phẩm | `purchaseRequestApi`, `uploadImage`, `aiOrderIntentApi` |
| `conversations.js` | **14** hội thoại CSKH / **58** tin nhắn | `chat/api/conversationApi.js` |
| `notifications.js` | **22** thông báo, **9** chưa đọc | `notifications/api/notificationApi.js` |
| `users.js` | **16** tài khoản khách hàng | `auth/api/authService.js` |

Mỗi file mở đầu bằng khối comment liệt kê **đúng những field mà component thực sự đọc** cùng các
bẫy về shape. **Đọc khối đó trước khi sửa dữ liệu** — nó là thứ giải thích vì sao một field trông
thừa lại không được xóa.

### Các fixture nối với nhau như thế nào

Không file nào chép tay GUID. Tất cả dựng khóa bằng `stableUuid(seed)`, cùng seed thì cùng GUID:

```
consignments.js       seed "consignment-order-XX"   ──┐
purchaseRequests.js   seed "purchase-request-XX"    ──┤
                                                      ├─► deliveryRequests, deliveryTracking,
                                                      │   receivingNotes, payments,
                                                      │   notifications, inventories,
                                                      │   warehouseReleases, conversations
                                                      ▼
users.js  ── MOCK_CUSTOMER / PRIMARY_USER (một danh tính khách duy nhất)
```

Hai hệ quả bắt buộc phải nhớ:

1. **Sửa seed một bên mà quên bên kia** là màn chi tiết rơi về nhánh fallback (bấm "Xem tiến trình"
   trên phiếu giao mà không tra ra đơn gốc).
2. **Chỉ có một danh tính khách hàng.** `MOCK_CUSTOMER` (khai trong `consignments.js`, cũng chính
   là `users[0]` / `PRIMARY_USER`) phải xuyên suốt: nhiều trang lọc dữ liệu theo hồ sơ đang đăng
   nhập (`LuuKhoKienHang` lọc theo `customerId`, `XuatKhoKienHang` so `customerId` /
   `customerPhone` / `customerCode` / `customerName`), lệch một trường là danh sách rỗng hoặc rơi
   về nhánh "hiện tất cả".

### Hàm tra cứu sẵn có

Mỗi file fixture xuất kèm vài hàm tra cứu để module `api/` khỏi tự viết vòng lặp:

| File | Hàm |
| --- | --- |
| `catalog.js` | `findPricingRuleByCode`, `findPricingRuleById`, `findPackageConfigurationById`, `findServicePricingById` (cọc và hệ số thể tích tra bằng `findPricingRuleByCode("DEPOSIT_RATE" / "VOLUMETRIC_DIVISOR")`) |
| `consignments.js` | `findConsignmentById`, `findConsignmentByCode`, `findConsignmentsByStatus` (+ `MOCK_CUSTOMER`, `PRICING_RULE_IDS`) |
| `purchaseRequests.js` | `findPurchaseRequestById`, `findPurchaseRequestByCode`, `findPurchaseRequestsByStatus` |
| `conversations.js` | `findConversationById`, `findConversationByRelated`, `resolveRelatedCodeById`, `createChatMessage` (+ `CHAT_CUSTOMER`, `CHAT_STAFF`) |
| `notifications.js` | `findNotificationById`, `countUnreadNotifications` |
| `users.js` | `findUserByEmail`, `findUserById`, `nextCustomerCode` (+ `PRIMARY_USER`, `DEMO_PASSWORD`) |

---

## Thêm hoặc sửa dữ liệu mẫu

**Sửa một bản ghi có sẵn**

1. Đọc khối comment đầu file — nó nói field nào bị component đọc và bẫy nào phải tránh.
2. Sửa giá trị. Đừng xóa field, kể cả field trông thừa: nhiều field chỉ được đọc ở một màn hình
   phụ hoặc một nhánh fallback.
3. `npm run dev` và mở đúng màn hình đang dùng bản ghi đó.

**Thêm một bản ghi**

1. Chép một bản ghi cùng loại làm khuôn — đừng viết từ đầu, rất dễ thiếu field.
2. Khóa chính dùng `stableUuid("<tiền-tố>-NN")` theo đúng nếp seed của file, **không** `newUuid()`
   (fixture tĩnh phải tất định giữa các lần chạy, nếu không các file khác không tham chiếu tới nó
   được).
3. Mã đơn dùng `makeOrderCode("VCL" | "PUR", ngàyTạo, hậuTố)` để phần ngày trong mã khớp
   `createdAt`.
4. Ngày tháng: fixture tĩnh nên viết ngày cứng; chỉ dùng `isoDaysAgo()` cho thứ cần luôn "tươi"
   (chuông thông báo).
5. Nếu bản ghi thuộc về khách demo, dùng `MOCK_CUSTOMER` chứ đừng gõ tay tên/số điện thoại.
6. Bản ghi liên quan tới một đơn có sẵn thì lấy `orderId` bằng **đúng seed** đơn đó.

**Thêm một loại dữ liệu hoàn toàn mới**

Tạo file mới trong `data/`, rồi cho **module `api/` tương ứng** import nó. Không cho component
import trực tiếp. Nếu module `api/` đó có thêm export mới thì cập nhật `tools/api-contract.json`
để `verify-mocks.mjs` soát luôn.

**Kiểm tra sau khi sửa**

```bash
npm run lint
node tools/verify-mocks.mjs
npm run dev
```

---

## Lưu ý về vòng đời dữ liệu

Fixture là **singleton dùng chung cả phiên**, và các mock mutate thẳng trên mảng đó (tạo đơn, đánh
dấu đã đọc thông báo, cập nhật hồ sơ, gửi tin nhắn…). Vì vậy:

- Mọi thay đổi **mất sau khi F5** — đúng như mong đợi của một bản demo.
- Mọi thứ trả ra ngoài phải đi qua `deepClone()`, nếu không component mutate là hỏng fixture gốc
  cho tới hết phiên.
- Riêng `users.js` **cố ý không `Object.freeze`**: verify OTP, đặt lại mật khẩu và cập nhật hồ sơ
  đều ghi thẳng lên mảng này.
