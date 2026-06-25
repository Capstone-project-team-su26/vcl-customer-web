import React, { useState, useRef } from "react";
import { Carousel } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import "./HeroCarousel.css";

// Đảm bảo chính xác đường dẫn đến thư mục chứa ảnh của bạn
// Cập nhật import hình ảnh từ các tệp được cung cấp cho 5 slide chính
import imgMuaHo from "../../assets/hero.png"; // Slide "Mua hàng hộ" (ảnh gốc đầy đủ)
import imgKyGui from "../../assets/hero.png"; // Slide "Ký gửi tại kho" (ảnh gốc isometric đầy đủ)
import imgThongQuan from "../../assets/hero.png"; // Slide "Thông quan hải quan" (ảnh gốc đầy đủ)

// Các hình ảnh khác (giả sử có sẵn hoặc giữ chỗ cho các mục không có ảnh)
import imgVanChuyen from "../../assets/hero.png"; // Giữ chỗ cho Vận chuyển
import imgDauGia from "../../assets/hero.png"; // Giữ chỗ cho Đấu giá

// Ảnh máy bay PNG xóa phông chạy dọc đường cong
import planeImg from "../../assets/airplan.png";

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef(null);

  // Khai báo đủ dữ liệu cho 5 dịch vụ tương ứng với 5 chấm mốc trên đường cong
  // Điều chỉnh 'progress' để chia đều cho 5 mục: 0%, 25%, 50%, 75%, 100%
  const slideData = [
    {
      title: (<>MUA HÀNG HỘ <br /> <span className="highlight">QUỐC TẾ DỄ DÀNG</span></>),
      tag: "DỊCH VỤ MUA HỘ",
      subTag: "Mua hộ",
      desc: "Dịch vụ mua hộ hàng từ Indonesia, Nhật Bản, Hàn Quốc, Philippines, US, báo giá trọn gói minh bạch.",
      btnText: "Gửi yêu cầu báo giá",
      image: imgMuaHo, // Cập nhật ảnh Mua hàng hộ
      progress: "0%", // Điểm đầu
    },
    {
      title: (<>KÝ GỬI TẠI <br /> <span className="highlight">KHO QUỐC TẾ CHÍNH CHỦ</span></>),
      tag: "DỊCH VỤ KÝ GỬI",
      subTag: "Ký gửi kho",
      desc: "Hàng hóa được lưu kho an toàn, minh bạch tại các kho hàng chính chủ Tiximax: Nhật, Indo, Phil, Việt.",
      btnText: "Tìm hiểu thêm",
      image: imgKyGui, // Cập nhật ảnh Ký gửi kho
      progress: "25%", // Điểm thứ 2
    },
    {
      title: (<>VẬN CHUYỂN <br /> <span className="highlight">QUỐC TẾ SIÊU TỐC</span></>),
      tag: "VẬN CHUYỂN QUỐC TẾ",
      subTag: "Vận chuyển",
      desc: "Tuyến vận chuyển đa quốc gia về Việt Nam bằng đường hàng không và đường biển nhanh chóng, tối ưu.",
      btnText: "Xem bảng giá",
      image: imgVanChuyen, // Giữ chỗ
      progress: "50%", // Điểm giữa
    },
    {
      title: (<>THÔNG QUAN <br /> <span className="highlight">HẢI QUAN CHÍNH NGẠCH</span></>),
      tag: "THÔNG QUAN HẢI QUAN",
      subTag: "Thông quan",
      desc: "Hỗ trợ đầy đủ thủ tục thông quan, tờ khai hải quan nhanh chóng, đúng pháp luật và đầy đủ hóa đơn.",
      btnText: "Liên hệ tư vấn",
      image: imgThongQuan, // Cập nhật ảnh Thông quan
      progress: "75%", // Điểm thứ 4
    },
    {
      title: (<>ĐẤU GIÁ <br /> <span className="highlight">TRỰC TUYẾN QUỐC TẾ</span></>),
      tag: "DỊCH VỤ ĐẤU GIÁ",
      subTag: "Đấu giá",
      desc: "Hỗ trợ đấu giá các mặt hàng độc lạ từ các sàn TMĐT nước ngoài với tỷ lệ thắng cao và an toàn.",
      btnText: "Thử ngay",
      image: imgDauGia, // Giữ chỗ
      progress: "100%", // Điểm cuối
    },
    // Mục Fulfillment đã bị loại bỏ
  ];

  // Chỉ ra lệnh cho Slider nhảy mốc, tuyệt đối không set State thủ công tại đây
  const handleDotClick = (index) => {
    if (carouselRef.current) {
      carouselRef.current.goTo(index);
    }
  };

  return (
    <div className="hero-carousel-wrapper">
      <div className="hero-carousel-container">
        
        {/* ================= BÊN TRÁI: TIMELINE ĐƯỜNG CONG (5 CHẤM) ================= */}
        <div className="timeline-left-container">
          {/* Đường cong SVG mượt mà */}
          <svg className="curve-svg" viewBox="0 0 400 600" fill="none">
            <path
              id="curvePath"
              d="M 50 550 C 120 420, 380 320, 280 50"
              stroke="#e28a16"
              strokeWidth="2"
              strokeDasharray="8,8"
              opacity="0.3"
            />
          </svg>

          {/* Cập nhật timeline-dots JSX để sử dụng CSS Motion Path và inline styles cho 5 dấu chấm */}
          <div className="timeline-dots">
            {slideData.map((slide, idx) => (
              <div
                key={idx}
                className={`dot ${currentSlide === idx ? "active" : ""}`}
                style={{
                  "--path-distance": slide.progress, // Sử dụng cùng tiến trình cho dấu chấm
                }}
                onClick={() => handleDotClick(idx)}
              />
            ))}
          </div>

          {/* BLOCK MÁY BAY CHẠY ĐỘNG: Gắn biến `--path-progress` truyền từ React vào CSS */}
          <div 
            className="moving-plane-block"
            style={{ "--path-progress": slideData[currentSlide]?.progress }}
          >
            {/* Tag thông tin màu cam bám theo máy bay */}
            <div className="plane-tag-box">
              <span className="tag-top">{slideData[currentSlide]?.tag}</span>
              <span className="tag-bottom">{slideData[currentSlide]?.subTag}</span>
            </div>
            
            <div className="plane-image-wrapper">
              <img src={planeImg} alt="airplane" className="plane-real-img" />
            </div>
          </div>
        </div>

        {/* ================= TRUNG TÂM VÀ BÊN PHẢI: KHỐI HIỂN THỊ CHỮ / ẢNH ================= */}
        <div className="carousel-right-container">
          <Carousel
            ref={carouselRef}
            autoplay
            autoplaySpeed={5000}
            effect="fade"
            dots={false}
            afterChange={(current) => setCurrentSlide(current)} // Sử dụng afterChange giúp đồng bộ mượt mà không lỗi render
          >
            {slideData.map((slide, index) => (
              <div key={index} className="slide-item">
                <div className="slide-inner-content">
                  
                  {/* KHỐI VĂN BẢN CHỮ NẰM CHÍNH GIỮA */}
                  <div className="content-text-block">
                    <h1 className="hero-title">{slide.title}</h1>
                    <p className="hero-description">{slide.desc}</p>
                    <button className="cta-btn">
                      {slide.btnText} <ArrowRightOutlined />
                    </button>
                  </div>

                  {/* KHỐI ĐỒ HỌA ẢNH ĐẨY HẲN SÁT SANG PHẢI */}
                  <div className="content-image-block">
                    <img src={slide.image} alt={slide.subTag} className="hero-main-img" />
                  </div>

                </div>
              </div>
            ))}
          </Carousel>
        </div>

      </div>
    </div>
  );
}