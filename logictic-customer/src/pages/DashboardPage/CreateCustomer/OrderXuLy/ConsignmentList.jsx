import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import axios from "axios";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import {
  DatePicker,
  Input,
  Space,
} from "antd";

import {
  Button,
  CircularProgress,
  Pagination,
} from "@mui/material";

import AutorenewIcon from "@mui/icons-material/Autorenew";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import SearchIcon from "@mui/icons-material/Search";

import { getConsignmentsApi } from "../../../../api/OrderApi/consignmentApi";
import AuthNotify from "../../../../utils/AuthNotify";

import {
  apiToUtcIso,
  formatVietnamDateTime,
  formatUtcDateTime,
} from "../../../../utils/timeUtc";

import "./ConsignmentList.css";

const { RangePicker } = DatePicker;

const DEFAULT_PAGE_SIZE = 10;


/* =========================================================
   HELPER FUNCTIONS
   ========================================================= */

const normalizeText = (value) => {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};


/**
 * Chuẩn hóa tên sản phẩm từ nhiều kiểu dữ liệu API:
 * - "Sản phẩm 1\nSản phẩm 2"
 * - ["Sản phẩm 1", "Sản phẩm 2"]
 * - [{ productName: "Sản phẩm 1" }]
 * Giữ nguyên tên sản phẩm đầy đủ (không tự ý tách theo dấu phẩy)
 */
const collectProductNames = (source) => {
  if (
    source === null ||
    source === undefined ||
    source === ""
  ) {
    return [];
  }

  if (Array.isArray(source)) {
    return source.flatMap(
      collectProductNames
    );
  }

  if (typeof source === "object") {
    const directName =
      source.productName ||
      source.itemName ||
      source.name ||
      source.title ||
      source.product?.productName ||
      source.product?.name;

    if (directName) {
      return collectProductNames(
        directName
      );
    }

    return collectProductNames(
      source.items ||
      source.productNames ||
      source.itemNames ||
      []
    );
  }

  const text = String(source).trim();

  if (!text) {
    return [];
  }

  if (
    (text.startsWith("[") &&
      text.endsWith("]")) ||
    (text.startsWith("{") &&
      text.endsWith("}"))
  ) {
    try {
      return collectProductNames(
        JSON.parse(text)
      );
    } catch {
      // Không phải JSON hợp lệ thì tiếp tục xử lý chuỗi thường.
    }
  }

  if (text.includes("\n")) {
    return text
      .split(/\r?\n+/)
      .map((name) => name.trim())
      .filter(Boolean);
  }

  return [text];
};

const getProductNames = (item) => {
  const rawNames =
    item?.itemNames ??
    item?.productNames ??
    item?.items ??
    [];

  return Array.from(
    new Set(
      collectProductNames(rawNames)
        .map((name) =>
          String(name).trim()
        )
        .filter(Boolean)
    )
  );
};

const extractConsignmentItems = (apiResult) => {
  const candidates = [
    apiResult,
    apiResult?.data,
    apiResult?.items,
    apiResult?.results,
    apiResult?.data?.items,
    apiResult?.data?.results,
    apiResult?.data?.data,
    apiResult?.data?.data?.items,
    apiResult?.data?.data?.results,
  ];

  return candidates.find(Array.isArray) || [];
};

const copyTextToClipboard = async (text) => {
  if (
    navigator.clipboard?.writeText &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");

  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "-9999px";
  textArea.style.opacity = "0";

  document.body.appendChild(textArea);
  textArea.select();

  const copied = document.execCommand("copy");

  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("Không thể sao chép mã vận đơn.");
  }
};

const formatStatusCode = (status) =>
  String(status || "")
    .trim()
    .replaceAll("_", " ");

const PENDING_REVIEW_STATUS = "PENDING_REVIEW";

const normalizeStatusCode = (status) =>
  String(status || "")
    .trim()
    .toUpperCase();

const isPendingReviewStatus = (status) =>
  normalizeStatusCode(status) === PENDING_REVIEW_STATUS;


const normalizeApiTimeToUtc = (value) => {
  return apiToUtcIso(value, {
    apiTimeMode: "utc",
  });
};


const getUtcDateOnly = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return null;
  }

  return utcIso.slice(0, 10);
};


const normalizeConsignmentTime = (item) => {
  if (!item) {
    return item;
  }

  const createdAtUtc = normalizeApiTimeToUtc(item.createdAt);
  const updatedAtUtc = normalizeApiTimeToUtc(item.updatedAt);

  return {
    ...item,
    createdAtUtc,
    updatedAtUtc,
  };
};


const formatDate = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return "-";
  }

  return formatVietnamDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  });
};


const formatDateUtcTitle = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return "";
  }

  return `UTC: ${formatUtcDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  })}`;
};

const ConsignmentList = () => {
  const navigate = useNavigate();

  const [consignments, setConsignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [dateRangeInput, setDateRangeInput] =
    useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copiedTrackingCode, setCopiedTrackingCode] =
    useState("");
  const copyResetTimerRef = useRef(null);

  /*
   * Chỉ bật khi người dùng chủ động bấm LÀM MỚI.
   * Lần tải đầu trang không hiện toast thành công để tránh gây nhiễu.
   */
  const manualRefreshRef = useRef(false);


  const fetchAllConsignments = useCallback(
    async (signal) => {
      const response = await getConsignmentsApi({
        params: {
          pageNumber: 1,
          pageSize: 100,
        },
        signal,
      });

      return extractConsignmentItems(response);
    },
    []
  );


  const fetchConsignments = useCallback(
    async (signal) => {
      try {
        setLoading(true);

        const items =
          await fetchAllConsignments(signal);

        const pendingReviewItems = items
          .map(normalizeConsignmentTime)
          .filter((item) =>
            isPendingReviewStatus(item?.status)
          );

        setConsignments(pendingReviewItems);

        if (manualRefreshRef.current) {
          AuthNotify.success(
            "Tải lại dữ liệu thành công",
            `Đã cập nhật ${pendingReviewItems.length.toLocaleString(
              "vi-VN"
            )} yêu cầu ký gửi chờ duyệt.`
          );

          manualRefreshRef.current = false;
        }
      } catch (error) {
        if (
          axios.isCancel(error) ||
          error?.code === "ERR_CANCELED"
        ) {
          return;
        }

        console.error(
          "Lỗi khi lấy danh sách ký gửi:",
          error
        );

        const isManualRefresh =
          manualRefreshRef.current;

        manualRefreshRef.current = false;

        AuthNotify.error(
          isManualRefresh
            ? "Tải lại dữ liệu thất bại"
            : "Không tải được danh sách ký gửi",
          error?.response?.data?.message ||
          error?.message ||
          "Không thể tải danh sách ký gửi."
        );

        setConsignments([]);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [fetchAllConsignments]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchConsignments(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchConsignments, refreshKey]);


  useEffect(
    () => () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    },
    []
  );




  const disabledRangeDate = (
    currentDate,
    info
  ) => {
    const fromDate = info?.from;

    if (!currentDate || !fromDate) {
      return false;
    }

    return currentDate.isBefore(
      fromDate,
      "day"
    );
  };

  const handleDateRangeChange = (dates) => {
    if (
      !Array.isArray(dates) ||
      !dates[0] ||
      !dates[1]
    ) {
      setDateRangeInput(null);
      setPageNumber(1);
      return;
    }

    const startDate = dayjs(dates[0]).startOf(
      "day"
    );

    const endDate = dayjs(dates[1]).startOf(
      "day"
    );

    if (endDate.isBefore(startDate, "day")) {
      AuthNotify.warning(
        "Khoảng ngày không hợp lệ",
        "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu."
      );

      setDateRangeInput([
        startDate,
        startDate,
      ]);
      setPageNumber(1);

      return;
    }

    setDateRangeInput([
      startDate,
      endDate,
    ]);
    setPageNumber(1);
  };



  const filteredConsignments = useMemo(() => {
    const normalizedSearch = normalizeText(searchInput);


    const startDate =
      dateRangeInput?.[0]?.format(
        "YYYY-MM-DD"
      ) || null;

    const endDate =
      dateRangeInput?.[1]?.format(
        "YYYY-MM-DD"
      ) || null;

    return consignments.filter((item) => {
      if (!isPendingReviewStatus(item?.status)) {
        return false;
      }

      const searchableContent = [
        item.orderId,
        item.orderCode,
        item.consignmentCode,
        item.trackingCode,
        item.domesticTrackingCode,
        item.waybillCode,
        item.shipmentCode,
        getProductNames(item).join(" "),
        item.consignmentType,
        item.status,
        item.route,
        item.receiverName,
        item.receiverPhone,
        item.receiverAddress,
        item.createdAtUtc,
        item.updatedAtUtc,
      ]
        .filter(Boolean)
        .map(normalizeText)
        .join(" ");

      const matchesSearch =
        !normalizedSearch ||
        searchableContent.includes(
          normalizedSearch
        );

      const createdDate = getUtcDateOnly(
        item.createdAtUtc || item.createdAt
      );

      const matchesStartDate =
        !startDate ||
        (createdDate !== null &&
          createdDate >= startDate);

      const matchesEndDate =
        !endDate ||
        (createdDate !== null &&
          createdDate <= endDate);

      return (
        matchesSearch &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [
    consignments,
    dateRangeInput,
    searchInput,
  ]);


  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredConsignments.length /
      DEFAULT_PAGE_SIZE
    )
  );

  const visibleConsignments = useMemo(() => {
    const startIndex =
      (pageNumber - 1) * DEFAULT_PAGE_SIZE;

    return filteredConsignments.slice(
      startIndex,
      startIndex + DEFAULT_PAGE_SIZE
    );
  }, [
    filteredConsignments,
    pageNumber,
  ]);

  useEffect(() => {
    if (pageNumber > totalPages) {
      setPageNumber(totalPages);
    }
  }, [pageNumber, totalPages]);



  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
    setPageNumber(1);
  };

  const handleResetClick = () => {
    if (loading) {
      return;
    }

    /*
     * Đánh dấu đây là lần tải thủ công để sau khi API hoàn tất
     * mới hiển thị thông báo thành công.
     */
    manualRefreshRef.current = true;

    /*
     * Cập nhật state trước để chắc chắn useEffect gọi lại API.
     * Không gọi trực tiếp AuthNotify.info vì một số phiên bản
     * AuthNotify của dự án không export phương thức info.
     */
    setSearchInput("");
    setDateRangeInput(null);
    setPageNumber(1);
    setRefreshKey((previous) => previous + 1);

    /*
     * Chỉ gọi thông báo bắt đầu nếu utility thực sự hỗ trợ info.
     * Lỗi thông báo không được phép chặn quá trình tải API.
     */
    try {
      if (typeof AuthNotify?.info === "function") {
        AuthNotify.info(
          "Đang tải lại dữ liệu",
          "Hệ thống đang cập nhật danh sách yêu cầu ký gửi chờ duyệt."
        );
      }
    } catch (notifyError) {
      console.warn(
        "Không thể hiển thị thông báo đang tải:",
        notifyError
      );
    }
  };

  const handleCopyTrackingCode = async (
    event,
    item
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const trackingCode = getTrackingCode(item);

    if (!trackingCode || trackingCode === "-") {
      AuthNotify.warning(
        "Chưa có mã vận đơn",
        "Đơn hàng chưa có mã vận đơn để sao chép."
      );
      return;
    }

    try {
      await copyTextToClipboard(trackingCode);

      setCopiedTrackingCode(trackingCode);
      AuthNotify.success(
        "Sao chép thành công",
        "Đã sao chép mã vận đơn."
      );

      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }

      copyResetTimerRef.current =
        window.setTimeout(() => {
          setCopiedTrackingCode("");
        }, 1800);
    } catch (error) {
      console.error(
        "Không thể sao chép mã vận đơn:",
        error
      );

      AuthNotify.error(
        "Sao chép thất bại",
        "Không thể sao chép mã vận đơn. Vui lòng thử lại."
      );
    }
  };

  const handlePageChange = (
    _,
    nextPageNumber
  ) => {
    setPageNumber(nextPageNumber);

    const scrollTarget =
      document.querySelector(".page-sub-content") ||
      window;

    if (scrollTarget === window) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } else {
      scrollTarget.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const handleViewDetail = (item) => {
    navigate(
      `/consignments/${item.orderId}`,
      {
        state: {
          consignment: item,
        },
      }
    );
  };

  const handleCardKeyDown = (
    event,
    item
  ) => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      handleViewDetail(item);
    }
  };



  const getStatusLabel = (status) => {
    const normalizedStatus = normalizeStatusCode(status);

    if (normalizedStatus === PENDING_REVIEW_STATUS) {
      return "Chờ duyệt";
    }

    return formatStatusCode(normalizedStatus) || "-";
  };

  const getStatusClassName = (status) => {
    return String(status || "unknown")
      .trim()
      .toLowerCase()
      .replaceAll("_", "-");
  };

  const getConsignmentTypeLabel = (
    type
  ) => {
    const normalizedType = String(
      type || ""
    )
      .trim()
      .toUpperCase();

    if (normalizedType === "EXPRESS") {
      return "HỎA TỐC";
    }

    if (normalizedType === "STANDARD") {
      return "TIÊU CHUẨN";
    }

    return type || "-";
  };

  const getTrackingCode = (item) => {
    const trackingCode =
      item?.consignmentCode ||
      item?.trackingCode ||
      item?.domesticTrackingCode ||
      item?.waybillCode ||
      item?.shipmentCode;

    return String(trackingCode || "").trim() || "-";
  };

  // const getOrderCode = (item) => {
  //   const orderCode =
  //     item?.orderCode ||
  //     item?.orderId;

  //   return String(orderCode || "").trim() || "-";
  // };


  const hasActiveFilter = Boolean(
    searchInput.trim() ||
    (dateRangeInput?.[0] &&
      dateRangeInput?.[1])
  );

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="vcl-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            YÊU CẦU KÍ GỬI CHỜ DUYỆT
          </h1>

          <p className="page-subtitle">
            Hệ thống tra cứu thông tin trạng thái
            lô hàng thời gian thực
          </p>
        </div>

        <div className="page-summary">
          <strong>
            {filteredConsignments.length}
          </strong>

          <span>Lô hàng chờ duyệt</span>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-fields">
          <Space size="middle" wrap>
            <Input
              prefix={
                <SearchIcon className="filter-search-icon" />
              }
              placeholder="Tìm mã vận đơn, sản phẩm, người nhận..."
              value={searchInput}
              onChange={handleSearchChange}
              onPressEnter={() =>
                setPageNumber(1)
              }
              allowClear
              className="filter-search-input"
            />

            <RangePicker
              value={dateRangeInput}
              onChange={
                handleDateRangeChange
              }
              disabledDate={
                disabledRangeDate
              }
              format="DD/MM/YYYY"
              placeholder={[
                "Từ ngày",
                "Đến ngày",
              ]}
              allowClear
              inputReadOnly
              className="filter-date-picker"
            />
          </Space>
        </div>

        <div className="filter-actions">
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<AutorenewIcon />}
            onClick={handleResetClick}
            disabled={
              loading
            }
            className={[
              "filter-reset-button",
              (loading) &&
              "is-loading",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {loading
              ? "ĐANG TẢI..."
              : "LÀM MỚI"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="vcl-loading-box">
          <CircularProgress size={38} />

          <div>
            Đang tải lại danh sách yêu cầu ký gửi chờ duyệt...
          </div>
        </div>
      ) : (
        <>
          <div className="card-list">
            {visibleConsignments.length ===
              0 ? (
              <div className="empty-container">
                <div className="empty-icon">
                  📭
                </div>

                <h3>
                  Không tìm thấy lô hàng chờ duyệt
                </h3>

                <p>
                  Hãy thay đổi từ khóa,
                  khoảng ngày tìm kiếm hoặc làm mới dữ liệu.
                </p>

                {hasActiveFilter && (
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={
                      <AutorenewIcon />
                    }
                    onClick={
                      handleResetClick
                    }
                    className="empty-reset-button"
                  >
                    Xóa bộ lọc
                  </Button>
                )}
              </div>
            ) : (
              visibleConsignments.map(
                (item) => {
                  const statusClass =
                    getStatusClassName(
                      item.status
                    );

                  const productNames =
                    getProductNames(item);

                  return (
                    <div
                      key={item.orderId}
                      className="consignment-card"
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        handleViewDetail(
                          item
                        )
                      }
                      onKeyDown={(event) =>
                        handleCardKeyDown(
                          event,
                          item
                        )
                      }
                      aria-label={`Xem chi tiết đơn ký gửi ${getTrackingCode(
                        item
                      )}`}
                    >
                      <div className="card-header">
                        <div className="header-left">
                          <div className="tracking-code-block">
                            <span className="tracking-code-label">
                              MÃ VẬN ĐƠN
                            </span>

                            <div className="tracking-code-row">
                              <strong className="order-code">
                                {getTrackingCode(
                                  item
                                )}
                              </strong>

                              <button
                                type="button"
                                className={[
                                  "copy-tracking-button",
                                  copiedTrackingCode ===
                                  getTrackingCode(item) &&
                                  "is-copied",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                title="Sao chép mã vận đơn"
                                aria-label={`Sao chép mã vận đơn ${getTrackingCode(
                                  item
                                )}`}
                                onClick={(event) =>
                                  handleCopyTrackingCode(
                                    event,
                                    item
                                  )
                                }
                              >
                                {copiedTrackingCode ===
                                  getTrackingCode(item) ? (
                                  <>
                                    <CheckRoundedIcon />
                                    <span>Đã chép</span>
                                  </>
                                ) : (
                                  <>
                                    <ContentCopyRoundedIcon />
                                    <span>Sao chép</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="header-tags">
                            <span className="tag-type">
                              {getConsignmentTypeLabel(
                                item.consignmentType
                              )}
                            </span>

                            <span className="tag-count">
                              Tuyến{" "}
                              {item.route || "-"}
                            </span>

                            <span
                              className={`tag-status-header status-${statusClass}`}
                            >
                              {getStatusLabel(
                                item.status
                              )}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="outlined"
                          size="small"
                          endIcon={
                            <ArrowForwardIcon />
                          }
                          onClick={(event) => {
                            event.stopPropagation();

                            handleViewDetail(
                              item
                            );
                          }}
                          className="view-detail-button"
                        >
                          Xem chi tiết
                        </Button>
                      </div>

                      <div className="sub-header">
                        <span>
                          Người nhận:{" "}
                          <strong>
                            {item.receiverName ||
                              "-"}
                          </strong>
                        </span>

                        <span
                          title={formatDateUtcTitle(
                            item.createdAtUtc ||
                            item.createdAt
                          )}
                        >
                          📅 Ngày tạo:{" "}
                          <strong>
                            {formatDate(
                              item.createdAtUtc ||
                              item.createdAt
                            )}
                          </strong>
                        </span>

                        <span className="price-total-header">
                          KIỂM HÀNG:{" "}
                          <b
                            className={
                              item.requiresInspection
                                ? "inspection-yes"
                                : "inspection-no"
                            }
                          >
                            {item.requiresInspection
                              ? "Có"
                              : "Không"}
                          </b>
                        </span>
                      </div>

                      <div className="card-body">
                        <div className="body-left">
                          <div className="box-icon">
                            📦
                          </div>

                          <div className="product-info">
                            <div className="product-name-group">
                              <div className="product-name-heading">
                                <span className="product-name-label">
                                  SẢN PHẨM
                                </span>

                                {productNames.length > 1 && (
                                  <span className="product-name-count">
                                    {productNames.length} sản phẩm
                                  </span>
                                )}
                              </div>

                              {productNames.length > 0 ? (
                                <div
                                  className={[
                                    "product-name-list",
                                    productNames.length === 1 &&
                                    "is-single",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                  aria-label={`Danh sách ${productNames.length} sản phẩm`}
                                >
                                  {productNames.map(
                                    (
                                      productName,
                                      productIndex
                                    ) => (
                                      <div
                                        key={`${productName}-${productIndex}`}
                                        className="product-name-item"
                                      >
                                        {productNames.length > 1 && (
                                          <span className="product-name-index">
                                            {productIndex + 1}
                                          </span>
                                        )}

                                        <strong
                                          className="product-name-value"
                                          title={productName}
                                        >
                                          {productName}
                                        </strong>
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <strong className="product-name-empty">
                                  Chưa có tên sản phẩm
                                </strong>
                              )}
                            </div>

                            {/* <div className="sku-tag">
                              Mã đơn: {getOrderCode(item)}
                            </div> */}

                            <div className="receiver-phone">
                              <span>Số điện thoại:</span>{" "}
                              <strong>
                                {item.receiverPhone ||
                                  "-"}
                              </strong>
                            </div>

                            <div className="receiver-address">
                              <span>Địa chỉ:</span>{" "}
                              <strong>
                                {item.receiverAddress ||
                                  "-"}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="body-right">
                          <span
                            className={`status-badge-center status-${statusClass}`}
                          >
                            {getStatusLabel(
                              item.status
                            )}
                          </span>

                          <div className="shipping-type">
                            <span>
                              LOẠI VẬN CHUYỂN
                            </span>

                            <strong>
                              {getConsignmentTypeLabel(
                                item.consignmentType
                              )}
                            </strong>
                          </div>

                          <div className="specs-list">
                            <span>
                              TL:{" "}
                              <strong>
                                {item.totalWeight ??
                                  0}{" "}
                                kg
                              </strong>
                            </span>

                            <span>
                              TT:{" "}
                              <strong>
                                {item.totalVolume ??
                                  0}{" "}
                                cm³
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>

          {filteredConsignments.length >
            0 && (
              <div className="pagination-section">
                <span className="pagination-summary">
                  Hiển thị{" "}
                  <strong>
                    {
                      visibleConsignments.length
                    }
                  </strong>{" "}
                  mục trên trang này, tổng cộng{" "}
                  <strong>
                    {
                      filteredConsignments.length
                    }
                  </strong>{" "}
                  mục
                </span>

                <Pagination
                  count={totalPages}
                  page={pageNumber}
                  onChange={
                    handlePageChange
                  }
                  disabled={loading}
                  color="primary"
                  shape="rounded"
                  showFirstButton
                  showLastButton
                />
              </div>
            )}
        </>
      )}
    </div>
  );
};

export default ConsignmentList;