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
  
  import AuthNotify from "../../../../utils/AuthNotify";
  
  import {
    getPurchaseRequestsApi,
  } from "../../../../api/OrderApi/purchaseRequestApi";
  
  import "./PurchaseRequestPendingList.css";
  
  const { RangePicker } = DatePicker;
  
  const DEFAULT_PAGE_SIZE = 5;
  
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
  
    return normalizedStatus
      .replaceAll("_", " ")
      .replaceAll("-", " ");
  };
  
  const getApiDateOnly = (dateString) => {
    if (!dateString) {
      return null;
    }
  
    const matchedDate = String(dateString).match(
      /^(\d{4}-\d{2}-\d{2})/
    );
  
    return matchedDate?.[1] || null;
  };
  
  const parseApiDateTime = (dateString) => {
    if (!dateString) {
      return null;
    }
  
    const normalizedDate = String(dateString).replace(
      /(\.\d{3})\d+/,
      "$1"
    );
  
    const date = dayjs(normalizedDate);
  
    return date.isValid() ? date : null;
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
  
  const isPendingReviewStatus = (status) => {
    return normalizeStatus(status) === "PENDING_REVIEW";
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
  
  const formatDate = (dateString) => {
    const date = parseApiDateTime(dateString);
  
    if (!date) {
      return "-";
    }
  
    return date.format("HH:mm DD/MM/YYYY");
  };
  
  /* =========================================================
     COMPONENT
     ========================================================= */
  
  const PurchaseRequestPendingList = () => {
    const navigate = useNavigate();
    const manualRefreshRef = useRef(false);
  
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
  
    /* =========================================================
       FETCH DATA
       ========================================================= */
  
    const fetchPurchaseRequests = useCallback(
      async (signal) => {
        try {
          setLoading(true);
  
          const result =
            await getPurchaseRequestsApi({
              signal,
            });
  
          const items =
            getPurchaseRequestItems(result);
  
          setPurchaseRequests(items);
  
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
              "Danh sách yêu cầu mua hộ đã được cập nhật."
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
  
      return purchaseRequests.filter((item) => {
        if (
          !isPendingReviewStatus(item.status)
        ) {
          return false;
        }
  
        const searchableContent = [
          item.purchaseRequestId,
          item.purchaseCode,
          item.customerId,
          item.customerName,
          item.itemCount,
          item.status,
          formatStatusCode(item.status),
          item.generalNote,
        ]
          .filter(Boolean)
          .map(normalizeText)
          .join(" ");
  
        const matchesSearch =
          !normalizedSearch ||
          searchableContent.includes(
            normalizedSearch
          );
  
        const createdDate = getApiDateOnly(
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
  
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
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
        `/processing-orders/purchase-requests/${purchaseRequestId}`,
        {
          state: {
            purchaseRequest: item,
            orderSummary: item,
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
              YÊU CẦU MUA HỘ CHỜ DUYỆT
            </h1>
  
            <p className="page-subtitle">
              Danh sách yêu cầu mua hộ đang chờ kiểm tra và duyệt
            </p>
          </div>
  
          <div className="page-summary">
            <strong>
              {filteredPurchaseRequests.length}
            </strong>
  
            <span>Yêu cầu</span>
          </div>
        </div>
  
        <div className="filter-section">
          <div className="filter-fields">
            <Space size="middle" wrap>
              <Input
                prefix={
                  <SearchIcon className="filter-search-icon" />
                }
                placeholder="Tìm mã yêu cầu, khách hàng, ghi chú..."
                value={searchInput}
                allowClear
                className="filter-search-input"
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
              disabled={loading}
              className="filter-reset-button"
            >
              LÀM MỚI
            </Button>
          </div>
        </div>
  
        {loading ? (
          <div className="vcl-loading-box">
            <CircularProgress size={38} />
  
            <div>
              Đang cập nhật danh sách yêu cầu mua hộ...
            </div>
          </div>
        ) : (
          <>
            <div className="card-list">
              {visiblePurchaseRequests.length ===
              0 ? (
                <div className="empty-container">
                  <div className="empty-icon">
                    📭
                  </div>
  
                  <h3>
                    Không tìm thấy yêu cầu mua hộ
                  </h3>
  
                  <p>
                    Chỉ hiển thị các yêu cầu có trạng thái Chờ duyệt.
                    Hãy thay đổi từ khóa hoặc khoảng ngày tìm kiếm.
                  </p>
  
                  {hasActiveFilter && (
                    <Button
                      variant="outlined"
                      color="inherit"
                      startIcon={<AutorenewIcon />}
                      onClick={handleResetClick}
                      className="empty-reset-button"
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
                        className="consignment-card"
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
                        <div className="card-header">
                          <div className="header-left">
                            <span className="order-code">
                              {getPurchaseCode(item)}
                            </span>
  
                            <span className="tag-type">
                              MUA HỘ
                            </span>
  
                            <span className="tag-count">
                              {item.itemCount ?? 0} sản phẩm
                            </span>
  
                            <span
                              className={`tag-status-header status-${statusClass}`}
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
                            className="view-detail-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleViewDetail(item);
                            }}
                          >
                            Xem chi tiết
                          </Button>
                        </div>
  
                        <div className="sub-header">
                          <span>
                            Khách hàng:{" "}
                            <strong>
                              {item.customerName || "-"}
                            </strong>
                          </span>
  
                          <span>
                            📅 Ngày tạo:{" "}
                            <strong>
                              {formatDate(
                                item.createdAt
                              )}
                            </strong>
                          </span>
  
                          <span className="price-total-header">
                            TRẠNG THÁI:{" "}
                            <b className="inspection-yes">
                              Chờ duyệt
                            </b>
                          </span>
                        </div>
  
                        <div className="card-body">
                          <div className="body-left">
                            <div className="box-icon">
                              🛒
                            </div>
  
                            <div className="product-info">
                              <div className="customer-name">
                                Yêu cầu mua hộ{" "}
                                {getPurchaseCode(item)}
                              </div>
  
                              <div className="sku-tag">
                                Mã yêu cầu:{" "}
                                {getPurchaseId(item) || "-"}
                              </div>
  
                              <div className="receiver-phone">
                                Số sản phẩm:{" "}
                                {item.itemCount ?? 0}
                              </div>
  
                              <div className="receiver-address">
                                Ghi chú:{" "}
                                {item.generalNote?.trim()
                                  ? item.generalNote
                                  : "Không có ghi chú"}
                              </div>
                            </div>
                          </div>
  
                          <div className="body-right">
                            <span
                              className={`status-badge-center status-${statusClass}`}
                            >
                              Chờ duyệt
                            </span>
  
                            <div className="shipping-type">
                              <span>
                                LOẠI YÊU CẦU
                              </span>
  
                              <strong>
                                MUA HỘ
                              </strong>
                            </div>
  
                            <div className="specs-list">
                              <span>
                                SP:{" "}
                                <strong>
                                  {item.itemCount ?? 0}
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
              <div className="pagination-section">
                <span className="pagination-summary">
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
  
  export default PurchaseRequestPendingList;