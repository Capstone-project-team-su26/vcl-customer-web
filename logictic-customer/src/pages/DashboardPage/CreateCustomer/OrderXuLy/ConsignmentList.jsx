import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import axios from "axios";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import {
  DatePicker,
  Input,
  Space,
  message,
} from "antd";

import {
  Button,
  CircularProgress,
  Pagination,
} from "@mui/material";

import FilterAltIcon from "@mui/icons-material/FilterAlt";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SearchIcon from "@mui/icons-material/Search";

import { getConsignmentsApi } from "../../../../api/OrderApi/consignmentApi";
import "./ConsignmentList.css";

const { RangePicker } = DatePicker;

const DEFAULT_PAGE_SIZE = 5;
const API_PAGE_SIZE = 100;

const STATUS_LABELS = {
  PENDING_REVIEW: "CHỜ XÁC NHẬN",
  APPROVED: "ĐÃ DUYỆT",
  REJECTED: "ĐÃ TỪ CHỐI",
  CANCELLED: "ĐÃ HỦY",
  IN_TRANSIT: "ĐANG VẬN CHUYỂN",
  DELIVERED: "ĐÃ GIAO",
};

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
 * Lấy phần YYYY-MM-DD từ ngày API.
 *
 * Ví dụ:
 * 2026-06-29T14:00:32.8526551
 * => 2026-06-29
 */
const getApiDateOnly = (dateString) => {
  if (!dateString) {
    return null;
  }

  const matchedDate = String(dateString).match(
    /^(\d{4}-\d{2}-\d{2})/
  );

  return matchedDate?.[1] || null;
};

/**
 * Chuẩn hóa chuỗi thời gian có quá nhiều chữ số mili-giây.
 */
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

const ConsignmentList = () => {
  const navigate = useNavigate();

  const [consignments, setConsignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [dateRangeInput, setDateRangeInput] =
    useState(null);

  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    dateRange: null,
  });

  const [pageNumber, setPageNumber] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  /* =========================================================
     FETCH ALL CONSIGNMENTS
     ========================================================= */

  const fetchAllConsignments = useCallback(
    async (signal) => {
      const firstResponse =
        await getConsignmentsApi({
          pageNumber: 1,
          pageSize: API_PAGE_SIZE,
          signal,
        });

      const firstPageData = firstResponse?.data;

      if (!firstPageData) {
        throw new Error(
          "Response API không chứa trường data."
        );
      }

      const firstPageItems = Array.isArray(
        firstPageData.items
      )
        ? firstPageData.items
        : [];

      const totalApiPages = Math.max(
        1,
        Number(firstPageData.totalPages) || 1
      );

      const actualApiPageSize =
        Number(firstPageData.pageSize) ||
        API_PAGE_SIZE;

      if (totalApiPages === 1) {
        return firstPageItems;
      }

      const remainingRequests = Array.from(
        {
          length: totalApiPages - 1,
        },
        (_, index) =>
          getConsignmentsApi({
            pageNumber: index + 2,
            pageSize: actualApiPageSize,
            signal,
          })
      );

      const remainingResponses =
        await Promise.all(remainingRequests);

      const remainingItems =
        remainingResponses.flatMap((response) => {
          return Array.isArray(
            response?.data?.items
          )
            ? response.data.items
            : [];
        });

      return [
        ...firstPageItems,
        ...remainingItems,
      ];
    },
    []
  );

  const fetchConsignments = useCallback(
    async (signal) => {
      try {
        setLoading(true);

        const items =
          await fetchAllConsignments(signal);

        setConsignments(items);
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

        message.error(
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

  /* =========================================================
     DATE RANGE
     ========================================================= */

  /**
   * Sau khi chọn ngày đầu, vô hiệu hóa tất cả ngày trước đó.
   *
   * Ví dụ chọn 20/06/2026:
   * - 19/06/2026 bị khóa
   * - các ngày năm 2025 bị khóa
   * - 20/06/2026 trở đi được chọn
   */
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
      return;
    }

    const startDate = dayjs(dates[0]).startOf(
      "day"
    );

    const endDate = dayjs(dates[1]).startOf(
      "day"
    );

    if (endDate.isBefore(startDate, "day")) {
      message.warning(
        "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu."
      );

      setDateRangeInput([
        startDate,
        startDate,
      ]);

      return;
    }

    setDateRangeInput([
      startDate,
      endDate,
    ]);
  };

  /* =========================================================
     FILTER
     ========================================================= */

  const filteredConsignments = useMemo(() => {
    const normalizedSearch = normalizeText(
      appliedFilters.search
    );

    /*
     * Chuyển RangePicker về chuỗi YYYY-MM-DD.
     * Không dùng giờ để tránh lệch múi giờ.
     */
    const startDate =
      appliedFilters.dateRange?.[0]?.format(
        "YYYY-MM-DD"
      ) || null;

    const endDate =
      appliedFilters.dateRange?.[1]?.format(
        "YYYY-MM-DD"
      ) || null;

    return consignments.filter((item) => {
      const searchableContent = [
        item.orderId,
        item.consignmentCode,
        item.customerName,
        item.consignmentType,
        item.status,
        item.route,
        item.receiverName,
        item.receiverPhone,
        item.receiverAddress,
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
  }, [consignments, appliedFilters]);

  /* =========================================================
     CLIENT PAGINATION
     ========================================================= */

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

  /* =========================================================
     EVENT HANDLERS
     ========================================================= */

  const handleFilterClick = () => {
    let selectedDateRange = null;

    if (
      Array.isArray(dateRangeInput) &&
      dateRangeInput[0] &&
      dateRangeInput[1]
    ) {
      const startDate = dayjs(
        dateRangeInput[0]
      ).startOf("day");

      const endDate = dayjs(
        dateRangeInput[1]
      ).startOf("day");

      /*
       * Kiểm tra lại để xử lý trường hợp người dùng
       * nhập ngày trực tiếp bằng bàn phím.
       */
      if (endDate.isBefore(startDate, "day")) {
        message.warning(
          "Ngày kết thúc không được nhỏ hơn ngày bắt đầu."
        );

        return;
      }

      selectedDateRange = [
        startDate,
        endDate,
      ];
    }

    setAppliedFilters({
      search: searchInput.trim(),
      dateRange: selectedDateRange,
    });

    setPageNumber(1);
  };

  const handleResetClick = () => {
    setSearchInput("");
    setDateRangeInput(null);

    setAppliedFilters({
      search: "",
      dateRange: null,
    });

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

  /* =========================================================
     DISPLAY HELPERS
     ========================================================= */

  const formatDate = (dateString) => {
    const date = parseApiDateTime(dateString);

    if (!date) {
      return "-";
    }

    return date.format(
      "HH:mm DD/MM/YYYY"
    );
  };

  const getStatusLabel = (status) => {
    const normalizedStatus = String(
      status || ""
    )
      .trim()
      .toUpperCase();

    return (
      STATUS_LABELS[normalizedStatus] ||
      normalizedStatus ||
      "-"
    );
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

  const getDisplayCode = (item) => {
    if (item.consignmentCode?.trim()) {
      return item.consignmentCode.trim();
    }

    const shortId = item.orderId
      ? item.orderId
          .slice(0, 7)
          .toUpperCase()
      : "UNKNOWN";

    return `KG-${shortId}`;
  };

  const getShortOrderId = (orderId) => {
    if (!orderId) {
      return "DH-UNKNOWN";
    }

    return `DH-${orderId
      .slice(0, 7)
      .toUpperCase()}`;
  };

  const hasActiveFilter = Boolean(
    appliedFilters.search ||
      (appliedFilters.dateRange?.[0] &&
        appliedFilters.dateRange?.[1])
  );

  const appliedStartDate =
    appliedFilters.dateRange?.[0]?.format(
      "DD/MM/YYYY"
    );

  const appliedEndDate =
    appliedFilters.dateRange?.[1]?.format(
      "DD/MM/YYYY"
    );

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="vcl-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            THEO DÕI VẬN CHUYỂN
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

          <span>Lô hàng</span>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-fields">
          <Space size="middle" wrap>
            <Input
              prefix={
                <SearchIcon className="filter-search-icon" />
              }
              placeholder="Tìm mã đơn, khách hàng, người nhận..."
              value={searchInput}
              onChange={(event) =>
                setSearchInput(
                  event.target.value
                )
              }
              onPressEnter={
                handleFilterClick
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
            variant="contained"
            startIcon={<FilterAltIcon />}
            onClick={handleFilterClick}
            disabled={loading}
            className="filter-submit-button"
          >
            BỘ LỌC
          </Button>

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

      {hasActiveFilter && (
        <div className="active-filter-summary">
          <div className="active-filter-content">
            <FilterAltIcon />

            <span>
              Đang hiển thị{" "}
              <strong>
                {filteredConsignments.length}
              </strong>{" "}
              kết quả phù hợp
              {appliedFilters.search && (
                <>
                  {" "}
                  với từ khóa “
                  <strong>
                    {appliedFilters.search}
                  </strong>
                  ”
                </>
              )}
              {appliedStartDate &&
                appliedEndDate && (
                  <>
                    {" "}
                    trong khoảng{" "}
                    <strong>
                      {appliedStartDate}
                    </strong>{" "}
                    đến{" "}
                    <strong>
                      {appliedEndDate}
                    </strong>
                  </>
                )}
            </span>
          </div>

          <button
            type="button"
            className="clear-filter-link"
            onClick={handleResetClick}
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      {loading ? (
        <div className="vcl-loading-box">
          <CircularProgress size={38} />

          <div>
            Đang cập nhật trạng thái dữ
            liệu...
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
                  Không tìm thấy lô hàng
                </h3>

                <p>
                  Hãy thay đổi từ khóa hoặc
                  khoảng ngày tìm kiếm.
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
                      aria-label={`Xem chi tiết lô hàng ${getDisplayCode(
                        item
                      )}`}
                    >
                      <div className="card-header">
                        <div className="header-left">
                          <span className="order-code">
                            {getDisplayCode(
                              item
                            )}
                          </span>

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

                        <span>
                          📅 Ngày tạo:{" "}
                          <strong>
                            {formatDate(
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
                            <div className="customer-name">
                              {item.customerName ||
                                "-"}
                            </div>

                            <div className="sku-tag">
                              {getShortOrderId(
                                item.orderId
                              )}
                            </div>

                            <div className="receiver-phone">
                              {item.receiverPhone ||
                                "-"}
                            </div>

                            <div className="receiver-address">
                              {item.receiverAddress ||
                                "-"}
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