/* =========================================================
   data/addresses.js

   Danh mục ĐỊA GIỚI HÀNH CHÍNH VIỆT NAM cho bản build UI-only.

   Bản gốc gọi provinces.open-api.vn (tỉnh -> quận/huyện -> phường/xã).
   File này dựng lại đúng SHAPE THÔ mà API đó trả về, vì addressApi
   normalize từ shape thô sang { value, label, code, name, ... }:
   - tỉnh:   { code, name, codename, division_type, phone_code, districts }
   - quận:   { code, name, codename, division_type, province_code, wards }
   - phường: { code, name, codename, division_type, district_code }

   Vì sao giữ nguyên snake_case: normalizeAddressOption đọc thẳng
   item.division_type / item.phone_code / item.province_code / item.district_code.
   Đổi sang camelCase là các field đó thành undefined trong option.

   Dữ liệu bám các tỉnh/thành đang xuất hiện trong fixture đơn hàng
   (Hà Nội, TP.HCM, Hải Phòng, Đà Nẵng, Lào Cai, Bắc Ninh...) để địa chỉ
   người nhận trên đơn và dropdown chọn địa chỉ mới nhìn khớp nhau.

   Mã (code) là SỐ, đúng như API thật — component ép String() khi so sánh
   nên số hay chuỗi đều chọn đúng dòng, nhưng giữ số cho sát bản gốc.
   ========================================================= */

/* =========================================================
   HELPER SINH FIELD PHỤ

   codename và division_type được suy ra từ tên để fixture khỏi phải
   chép tay hàng trăm dòng — chép tay là chỗ dễ sai chính tả nhất.
   ========================================================= */

/** "Quận Ba Đình" -> "quan_ba_dinh" (đúng quy ước codename của API). */
const toCodename = (name) =>
  String(name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    /* "đ" không tách dấu bằng NFD nên phải thay tay. */
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/** Loại đơn vị hành chính, suy từ tiền tố tên. */
const toDivisionType = (name, level) => {
  const value = String(name ?? "");

  if (level === "province") {
    return value.startsWith("Thành phố")
      ? "thành phố trung ương"
      : "tỉnh";
  }

  if (level === "district") {
    if (value.startsWith("Quận")) return "quận";
    if (value.startsWith("Thị xã")) return "thị xã";
    if (value.startsWith("Thành phố")) return "thành phố";

    return "huyện";
  }

  if (value.startsWith("Phường")) return "phường";
  if (value.startsWith("Thị trấn")) return "thị trấn";

  return "xã";
};

/* =========================================================
   DỮ LIỆU GỐC (viết gọn)

   Phường/xã viết dạng cặp [code, name] cho đỡ dài; hàm build ở dưới
   sẽ bung thành object đầy đủ.
   ========================================================= */

const RAW_PROVINCES = [
  {
    code: 1,
    name: "Thành phố Hà Nội",
    phone_code: 24,
    districts: [
      {
        code: 1,
        name: "Quận Ba Đình",
        wards: [
          [1, "Phường Phúc Xá"],
          [4, "Phường Trúc Bạch"],
          [6, "Phường Vĩnh Phúc"],
          [7, "Phường Cống Vị"],
          [8, "Phường Liễu Giai"],
          [10, "Phường Ngọc Hà"],
        ],
      },
      {
        code: 2,
        name: "Quận Hoàn Kiếm",
        wards: [
          [37, "Phường Phúc Tân"],
          [40, "Phường Đồng Xuân"],
          [43, "Phường Hàng Mã"],
          [46, "Phường Hàng Buồm"],
          [49, "Phường Hàng Đào"],
        ],
      },
      {
        code: 5,
        name: "Quận Cầu Giấy",
        wards: [
          [79, "Phường Nghĩa Đô"],
          [82, "Phường Nghĩa Tân"],
          [85, "Phường Mai Dịch"],
          [88, "Phường Dịch Vọng"],
          [91, "Phường Dịch Vọng Hậu"],
          [94, "Phường Quan Hoa"],
        ],
      },
      {
        code: 6,
        name: "Quận Đống Đa",
        wards: [
          [178, "Phường Cát Linh"],
          [181, "Phường Văn Miếu"],
          [187, "Phường Láng Thượng"],
          [190, "Phường Ô Chợ Dừa"],
          [193, "Phường Văn Chương"],
        ],
      },
      {
        code: 7,
        name: "Quận Hai Bà Trưng",
        wards: [
          [232, "Phường Nguyễn Du"],
          [235, "Phường Bạch Đằng"],
          [241, "Phường Phạm Đình Hổ"],
          [244, "Phường Lê Đại Hành"],
        ],
      },
      {
        code: 8,
        name: "Quận Hoàng Mai",
        wards: [
          [286, "Phường Thanh Trì"],
          [289, "Phường Vĩnh Hưng"],
          [292, "Phường Định Công"],
          [295, "Phường Mai Động"],
        ],
      },
      {
        code: 9,
        name: "Quận Thanh Xuân",
        wards: [
          [265, "Phường Nhân Chính"],
          [268, "Phường Thượng Đình"],
          [271, "Phường Khương Trung"],
          [274, "Phường Khương Mai"],
        ],
      },
      {
        code: 19,
        name: "Quận Nam Từ Liêm",
        wards: [
          [154, "Phường Cầu Diễn"],
          [157, "Phường Xuân Phương"],
          [163, "Phường Mỹ Đình 1"],
          [166, "Phường Mỹ Đình 2"],
        ],
      },
      {
        code: 21,
        name: "Quận Hà Đông",
        wards: [
          [541, "Phường Nguyễn Trãi"],
          [544, "Phường Mộ Lao"],
          [547, "Phường Văn Quán"],
          [550, "Phường Vạn Phúc"],
        ],
      },
      {
        code: 17,
        name: "Huyện Đông Anh",
        wards: [
          [493, "Thị trấn Đông Anh"],
          [496, "Xã Xuân Nộn"],
          [499, "Xã Thuỵ Lâm"],
          [502, "Xã Bắc Hồng"],
        ],
      },
    ],
  },
  {
    code: 79,
    name: "Thành phố Hồ Chí Minh",
    phone_code: 28,
    districts: [
      {
        code: 760,
        name: "Quận 1",
        wards: [
          [26740, "Phường Tân Định"],
          [26743, "Phường Đa Kao"],
          [26746, "Phường Bến Nghé"],
          [26749, "Phường Bến Thành"],
          [26752, "Phường Nguyễn Thái Bình"],
          [26758, "Phường Cầu Ông Lãnh"],
        ],
      },
      {
        code: 770,
        name: "Quận 3",
        wards: [
          [27007, "Phường 1"],
          [27010, "Phường 2"],
          [27013, "Phường 3"],
          [27016, "Phường 4"],
          [27019, "Phường Võ Thị Sáu"],
        ],
      },
      {
        code: 771,
        name: "Quận 10",
        wards: [
          [27184, "Phường 1"],
          [27196, "Phường 12"],
          [27202, "Phường 14"],
          [27205, "Phường 15"],
        ],
      },
      {
        code: 764,
        name: "Quận Gò Vấp",
        wards: [
          [26845, "Phường 15"],
          [26848, "Phường 13"],
          [26851, "Phường 17"],
          [26854, "Phường 6"],
        ],
      },
      {
        code: 765,
        name: "Quận Bình Thạnh",
        wards: [
          [26884, "Phường 13"],
          [26887, "Phường 11"],
          [26890, "Phường 27"],
          [26893, "Phường 26"],
          [26896, "Phường 12"],
        ],
      },
      {
        code: 766,
        name: "Quận Tân Bình",
        wards: [
          [26935, "Phường 2"],
          [26938, "Phường 4"],
          [26941, "Phường 12"],
          [26944, "Phường 13"],
        ],
      },
      {
        code: 769,
        name: "Thành phố Thủ Đức",
        wards: [
          [26800, "Phường Linh Xuân"],
          [26803, "Phường Bình Chiểu"],
          [26806, "Phường Linh Trung"],
          [26815, "Phường Hiệp Bình Chánh"],
          [26818, "Phường Hiệp Bình Phước"],
        ],
      },
      {
        code: 777,
        name: "Quận Bình Tân",
        wards: [
          [27469, "Phường Bình Hưng Hòa"],
          [27472, "Phường Bình Hưng Hoà A"],
          [27475, "Phường Bình Trị Đông"],
          [27478, "Phường Tân Tạo"],
        ],
      },
    ],
  },
  {
    code: 31,
    name: "Thành phố Hải Phòng",
    phone_code: 225,
    districts: [
      {
        code: 303,
        name: "Quận Hồng Bàng",
        wards: [
          [11101, "Phường Quán Toan"],
          [11104, "Phường Hùng Vương"],
          [11107, "Phường Sở Dầu"],
          [11110, "Phường Thượng Lý"],
        ],
      },
      {
        code: 304,
        name: "Quận Ngô Quyền",
        wards: [
          [11149, "Phường Máy Chai"],
          [11152, "Phường Máy Tơ"],
          [11155, "Phường Vạn Mỹ"],
          [11158, "Phường Cầu Tre"],
        ],
      },
      {
        code: 305,
        name: "Quận Lê Chân",
        wards: [
          [11203, "Phường Cát Dài"],
          [11206, "Phường An Biên"],
          [11209, "Phường Lam Sơn"],
          [11212, "Phường An Dương"],
        ],
      },
      {
        code: 306,
        name: "Quận Hải An",
        wards: [
          [11290, "Phường Đông Hải 1"],
          [11293, "Phường Đông Hải 2"],
          [11296, "Phường Đằng Lâm"],
          [11299, "Phường Thành Tô"],
        ],
      },
      {
        code: 311,
        name: "Huyện Thuỷ Nguyên",
        wards: [
          [11527, "Thị trấn Núi Đèo"],
          [11530, "Xã Lại Xuân"],
          [11533, "Xã An Sơn"],
        ],
      },
    ],
  },
  {
    code: 48,
    name: "Thành phố Đà Nẵng",
    phone_code: 236,
    districts: [
      {
        code: 492,
        name: "Quận Hải Châu",
        wards: [
          [20206, "Phường Thanh Bình"],
          [20209, "Phường Thuận Phước"],
          [20212, "Phường Thạch Thang"],
          [20215, "Phường Hải Châu 1"],
          [20218, "Phường Hải Châu 2"],
        ],
      },
      {
        code: 491,
        name: "Quận Thanh Khê",
        wards: [
          [20194, "Phường Tam Thuận"],
          [20197, "Phường Xuân Hà"],
          [20200, "Phường Chính Gián"],
          [20203, "Phường Vĩnh Trung"],
        ],
      },
      {
        code: 493,
        name: "Quận Sơn Trà",
        wards: [
          [20263, "Phường Mân Thái"],
          [20266, "Phường An Hải Bắc"],
          [20269, "Phường Phước Mỹ"],
          [20272, "Phường An Hải Tây"],
        ],
      },
      {
        code: 490,
        name: "Quận Liên Chiểu",
        wards: [
          [20185, "Phường Hòa Hiệp Bắc"],
          [20188, "Phường Hòa Hiệp Nam"],
          [20191, "Phường Hòa Khánh Bắc"],
          [20192, "Phường Hòa Khánh Nam"],
        ],
      },
      {
        code: 495,
        name: "Quận Cẩm Lệ",
        wards: [
          [20308, "Phường Khuê Trung"],
          [20311, "Phường Hòa Phát"],
          [20314, "Phường Hòa An"],
        ],
      },
    ],
  },
  {
    code: 92,
    name: "Thành phố Cần Thơ",
    phone_code: 292,
    districts: [
      {
        code: 916,
        name: "Quận Ninh Kiều",
        wards: [
          [31117, "Phường Cái Khế"],
          [31120, "Phường An Hòa"],
          [31123, "Phường Thới Bình"],
          [31126, "Phường An Nghiệp"],
        ],
      },
      {
        code: 918,
        name: "Quận Bình Thuỷ",
        wards: [
          [31150, "Phường Bình Thủy"],
          [31153, "Phường Trà An"],
          [31156, "Phường Trà Nóc"],
        ],
      },
      {
        code: 919,
        name: "Quận Cái Răng",
        wards: [
          [31192, "Phường Lê Bình"],
          [31195, "Phường Hưng Phú"],
          [31198, "Phường Hưng Thạnh"],
        ],
      },
    ],
  },
  {
    code: 10,
    name: "Tỉnh Lào Cai",
    phone_code: 214,
    districts: [
      {
        code: 80,
        name: "Thành phố Lào Cai",
        wards: [
          [2350, "Phường Duyên Hải"],
          [2353, "Phường Lào Cai"],
          [2356, "Phường Cốc Lếu"],
          [2359, "Phường Kim Tân"],
          [2362, "Phường Bắc Lệnh"],
        ],
      },
      {
        code: 82,
        name: "Huyện Bát Xát",
        wards: [
          [2383, "Thị trấn Bát Xát"],
          [2386, "Xã A Mú Sung"],
          [2389, "Xã Nậm Chạc"],
        ],
      },
      {
        code: 83,
        name: "Huyện Mường Khương",
        wards: [
          [2446, "Thị trấn Mường Khương"],
          [2449, "Xã Pha Long"],
          [2452, "Xã Tả Ngải Chồ"],
        ],
      },
      {
        code: 85,
        name: "Huyện Bảo Thắng",
        wards: [
          [2500, "Thị trấn Phố Lu"],
          [2503, "Thị trấn Tằng Loỏng"],
          [2506, "Xã Bản Phiệt"],
        ],
      },
      {
        code: 88,
        name: "Thị xã Sa Pa",
        wards: [
          [2542, "Phường Sa Pa"],
          [2545, "Phường Sa Pả"],
          [2548, "Phường Ô Quý Hồ"],
        ],
      },
    ],
  },
  {
    code: 27,
    name: "Tỉnh Bắc Ninh",
    phone_code: 222,
    districts: [
      {
        code: 256,
        name: "Thành phố Bắc Ninh",
        wards: [
          [9088, "Phường Vũ Ninh"],
          [9091, "Phường Đáp Cầu"],
          [9094, "Phường Thị Cầu"],
          [9097, "Phường Kinh Bắc"],
          [9100, "Phường Vệ An"],
        ],
      },
      {
        code: 258,
        name: "Huyện Yên Phong",
        wards: [
          [9151, "Thị trấn Chờ"],
          [9154, "Xã Dũng Liệt"],
          [9157, "Xã Tam Đa"],
        ],
      },
      {
        code: 260,
        name: "Huyện Tiên Du",
        wards: [
          [9220, "Thị trấn Lim"],
          [9223, "Xã Phú Lâm"],
          [9226, "Xã Nội Duệ"],
        ],
      },
      {
        code: 261,
        name: "Thị xã Từ Sơn",
        wards: [
          [9271, "Phường Đông Ngàn"],
          [9274, "Phường Tam Sơn"],
          [9277, "Phường Trang Hạ"],
        ],
      },
    ],
  },
  {
    code: 22,
    name: "Tỉnh Quảng Ninh",
    phone_code: 203,
    districts: [
      {
        code: 193,
        name: "Thành phố Hạ Long",
        wards: [
          [6904, "Phường Hà Khánh"],
          [6907, "Phường Hà Phong"],
          [6913, "Phường Hà Trung"],
          [6916, "Phường Hà Tu"],
          [6919, "Phường Hồng Hải"],
        ],
      },
      {
        code: 194,
        name: "Thành phố Móng Cái",
        wards: [
          [7030, "Phường Ka Long"],
          [7033, "Phường Trần Phú"],
          [7036, "Phường Ninh Dương"],
          [7039, "Phường Hòa Lạc"],
        ],
      },
      {
        code: 195,
        name: "Thành phố Cẩm Phả",
        wards: [
          [6955, "Phường Mông Dương"],
          [6958, "Phường Cửa Ông"],
          [6961, "Phường Cẩm Sơn"],
        ],
      },
      {
        code: 196,
        name: "Thành phố Uông Bí",
        wards: [
          [7000, "Phường Vàng Danh"],
          [7003, "Phường Thanh Sơn"],
          [7006, "Phường Bắc Sơn"],
        ],
      },
    ],
  },
  {
    code: 33,
    name: "Tỉnh Hưng Yên",
    phone_code: 221,
    districts: [
      {
        code: 323,
        name: "Thành phố Hưng Yên",
        wards: [
          [12139, "Phường Lam Sơn"],
          [12142, "Phường Hiến Nam"],
          [12145, "Phường An Tảo"],
          [12148, "Phường Lê Lợi"],
        ],
      },
      {
        code: 325,
        name: "Huyện Văn Lâm",
        wards: [
          [12181, "Thị trấn Như Quỳnh"],
          [12184, "Xã Lạc Đạo"],
          [12187, "Xã Chỉ Đạo"],
        ],
      },
      {
        code: 326,
        name: "Huyện Văn Giang",
        wards: [
          [12220, "Thị trấn Văn Giang"],
          [12223, "Xã Xuân Quan"],
          [12226, "Xã Cửu Cao"],
        ],
      },
      {
        code: 327,
        name: "Huyện Yên Mỹ",
        wards: [
          [12283, "Thị trấn Yên Mỹ"],
          [12286, "Xã Giai Phạm"],
          [12289, "Xã Nghĩa Hiệp"],
        ],
      },
    ],
  },
  {
    code: 74,
    name: "Tỉnh Bình Dương",
    phone_code: 274,
    districts: [
      {
        code: 718,
        name: "Thành phố Thủ Dầu Một",
        wards: [
          [25807, "Phường Hiệp Thành"],
          [25810, "Phường Phú Lợi"],
          [25813, "Phường Phú Cường"],
          [25816, "Phường Phú Hòa"],
        ],
      },
      {
        code: 723,
        name: "Thành phố Dĩ An",
        wards: [
          [25990, "Phường Dĩ An"],
          [25993, "Phường Tân Bình"],
          [25996, "Phường Tân Đông Hiệp"],
          [25999, "Phường Bình An"],
        ],
      },
      {
        code: 724,
        name: "Thành phố Thuận An",
        wards: [
          [26011, "Phường An Thạnh"],
          [26014, "Phường Lái Thiêu"],
          [26017, "Phường Bình Chuẩn"],
          [26020, "Phường Thuận Giao"],
        ],
      },
      {
        code: 721,
        name: "Thị xã Bến Cát",
        wards: [
          [25915, "Phường Mỹ Phước"],
          [25918, "Phường Chánh Phú Hòa"],
          [25921, "Xã An Điền"],
        ],
      },
    ],
  },
  {
    code: 75,
    name: "Tỉnh Đồng Nai",
    phone_code: 251,
    districts: [
      {
        code: 731,
        name: "Thành phố Biên Hòa",
        wards: [
          [26026, "Phường Trảng Dài"],
          [26029, "Phường Tân Phong"],
          [26032, "Phường Tân Biên"],
          [26035, "Phường Hố Nai"],
          [26038, "Phường Tân Hòa"],
        ],
      },
      {
        code: 732,
        name: "Thành phố Long Khánh",
        wards: [
          [26128, "Phường Xuân Trung"],
          [26131, "Phường Xuân Thanh"],
          [26134, "Phường Xuân Bình"],
        ],
      },
      {
        code: 734,
        name: "Huyện Trảng Bom",
        wards: [
          [26197, "Thị trấn Trảng Bom"],
          [26200, "Xã Thanh Bình"],
          [26203, "Xã Cây Gáo"],
        ],
      },
    ],
  },
  {
    code: 46,
    name: "Tỉnh Thừa Thiên Huế",
    phone_code: 234,
    districts: [
      {
        code: 474,
        name: "Thành phố Huế",
        wards: [
          [19765, "Phường Phú Thuận"],
          [19768, "Phường Phú Bình"],
          [19771, "Phường Tây Lộc"],
          [19774, "Phường Thuận Lộc"],
          [19780, "Phường Phú Hòa"],
        ],
      },
      {
        code: 476,
        name: "Huyện Phong Điền",
        wards: [
          [19858, "Thị trấn Phong Điền"],
          [19861, "Xã Điền Hương"],
          [19864, "Xã Điền Môn"],
        ],
      },
      {
        code: 481,
        name: "Thị xã Hương Thuỷ",
        wards: [
          [19945, "Phường Phú Bài"],
          [19948, "Xã Thủy Vân"],
          [19951, "Phường Thủy Dương"],
        ],
      },
    ],
  },
  {
    code: 40,
    name: "Tỉnh Nghệ An",
    phone_code: 238,
    districts: [
      {
        code: 412,
        name: "Thành phố Vinh",
        wards: [
          [16693, "Phường Đông Vĩnh"],
          [16696, "Phường Hà Huy Tập"],
          [16699, "Phường Lê Lợi"],
          [16702, "Phường Quán Bàu"],
          [16705, "Phường Hưng Bình"],
        ],
      },
      {
        code: 413,
        name: "Thị xã Cửa Lò",
        wards: [
          [16759, "Phường Nghi Thủy"],
          [16762, "Phường Nghi Tân"],
          [16765, "Phường Thu Thủy"],
        ],
      },
      {
        code: 415,
        name: "Huyện Quỳnh Lưu",
        wards: [
          [16852, "Thị trấn Cầu Giát"],
          [16855, "Xã Quỳnh Thắng"],
          [16858, "Xã Quỳnh Tam"],
        ],
      },
    ],
  },
  {
    code: 56,
    name: "Tỉnh Khánh Hòa",
    phone_code: 258,
    districts: [
      {
        code: 568,
        name: "Thành phố Nha Trang",
        wards: [
          [22357, "Phường Vĩnh Hòa"],
          [22360, "Phường Vĩnh Hải"],
          [22363, "Phường Vĩnh Phước"],
          [22366, "Phường Ngọc Hiệp"],
          [22369, "Phường Vĩnh Thọ"],
        ],
      },
      {
        code: 569,
        name: "Thành phố Cam Ranh",
        wards: [
          [22405, "Phường Cam Nghĩa"],
          [22408, "Phường Cam Phúc Bắc"],
          [22411, "Phường Cam Phúc Nam"],
        ],
      },
      {
        code: 571,
        name: "Thị xã Ninh Hòa",
        wards: [
          [22483, "Phường Ninh Hiệp"],
          [22486, "Xã Ninh Sơn"],
          [22489, "Xã Ninh Tây"],
        ],
      },
    ],
  },
  {
    code: 68,
    name: "Tỉnh Lâm Đồng",
    phone_code: 263,
    districts: [
      {
        code: 672,
        name: "Thành phố Đà Lạt",
        wards: [
          [24730, "Phường 7"],
          [24733, "Phường 8"],
          [24736, "Phường 12"],
          [24739, "Phường 11"],
          [24742, "Phường 6"],
        ],
      },
      {
        code: 673,
        name: "Thành phố Bảo Lộc",
        wards: [
          [24784, "Phường Lộc Phát"],
          [24787, "Phường Lộc Tiến"],
          [24790, "Phường 1"],
          [24793, "Phường 2"],
        ],
      },
      {
        code: 678,
        name: "Huyện Đức Trọng",
        wards: [
          [24925, "Thị trấn Liên Nghĩa"],
          [24928, "Xã Hiệp An"],
          [24931, "Xã Liên Hiệp"],
        ],
      },
    ],
  },
  {
    code: 89,
    name: "Tỉnh An Giang",
    phone_code: 296,
    districts: [
      {
        code: 883,
        name: "Thành phố Long Xuyên",
        wards: [
          [30271, "Phường Mỹ Bình"],
          [30274, "Phường Mỹ Long"],
          [30277, "Phường Đông Xuyên"],
          [30280, "Phường Mỹ Xuyên"],
        ],
      },
      {
        code: 884,
        name: "Thành phố Châu Đốc",
        wards: [
          [30310, "Phường Châu Phú B"],
          [30313, "Phường Châu Phú A"],
          [30316, "Phường Vĩnh Mỹ"],
        ],
      },
      {
        code: 887,
        name: "Thị xã Tân Châu",
        wards: [
          [30337, "Phường Long Thạnh"],
          [30340, "Phường Long Hưng"],
          [30343, "Phường Long Châu"],
        ],
      },
    ],
  },
];

/* =========================================================
   BUNG DỮ LIỆU THÀNH CÂY ĐẦY ĐỦ
   ========================================================= */

const buildWard = (rawWard, districtCode) => {
  const [code, name] = rawWard;

  return {
    name,
    code,
    codename: toCodename(name),
    division_type: toDivisionType(name, "ward"),
    district_code: districtCode,
  };
};

const buildDistrict = (rawDistrict, provinceCode) => ({
  name: rawDistrict.name,
  code: rawDistrict.code,
  codename: toCodename(rawDistrict.name),
  division_type: toDivisionType(rawDistrict.name, "district"),
  province_code: provinceCode,
  wards: (rawDistrict.wards || []).map((rawWard) =>
    buildWard(rawWard, rawDistrict.code)
  ),
});

const buildProvince = (rawProvince) => ({
  name: rawProvince.name,
  code: rawProvince.code,
  codename: toCodename(rawProvince.name),
  division_type: toDivisionType(rawProvince.name, "province"),
  phone_code: rawProvince.phone_code,
  districts: (rawProvince.districts || []).map((rawDistrict) =>
    buildDistrict(rawDistrict, rawProvince.code)
  ),
});

/**
 * Cây địa giới đầy đủ: tỉnh -> districts -> wards.
 * Đây là nguồn duy nhất; hai mảng phẳng bên dưới chỉ là view của nó.
 */
export const provinces = RAW_PROVINCES.map(buildProvince);

/** Mảng phẳng quận/huyện (vẫn giữ wards lồng bên trong). */
export const districts = provinces.flatMap(
  (province) => province.districts
);

/** Mảng phẳng phường/xã. */
export const wards = districts.flatMap(
  (district) => district.wards
);

export default {
  provinces,
  districts,
  wards,
};
