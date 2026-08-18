import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  DatePicker,
  Image,
  Input,
  Select,
  Tag,
} from "antd";

import {
  Button,
  CircularProgress,
  Pagination,
} from "@mui/material";

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";

import AuthNotify from "../../../../utils/AuthNotify";
import { getPurchaseRequestsApi } from "../../../../api/PurchaseAPI/purchaseRequestApi";
import { apiToTimestamp, formatVietnamDateTime } from "../../../../utils/timeUtc";

import "./BuyOrderHistoryList.css";

const { RangePicker } = DatePicker;

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

/* =========================================================
   STATUS MAPPER & HELPER FUNCTIONS
   ========================================================= */

const STATUS_FILTERS = {
  ALL: "ALL",
  PENDING_REVIEW: "PENDING_REVIEW", // Chờ duyệt
  WAITING_PAYMENT: "WAITING_PAYMENT", // Chờ thanh toán / Đã báo giá
  PAID: "PAID", // Đã thanh toán / Đã xác nhận
  COMPLETED: "COMPLETED", // Hoàn thành
  REJECTED: "REJECTED", // Đã từ chối / Đã hủy
  PROCESSING: "PROCESSING", // Đang mua hàng
};

const getStatusLabel = (status) => {
  const normalized = String(status || "")
    .trim()
    .toUpperCase();

  switch (normalized) {
    case "PENDING":
    case "PENDING_REVIEW":
    case "SUBMITTED":
      return "Chờ duyệt";
    case "QUOTED":
    case "PENDING_CUSTOMER_CONFIRMATION":
    case "WAITING_PAYMENT":
    case "UNPAID":
      return "Chờ thanh toán / Đã báo giá";
    case "ACCEPTED":
    case "PAID":
    case "CONFIRMED":
    case "APPROVED":
      return "Đã thanh toán / Đã xác nhận";
    case "COMPLETED":
      return "Hoàn thành";
    case "PROCESSING":
    case "IN_PROGRESS":
    case "PURCHASING":
      return "Đang mua hàng";
    case "REJECTED":
    case "CANCELLED":
    case "CANCELED":
    case "FAILED":
      return "Đã từ chối / Đã hủy";
    default:
      return normalized
        ? normalized.replaceAll("_", " ")
        : "Chưa xác định";
  }
};

const getStatusCategory = (status) => {
  const normalized = String(status || "")
    .trim()
    .toUpperCase();

  if (normalized === "COMPLETED") {
    return STATUS_FILTERS.COMPLETED;
  }

  if (
    ["ACCEPTED", "PAID", "CONFIRMED", "APPROVED"].includes(normalized)
  ) {
    return STATUS_FILTERS.PAID;
  }

  if (["REJECTED", "CANCELLED", "CANCELED", "FAILED"].includes(normalized)) {
    return STATUS_FILTERS.REJECTED;
  }

  if (
    [
      "QUOTED",
      "PENDING_CUSTOMER_CONFIRMATION",
      "WAITING_PAYMENT",
      "UNPAID",
    ].includes(normalized)
  ) {
    return STATUS_FILTERS.WAITING_PAYMENT;
  }

  if (["PENDING", "PENDING_REVIEW", "SUBMITTED"].includes(normalized)) {
    return STATUS_FILTERS.PENDING_REVIEW;
  }

  if (["PROCESSING", "IN_PROGRESS", "PURCHASING"].includes(normalized)) {
    return STATUS_FILTERS.PROCESSING;
  }

  return STATUS_FILTERS.ALL;
};

const renderStatusTag = (status) => {
  const normalized = String(status || "")
    .trim()
    .toUpperCase();

  switch (normalized) {
    case "QUOTED":
    case "PENDING_CUSTOMER_CONFIRMATION":
    case "WAITING_PAYMENT":
    case "UNPAID":
      return (
        <Tag color="gold" className="buy-order-status-pill">
          Chờ thanh toán / Đã báo giá
        </Tag>
      );
    case "PENDING":
    case "PENDING_REVIEW":
    case "SUBMITTED":
      return (
        <Tag color="blue" className="buy-order-status-pill">
          Chờ duyệt
        </Tag>
      );
    case "PROCESSING":
    case "IN_PROGRESS":
    case "PURCHASING":
      return (
        <Tag color="purple" className="buy-order-status-pill">
          Đang mua hàng
        </Tag>
      );
    case "ACCEPTED":
    case "PAID":
    case "CONFIRMED":
    case "APPROVED":
      return (
        <Tag color="green" className="buy-order-status-pill">
          Đã thanh toán / Đã xác nhận
        </Tag>
      );
    case "COMPLETED":
      return (
        <Tag color="cyan" className="buy-order-status-pill">
          Hoàn thành
        </Tag>
      );
    case "REJECTED":
    case "CANCELLED":
    case "CANCELED":
    case "FAILED":
      return (
        <Tag color="red" className="buy-order-status-pill">
          Đã từ chối / Đã hủy
        </Tag>
      );
    default:
      return (
        <Tag color="default" className="buy-order-status-pill">
          {normalized || "Chưa xác định"}
        </Tag>
      );
  }
};

const formatShippingOption = (option) => {
  if (!option) return "Tiêu chuẩn";
  const normalized = String(option).trim().toUpperCase();

  switch (normalized) {
    case "STANDARD":
    case "STD":
      return "Tiêu chuẩn";
    case "EXPRESS":
    case "FAST":
      return "Hỏa tốc";
    case "SAVING":
    case "ECONOMY":
      return "Tiết kiệm";
    case "AIR":
      return "Hàng không";
    case "SEA":
      return "Đường biển";
    default:
      return option;
  }
};

const getCurrentUserName = () => {
  try {
    const userString = sessionStorage.getItem("user");
    if (userString) {
      const parsed = JSON.parse(userString);
      if (parsed?.fullName) return parsed.fullName;
      if (parsed?.name) return parsed.name;
    }
  } catch { }
  return (
    sessionStorage.getItem("fullName") ||
    sessionStorage.getItem("userName") ||
    ""
  );
};

const normalizeText = (value) => {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

const formatVndCurrency = (value) => {
  const number = Number(value || 0);
  return `${Math.round(number).toLocaleString("vi-VN")} đ`;
};

const formatDateDisplay = (value) => {
  if (!value) return "-";
  return formatVietnamDateTime(value, {
    apiTimeMode: "utc",
    fallback: "-",
  });
};

const writeTextToClipboard = async (text) => {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Không thể sao chép.");
  }
};

/* =========================================================
   MAIN COMPONENT: BuyOrderHistoryList
   ========================================================= */

const BuyOrderHistoryList = ({ defaultStatus } = {}) => {
  const navigate = useNavigate();

  const [rawOrders, setRawOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(defaultStatus || STATUS_FILTERS.ALL);
  const [dateRangeInput, setDateRangeInput] = useState(null);

  // Pagination state
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Clipboard & Refreshing
  const [copiedCode, setCopiedCode] = useState("");
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  /* =========================================================
     DYNAMIC STATUS TABS & OPTIONS DERIVED FROM API DATA
     ========================================================= */

  const dynamicStatusTabs = useMemo(() => {
    const uniqueRawStatuses = Array.from(
      new Set(
        rawOrders
          .map((o) => String(o.status || "").trim().toUpperCase())
          .filter(Boolean)
      )
    );

    const baseTabs = [
      { value: STATUS_FILTERS.ALL, label: "Tất cả" },
      { value: STATUS_FILTERS.PENDING_REVIEW, label: "Chờ duyệt" },
      {
        value: STATUS_FILTERS.WAITING_PAYMENT,
        label: "Chờ thanh toán / Đã báo giá",
      },
      { value: STATUS_FILTERS.PAID, label: "Đã thanh toán / Đã xác nhận" },
      { value: STATUS_FILTERS.REJECTED, label: "Đã từ chối / Đã hủy" },
    ];

    // Append any raw status if present in API data and not covered
    uniqueRawStatuses.forEach((st) => {
      const existsInBase = baseTabs.some((t) => t.value === st);
      const cat = getStatusCategory(st);
      const existsInCat = baseTabs.some((t) => t.value === cat);

      if (!existsInBase && !existsInCat) {
        baseTabs.push({
          value: st,
          label: getStatusLabel(st),
        });
      }
    });

    return baseTabs;
  }, [rawOrders]);

  const dynamicStatusOptions = useMemo(() => {
    return dynamicStatusTabs.map((tab) => ({
      value: tab.value,
      label: tab.label,
    }));
  }, [dynamicStatusTabs]);

  const statusCounts = useMemo(() => {
    const counts = {};
    dynamicStatusTabs.forEach((tab) => {
      counts[tab.value] = 0;
    });

    counts[STATUS_FILTERS.ALL] = rawOrders.length;

    rawOrders.forEach((order) => {
      const rawSt = String(order.status || "").trim().toUpperCase();
      const catSt = getStatusCategory(rawSt);

      if (counts[catSt] !== undefined && catSt !== STATUS_FILTERS.ALL) {
        counts[catSt] += 1;
      }

      if (counts[rawSt] !== undefined && rawSt !== catSt) {
        counts[rawSt] += 1;
      }
    });

    return counts;
  }, [rawOrders, dynamicStatusTabs]);

  /* =========================================================
     DEBOUNCE SEARCH INPUT
     ========================================================= */

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPageNumber(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timerId);
  }, [searchInput]);

  /* =========================================================
     FETCH DATA FROM API
     ========================================================= */

  const fetchOrders = useCallback(async (signal) => {
    try {
      setLoading(true);
      const response = await getPurchaseRequestsApi(1, 10, { signal });

      const dataObj = response?.data || response;
      let dataArray = [];

      if (Array.isArray(dataObj?.items)) {
        dataArray = dataObj.items;
      } else if (Array.isArray(dataObj)) {
        dataArray = dataObj;
      } else if (Array.isArray(response?.items)) {
        dataArray = response.items;
      } else if (Array.isArray(response)) {
        dataArray = response;
      }

      setRawOrders(dataArray);
    } catch (error) {
      if (
        error?.code === "ERR_CANCELED" ||
        error?.name === "CanceledError" ||
        error?.name === "AbortError"
      ) {
        return;
      }

      console.error("Lỗi khi lấy lịch sử mua hộ:", error);
      AuthNotify.error(
        "Không tải được lịch sử mua hộ",
        error?.response?.data?.message ||
        error?.message ||
        "Không thể kết nối đến máy chủ."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchOrders(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchOrders]);

  /* =========================================================
     FILTERING DATA CLIENT-SIDE (EXACT STATUS + CATEGORY MATCH)
     ========================================================= */

  const filteredOrders = useMemo(() => {
    const searchNormalized = normalizeText(debouncedSearch);

    const fromTimestamp = dateRangeInput?.[0]
      ? dateRangeInput[0].startOf("day").valueOf()
      : null;

    const toTimestamp = dateRangeInput?.[1]
      ? dateRangeInput[1].endOf("day").valueOf()
      : null;

    const getLatestTimestamp = (order) => {
      const t1 = apiToTimestamp(order.statusUpdatedAt) || 0;
      const t2 = apiToTimestamp(order.quotationCreatedAt) || 0;
      const t3 = apiToTimestamp(order.createdAt) || 0;
      const t4 = apiToTimestamp(order.updatedAt) || 0;
      return Math.max(t1, t2, t3, t4);
    };

    const filtered = rawOrders.filter((order) => {
      // 1. Filter by Status (Exact raw code match OR category match)
      if (selectedStatus !== STATUS_FILTERS.ALL) {
        const orderRawStatus = String(order.status || "")
          .trim()
          .toUpperCase();
        const orderStatusCat = getStatusCategory(orderRawStatus);

        const isExactMatch = orderRawStatus === selectedStatus;
        const isCatMatch = orderStatusCat === selectedStatus;

        if (!isExactMatch && !isCatMatch) {
          return false;
        }
      }

      // 2. Filter by Date Range
      if (fromTimestamp || toTimestamp) {
        const orderTime = getLatestTimestamp(order);
        if (!orderTime) return false;
        if (fromTimestamp && orderTime < fromTimestamp) return false;
        if (toTimestamp && orderTime > toTimestamp) return false;
      }

      // 3. Filter by Search Keyword
      if (searchNormalized) {
        const codeText = normalizeText(order.purchaseCode);
        const customerText = normalizeText(
          order.customerName || order.createdByName
        );
        const receiverText = normalizeText(order.receiverName);
        const phoneText = normalizeText(order.receiverPhone);

        const itemsText = Array.isArray(order.items)
          ? order.items
            .map((i) => normalizeText(i.productName))
            .join(" ")
          : "";

        const isMatch =
          codeText.includes(searchNormalized) ||
          customerText.includes(searchNormalized) ||
          receiverText.includes(searchNormalized) ||
          phoneText.includes(searchNormalized) ||
          itemsText.includes(searchNormalized);

        if (!isMatch) return false;
      }

      return true;
    });

    // Sort descending by latest UTC timestamp (Newest created/updated orders always first)
    return [...filtered].sort((a, b) => {
      const timeA = getLatestTimestamp(a);
      const timeB = getLatestTimestamp(b);
      return timeB - timeA;
    });
  }, [rawOrders, selectedStatus, dateRangeInput, debouncedSearch]);

  // Paginated Data
  const totalCount = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const pageOrders = useMemo(() => {
    const startIndex = (pageNumber - 1) * pageSize;
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredOrders, pageNumber, pageSize]);

  /* =========================================================
     HANDLERS
     ========================================================= */

  const handleCopyCode = async (code) => {
    if (!code) return;
    try {
      await writeTextToClipboard(code);
      setCopiedCode(code);
      AuthNotify.success("Đã sao chép mã", code);

      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedCode("");
      }, 1800);
    } catch {
      AuthNotify.error("Sao chép thất bại", "Vui lòng sao chép thủ công.");
    }
  };

  const handleRefresh = () => {
    const controller = new AbortController();
    fetchOrders(controller.signal);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedStatus(STATUS_FILTERS.ALL);
    setDateRangeInput(null);
    setPageNumber(1);
  };

  return (
    <div className="buy-order-history-page">
      {/* Header Banner */}
      <section className="buy-order-history-header">
        <div className="buy-order-history-header-left">
          <div className="buy-order-history-header-icon">
            <ShoppingBagOutlinedIcon fontSize="large" />
          </div>
          <div>
            <span className="buy-order-history-eyebrow">
              LỊCH SỬ GIAO DỊCH MUA HỘ
            </span>
            <h1>Lịch Sử Đơn Hàng Mua Hộ</h1>
            <p>
              Theo dõi danh sách các yêu cầu mua hộ, bảng giá chi tiết & trạng
              thái xác nhận/thanh toán.
            </p>
          </div>
        </div>

        <div className="buy-order-history-header-summary">
          <span>TỔNG SỐ ĐƠN HÀNG</span>
          <strong>{totalCount}</strong>
          <small>Đơn mua hộ</small>
        </div>
      </section>

      {/* Quick Status Tabs Filter */}
      <section className="buy-order-status-tabs-container">
        <div className="buy-order-status-tabs">
          {dynamicStatusTabs.map((tab) => {
            const count = statusCounts[tab.value] ?? 0;
            const isActive = selectedStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                className={`status-tab-button ${isActive ? "is-active" : ""}`}
                onClick={() => {
                  setSelectedStatus(tab.value);
                  setPageNumber(1);
                }}
              >
                <span>{tab.label}</span>
                <span className="status-tab-count">{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filters Bar Card */}
      <section className="buy-order-history-filters-card">
        <div className="filters-search-box">
          <Input
            placeholder="Tìm theo mã đơn, tên sản phẩm, người nhận, SĐT..."
            prefix={<SearchIcon style={{ color: "#94a3b8" }} />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            allowClear
            className="filters-search-input"
          />
        </div>

        <div className="filters-status-box">
          <Select
            value={selectedStatus}
            onChange={(val) => {
              setSelectedStatus(val);
              setPageNumber(1);
            }}
            options={dynamicStatusOptions}
            className="filters-status-select"
          />
        </div>

        <div className="filters-date-box">
          <RangePicker
            value={dateRangeInput}
            onChange={(dates) => {
              setDateRangeInput(dates);
              setPageNumber(1);
            }}
            format="DD/MM/YYYY"
            placeholder={["Từ ngày", "Đến ngày"]}
            className="filters-date-picker"
          />
        </div>

        <div className="filters-actions-box">
          <Button
            type="button"
            variant="outlined"
            startIcon={<AutorenewIcon />}
            onClick={handleRefresh}
            disabled={loading}
            className="filters-refresh-button"
          >
            Làm mới
          </Button>

          {(searchInput || selectedStatus !== STATUS_FILTERS.ALL || dateRangeInput) && (
            <button
              type="button"
              className="filters-reset-link"
              onClick={handleResetFilters}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </section>

      {/* Orders Grid / Cards List */}
      {loading ? (
        <div className="buy-order-history-loading-box">
          <CircularProgress size={36} />
          <div>
            <strong>Đang tải danh sách lịch sử mua hộ...</strong>
            <span>Vui lòng chờ trong giây lát.</span>
          </div>
        </div>
      ) : pageOrders.length === 0 ? (
        <div className="buy-order-history-empty-box">
          <div className="empty-icon">🛒</div>
          <h3>Không tìm thấy đơn mua hộ nào</h3>
          <p>
            {debouncedSearch || selectedStatus !== STATUS_FILTERS.ALL || dateRangeInput
              ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
              : "Bạn chưa có yêu cầu mua hộ nào trong hệ thống."}
          </p>
          {(debouncedSearch || selectedStatus !== STATUS_FILTERS.ALL || dateRangeInput) && (
            <Button
              variant="outlined"
              onClick={handleResetFilters}
              style={{ marginTop: 12 }}
            >
              Xóa tất cả bộ lọc
            </Button>
          )}
        </div>
      ) : (
        <section className="buy-order-history-grid">
          {pageOrders.map((order, idx) => {
            const quotation = order.quotation;
            const items = Array.isArray(order.items) ? order.items : [];
            const isCopied = copiedCode === order.purchaseCode;
            const requestId =
              order.purchaseRequestId || order.id || order.requestId;

            return (
              <article
                className="buy-order-history-card"
                key={requestId || idx}
              >
                {/* Header Row */}
                <div className="card-header">
                  <div className="card-header-left">
                    <span className="card-index-tag">
                      #{(pageNumber - 1) * pageSize + idx + 1}
                    </span>
                    <div className="card-code-group">
                      <h2>{order.purchaseCode || "Đang cập nhật"}</h2>
                      {order.purchaseCode && (
                        <button
                          type="button"
                          className={`card-copy-button ${isCopied ? "is-copied" : ""
                            }`}
                          onClick={() => handleCopyCode(order.purchaseCode)}
                        >
                          {isCopied ? (
                            <CheckRoundedIcon fontSize="small" />
                          ) : (
                            <ContentCopyRoundedIcon fontSize="small" />
                          )}
                          <span>{isCopied ? "Đã sao chép" : "Sao chép mã"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="card-header-right">
                    {renderStatusTag(order.status)}
                  </div>
                </div>

                {/* Info Metadata Bar */}
                <div className="card-meta-bar">
                  <div>
                    <span>Khách hàng</span>
                    <strong>
                      {order.customerName ||
                        order.createdByName ||
                        order.customer?.fullName ||
                        getCurrentUserName() ||
                        order.receiverName ||
                        "-"}
                    </strong>
                  </div>
                  <div>
                    <span>Ngày tạo</span>
                    <strong>{formatDateDisplay(order.createdAt)}</strong>
                  </div>
                  {order.statusUpdatedAt &&
                    order.statusUpdatedAt !== order.createdAt && (
                      <div>
                        <span>Ngày cập nhật</span>
                        <strong style={{ color: "#059669" }}>
                          {formatDateDisplay(order.statusUpdatedAt)}
                        </strong>
                      </div>
                    )}
                  <div>
                    <span>Tuyến vận chuyển</span>
                    <strong>
                      {order.route || "Trung Quốc --> VN"}{" "}
                      <small>
                        ({formatShippingOption(order.shippingOption)})
                      </small>
                    </strong>
                  </div>
                  <div>
                    <span>Người nhận hàng</span>
                    <strong>
                      {order.receiverName || "-"}
                      {order.receiverPhone ? ` (${order.receiverPhone})` : ""}
                    </strong>
                  </div>
                </div>

                {/* Items Summary Grid */}
                {items.length > 0 && (
                  <div className="card-items-section">
                    <span className="section-title">
                      Danh sách sản phẩm ({items.length} mặt hàng, Tổng SL:{" "}
                      {order.totalQuantity ?? 0})
                    </span>

                    <div className="card-items-grid">
                      {items.slice(0, 3).map((item, itemIdx) => (
                        <div
                          className="card-item-chip"
                          key={item.itemId || itemIdx}
                        >
                          {Array.isArray(item.imageUrls) &&
                            item.imageUrls.length > 0 ? (
                            <Image
                              src={item.imageUrls[0]}
                              alt={item.productName}
                              className="item-chip-img"
                            />
                          ) : (
                            <div className="item-chip-no-img">📦</div>
                          )}

                          <div className="item-chip-info">
                            <strong>{item.productName}</strong>
                            <small>
                              SL: {item.quantity} | {item.attributes || "Mặc định"}
                            </small>
                          </div>

                          {item.productLink && (
                            <a
                              href={item.productLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="item-chip-link"
                            >
                              <OpenInNewIcon fontSize="inherit" />
                            </a>
                          )}
                        </div>
                      ))}

                      {items.length > 3 && (
                        <div className="card-items-more">
                          +{items.length - 3} sản phẩm khác...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bottom Total Price & Action Bar */}
                <div className="card-footer-bar">
                  {(() => {
                    const totalAmount = Number(
                      quotation?.totalAmount ??
                      order.totalBillAmount ??
                      order.totalAmount ??
                      0
                    );

                    if (totalAmount > 0) {
                      return (
                        <div className="footer-price-box">
                          <span>TỔNG THÀNH TIỀN BÁO GIÁ</span>
                          <strong>{formatVndCurrency(totalAmount)}</strong>
                        </div>
                      );
                    }

                    return <div />;
                  })()}

                  <div className="card-footer-actions">
                    <Button
                      variant="outlined"
                      onClick={() =>
                        navigate(`/check-orders/buy-on-behalf/${requestId}`)
                      }
                      className="card-quotation-button"
                    >
                      Chi tiết báo giá
                    </Button>

                    <Button
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() =>
                        navigate(
                          `/history/buy-on-behalf/${requestId}/payments`,
                          {
                            state: { purchaseRequest: order },
                          }
                        )
                      }
                      className="card-detail-button"
                    >
                      Lịch sử thanh toán
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Pagination Bar */}
      {totalCount > 0 && (
        <section className="buy-order-history-pagination">
          <div className="pagination-info">
            Hiển thị{" "}
            <strong>
              {(pageNumber - 1) * pageSize + 1} -{" "}
              {Math.min(pageNumber * pageSize, totalCount)}
            </strong>{" "}
            trong <strong>{totalCount}</strong> đơn mua hộ
          </div>

          <Pagination
            count={totalPages}
            page={pageNumber}
            onChange={(_, page) => setPageNumber(page)}
            color="primary"
            shape="rounded"
          />
        </section>
      )}
    </div>
  );
};

export default BuyOrderHistoryList;
