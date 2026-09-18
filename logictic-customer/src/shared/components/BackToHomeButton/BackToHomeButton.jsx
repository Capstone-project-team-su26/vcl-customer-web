import { useNavigate } from "react-router-dom";
import { HomeOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import "./BackToHomeButton.css";

export default function BackToHomeButton({ variant = "pill" }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className={`back-home-btn back-home-btn--${variant}`}
      onClick={() => navigate("/")}
    >
      <ArrowLeftOutlined className="back-home-btn__icon" />
      <HomeOutlined className="back-home-btn__home-icon" />
      <span>Quay về trang chủ</span>
    </button>
  );
}
