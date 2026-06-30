import {
    useCallback,
    useEffect,
    useRef,
    useState,
  } from "react";
  import { useNavigate } from "react-router-dom";
  import {
    CloseOutlined,
    EnvironmentFilled,
  } from "@ant-design/icons";
  
  import { BRAND } from "../../pages/HomePage/data/homeData";
  import "./LogisticsIntro.css";
  
  const INTRO_STORAGE_KEY =
    "vietnam-logictic-intro-seen";
  
  const INTRO_DURATION = 7200;
  const CLOSING_DURATION = 650;
  
  export default function LogisticsIntro() {
    const navigate = useNavigate();
  
    const [isClosing, setIsClosing] = useState(false);
  
    const closedRef = useRef(false);
    const autoCloseTimerRef = useRef(null);
    const navigateTimerRef = useRef(null);
    const previousOverflowRef = useRef("");
  
    const goToHome = useCallback(() => {
      document.body.style.overflow =
        previousOverflowRef.current;
  
      navigate("/home", {
        replace: true,
      });
    }, [navigate]);
  
    const closeIntro = useCallback(() => {
      if (closedRef.current) {
        return;
      }
  
      closedRef.current = true;
  
      window.clearTimeout(autoCloseTimerRef.current);
  
      setIsClosing(true);
  
      try {
        window.sessionStorage.setItem(
          INTRO_STORAGE_KEY,
          "true"
        );
      } catch {
        // Vẫn chuyển trang khi sessionStorage bị chặn.
      }
  
      navigateTimerRef.current = window.setTimeout(
        goToHome,
        CLOSING_DURATION
      );
    }, [goToHome]);
  
    useEffect(() => {
      previousOverflowRef.current =
        document.body.style.overflow;
  
      let hasSeenIntro = false;
  
      try {
        hasSeenIntro =
          window.sessionStorage.getItem(
            INTRO_STORAGE_KEY
          ) === "true";
      } catch {
        hasSeenIntro = false;
      }
  
      /*
        Nếu đã xem intro trong phiên hiện tại,
        chuyển thẳng vào trang Home.
      */
      if (hasSeenIntro) {
        goToHome();
        return undefined;
      }
  
      document.body.style.overflow = "hidden";
  
      autoCloseTimerRef.current = window.setTimeout(
        closeIntro,
        INTRO_DURATION
      );
  
      const handleKeyDown = (event) => {
        if (event.key === "Escape") {
          closeIntro();
        }
      };
  
      window.addEventListener(
        "keydown",
        handleKeyDown
      );
  
      return () => {
        window.clearTimeout(autoCloseTimerRef.current);
        window.clearTimeout(navigateTimerRef.current);
  
        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
  
        document.body.style.overflow =
          previousOverflowRef.current;
      };
    }, [closeIntro, goToHome]);
  
    return (
      <div
        className={`logistics-intro ${
          isClosing ? "is-closing" : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={`Giới thiệu ${BRAND.name}`}
      >
        <button
          type="button"
          className="logistics-intro__skip"
          onClick={closeIntro}
          aria-label="Bỏ qua phần giới thiệu"
        >
          <span>Bỏ qua</span>
          <CloseOutlined />
        </button>
  
        <div
          className="logistics-intro__sky-light logistics-intro__sky-light--one"
          aria-hidden="true"
        />
  
        <div
          className="logistics-intro__sky-light logistics-intro__sky-light--two"
          aria-hidden="true"
        />
  
        <div
          className="logistics-intro__stars"
          aria-hidden="true"
        >
          {Array.from({ length: 26 }).map(
            (_, index) => (
              <span
                key={index}
                style={{
                  "--star-x": `${
                    (index * 37) % 100
                  }%`,
                  "--star-y": `${
                    (index * 53) % 68
                  }%`,
                  "--star-delay": `${
                    (index % 8) * 0.18
                  }s`,
                  "--star-size": `${
                    2 + (index % 3)
                  }px`,
                }}
              />
            )
          )}
        </div>
  
        <div className="logistics-intro__brand">
          <span className="logistics-intro__brand-label">
            HÀNH TRÌNH XUYÊN BIÊN GIỚI
          </span>
  
          <h1>
            <span>{BRAND.name}</span>
  
            <strong>
              Kết nối hàng hóa về Việt Nam
            </strong>
          </h1>
  
          <p>
            Từ kho quốc tế đến tận tay khách hàng
          </p>
        </div>
  
        <div className="logistics-intro__scene">
          <div
            className="logistics-intro__ground"
            aria-hidden="true"
          />
  
          <svg
            className="logistics-intro__route"
            viewBox="0 0 1000 500"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="logisticsRouteGradient"
                x1="0%"
                y1="100%"
                x2="100%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  stopColor="#48a9e6"
                />
  
                <stop
                  offset="52%"
                  stopColor="#ffffff"
                />
  
                <stop
                  offset="100%"
                  stopColor="#ffcc4d"
                />
              </linearGradient>
  
              <filter id="logisticsRouteGlow">
                <feGaussianBlur
                  stdDeviation="5"
                  result="blur"
                />
  
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
  
            <path
              className="logistics-intro__route-shadow"
              d="M110 390 C290 110 620 55 875 250"
            />
  
            <path
              className="logistics-intro__route-line"
              d="M110 390 C290 110 620 55 875 250"
            />
          </svg>
  
          <div className="logistics-intro__warehouse">
            <div className="logistics-intro__warehouse-pin">
              <span />
              KHO QUỐC TẾ
            </div>
  
            <div className="logistics-intro__warehouse-building">
              <div className="logistics-intro__warehouse-roof" />
  
              <div className="logistics-intro__warehouse-sign">
                GLOBAL WAREHOUSE
              </div>
  
              <div className="logistics-intro__warehouse-door">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
  
              <div className="logistics-intro__warehouse-window logistics-intro__warehouse-window--one" />
  
              <div className="logistics-intro__warehouse-window logistics-intro__warehouse-window--two" />
            </div>
  
            <div className="logistics-intro__packages">
              <span>
                {BRAND.name
                  ?.trim()
                  ?.charAt(0)
                  ?.toUpperCase() || "V"}
              </span>
  
              <span>VN</span>
              <span />
            </div>
  
            <div className="logistics-intro__warehouse-shadow" />
          </div>
  
          <div
            className="logistics-intro__plane-path"
            aria-hidden="true"
          >
            <div className="logistics-intro__plane-trail">
              <span />
              <span />
              <span />
            </div>
  
            <div className="logistics-intro__plane">
              <span className="logistics-intro__plane-body" />
  
              <span className="logistics-intro__plane-nose" />
  
              <span className="logistics-intro__plane-wing logistics-intro__plane-wing--top" />
  
              <span className="logistics-intro__plane-wing logistics-intro__plane-wing--bottom" />
  
              <span className="logistics-intro__plane-tail" />
  
              <span className="logistics-intro__plane-windows">
                <i />
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
  
          <div className="logistics-intro__destination">
            <div className="logistics-intro__destination-radar">
              <span />
              <span />
              <span />
            </div>
  
            <div className="logistics-intro__destination-card">
              <div className="logistics-intro__flag">
                <span>★</span>
              </div>
  
              <div className="logistics-intro__destination-info">
                <small>ĐIỂM ĐẾN</small>
                <strong>VIỆT NAM</strong>
  
                <span>
                  <EnvironmentFilled />
                  Hàng đã về đến nơi
                </span>
              </div>
            </div>
  
            <div
              className="logistics-intro__city"
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
  
        <div className="logistics-intro__status">
          <div className="logistics-intro__status-text">
            <span className="logistics-intro__status-step logistics-intro__status-step--one">
              Đang tiếp nhận hàng tại kho quốc tế...
            </span>
  
            <span className="logistics-intro__status-step logistics-intro__status-step--two">
              Máy bay đang vận chuyển hàng hóa...
            </span>
  
            <span className="logistics-intro__status-step logistics-intro__status-step--three">
              Hàng đã cập bến Việt Nam!
            </span>
          </div>
  
          <div className="logistics-intro__progress">
            <span />
          </div>
  
          <div className="logistics-intro__progress-labels">
            <span>Kho quốc tế</span>
            <span>Vận chuyển</span>
            <span>Việt Nam</span>
          </div>
        </div>
      </div>
    );
  }