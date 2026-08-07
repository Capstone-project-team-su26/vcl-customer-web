import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
import SearchIcon from "@mui/icons-material/Search";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";

import AuthNotify from "../../../../utils/AuthNotify";

import {
  getPurchaseRequestsApi,
} from "../../../../api/PurchaseAPI/purchaseRequestApi";

import {
  apiToTimestamp,
  apiToUtcIso,
  formatUtcDateTime,
  formatVietnamDateTime,
} from "../../../../utils/timeUtc";

import "./BuyForMeQuotationList.css";

const { RangePicker } = DatePicker;

const DEFAULT_PAGE_SIZE = 10;


/* =========================================================
   HELPERS
   ========================================================= */

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

const getApiErrorMessage = (
  error,
  fallbackMessage
) => {
  if (
    error?.message === "Network Error" ||
    error?.code === "ERR_NETWORK"
  ) {
    return "Lỗi kết nối máy chủ (Network Error). Vui lòng kiểm tra lại mạng hoặc đăng nhập lại.";
  }

  const responseData =
    error?.response?.data;

  if (
    typeof responseData === "string" &&
    responseData.trim()
  ) {
    return responseData;
  }

  return (
    responseData?.message ||
    responseData?.title ||
    responseData?.error ||
    error?.message ||
    fallbackMessage
  );
};

const normalizeText = (value) => {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

const normalizeStatus = (status) => {
  return String(status || "")
    .trim()
    .toUpperCase();
};

const formatStatusCode = (status) => {
  const normalizedStatus =
    normalizeStatus(status);

  if (!normalizedStatus) {
    return "-";
  }

  if (normalizedStatus === "PENDING_REVIEW") {
    return "Chờ duyệt";
  }

  if (
    normalizedStatus === "QUOTATION_SENT" ||
    normalizedStatus === "QUOTED"
  ) {
    return "Đã báo giá";
  }

  return normalizedStatus
    .replaceAll("_", " ")
    .replaceAll("-", " ");
};

/* =========================================================
   UTC TIME HELPERS
   ========================================================= */

const normalizeApiTimeToUtc = (value) => {
  return apiToUtcIso(value, {
    apiTimeMode: "utc",
  });
};

const getUtcDateOnly = (value) => {
  const utcIso =
    normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return null;
  }

  return utcIso.slice(0, 10);
};

const formatDate = (value) => {
  const utcIso =
    normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return "-";
  }

  return formatVietnamDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  });
};

const formatDateUtcTitle = (value) => {
  const utcIso =
    normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return "";
  }

  return `UTC: ${formatUtcDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  })}`;
};

const normalizePurchaseRequestTime = (item) => {
  if (!item) {
    return item;
  }

  return {
    ...item,
    createdAtUtc: normalizeApiTimeToUtc(
      item.createdAt
    ),
    updatedAtUtc: normalizeApiTimeToUtc(
      item.updatedAt
    ),
    approvedAtUtc: normalizeApiTimeToUtc(
      item.approvedAt
    ),
    rejectedAtUtc: normalizeApiTimeToUtc(
      item.rejectedAt
    ),
  };
};

const getPurchaseRequestItems = (response) => {
  const responseData =
    response?.data ?? response;

  const items =
    responseData?.items ||
    responseData?.data?.items ||
    [];

  return Array.isArray(items) ? items : [];
};

const getProductItems = (purchaseRequest) => {
  return Array.isArray(purchaseRequest?.items)
    ? purchaseRequest.items
    : [];
};

const getTotalQuantity = (purchaseRequest) => {
  return getProductItems(purchaseRequest).reduce(
    (total, product) => total + Number(product?.quantity || 0),
    0
  );
};

const isQuotedStatus = (status) => {
  const normalized = normalizeStatus(status);
  return normalized === "QUOTED" || normalized === "QUOTATION_SENT";
};

const getPurchaseCode = (item) => {
  return (
    String(item?.purchaseCode || "").trim() ||
    "Chưa có mã mua hộ"
  );
};

const getPurchaseId = (item) => {
  return String(
    item?.purchaseRequestId || ""
  ).trim();
};

const getStatusClassName = (status) => {
  return String(status || "unknown")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");
};

const writeTextToClipboard = async (text) => {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard?.writeText
  ) {
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
    throw new Error("Không thể sao chép mã.");
  }
};

/* =========================================================
   COMPONENT
   ========================================================= */

const BuyForMeQuotationList = () => {
  const navigate = useNavigate();
  const manualRefreshRef = useRef(false);
  const copyTimerRef = useRef(null);

  const [
    purchaseRequests,
    setPurchaseRequests,
  ] = useState([]);

  const [loading, setLoading] =
    useState(false);

  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const [
    dateRangeInput,
    setDateRangeInput,
  ] = useState(null);

  const [
    pageNumber,
    setPageNumber,
  ] = useState(1);

  const [
    refreshKey,
    setRefreshKey,
  ] = useState(0);

  const [copiedCode, setCopiedCode] =
    useState("");

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(
          copyTimerRef.current
        );
      }
    };
  }, []);

  /* =========================================================
     FETCH DATA
     ========================================================= */

  const fetchPurchaseRequests = useCallback(
    async (signal) => {
      try {
        setLoading(true);

        const result =
          await getPurchaseRequestsApi(1, 100, {
            signal,
          });


        const items =
          getPurchaseRequestItems(result);

        setPurchaseRequests(
          items.map(
            normalizePurchaseRequestTime
          )
        );

        return true;
      } catch (error) {
        if (isCanceledRequest(error)) {
          return false;
        }

        console.error(
          "Lỗi khi lấy danh sách yêu cầu mua hộ:",
          error
        );

        AuthNotify.error(
          "Không tải được danh sách",
          getApiErrorMessage(
            error,
            "Không thể tải danh sách yêu cầu mua hộ."
          )
        );

        setPurchaseRequests([]);

        return false;
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadPageData = async () => {
      const loaded =
        await fetchPurchaseRequests(
          controller.signal
        );

      if (controller.signal.aborted) {
        return;
      }

      if (manualRefreshRef.current) {
        manualRefreshRef.current = false;

        if (loaded) {
          AuthNotify.success(
            "Làm mới thành công",
            "Danh sách mua hộ đã báo giá đã được cập nhật."
          );
        }
      }
    };

    loadPageData();

    return () => {
      controller.abort();
    };
  }, [fetchPurchaseRequests, refreshKey]);

  /* =========================================================
     DATE RANGE
     ========================================================= */

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

  /* =========================================================
     FILTER AUTO
     ========================================================= */

  const filteredPurchaseRequests = useMemo(() => {
    const normalizedSearch =
      normalizeText(searchInput);

    const startDate =
      dateRangeInput?.[0]?.format(
        "YYYY-MM-DD"
      ) || null;

    const endDate =
      dateRangeInput?.[1]?.format(
        "YYYY-MM-DD"
      ) || null;

    const getLatestTimestamp = (item) => {
      const t1 = apiToTimestamp(item.statusUpdatedAt) || 0;
      const t2 = apiToTimestamp(item.quotationCreatedAt) || 0;
      const t3 = apiToTimestamp(item.createdAtUtc || item.createdAt) || 0;
      const t4 = apiToTimestamp(item.updatedAtUtc || item.updatedAt) || 0;
      return Math.max(t1, t2, t3, t4);
    };

    const filtered = purchaseRequests.filter((item) => {
      if (
        !isQuotedStatus(item.status)
      ) {
        return false;
      }

      const searchableContent = [
        item.purchaseRequestId,
        item.purchaseCode,
        item.receiverName,
        item.itemCount,
        item.status,
        formatStatusCode(item.status),
        item.generalNote,
        item.createdAtUtc,
        item.updatedAtUtc,
        ...getProductItems(item).flatMap((product) => [
          product?.productName,
          product?.quantity,
        ]),
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
        item.createdAtUtc ||
        item.createdAt
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

    // Sort descending by latest UTC timestamp (Newest orders first)
    return [...filtered].sort((a, b) => {
      const timeA = getLatestTimestamp(a);
      const timeB = getLatestTimestamp(b);
      return timeB - timeA;
    });
  }, [
    purchaseRequests,
    searchInput,
    dateRangeInput,
  ]);

  /* =========================================================
     PAGINATION
     ========================================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredPurchaseRequests.length /
      DEFAULT_PAGE_SIZE
    )
  );

  const visiblePurchaseRequests =
    useMemo(() => {
      const startIndex =
        (pageNumber - 1) *
        DEFAULT_PAGE_SIZE;

      return filteredPurchaseRequests.slice(
        startIndex,
        startIndex +
        DEFAULT_PAGE_SIZE
      );
    }, [
      filteredPurchaseRequests,
      pageNumber,
    ]);

  useEffect(() => {
    if (pageNumber > totalPages) {
      setPageNumber(totalPages);
    }
  }, [pageNumber, totalPages]);

  /* =========================================================
     EVENTS
     ========================================================= */

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
    setPageNumber(1);
  };

  const handleResetClick = () => {
    manualRefreshRef.current = true;

    setSearchInput("");
    setDateRangeInput(null);
    setPageNumber(1);

    setRefreshKey(
      (previous) => previous + 1
    );
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
    const purchaseRequestId =
      getPurchaseId(item);

    if (!purchaseRequestId) {
      AuthNotify.error(
        "Không thể mở chi tiết",
        "Không tìm thấy mã yêu cầu mua hộ."
      );
      return;
    }

    navigate(
      `/check-orders/buy-on-behalf/${purchaseRequestId}`,
      {
        state: {
          purchaseRequest: item,
          orderSummary: item,
        },
      }
    );
  };

  const handleCopyPurchaseCode = async (
    event,
    item
  ) => {
    event.stopPropagation();

    const purchaseCode = String(
      item?.purchaseCode || ""
    ).trim();

    if (!purchaseCode) {
      AuthNotify.warning(
        "Chưa có mã vận đơn",
        "Không tìm thấy mã để sao chép."
      );
      return;
    }

    try {
      await writeTextToClipboard(
        purchaseCode
      );

      setCopiedCode(purchaseCode);

      AuthNotify.success(
        "Đã sao chép mã vận đơn",
        purchaseCode
      );

      if (copyTimerRef.current) {
        window.clearTimeout(
          copyTimerRef.current
        );
      }

      copyTimerRef.current =
        window.setTimeout(() => {
          setCopiedCode("");
        }, 1800);
    } catch (error) {
      AuthNotify.error(
        "Sao chép thất bại",
        "Vui lòng bôi đen và sao chép mã thủ công."
      );
    }
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

  const hasActiveFilter = Boolean(
    searchInput.trim() ||
    (dateRangeInput?.[0] &&
      dateRangeInput?.[1])
  );

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="purchase-pending-container">
      <div className="purchase-pending-page-header">
        <div>
          <h1 className="purchase-pending-page-title">
            THEO DÕI BÁO GIÁ MUA HỘ
          </h1>

          <p className="purchase-pending-page-subtitle">
            Danh sách yêu cầu mua hộ đã được gửi báo giá
          </p>
        </div>

        <div className="purchase-pending-page-summary">
          <strong>
            {filteredPurchaseRequests.length}
          </strong>

          <span>Yêu cầu</span>
        </div>
      </div>

      <div className="purchase-pending-filter-section">
        <div className="purchase-pending-filter-fields">
          <Space size="middle" wrap>
            <Input
              prefix={
                <SearchIcon className="purchase-pending-search-icon" />
              }
              placeholder="Tìm mã yêu cầu, người nhận, sản phẩm..."
              value={searchInput}
              allowClear
              className="purchase-pending-search-input"
              onChange={handleSearchChange}
            />

            <RangePicker
              value={dateRangeInput}
              onChange={handleDateRangeChange}
              disabledDate={disabledRangeDate}
              format="DD/MM/YYYY"
              placeholder={[
                "Từ ngày",
                "Đến ngày",
              ]}
              allowClear
              inputReadOnly
              className="purchase-pending-date-picker"
            />
          </Space>
        </div>

        <div className="purchase-pending-filter-actions">
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<AutorenewIcon />}
            onClick={handleResetClick}
            disabled={loading}
            className="purchase-pending-reset-button"
          >
            LÀM MỚI
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="purchase-pending-loading-box">
          <CircularProgress size={38} />

          <div>
            Đang cập nhật danh sách yêu cầu mua hộ...
          </div>
        </div>
      ) : (
        <>
          <div className="purchase-pending-card-list">
            {visiblePurchaseRequests.length ===
              0 ? (
              <div className="purchase-pending-empty-container">
                <div className="purchase-pending-empty-icon">
                  📭
                </div>

                <h3>
                  Không tìm thấy yêu cầu mua hộ
                </h3>

                <p>
                  Chỉ hiển thị các yêu cầu có trạng thái Đã báo giá.
                  Hãy thay đổi từ khóa hoặc khoảng ngày tìm kiếm.
                </p>

                {hasActiveFilter && (
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<AutorenewIcon />}
                    onClick={handleResetClick}
                    className="purchase-pending-empty-reset-button"
                  >
                    Xóa bộ lọc
                  </Button>
                )}
              </div>
            ) : (
              visiblePurchaseRequests.map(
                (item) => {
                  const statusClass =
                    getStatusClassName(
                      item.status
                    );

                  return (
                    <div
                      key={
                        item.purchaseRequestId ||
                        item.purchaseCode
                      }
                      className="purchase-pending-card"
                      role="button"
                      tabIndex={0}
                      aria-label={`Xem chi tiết yêu cầu mua hộ ${getPurchaseCode(
                        item
                      )}`}
                      onClick={() =>
                        handleViewDetail(item)
                      }
                      onKeyDown={(event) =>
                        handleCardKeyDown(
                          event,
                          item
                        )
                      }
                    >
                      <div className="purchase-pending-card-header">
                        <div className="purchase-pending-header-left">
                          <div className="purchase-pending-code-group">
                            <span className="purchase-pending-code-label">
                              Mã vận đơn
                            </span>

                            <span className="purchase-pending-order-code">
                              {getPurchaseCode(item)}
                            </span>

                            <button
                              type="button"
                              className={`purchase-pending-copy-code-button ${copiedCode === item.purchaseCode
                                ? "is-copied"
                                : ""
                                }`}
                              aria-label={`Sao chép mã vận đơn ${getPurchaseCode(item)}`}
                              title={
                                copiedCode === item.purchaseCode
                                  ? "Đã sao chép"
                                  : "Sao chép mã vận đơn"
                              }
                              onClick={(event) =>
                                handleCopyPurchaseCode(
                                  event,
                                  item
                                )
                              }
                            >
                              {copiedCode === item.purchaseCode ? (
                                <CheckRoundedIcon />
                              ) : (
                                <ContentCopyRoundedIcon />
                              )}

                              <span>
                                {copiedCode === item.purchaseCode
                                  ? "Đã sao chép"
                                  : "Sao chép"}
                              </span>
                            </button>
                          </div>

                          <span className="purchase-pending-tag-type">
                            MUA HỘ
                          </span>

                          <span className="purchase-pending-tag-count">
                            {item.itemCount ?? 0} sản phẩm
                          </span>

                          <span
                            className={`purchase-pending-status-tag purchase-pending-status-${statusClass}`}
                          >
                            {formatStatusCode(
                              item.status
                            )}
                          </span>
                        </div>

                        <Button
                          variant="outlined"
                          size="small"
                          endIcon={
                            <ArrowForwardIcon />
                          }
                          className="purchase-pending-view-detail-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleViewDetail(item);
                          }}
                        >
                          Xem chi tiết
                        </Button>
                      </div>

                      <div className="purchase-pending-sub-header">
                        <span>
                          Người nhận:{" "}
                          <strong>
                            {item.receiverName || "-"}
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

                        {item.statusUpdatedAt &&
                          item.statusUpdatedAt !== item.createdAt && (
                            <span
                              title={formatDateUtcTitle(item.statusUpdatedAt)}
                              style={{ color: "#059669" }}
                            >
                              🕒 Ngày cập nhật:{" "}
                              <strong>
                                {formatDate(item.statusUpdatedAt)}
                              </strong>
                            </span>
                          )}

                        <span className="purchase-pending-status-inline">
                          TRẠNG THÁI:{" "}
                          <b>
                            {formatStatusCode(
                              item.status
                            )}
                          </b>
                        </span>
                      </div>

                      <div className="purchase-pending-card-body">
                        <div className="purchase-pending-body-left">
                          <div className="purchase-pending-box-icon">
                            🛒
                          </div>

                          <div className="purchase-pending-product-info">
                            <div className="purchase-pending-customer-name">
                              Người nhận: {item.receiverName || "-"}
                            </div>

                            <div className="purchase-pending-sku-tag">
                              Mã yêu cầu:{" "}
                              {getPurchaseId(item) || "-"}
                            </div>

                            <div className="purchase-pending-products">
                              <div className="purchase-pending-products-title">
                                Danh sách sản phẩm
                              </div>

                              {getProductItems(item).length > 0 ? (
                                getProductItems(item).map((product, productIndex) => (
                                  <div
                                    className="purchase-pending-product-row"
                                    key={`${getPurchaseId(item)}-${productIndex}`}
                                  >
                                    <span className="purchase-pending-product-index">
                                      {productIndex + 1}
                                    </span>
                                    <span className="purchase-pending-product-name">
                                      {product?.productName || "Sản phẩm chưa có tên"}
                                    </span>
                                    <strong className="purchase-pending-product-quantity">
                                      SL: {Number(product?.quantity || 0).toLocaleString("vi-VN")}
                                    </strong>
                                  </div>
                                ))
                              ) : (
                                <div className="purchase-pending-product-empty">
                                  Chưa có thông tin sản phẩm
                                </div>
                              )}
                            </div>

                            <div className="purchase-pending-note">
                              Ghi chú:{" "}
                              {item.generalNote?.trim()
                                ? item.generalNote
                                : "Không có ghi chú"}
                            </div>
                          </div>
                        </div>

                        <div className="purchase-pending-body-right">
                          <span
                            className={`purchase-pending-status-badge purchase-pending-status-${statusClass}`}
                          >
                            {formatStatusCode(
                              item.status
                            )}
                          </span>

                          <div className="purchase-pending-request-type">
                            <span>
                              LOẠI YÊU CẦU
                            </span>

                            <strong>
                              MUA HỘ
                            </strong>
                          </div>

                          <div className="purchase-pending-specs-list">
                            <span>
                              Mặt hàng:{" "}
                              <strong>
                                {item.itemCount ?? 0}
                              </strong>
                            </span>

                            <span>
                              Tổng SL:{" "}
                              <strong>
                                {getTotalQuantity(item).toLocaleString("vi-VN")}
                              </strong>
                            </span>

                            <span>
                              Mã:{" "}
                              <strong>
                                {getPurchaseCode(item)}
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

          {filteredPurchaseRequests.length >
            0 && (
              <div className="purchase-pending-pagination-section">
                <span className="purchase-pending-pagination-summary">
                  Hiển thị{" "}
                  <strong>
                    {
                      visiblePurchaseRequests.length
                    }
                  </strong>{" "}
                  mục trên trang này, tổng cộng{" "}
                  <strong>
                    {
                      filteredPurchaseRequests.length
                    }
                  </strong>{" "}
                  mục
                </span>

                <Pagination
                  count={totalPages}
                  page={pageNumber}
                  onChange={handlePageChange}
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

export default BuyForMeQuotationList;