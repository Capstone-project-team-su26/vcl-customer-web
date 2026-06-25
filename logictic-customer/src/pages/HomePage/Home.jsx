import React from "react";
import Header from "../../layouts/HeaderLayout/Headeer"; // Đã sửa chuẩn lỗi gõ nhanh 'HeaderComponets/Headeer'


export default function Home() {
  return (
    <div className="home-page-wrapper">
      {/* Thanh điều hướng Header Tiximax */}
      <Header />
 

      {/* Khu vực nội dung chính phía dưới banner */}
      <main className="main-content-container">
        <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "40px 20px" }}>
          <h1>Home Page</h1>
        </div>
      </main>
    </div>
  );
}