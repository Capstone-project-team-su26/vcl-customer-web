import { useState } from "react";
import "./ServicePolicy.css";

const POLICY_TABS = [
  {
    id: "weight-rule",
    label: "Quy ước tính kg",
  },
  {
    id: "vn-japan",
    label: "VN → Nhật",
  },
  {
    id: "japan-vn",
    label: "Nhật → VN",
  },
  {
    id: "vn-korea",
    label: "VN → Hàn",
  },
  {
    id: "korea-vn",
    label: "Hàn → VN",
  },
  {
    id: "vn-indonesia",
    label: "VN → Indonesia",
  },
  {
    id: "indonesia-vn",
    label: "Indonesia → VN",
  },
  {
    id: "tax-refund",
    label: "Hoàn thuế",
  },
  {
    id: "japan-fulfillment",
    label: "Fulfillment Nhật",
  },
];

const createRoutePolicy = ({
  eta,
  minimumWeight,
  standardRows,
  specialRows,
  surchargeRows,
  notes,
  notice,
}) => ({
  summary: [
    {
      label: "Thời gian dự kiến",
      value: eta,
    },
    {
      label: "Khối lượng tối thiểu",
      value: minimumWeight,
    },
    {
      label: "Đơn vị tính",
      value: "VNĐ / kg",
    },
    {
      label: "Trạng thái",
      value: "Đang áp dụng",
      status: true,
    },
  ],

  sections: [
    {
      type: "table",
      title: "Bảng giá hàng tiêu chuẩn",
      description:
        "Áp dụng cho hàng thông thường, không chứa pin, chất lỏng hoặc hàng thuộc danh mục kiểm soát.",
      columns: [
        {
          key: "weight",
          label: "KHỐI LƯỢNG",
        },
        {
          key: "price",
          label: "ĐƠN GIÁ",
        },
        {
          key: "time",
          label: "THỜI GIAN",
        },
      ],
      rows: standardRows,
    },
    {
      type: "table",
      title: "Bảng giá hàng đặc biệt",
      description:
        "Đơn giá có thể thay đổi sau khi kiểm tra tên hàng, thành phần, kích thước và yêu cầu đóng gói.",
      columns: [
        {
          key: "type",
          label: "LOẠI HÀNG",
        },
        {
          key: "price",
          label: "ĐƠN GIÁ DỰ KIẾN",
        },
        {
          key: "condition",
          label: "ĐIỀU KIỆN",
        },
      ],
      rows: specialRows,
    },
    {
      type: "table",
      title: "Phụ phí dịch vụ",
      columns: [
        {
          key: "service",
          label: "DỊCH VỤ",
        },
        {
          key: "fee",
          label: "MỨC PHÍ",
        },
        {
          key: "note",
          label: "GHI CHÚ",
        },
      ],
      rows: surchargeRows,
    },
    {
      type: "list",
      title: "Quy định nhận hàng",
      items: notes,
    },
  ],

  notice,
});

const POLICY_DATA = {
  "weight-rule": {
    summary: [
      {
        label: "Cân tối thiểu",
        value: "1 kg",
      },
      {
        label: "Trọng lượng thể tích",
        value: "D × R × C / 6.000",
      },
      {
        label: "Giới hạn kiện",
        value: "30 kg / kiện",
      },
      {
        label: "Tình trạng",
        value: "Đang áp dụng",
        status: true,
      },
    ],

    sections: [
      {
        type: "info",
        title: "Hàng cồng kềnh",
        paragraphs: [
          "Kiện hàng bị tính cồng kềnh khi kích thước lớn hơn 60 × 40 × 40 cm, tổng ba chiều lớn hơn 140 cm hoặc trọng lượng thực tế lớn hơn 30 kg.",
          "Đối với hàng cồng kềnh, trọng lượng tính cước là giá trị lớn hơn giữa trọng lượng thực tế và trọng lượng thể tích.",
        ],
      },
      {
        type: "info",
        title: "Công thức trọng lượng thể tích",
        paragraphs: [
          "Trọng lượng thể tích = (Dài × Rộng × Cao) / 6.000.",
          "Dài, Rộng và Cao được tính bằng centimet. Kết quả trọng lượng được tính bằng kilogram.",
        ],
      },
      {
        type: "table",
        title: "Làm tròn chung",
        columns: [
          {
            key: "weight",
            label: "TRỌNG LƯỢNG",
          },
          {
            key: "rule",
            label: "CÁCH LÀM TRÒN",
          },
        ],
        rows: [
          {
            weight: "Dưới 1 kg",
            rule: "Làm tròn thành 1 kg",
          },
          {
            weight: "Trên 1 kg",
            rule:
              "Làm tròn 1 chữ số thập phân. Ví dụ: 2,04 kg → 2 kg; 2,05 kg → 2,1 kg",
          },
        ],
      },
      {
        type: "table",
        title: "Tuyến VN → Nhật — Hàng hỗn hợp",
        columns: [
          {
            key: "weight",
            label: "TRỌNG LƯỢNG LẺ",
          },
          {
            key: "rule",
            label: "CÁCH LÀM TRÒN",
          },
        ],
        rows: [
          {
            weight: "Dưới 0,1 kg",
            rule:
              "Làm tròn xuống. Ví dụ: 2,09 kg → 2 kg",
          },
          {
            weight: "Từ 0,1 kg trở lên",
            rule:
              "Làm tròn lên kg kế tiếp. Ví dụ: 2,1 kg → 3 kg",
          },
        ],
      },
      {
        type: "table",
        title: "Tuyến VN → Nhật — Hàng sạch",
        description:
          "Hàng sạch được làm tròn theo từng mốc 0,5 kg.",
        columns: [
          {
            key: "actual",
            label: "CÂN THỰC TẾ",
          },
          {
            key: "charged",
            label: "CÂN TÍNH CƯỚC",
          },
        ],
        rows: [
          {
            actual: "1,01 – 1,5 kg",
            charged: "1,5 kg",
          },
          {
            actual: "1,51 – 2 kg",
            charged: "2 kg",
          },
          {
            actual: "2,2 kg",
            charged: "2,5 kg",
          },
          {
            actual: "2,6 kg",
            charged: "3 kg",
          },
        ],
      },
    ],

    notice:
      "Việc xác định trọng lượng cuối cùng được thực hiện tại kho sau khi kiện hàng được kiểm tra, cân đo và đóng gói hoàn chỉnh.",
  },

  "vn-japan": createRoutePolicy({
    eta: "4 – 6 ngày",
    minimumWeight: "1 kg",

    standardRows: [
      {
        weight: "1 – 4,9 kg",
        price: "215.000đ / kg",
        time: "4 – 6 ngày",
      },
      {
        weight: "5 – 19,9 kg",
        price: "195.000đ / kg",
        time: "4 – 6 ngày",
      },
      {
        weight: "20 – 49,9 kg",
        price: "178.000đ / kg",
        time: "4 – 7 ngày",
      },
      {
        weight: "Từ 50 kg",
        price: "Liên hệ báo giá",
        time: "Theo lịch bay",
      },
    ],

    specialRows: [
      {
        type: "Thực phẩm khô",
        price: "245.000đ / kg",
        condition: "Có nhãn và hạn sử dụng",
      },
      {
        type: "Mỹ phẩm",
        price: "265.000đ / kg",
        condition: "Không chứa chất cấm",
      },
      {
        type: "Thiết bị có pin",
        price: "295.000đ / kg",
        condition: "Kiểm tra loại pin trước khi gửi",
      },
      {
        type: "Hàng dễ vỡ",
        price: "Từ 235.000đ / kg",
        condition: "Bắt buộc đóng chống sốc",
      },
    ],

    surchargeRows: [
      {
        service: "Nhận hàng nội thành TP.HCM",
        fee: "30.000đ / lần",
        note: "Miễn phí từ 30 kg",
      },
      {
        service: "Đóng kiện gỗ",
        fee: "Từ 250.000đ",
        note: "Tính theo kích thước thực tế",
      },
      {
        service: "Bảo hiểm hàng hóa",
        fee: "1% giá trị khai báo",
        note: "Tối thiểu 30.000đ",
      },
      {
        service: "Giao vùng xa tại Nhật",
        fee: "Theo mã bưu điện",
        note: "Báo trước khi xuất kho",
      },
    ],

    notes: [
      "Người gửi phải cung cấp tên hàng, số lượng và giá trị khai báo chính xác.",
      "Không nhận chất cháy nổ, chất cấm, tiền mặt, động vật sống và hàng vi phạm bản quyền.",
      "Thực phẩm, mỹ phẩm và thuốc cần được kiểm tra trước khi gửi.",
      "Thời gian vận chuyển không bao gồm thời gian kiểm hóa hoặc chậm chuyến bay.",
    ],

    notice:
      "Giá chưa bao gồm thuế nhập khẩu, phí kiểm hóa, phí lưu kho quá hạn và phụ phí giao hàng vùng xa tại Nhật Bản.",
  }),

  "japan-vn": createRoutePolicy({
    eta: "3 – 5 ngày",
    minimumWeight: "1 kg",

    standardRows: [
      {
        weight: "1 – 4,9 kg",
        price: "165.000đ / kg",
        time: "3 – 5 ngày",
      },
      {
        weight: "5 – 19,9 kg",
        price: "148.000đ / kg",
        time: "3 – 5 ngày",
      },
      {
        weight: "20 – 49,9 kg",
        price: "135.000đ / kg",
        time: "3 – 6 ngày",
      },
      {
        weight: "Từ 50 kg",
        price: "125.000đ / kg",
        time: "Theo lịch bay",
      },
    ],

    specialRows: [
      {
        type: "Mỹ phẩm và nước hoa",
        price: "180.000đ / kg",
        condition: "Khai báo đầy đủ dung tích",
      },
      {
        type: "Thiết bị điện tử",
        price: "175.000đ / kg",
        condition: "Không bao gồm pin rời",
      },
      {
        type: "Hàng có pin",
        price: "205.000đ / kg",
        condition: "Kiểm tra pin lithium",
      },
      {
        type: "Hàng cồng kềnh",
        price: "Từ 190.000đ / kg",
        condition: "Tính theo trọng lượng thể tích",
      },
    ],

    surchargeRows: [
      {
        service: "Nhận hàng tại kho Nhật",
        fee: "Miễn phí",
        note: "Trong giờ làm việc",
      },
      {
        service: "Nhận hàng tận nơi tại Nhật",
        fee: "Từ 1.200 JPY",
        note: "Theo khu vực",
      },
      {
        service: "Đóng gói lại",
        fee: "Từ 300 JPY / kiện",
        note: "Tùy vật liệu",
      },
      {
        service: "Giao nội địa Việt Nam",
        fee: "Theo đơn vị vận chuyển",
        note: "Tính theo địa chỉ nhận",
      },
    ],

    notes: [
      "Khách hàng cần ghi đúng mã khách hàng trên mỗi kiện gửi về kho Nhật.",
      "Hàng điện tử phải được khai báo model, số lượng và tình trạng mới hoặc đã qua sử dụng.",
      "Không nhận hàng giả, hàng không rõ nguồn gốc và hàng thuộc danh mục cấm nhập khẩu.",
      "Kiện hàng không có mã khách hàng có thể bị chậm xử lý.",
    ],

    notice:
      "Cước phí có thể thay đổi đối với hàng giá trị cao, hàng nguyên seal số lượng lớn hoặc hàng cần giấy phép nhập khẩu.",
  }),

  "vn-korea": createRoutePolicy({
    eta: "4 – 7 ngày",
    minimumWeight: "1 kg",

    standardRows: [
      {
        weight: "1 – 4,9 kg",
        price: "190.000đ / kg",
        time: "4 – 7 ngày",
      },
      {
        weight: "5 – 19,9 kg",
        price: "172.000đ / kg",
        time: "4 – 7 ngày",
      },
      {
        weight: "20 – 49,9 kg",
        price: "158.000đ / kg",
        time: "5 – 7 ngày",
      },
      {
        weight: "Từ 50 kg",
        price: "Liên hệ báo giá",
        time: "Theo lịch bay",
      },
    ],

    specialRows: [
      {
        type: "Thực phẩm khô",
        price: "220.000đ / kg",
        condition: "Có bao bì và hạn sử dụng",
      },
      {
        type: "Mỹ phẩm",
        price: "235.000đ / kg",
        condition: "Khai báo thành phần",
      },
      {
        type: "Thuốc và thực phẩm chức năng",
        price: "Từ 260.000đ / kg",
        condition: "Kiểm tra trước khi nhận",
      },
      {
        type: "Hàng dễ vỡ",
        price: "Từ 215.000đ / kg",
        condition: "Đóng chống sốc",
      },
    ],

    surchargeRows: [
      {
        service: "Nhận hàng tại TP.HCM",
        fee: "30.000đ / lần",
        note: "Miễn phí từ 30 kg",
      },
      {
        service: "Đóng chống sốc",
        fee: "Từ 50.000đ",
        note: "Tùy kích thước",
      },
      {
        service: "Đóng kiện gỗ",
        fee: "Từ 250.000đ",
        note: "Theo kích thước kiện",
      },
      {
        service: "Bảo hiểm",
        fee: "1% giá trị hàng",
        note: "Có hóa đơn mua hàng",
      },
    ],

    notes: [
      "Hàng gửi sang Hàn Quốc phải có thông tin người nhận đầy đủ và số điện thoại liên hệ.",
      "Thực phẩm phải còn nguyên bao bì, có thành phần và hạn sử dụng rõ ràng.",
      "Không nhận thịt tươi sống, hạt giống, chất lỏng dễ cháy và hàng cấm.",
      "Một số mặt hàng có thể yêu cầu mã thông quan cá nhân của người nhận tại Hàn Quốc.",
    ],

    notice:
      "Người nhận tại Hàn Quốc chịu trách nhiệm cung cấp thông tin thông quan khi cơ quan hải quan yêu cầu.",
  }),

  "korea-vn": createRoutePolicy({
    eta: "3 – 5 ngày",
    minimumWeight: "1 kg",

    standardRows: [
      {
        weight: "1 – 4,9 kg",
        price: "150.000đ / kg",
        time: "3 – 5 ngày",
      },
      {
        weight: "5 – 19,9 kg",
        price: "138.000đ / kg",
        time: "3 – 5 ngày",
      },
      {
        weight: "20 – 49,9 kg",
        price: "128.000đ / kg",
        time: "3 – 6 ngày",
      },
      {
        weight: "Từ 50 kg",
        price: "118.000đ / kg",
        time: "Theo lịch bay",
      },
    ],

    specialRows: [
      {
        type: "Mỹ phẩm Hàn Quốc",
        price: "165.000đ / kg",
        condition: "Số lượng sử dụng cá nhân",
      },
      {
        type: "Thực phẩm chức năng",
        price: "185.000đ / kg",
        condition: "Kiểm tra thành phần",
      },
      {
        type: "Thiết bị điện tử",
        price: "170.000đ / kg",
        condition: "Khai báo model và giá trị",
      },
      {
        type: "Hàng có pin",
        price: "195.000đ / kg",
        condition: "Phân loại trước khi gửi",
      },
    ],

    surchargeRows: [
      {
        service: "Nhận hàng tận nơi tại Hàn",
        fee: "Từ 8.000 KRW",
        note: "Theo khu vực",
      },
      {
        service: "Kiểm đếm sản phẩm",
        fee: "500 KRW / sản phẩm",
        note: "Theo yêu cầu",
      },
      {
        service: "Chụp ảnh hàng hóa",
        fee: "3.000 KRW / kiện",
        note: "Tối đa 5 ảnh",
      },
      {
        service: "Giao nội địa Việt Nam",
        fee: "Theo đơn vị giao hàng",
        note: "Tính theo địa chỉ",
      },
    ],

    notes: [
      "Mỗi kiện cần ghi rõ mã khách hàng và số điện thoại người nhận.",
      "Hàng mua từ nhiều cửa hàng có thể gom chung trước khi vận chuyển.",
      "Hàng đã qua sử dụng cần khai báo rõ tình trạng.",
      "Không nhận hàng giả thương hiệu hoặc hàng bị hạn chế nhập khẩu.",
    ],

    notice:
      "Giá chưa bao gồm thuế nhập khẩu đối với đơn hàng thương mại hoặc số lượng vượt mức sử dụng cá nhân.",
  }),

  "vn-indonesia": createRoutePolicy({
    eta: "5 – 8 ngày",
    minimumWeight: "1 kg",

    standardRows: [
      {
        weight: "1 – 4,9 kg",
        price: "220.000đ / kg",
        time: "5 – 8 ngày",
      },
      {
        weight: "5 – 19,9 kg",
        price: "202.000đ / kg",
        time: "5 – 8 ngày",
      },
      {
        weight: "20 – 49,9 kg",
        price: "188.000đ / kg",
        time: "6 – 9 ngày",
      },
      {
        weight: "Từ 50 kg",
        price: "Liên hệ báo giá",
        time: "Theo lịch bay",
      },
    ],

    specialRows: [
      {
        type: "Thực phẩm đóng gói",
        price: "250.000đ / kg",
        condition: "Có nhãn sản phẩm",
      },
      {
        type: "Mỹ phẩm",
        price: "265.000đ / kg",
        condition: "Không chứa thành phần cấm",
      },
      {
        type: "Linh kiện điện tử",
        price: "240.000đ / kg",
        condition: "Khai báo tên linh kiện",
      },
      {
        type: "Hàng cồng kềnh",
        price: "Từ 260.000đ / kg",
        condition: "Tính cân thể tích",
      },
    ],

    surchargeRows: [
      {
        service: "Nhận hàng nội thành",
        fee: "30.000đ / lần",
        note: "Miễn phí từ 30 kg",
      },
      {
        service: "Đóng chống nước",
        fee: "Từ 30.000đ",
        note: "Theo kích thước",
      },
      {
        service: "Đóng kiện gỗ",
        fee: "Từ 250.000đ",
        note: "Theo thực tế",
      },
      {
        service: "Giao vùng đảo",
        fee: "Theo địa chỉ",
        note: "Báo giá riêng",
      },
    ],

    notes: [
      "Người nhận cần cung cấp địa chỉ đầy đủ, mã bưu điện và số điện thoại Indonesia.",
      "Một số mặt hàng cần giấy phép hoặc chứng nhận nhập khẩu.",
      "Không nhận chất lỏng dễ cháy, hàng quân dụng, thuốc không rõ nguồn gốc.",
      "Thời gian giao vùng đảo có thể kéo dài thêm từ 2 đến 5 ngày.",
    ],

    notice:
      "Cước giao chặng cuối tại các đảo xa Indonesia có thể phát sinh thêm tùy theo mã bưu điện.",
  }),

  "indonesia-vn": createRoutePolicy({
    eta: "5 – 8 ngày",
    minimumWeight: "1 kg",

    standardRows: [
      {
        weight: "1 – 4,9 kg",
        price: "180.000đ / kg",
        time: "5 – 8 ngày",
      },
      {
        weight: "5 – 19,9 kg",
        price: "165.000đ / kg",
        time: "5 – 8 ngày",
      },
      {
        weight: "20 – 49,9 kg",
        price: "152.000đ / kg",
        time: "6 – 9 ngày",
      },
      {
        weight: "Từ 50 kg",
        price: "140.000đ / kg",
        time: "Theo lịch bay",
      },
    ],

    specialRows: [
      {
        type: "Cà phê và thực phẩm khô",
        price: "200.000đ / kg",
        condition: "Bao bì nguyên vẹn",
      },
      {
        type: "Mỹ phẩm",
        price: "215.000đ / kg",
        condition: "Khai báo số lượng",
      },
      {
        type: "Đồ thủ công",
        price: "190.000đ / kg",
        condition: "Không chứa gỗ quý",
      },
      {
        type: "Hàng có pin",
        price: "235.000đ / kg",
        condition: "Kiểm tra trước khi nhận",
      },
    ],

    surchargeRows: [
      {
        service: "Nhận hàng tại Jakarta",
        fee: "Từ 50.000 IDR",
        note: "Theo khoảng cách",
      },
      {
        service: "Kiểm đếm",
        fee: "5.000 IDR / sản phẩm",
        note: "Theo yêu cầu",
      },
      {
        service: "Đóng gói lại",
        fee: "Từ 40.000 IDR",
        note: "Tùy vật liệu",
      },
      {
        service: "Giao nội địa Việt Nam",
        fee: "Theo hãng vận chuyển",
        note: "Theo địa chỉ nhận",
      },
    ],

    notes: [
      "Khách hàng cần ghi mã kho và mã khách hàng trên kiện hàng.",
      "Hàng thực phẩm cần có ngày sản xuất, hạn sử dụng và thành phần.",
      "Sản phẩm làm từ động vật, thực vật hoặc gỗ cần kiểm tra trước.",
      "Không nhận hàng thuộc danh mục cấm xuất khẩu của Indonesia.",
    ],

    notice:
      "Các kiện gửi từ ngoài khu vực Jakarta có thể phát sinh phí vận chuyển nội địa Indonesia.",
  }),

  "tax-refund": {
    summary: [
      {
        label: "Thời gian xử lý",
        value: "7 – 14 ngày",
      },
      {
        label: "Giá trị tối thiểu",
        value: "10.000 JPY",
      },
      {
        label: "Phương thức",
        value: "Chuyển khoản",
      },
      {
        label: "Tình trạng",
        value: "Đang áp dụng",
        status: true,
      },
    ],

    sections: [
      {
        type: "table",
        title: "Phí dịch vụ hoàn thuế",
        columns: [
          {
            key: "value",
            label: "GIÁ TRỊ HÓA ĐƠN",
          },
          {
            key: "fee",
            label: "PHÍ DỊCH VỤ",
          },
          {
            key: "time",
            label: "THỜI GIAN XỬ LÝ",
          },
        ],
        rows: [
          {
            value: "10.000 – 49.999 JPY",
            fee: "15% số tiền thuế",
            time: "10 – 14 ngày",
          },
          {
            value: "50.000 – 199.999 JPY",
            fee: "12% số tiền thuế",
            time: "7 – 12 ngày",
          },
          {
            value: "200.000 – 499.999 JPY",
            fee: "10% số tiền thuế",
            time: "7 – 10 ngày",
          },
          {
            value: "Từ 500.000 JPY",
            fee: "Liên hệ",
            time: "Theo hồ sơ",
          },
        ],
      },
      {
        type: "table",
        title: "Hồ sơ cần cung cấp",
        columns: [
          {
            key: "document",
            label: "HỒ SƠ",
          },
          {
            key: "requirement",
            label: "YÊU CẦU",
          },
        ],
        rows: [
          {
            document: "Hóa đơn mua hàng",
            requirement:
              "Ảnh hoặc bản scan rõ toàn bộ nội dung",
          },
          {
            document: "Thông tin đơn hàng",
            requirement:
              "Mã đơn, ngày mua, cửa hàng và giá trị",
          },
          {
            document: "Chứng từ thanh toán",
            requirement:
              "Biên nhận thẻ hoặc chuyển khoản",
          },
          {
            document: "Thông tin nhận tiền",
            requirement:
              "Tên chủ tài khoản và số tài khoản",
          },
        ],
      },
      {
        type: "list",
        title: "Điều kiện hoàn thuế",
        items: [
          "Hàng hóa phải được mua tại cửa hàng hoặc website có hỗ trợ xuất hóa đơn.",
          "Thông tin người mua phải khớp với hồ sơ được cung cấp.",
          "Hóa đơn không được tẩy xóa, chỉnh sửa hoặc sử dụng cho yêu cầu hoàn thuế khác.",
          "Một số nhóm hàng tiêu dùng, dịch vụ hoặc hàng đã sử dụng có thể không được hoàn thuế.",
          "Thời gian xử lý được tính từ khi nhận đủ hồ sơ hợp lệ.",
        ],
      },
    ],

    notice:
      "Số tiền hoàn thực tế phụ thuộc vào hồ sơ, chính sách cửa hàng và quy định thuế tại thời điểm xử lý.",
  },

  "japan-fulfillment": {
    summary: [
      {
        label: "Kho vận hành",
        value: "Tokyo · Osaka",
      },
      {
        label: "Xử lý đơn",
        value: "Trong 24 giờ",
      },
      {
        label: "Đơn vị tính",
        value: "JPY",
      },
      {
        label: "Tình trạng",
        value: "Đang áp dụng",
        status: true,
      },
    ],

    sections: [
      {
        type: "table",
        title: "Phí nhập kho và lưu kho",
        columns: [
          {
            key: "service",
            label: "DỊCH VỤ",
          },
          {
            key: "fee",
            label: "MỨC PHÍ",
          },
          {
            key: "note",
            label: "GHI CHÚ",
          },
        ],
        rows: [
          {
            service: "Nhận kiện vào kho",
            fee: "180 JPY / kiện",
            note: "Kiện dưới 20 kg",
          },
          {
            service: "Kiểm đếm sản phẩm",
            fee: "20 JPY / sản phẩm",
            note: "Kiểm số lượng cơ bản",
          },
          {
            service: "Lưu kho 30 ngày đầu",
            fee: "5 JPY / sản phẩm / ngày",
            note: "Tính từ ngày nhập kho",
          },
          {
            service: "Lưu kho từ ngày 31",
            fee: "8 JPY / sản phẩm / ngày",
            note: "Áp dụng hàng lưu lâu",
          },
          {
            service: "Lưu kho hàng cồng kềnh",
            fee: "Từ 100 JPY / ngày",
            note: "Theo kích thước kiện",
          },
        ],
      },
      {
        type: "table",
        title: "Phí xử lý đơn hàng",
        columns: [
          {
            key: "service",
            label: "DỊCH VỤ",
          },
          {
            key: "fee",
            label: "MỨC PHÍ",
          },
          {
            key: "note",
            label: "GHI CHÚ",
          },
        ],
        rows: [
          {
            service: "Lấy và đóng gói đơn đầu tiên",
            fee: "120 JPY / đơn",
            note: "Bao gồm 1 sản phẩm",
          },
          {
            service: "Sản phẩm tiếp theo",
            fee: "25 JPY / sản phẩm",
            note: "Cùng một đơn",
          },
          {
            service: "In phiếu giao hàng",
            fee: "20 JPY / tờ",
            note: "Khổ A4 hoặc A5",
          },
          {
            service: "Dán nhãn sản phẩm",
            fee: "30 JPY / nhãn",
            note: "Khách cung cấp nội dung",
          },
          {
            service: "Đóng gói quà tặng",
            fee: "Từ 150 JPY / đơn",
            note: "Theo vật liệu",
          },
        ],
      },
      {
        type: "table",
        title: "Đổi trả và xử lý đặc biệt",
        columns: [
          {
            key: "service",
            label: "DỊCH VỤ",
          },
          {
            key: "fee",
            label: "MỨC PHÍ",
          },
          {
            key: "note",
            label: "GHI CHÚ",
          },
        ],
        rows: [
          {
            service: "Nhận hàng hoàn",
            fee: "250 JPY / đơn",
            note: "Chưa gồm phí vận chuyển",
          },
          {
            service: "Kiểm tra hàng hoàn",
            fee: "50 JPY / sản phẩm",
            note: "Kiểm tra ngoại quan",
          },
          {
            service: "Chụp ảnh sản phẩm",
            fee: "100 JPY / sản phẩm",
            note: "Tối đa 5 ảnh",
          },
          {
            service: "Hủy hàng",
            fee: "Từ 200 JPY / kiện",
            note: "Theo loại hàng",
          },
        ],
      },
      {
        type: "list",
        title: "Quy trình Fulfillment Nhật",
        items: [
          "Khách hàng tạo mã nhập kho trước khi gửi hàng.",
          "Kho tiếp nhận, kiểm đếm và cập nhật số lượng tồn.",
          "Khi có đơn, kho lấy hàng, đóng gói và bàn giao cho hãng vận chuyển.",
          "Mã vận đơn được cập nhật sau khi đơn xuất kho.",
          "Đơn tạo trước 11 giờ có thể được xử lý trong ngày làm việc.",
        ],
      },
    ],

    notice:
      "Phí giao hàng nội địa Nhật Bản được tính theo biểu phí thực tế của Yamato, Sagawa, Japan Post hoặc hãng vận chuyển được lựa chọn.",
  },
};

function PolicySectionTitle({ children }) {
  return (
    <div className="policy-service__section-title">
      <span aria-hidden="true" />
      <h2>{children}</h2>
    </div>
  );
}

function PolicyTable({
  columns,
  rows,
  description,
}) {
  return (
    <>
      {description && (
        <p className="policy-service__section-description">
          {description}
        </p>
      )}

      <div className="policy-service__table-container">
        <table
          className="policy-service__table"
          data-columns={columns.length}
        >
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${columns[0].key}`}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PolicySection({ section }) {
  return (
    <section className="policy-service__section">
      <PolicySectionTitle>
        {section.title}
      </PolicySectionTitle>

      {section.type === "info" && (
        <div className="policy-service__information-box">
          {section.paragraphs.map(
            (paragraph, index) => (
              <p key={index}>{paragraph}</p>
            )
          )}
        </div>
      )}

      {section.type === "table" && (
        <PolicyTable
          columns={section.columns}
          rows={section.rows}
          description={section.description}
        />
      )}

      {section.type === "list" && (
        <div className="policy-service__list-box">
          <ul>
            {section.items.map((item, index) => (
              <li key={index}>
                <span>{index + 1}</span>
                <p>{item}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PolicySummary({ items }) {
  return (
    <div className="policy-service__summary">
      {items.map((item) => (
        <article
          key={item.label}
          className="policy-service__summary-card"
        >
          <span>{item.label}</span>

          <strong
            className={
              item.status
                ? "policy-service__summary-status"
                : ""
            }
          >
            {item.status && <i />}
            {item.value}
          </strong>
        </article>
      ))}
    </div>
  );
}

function PolicyContent({ policy }) {
  return (
    <div className="policy-service__content">
      <PolicySummary items={policy.summary} />

      {policy.sections.map((section, index) => (
        <PolicySection
          key={`${section.title}-${index}`}
          section={section}
        />
      ))}

      <div className="policy-service__notice-box">
        <strong>Lưu ý</strong>
        <p>{policy.notice}</p>
      </div>
    </div>
  );
}

export default function ServicePolicy() {
  const [activeTab, setActiveTab] =
    useState("weight-rule");

  const activePolicy =
    POLICY_DATA[activeTab] ||
    POLICY_DATA["weight-rule"];

  return (
    <main className="policy-service">
      <header className="policy-service__header">
        <h1>CHÍNH SÁCH DỊCH VỤ</h1>

        <p>
          Bảng giá và quy định vận chuyển — cập nhật{" "}
          <strong>11/05/2026</strong>
        </p>
      </header>

      <section className="policy-service__card">
        <div
          className="policy-service__tabs"
          role="tablist"
          aria-label="Danh mục chính sách dịch vụ"
        >
          {POLICY_TABS.map((tab) => {
            const isActive =
              activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`policy-service__tab ${
                  isActive ? "is-active" : ""
                }`}
                onClick={() =>
                  setActiveTab(tab.id)
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          className="policy-service__panel"
          role="tabpanel"
          key={activeTab}
        >
          <PolicyContent policy={activePolicy} />
        </div>
      </section>
    </main>
  );
}