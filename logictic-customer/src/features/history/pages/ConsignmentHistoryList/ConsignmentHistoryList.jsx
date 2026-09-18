import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import axios from "@shared/api/requestCancel";
import dayjs from "dayjs";
import { useLocation, useNavigate } from "react-router-dom";

import {
  DatePicker,
  Input,
  Select,
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

import {
  getConsignmentPaymentStatusApi,
  getConsignmentsApi,
} from "@features/consignment/api/consignmentApi";
import { getConsignmentStatusesApi } from "@features/consignment/api/consignmentStatusApi";
import AuthNotify from "@shared/components/AuthNotify/AuthNotify";

import {
  clearPendingConsignmentPayment,
  parsePayOsReturn,
  pollConsignmentPaymentStatus,
  readPendingConsignmentPayment,
  stripPayOsReturnParams,
} from "@features/payment/utils/consignmentPaymentReturn";

import {
  ORDER_STATUS,
  ORDER_STATUS_ORDER,
  getOrderStatusLabel,
  normalizeOrderStatus,
} from "@features/consignment";

import {
  PAGE_SIZE_OPTIONS,
  SEARCH_DEBOUNCE_MS,
} from "./ConsignmentHistoryList.constants";

import {
  copyTextToClipboard,
  extractConsignmentPage,
  formatDate,
  formatDateUtcTitle,
  getItemStatus,
  getProductNames,
  normalizeConsignmentTime,
  normalizeStatusKey,
  normalizeStatusOptions,
} from "./ConsignmentHistoryList.helpers";

import "./ConsignmentHistoryList.css";

const { RangePicker } = DatePicker;

const ConsignmentHistoryList = ({ defaultStatus } = {}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [consignments, setConsignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [statusInput, setStatusInput] =
    useState(defaultStatus || "");

  const [dateRangeInput, setDateRangeInput] =
    useState(null);

  const [statusOptions, setStatusOptions] =
    useState([]);
  const [loadingStatuses, setLoadingStatuses] =
    useState(false);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copiedTrackingCode, setCopiedTrackingCode] =
    useState("");
  const copyResetTimerRef = useRef(null);
  const requestSequenceRef = useRef(0);

  /* =========================================================
     SERVER PAGINATION + DEBOUNCED FILTERS
     ========================================================= */

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPageNumber(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timerId);
  }, [searchInput]);

  const requestFilters = useMemo(() => {
    const fromDate =
      dateRangeInput?.[0]?.format("YYYY-MM-DD") ||
      undefined;

    const toDate =
      dateRangeInput?.[1]?.format("YYYY-MM-DD") ||
      undefined;

    return {
      search: debouncedSearch || undefined,
      status: statusInput || undefined,
      fromDate,
      toDate,
    };
  }, [
    dateRangeInput,
    debouncedSearch,
    statusInput,
  ]);

  const fetchConsignments = useCallback(
    async (signal) => {
      const requestSequence =
        requestSequenceRef.current + 1;

      requestSequenceRef.current =
        requestSequence;

      try {
        setLoading(true);

        /*
         * Truyền pageNumber & pageSize trực tiếp vào API call
         */
        const response =
          await getConsignmentsApi(
            pageNumber,
            pageSize,
            {
              signal,
              params: requestFilters,
            }
          );

        if (
          signal?.aborted ||
          requestSequence !==
            requestSequenceRef.current
        ) {
          return;
        }

        const pageData =
          extractConsignmentPage(response, pageSize);

        setConsignments(
          pageData.items.map(
            normalizeConsignmentTime
          )
        );
        setTotalCount(pageData.totalCount);
        setTotalPages(
          Math.max(1, pageData.totalPages)
        );
      } catch (error) {
        if (
          axios.isCancel(error) ||
          error?.code === "ERR_CANCELED" ||
          error?.name === "CanceledError" ||
          error?.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Lỗi khi lấy danh sách ký gửi:",
          error
        );

        AuthNotify.error(
          "Không tải được danh sách ký gửi",
          error?.response?.data?.message ||
            error?.message ||
            "Không thể tải danh sách ký gửi."
        );

        setConsignments([]);
        setTotalCount(0);
        setTotalPages(1);
      } finally {
        if (
          !signal?.aborted &&
          requestSequence ===
            requestSequenceRef.current
        ) {
          setLoading(false);
        }
      }
    },
    [pageNumber, pageSize, requestFilters]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchConsignments(controller.signal);

    return () => controller.abort();
  }, [fetchConsignments, refreshKey]);

  /* =========================================================
     KHOẢN CỌC ĐANG CHỜ (payOS trả khách về đây)

     Chạy một lần lúc mở trang: đọc query payOS + khoản đang chờ trong
     sessionStorage rồi poll GET /api/payments/status/{orderCode} mỗi 4 giây,
     tối đa 2 phút (webhook payOS mới là nơi đổi trạng thái đơn, FE chỉ chờ).
     ========================================================= */

  useEffect(() => {
    const payOsReturn = parsePayOsReturn(location.search);
    const pending = readPendingConsignmentPayment();

    /* Bỏ query payOS khỏi URL để F5 không xử lý lại. */
    if (payOsReturn.hasPayOsParams) {
      navigate(
        {
          pathname: location.pathname,
          search: stripPayOsReturnParams(location.search),
          hash: location.hash,
        },
        { replace: true, state: location.state },
      );
    }

    const matchesPending =
      Boolean(pending) &&
      (!payOsReturn.orderCode ||
        pending.orderCode === payOsReturn.orderCode);

    const orderLabel =
      matchesPending && pending?.consignmentCode
        ? ` đơn ${pending.consignmentCode}`
        : "";

    const forgetPending = () => {
      if (matchesPending) {
        clearPendingConsignmentPayment();
      }
    };

    if (payOsReturn.cancelled) {
      forgetPending();

      AuthNotify.info(
        "Đã hủy thanh toán",
        `Bạn đã hủy thanh toán tiền cọc${orderLabel}. Có thể thanh toán lại trong lịch sử thanh toán của đơn.`,
      );

      return undefined;
    }

    const orderCode = payOsReturn.orderCode || pending?.orderCode || "";

    if (!orderCode) {
      return undefined;
    }

    return pollConsignmentPaymentStatus({
      orderCode,
      fetchStatus: getConsignmentPaymentStatusApi,
      onDone: ({ outcome }) => {
        if (outcome === "paid") {
          forgetPending();

          AuthNotify.success(
            "Thanh toán tiền cọc thành công",
            `Hệ thống đã nhận tiền cọc${orderLabel}. Trạng thái đơn đang được cập nhật.`,
          );

          setRefreshKey((value) => value + 1);
          return;
        }

        if (outcome === "failed") {
          forgetPending();

          AuthNotify.warning(
            "Thanh toán chưa thành công",
            `Giao dịch tiền cọc${orderLabel} chưa hoàn tất. Vui lòng thử lại trong lịch sử thanh toán của đơn.`,
          );
          return;
        }

        if (outcome === "not_found") {
          forgetPending();
          return;
        }

        AuthNotify.info(
          "Đang chờ xác nhận thanh toán",
          `Hệ thống chưa nhận được xác nhận cho khoản cọc${orderLabel}. Trạng thái đơn sẽ tự cập nhật, vui lòng tải lại sau ít phút.`,
        );
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ xử lý một lần lúc mở trang
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStatuses = async () => {
      try {
        setLoadingStatuses(true);

        const result =
          await getConsignmentStatusesApi({
            signal: controller.signal,
          });

        setStatusOptions(
          normalizeStatusOptions(result)
        );
      } catch (error) {
        if (
          axios.isCancel(error) ||
          error?.code === "ERR_CANCELED" ||
          error?.name === "CanceledError" ||
          error?.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Lỗi khi lấy danh sách trạng thái:",
          error
        );

        AuthNotify.error(
          "Không tải được trạng thái",
          error?.response?.data?.message ||
            error?.message ||
            "Không thể tải danh sách trạng thái."
        );

        setStatusOptions([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingStatuses(false);
        }
      }
    };

    fetchStatuses();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(
    () => () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    },
    []
  );

  /*
   * Dropdown lọc dùng đúng 19 mã đích của đơn ký gửi, nhãn và thứ tự lấy từ
   * module trạng thái dùng chung. Mã API/đơn trả về (kể cả mã cũ) được chuẩn
   * hóa trước; mã lạ vẫn được bổ sung để không đơn nào lọt khỏi bộ lọc.
   */
  const statusFilterOptions = useMemo(() => {
    const optionMap = new Map();

    const put = (rawStatus) => {
      const key = normalizeOrderStatus(
        normalizeStatusKey(rawStatus)
      );

      if (!key || optionMap.has(key)) {
        return;
      }

      optionMap.set(key, {
        value: key,
        label: getOrderStatusLabel(key),
      });
    };

    statusOptions.forEach((option) => put(option.value));

    consignments.forEach((item) => put(getItemStatus(item)));

    const orderIndex = (code) => {
      const index = ORDER_STATUS_ORDER.indexOf(code);

      return index === -1 ? ORDER_STATUS_ORDER.length : index;
    };

    return Array.from(
      optionMap.values()
    ).sort(
      (first, second) =>
        orderIndex(first.value) - orderIndex(second.value)
    );
  }, [
    consignments,
    statusOptions,
  ]);

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
     SERVER RESULT
     ========================================================= */

  const visibleConsignments = consignments;

  useEffect(() => {
    if (pageNumber > totalPages) {
      setPageNumber(totalPages);
    }
  }, [pageNumber, totalPages]);

  /* =========================================================
     EVENT HANDLERS
     ========================================================= */

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
  };

  const handleStatusChange = (value) => {
    setStatusInput(normalizeStatusKey(value));

    setPageNumber(1);
  };

  const handleResetClick = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusInput("");
    setDateRangeInput(null);
    setPageNumber(1);

    setRefreshKey(
      (previous) => previous + 1
    );
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
      document.querySelector(".consignment-data-scroll") ||
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
    if (!item?.orderId) {
      return;
    }
  
    navigate(
      `/orders/${item.orderId}/payments/history`,
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

  const getStatusLabel = (status) =>
    getOrderStatusLabel(normalizeStatusKey(status));

  /*
   * Nhóm màu của thẻ đơn theo 19 mã đích (mã cũ được chuẩn hóa trước).
   */
  const getStatusClassName = (status) => {
    const normalizedStatus = normalizeOrderStatus(
      normalizeStatusKey(status)
    );

    if (normalizedStatus === ORDER_STATUS.DEPOSIT_PAID) {
      return "deposit-paid";
    }

    if (
      [
        ORDER_STATUS.APPROVED,
        ORDER_STATUS.CHECKED_IN,
        ORDER_STATUS.PAID,
        ORDER_STATUS.DELIVERED,
        ORDER_STATUS.COMPLETED,
      ].includes(normalizedStatus)
    ) {
      return "completed";
    }

    if (
      [
        ORDER_STATUS.REJECTED,
        ORDER_STATUS.QUOTATION_REJECTED,
        ORDER_STATUS.CANCELLED,
      ].includes(normalizedStatus)
    ) {
      return "canceled";
    }

    if (normalizedStatus === ORDER_STATUS.QUOTATION_SENT) {
      return "quotation";
    }

    if (
      [
        ORDER_STATUS.IN_TRANSIT,
        ORDER_STATUS.ARRIVED_VN,
        ORDER_STATUS.ARRIVED_DESTINATION,
        ORDER_STATUS.STORED_AT_VN,
        ORDER_STATUS.DELIVERING,
      ].includes(normalizedStatus)
    ) {
      return "shipping";
    }

    if (
      [
        ORDER_STATUS.PENDING_REVIEW,
        ORDER_STATUS.NEED_MORE_INFO,
        ORDER_STATUS.WAITING_DEPOSIT,
        ORDER_STATUS.WAITING_PAYMENT,
      ].includes(normalizedStatus)
    ) {
      return "pending";
    }

    return "neutral";
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

  const hasActiveFilter = Boolean(
    searchInput.trim() ||
      statusInput ||
      (
        dateRangeInput?.[0] &&
        dateRangeInput?.[1]
      )
  );

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="vcl-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            LỊCH SỬ YÊU CẦU KÝ GỬI
          </h1>

          <p className="page-subtitle">
            Danh sách toàn bộ yêu cầu ký gửi và trạng thái xử lý
          </p>
        </div>

        <div className="page-summary">
          <strong>
            {totalCount}
          </strong>

          <span>Tổng đơn ký gửi</span>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-fields">
          <Space size="middle" wrap>
            <Input
              prefix={
                <SearchIcon className="filter-search-icon" />
              }
              placeholder="Tìm theo mã VCL-..."
              value={searchInput}
              onChange={handleSearchChange}
              onPressEnter={() =>
                setPageNumber(1)
              }
              allowClear
              className="filter-search-input"
            />

            <Select
              value={
                statusInput ||
                undefined
              }
              options={
                statusFilterOptions
              }
              onChange={
                handleStatusChange
              }
              placeholder="Tất cả trạng thái"
              allowClear
              showSearch
              optionFilterProp="label"
              loading={
                loadingStatuses
              }
              disabled={
                loadingStatuses
              }
              className="filter-status-select"
              style={{
                minWidth: 220,
              }}
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
              disabled
              allowEmpty={[true, true]}
              className="filter-date-picker"
            />

            <Select
              value={pageSize}
              options={PAGE_SIZE_OPTIONS}
              onChange={(val) => {
                setPageSize(val);
                setPageNumber(1);
              }}
              className="filter-pagesize-select"
              style={{ minWidth: 145 }}
              title="Chọn số đơn hiển thị trên 1 trang"
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
              loading || loadingStatuses
            }
            className="filter-reset-button"
          >
            LÀM MỚI
          </Button>
        </div>
      </div>

      <div className="consignment-data-scroll">
      {loading ? (
        <div className="vcl-loading-box">
          <CircularProgress size={38} />

          <div>
            Đang cập nhật trạng thái dữ
            liệu...
          </div>
        </div>
      ) : (
          <div className="card-list">
            {visibleConsignments.length ===
            0 ? (
              <div className="empty-container">
                <div className="empty-icon">
                  📭
                </div>

                <h3>
                  Không tìm thấy yêu cầu ký gửi phù hợp
                </h3>

                <p>
                  Hãy thay đổi từ khóa, trạng thái, khoảng ngày hoặc làm mới dữ liệu.
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
                  const itemStatus =
                    getItemStatus(item);

                  const statusClass =
                    getStatusClassName(
                      itemStatus
                    );

                  const productNames =
                    getProductNames(item);

                  return (
                    <div
                      key={item.orderId || item.consignmentCode}
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
                                itemStatus
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
                              itemStatus
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

        )}
      </div>

      {totalCount > 0 && (
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
                totalCount
              }
            </strong>{" "}
            mục
          </span>

          <div className="pagination-controls">
            <Select
              value={pageSize}
              options={PAGE_SIZE_OPTIONS}
              onChange={(val) => {
                setPageSize(val);
                setPageNumber(1);
              }}
              className="pagination-pagesize-select"
              style={{ minWidth: 145 }}
            />

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
        </div>
      )}
    </div>
  );
};

export default ConsignmentHistoryList;