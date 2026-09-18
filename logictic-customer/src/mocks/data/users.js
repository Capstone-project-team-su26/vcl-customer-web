/* =========================================================
   data/users.js

   Danh bạ TÀI KHOẢN KHÁCH HÀNG cho bản build UI-only.

   Đây là nguồn dữ liệu duy nhất của mock auth/profile:
   authService.js đọc file này để trả về hồ sơ đăng nhập, hồ sơ cá nhân
   và để ghi lại khi khách bấm "Cập nhật thông tin".

   Shape của một bản ghi bám đúng những gì component thực sự đọc:
   - ProfileView đọc: fullName, email, phone, country, address,
     status (fallback accountStatus / userStatus).
   - ProfileEdit đọc và ghi: fullName, phone, country, address.
     country PHẢI trùng tên trong COUNTRY_LIST của ProfileEdit
     ("Vietnam", "China"...) thì thẻ <select> mới chọn đúng dòng.
   - Sidebar / SiteHeader / Dashboard / FloatingChat đọc:
     userId (fallback id / customerId), fullName, phone, email.
   - LuuKhoKienHang lọc kiện hàng theo userId === item.customerId,
     nên khách demo chính phải mang đúng customerId của fixture ký gửi.

   Bản ghi KHÔNG được Object.freeze: verify OTP, reset mật khẩu và
   cập nhật hồ sơ đều mutate ngay trên mảng này trong phiên làm việc.
   ========================================================= */

import { MOCK_CUSTOMER } from "./consignments";

/* =========================================================
   HẰNG SỐ DÙNG CHUNG
   ========================================================= */

/*
 * Mật khẩu demo hiển thị ở màn hình đăng nhập nếu cần gợi ý.
 * Mock KHÔNG so khớp mật khẩu (xem authService.loginApi) — để lại đây
 * cho ai muốn bật kiểm tra thật khi nối lại API.
 */
export const DEMO_PASSWORD = "Demo@12345";

/** Quốc gia mặc định, viết đúng tên trong COUNTRY_LIST của ProfileEdit. */
const VN = "Vietnam";

/**
 * Tạo một bản ghi tài khoản đầy đủ field.
 *
 * userId / id / customerId cùng một GUID: mỗi màn hình đọc theo một tên
 * khác nhau (user.userId || user.id || user.customerId), thiếu tên nào là
 * màn hình đó rơi về chuỗi rỗng và lọc dữ liệu ra sạch trơn.
 */
const makeUser = ({
  userId,
  customerCode,
  fullName,
  email,
  phone,
  address,
  country = VN,
  status = "ACTIVE",
  isEmailVerified = true,
  createdAt,
  updatedAt,
  lastLoginAt = null,
}) => ({
  userId,
  id: userId,
  customerId: userId,
  customerCode,

  fullName,
  email,
  phone,
  country,
  address,

  /* Ba tên trạng thái vì ProfileView dò lần lượt cả ba. */
  status,
  accountStatus: status,
  userStatus: status,

  role: "CUSTOMER",
  roleName: "Khách hàng",

  isEmailVerified,
  emailVerified: isEmailVerified,

  avatarUrl: null,

  /* Mật khẩu chỉ tồn tại trong fixture; authService luôn bóc bỏ trước khi trả về. */
  password: DEMO_PASSWORD,

  createdAt,
  updatedAt: updatedAt || createdAt,
  lastLoginAt,
});

/* =========================================================
   DANH SÁCH TÀI KHOẢN
   ========================================================= */

/**
 * 16 tài khoản hư cấu: đủ để danh sách, bộ lọc và các nhãn trạng thái
 * (ACTIVE / PENDING / INACTIVE) đều có dòng để hiển thị.
 *
 * Phần tử [0] là khách hàng đang đăng nhập trong bản demo — dùng lại
 * nguyên identity của MOCK_CUSTOMER bên fixture ký gửi để đơn hàng,
 * kiện kho và hồ sơ cùng trỏ về một người.
 */
export const users = [
  makeUser({
    userId: MOCK_CUSTOMER.customerId,
    customerCode: "KH-2026-0001",
    fullName: MOCK_CUSTOMER.fullName,
    email: MOCK_CUSTOMER.email,
    phone: MOCK_CUSTOMER.phone,
    address:
      "Số 128, Ngõ 42 Trần Duy Hưng, P. Trung Hòa, Q. Cầu Giấy, Hà Nội",
    createdAt: "2025-03-18T02:14:36.000Z",
    updatedAt: "2026-08-21T09:41:05.000Z",
    lastLoginAt: "2026-09-01T23:12:44.000Z",
  }),

  makeUser({
    userId: "9c41d7a2-6b18-4f05-9e73-2c8a5d10b431",
    customerCode: "KH-2026-0002",
    fullName: "Trần Minh Khoa",
    email: "minhkhoa.tran@vcl-demo.vn",
    phone: "0912345671",
    address:
      "45 Nguyễn Thị Minh Khai, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    createdAt: "2025-05-02T07:30:11.000Z",
    lastLoginAt: "2026-08-29T02:05:19.000Z",
  }),

  makeUser({
    userId: "0f7b3e59-84c1-4a62-b0d8-77e4915ac2d6",
    customerCode: "KH-2026-0003",
    fullName: "Lê Thị Bích Ngọc",
    email: "bichngoc.le@vcl-demo.vn",
    phone: "0987441203",
    address: "27 Lê Đại Hành, P. Hải Châu 1, Q. Hải Châu, Đà Nẵng",
    createdAt: "2025-06-21T04:52:47.000Z",
    lastLoginAt: "2026-08-30T12:38:02.000Z",
  }),

  makeUser({
    userId: "58a0c964-31df-4b17-8c25-9ab6f0e743cc",
    customerCode: "KH-2026-0004",
    fullName: "Phạm Quốc Cường",
    email: "quoccuong.pham@vcl-demo.vn",
    phone: "0938217640",
    address:
      "Kho A3, KCN VSIP Bắc Ninh, P. Từ Sơn, TP. Từ Sơn, Bắc Ninh",
    createdAt: "2025-07-09T09:18:03.000Z",
    lastLoginAt: "2026-08-27T06:44:51.000Z",
  }),

  makeUser({
    userId: "1d63f8b0-5c47-42ae-9f31-6e0d82b5a719",
    customerCode: "KH-2026-0005",
    fullName: "Vũ Hoàng Nam",
    email: "hoangnam.vu@vcl-demo.vn",
    phone: "0977102938",
    address: "12 Lạch Tray, P. Đông Khê, Q. Ngô Quyền, Hải Phòng",
    createdAt: "2025-08-14T01:26:58.000Z",
    lastLoginAt: "2026-08-25T15:07:33.000Z",
  }),

  makeUser({
    userId: "7e2a45cd-90b6-4d38-a1c7-53f9e6041b82",
    customerCode: "KH-2026-0006",
    fullName: "Đặng Thu Trang",
    email: "thutrang.dang@vcl-demo.vn",
    phone: "0903556812",
    address:
      "88 Nguyễn Văn Cừ, P. Ngọc Lâm, Q. Long Biên, Hà Nội",
    createdAt: "2025-09-27T03:44:12.000Z",
    lastLoginAt: "2026-08-31T08:19:26.000Z",
  }),

  makeUser({
    userId: "3b8d17f4-62e0-4c95-b743-08ca9d2e5610",
    customerCode: "KH-2026-0007",
    fullName: "Hoàng Gia Bảo",
    email: "giabao.hoang@vcl-demo.vn",
    phone: "0968330147",
    address: "19 Trần Phú, P. Đông Kinh, TP. Lạng Sơn, Lạng Sơn",
    createdAt: "2025-10-05T10:02:39.000Z",
    lastLoginAt: "2026-08-18T04:55:10.000Z",
  }),

  makeUser({
    userId: "c4f92a71-1e83-40d6-95bc-27d6083ff4a5",
    customerCode: "KH-2026-0008",
    fullName: "Bùi Khánh Linh",
    email: "khanhlinh.bui@vcl-demo.vn",
    phone: "0918274655",
    address:
      "233 Cách Mạng Tháng Tám, Phường 12, Quận 10, TP. Hồ Chí Minh",
    /* Tài khoản vừa đăng ký, chưa nhập OTP: để nhãn "Đang chờ" có dòng. */
    status: "PENDING",
    isEmailVerified: false,
    createdAt: "2026-08-28T02:11:07.000Z",
  }),

  makeUser({
    userId: "a610b3ec-7d24-4f89-8ab2-4c1957e0d33f",
    customerCode: "KH-2026-0009",
    fullName: "Ngô Đức Anh",
    email: "ducanh.ngo@vcl-demo.vn",
    phone: "0349871220",
    address:
      "56 Nguyễn Trãi, P. Thanh Xuân Trung, Q. Thanh Xuân, Hà Nội",
    createdAt: "2025-11-16T06:37:24.000Z",
    lastLoginAt: "2026-08-22T11:29:48.000Z",
  }),

  makeUser({
    userId: "e29d4f05-3ba7-4162-9d80-6f5c17ae82b4",
    customerCode: "KH-2026-0010",
    fullName: "Trịnh Mỹ Duyên",
    email: "myduyen.trinh@vcl-demo.vn",
    phone: "0932114788",
    address: "7 Lý Thường Kiệt, P. Vĩnh Ninh, TP. Huế, Thừa Thiên Huế",
    createdAt: "2025-12-01T08:55:41.000Z",
    lastLoginAt: "2026-08-19T03:16:57.000Z",
  }),

  makeUser({
    userId: "46c7e8b1-0f52-4d3a-87e6-91b0d4a2735e",
    customerCode: "KH-2026-0011",
    fullName: "Đỗ Trọng Tín",
    email: "trongtin.do@vcl-demo.vn",
    phone: "0961223344",
    address:
      "102 Hùng Vương, P. Mỹ Long, TP. Long Xuyên, An Giang",
    createdAt: "2026-01-13T05:09:16.000Z",
    lastLoginAt: "2026-08-15T09:02:35.000Z",
  }),

  makeUser({
    userId: "b7350d9a-4c68-41fb-92e5-0d8a6f37c1e2",
    customerCode: "KH-2026-0012",
    fullName: "Lý Gia Huy",
    email: "giahuy.ly@vcl-demo.vn",
    phone: "0908777123",
    address:
      "Phòng 1204, Tòa S2, Vinhomes Grand Park, P. Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh",
    /* Tài khoản bị tạm ngưng: dùng để thử luồng báo lỗi khi đăng nhập. */
    status: "INACTIVE",
    createdAt: "2026-02-04T02:48:53.000Z",
    lastLoginAt: "2026-05-30T07:41:12.000Z",
  }),

  makeUser({
    userId: "8f1c62d3-95a4-4e07-b16d-3ea780c5941b",
    customerCode: "KH-2026-0013",
    fullName: "Chu Thảo Vy",
    email: "thaovy.chu@vcl-demo.vn",
    phone: "0355998741",
    address:
      "64 Quang Trung, P. Quang Trung, TP. Thái Nguyên, Thái Nguyên",
    createdAt: "2026-03-22T12:31:29.000Z",
    lastLoginAt: "2026-08-12T01:53:40.000Z",
  }),

  makeUser({
    userId: "2a94f7e8-63b0-4d51-a729-5c08e1b34d67",
    customerCode: "KH-2026-0014",
    fullName: "Mai Anh Tuấn",
    email: "anhtuan.mai@vcl-demo.vn",
    phone: "0913004567",
    address:
      "Số 9 Phan Đình Phùng, P. Tân Thành, TP. Buôn Ma Thuột, Đắk Lắk",
    createdAt: "2026-04-08T04:07:15.000Z",
    lastLoginAt: "2026-08-09T10:26:04.000Z",
  }),

  makeUser({
    userId: "d5b08c62-af31-4970-8e24-71c6d09b3a58",
    customerCode: "KH-2026-0015",
    fullName: "Tạ Hồng Nhung",
    email: "hongnhung.ta@vcl-demo.vn",
    phone: "0942318877",
    address:
      "Tầng 3, Tòa Kim Long, Đường Trạm Tây, Quận Bạch Vân, Quảng Châu, Quảng Đông",
    /* Khách đặt hàng tại nguồn Trung Quốc: để bộ chọn quốc gia có dòng khác VN. */
    country: "China",
    createdAt: "2026-05-19T07:22:58.000Z",
    lastLoginAt: "2026-08-05T02:48:31.000Z",
  }),

  makeUser({
    userId: "6e83a10f-27c5-4b46-90d1-4fa2e7c85b09",
    customerCode: "KH-2026-0016",
    fullName: "Phan Bảo Châu",
    email: "baochau.phan@vcl-demo.vn",
    phone: "0906885210",
    address: "21 Nguyễn Huệ, P. Phú Hội, TP. Đà Lạt, Lâm Đồng",
    createdAt: "2026-06-30T09:14:22.000Z",
    lastLoginAt: "2026-07-28T05:33:47.000Z",
  }),
];

/** Khách hàng đang đăng nhập mặc định của bản demo. */
export const PRIMARY_USER = users[0];

/* =========================================================
   TRA CỨU
   ========================================================= */

const normalizeKey = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

/**
 * Tìm tài khoản theo email (không phân biệt hoa thường).
 *
 * @param {string} email
 * @returns {object | null}
 */
export const findUserByEmail = (email) => {
  const key = normalizeKey(email);

  if (!key) {
    return null;
  }

  return (
    users.find((user) => normalizeKey(user.email) === key) || null
  );
};

/**
 * Tìm tài khoản theo GUID, chấp nhận cả userId / id / customerId.
 *
 * @param {string} userId
 * @returns {object | null}
 */
export const findUserById = (userId) => {
  const key = normalizeKey(userId);

  if (!key) {
    return null;
  }

  return (
    users.find(
      (user) =>
        normalizeKey(user.userId) === key ||
        normalizeKey(user.id) === key ||
        normalizeKey(user.customerId) === key
    ) || null
  );
};

/**
 * Mã khách hàng kế tiếp cho tài khoản đăng ký mới trong phiên.
 *
 * @returns {string}
 */
export const nextCustomerCode = () =>
  `KH-2026-${String(users.length + 1).padStart(4, "0")}`;

export default users;
