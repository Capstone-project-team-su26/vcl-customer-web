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

import { getConsignmentsApi } from "../../../../api/OrderApi/consignmentApi";
import { getConsignmentStatusesApi } from "../../../../api/OrderApi/consignmentStatusApi";
import AuthNotify from "../../../../utils/AuthNotify";

import {
  apiToUtcIso,
  formatVietnamDateTime,
  formatUtcDateTime,
} from "../../../../utils/timeUtc";

import "./ConsignmentHistoryList.css";

const { RangePicker } = DatePicker;

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 450;

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

const extractConsignmentPage = (apiResult) => {
  const candidates = [
    apiResult?.data?.data,
    apiResult?.data,
    apiResult,
  ];

  const pageData =
    candidates.find(
      (candidate) =>
        candidate &&
        typeof candidate === "object" &&
        !Array.isArray(candidate) &&
        (
          Array.isArray(candidate.items) ||
          Array.isArray(candidate.results)
        )
    ) || null;

  if (pageData) {
    const items = Array.isArray(
      pageData.items
    )
      ? pageData.items
      : Array.isArray(pageData.results)
        ? pageData.results
        : [];

    return {
      items,
      totalCount:
        Number(pageData.totalCount) ||
        items.length,
      pageNumber:
        Number(pageData.pageNumber) ||
        1,
      pageSize:
        Number(pageData.pageSize) ||
        DEFAULT_PAGE_SIZE,
      totalPages: Math.max(
        1,
        Number(pageData.totalPages) ||
          1
      ),
    };
  }

  const arrayCandidates = [
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

  const items =
    arrayCandidates.find(
      Array.isArray
    ) || [];

  return {
    items,
    totalCount: items.length,
    pageNumber: 1,
    pageSize:
      items.length ||
      DEFAULT_PAGE_SIZE,
    totalPages: 1,
  };
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

const normalizeStatusKey = (value) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
};

/**
 * Toàn bộ trạng thái hiển thị cho khách hàng phải dùng tiếng Việt.
 * Không sử dụng trực tiếp label tiếng Anh do API trả về.
 */
const STATUS_FALLBACK_LABELS = Object.freeze({
  NEW: "Đơn mới",
  CREATED: "Đã tạo đơn",
  SUBMITTED: "Đã gửi yêu cầu",

  PENDING: "Chờ xử lý",
  PENDING_REVIEW: "Chờ duyệt",
  WAITING_REVIEW: "Chờ duyệt",
  UNDER_REVIEW: "Đang duyệt",
  WAITING_CONFIRMATION: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  APPROVED: "Đã duyệt",
  ON_HOLD: "Tạm giữ xử lý",

  WAITING_QUOTATION: "Chờ báo giá",
  PENDING_QUOTATION: "Chờ báo giá",
  QUOTATION_SENT: "Đã gửi báo giá",
  QUOTATION_CONFIRMED: "Đã xác nhận báo giá",
  QUOTED: "Đã có báo giá",
  QUOTATION_ACCEPTED: "Đã chấp nhận báo giá",
  QUOTATION_REJECTED: "Đã từ chối báo giá",
  QUOTATION_EXPIRED: "Báo giá đã hết hạn",

  WAITING_DEPOSIT: "Chờ đặt cọc",
  DEPOSIT_PENDING: "Chờ đặt cọc",
  PENDING_DEPOSIT: "Chờ đặt cọc",
  DEPOSIT_PAID: "Đã thanh toán tiền cọc",
  DEPOSIT_CONFIRMED: "Đã xác nhận tiền cọc",

  WAITING_PAYMENT: "Chờ thanh toán",
  PENDING_PAYMENT: "Chờ thanh toán",
  PAYMENT_PENDING: "Chờ thanh toán",
  PAYMENT_CONFIRMED: "Đã xác nhận thanh toán",
  PARTIALLY_PAID: "Đã thanh toán một phần",
  PAID: "Đã thanh toán",
  FULLY_PAID: "Đã thanh toán đầy đủ",
  PAYMENT_FAILED: "Thanh toán thất bại",
  PAYMENT_EXPIRED: "Giao dịch đã hết hạn",
  REFUNDED: "Đã hoàn tiền",
  PARTIALLY_REFUNDED: "Đã hoàn tiền một phần",

  PROCESSING: "Đang xử lý",
  IN_PROGRESS: "Đang xử lý",

  WAITING_INSPECTION: "Chờ kiểm hàng",
  INSPECTING: "Đang kiểm hàng",
  INSPECTION_COMPLETED: "Đã kiểm hàng",

  WAITING_PACKING: "Chờ đóng gói",
  PACKING: "Đang đóng gói",
  PACKED: "Đã đóng gói",

  WAITING_WAREHOUSE: "Chờ nhập kho",
  WAREHOUSE_RECEIVED: "Kho đã nhận hàng",
  RECEIVED: "Đã nhận hàng",
  STORED: "Đã lưu kho",
  READY_FOR_SHIPMENT: "Sẵn sàng vận chuyển",

  CUSTOMS_CLEARANCE: "Đang làm thủ tục hải quan",
  CUSTOMS_PROCESSING: "Đang thông quan",
  CUSTOMS_HOLD: "Đang chờ xử lý hải quan",
  CUSTOMS_CLEARED: "Đã thông quan",

  SHIPPING: "Đang vận chuyển",
  IN_TRANSIT: "Đang vận chuyển",
  OUT_FOR_DELIVERY: "Đang giao hàng",
  DELIVERY_FAILED: "Giao hàng thất bại",
  DELIVERED: "Đã giao hàng",

  RETURNING: "Đang hoàn hàng",
  RETURNED: "Đã hoàn hàng",

  COMPLETED: "Hoàn thành",
  COMPLETE: "Hoàn thành",
  DONE: "Hoàn thành",
  FINISHED: "Hoàn thành",

  CANCELED: "Đã hủy",
  CANCELLED: "Đã hủy",
  CANCEL: "Đã hủy",
  REJECTED: "Đã từ chối",
  FAILED: "Xử lý thất bại",
  DELETED: "Đã xóa",
});

const getVietnameseStatusLabel = (status) => {
  const normalizedStatus = normalizeStatusKey(status);

  if (!normalizedStatus) {
    return "-";
  }

  return (
    STATUS_FALLBACK_LABELS[normalizedStatus] ||
    "Đang cập nhật"
  );
};

const formatStatusCode = (status) =>
  getVietnameseStatusLabel(status);

const normalizeStatusOptions = (apiResult) => {
  const candidates = [
    apiResult,
    apiResult?.data,
    apiResult?.items,
    apiResult?.results,
    apiResult?.statuses,
    apiResult?.data?.items,
    apiResult?.data?.results,
    apiResult?.data?.statuses,
  ];

  const rawStatuses =
    candidates.find(Array.isArray) || [];

  const optionMap = new Map();

  rawStatuses.forEach((item) => {
    const value =
      typeof item === "string" ||
      typeof item === "number"
        ? String(item).trim()
        : String(
            item?.value ||
              item?.code ||
              item?.status ||
              item?.statusCode ||
              item?.id ||
              ""
          ).trim();

    const normalizedKey =
      normalizeStatusKey(value);

    if (!value || !normalizedKey) {
      return;
    }

    optionMap.set(normalizedKey, {
      value,
      label:
        getVietnameseStatusLabel(value),
    });
  });

  return Array.from(optionMap.values());
};

const getItemStatus = (item) => {
  return String(
    item?.status ??
    item?.orderStatus ??
    item?.consignmentStatus ??
    item?.order?.status ??
    ""
  ).trim();
};

/* =========================================================
   UTC TIME HELPERS
   ========================================================= */

/**
 * Chuẩn hóa thời gian API về UTC ISO.
 *
 * API có thể trả:
 * - 2026-06-29T14:00:32.8526551
 * - 2026-06-29T14:00:32Z
 * - 2026-06-29T14:00:32+07:00
 *
 * Output luôn chuẩn:
 * - 2026-06-29T14:00:32.852Z
 */
const normalizeApiTimeToUtc = (value) => {
  return apiToUtcIso(value, {
    apiTimeMode: "utc",
  });
};

/**
 * Lấy YYYY-MM-DD theo UTC để lọc ngày không lệch múi giờ.
 */
const getUtcDateOnly = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return null;
  }

  return utcIso.slice(0, 10);
};

/**
 * Gắn field UTC vào từng item lấy từ API.
 */
const normalizeConsignmentTime = (item) => {
  if (!item) {
    return item;
  }

  const createdAtUtc = normalizeApiTimeToUtc(item.createdAt);
  const updatedAtUtc = normalizeApiTimeToUtc(item.updatedAt);

  const resolvedStatus =
    getItemStatus(item);

  return {
    ...item,
    status: resolvedStatus,
    orderStatus:
      item.orderStatus ??
      resolvedStatus,
    createdAtUtc,
    updatedAtUtc,
  };
};

/**
 * Hiển thị thời gian cho user Việt Nam.
 */
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

/**
 * Tooltip / title nếu cần xem UTC gốc.
 */
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

const ConsignmentHistoryList = ({ defaultStatus } = {}) => {
  const navigate = useNavigate();

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
         * Chỉ tải đúng một trang API.
         * Không còn vòng Promise.all tải toàn bộ các trang.
         */
        const response =
          await getConsignmentsApi(
            pageNumber,
            DEFAULT_PAGE_SIZE,
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
          extractConsignmentPage(response);

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
    [pageNumber, requestFilters]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchConsignments(controller.signal);

    return () => controller.abort();
  }, [fetchConsignments, refreshKey]);

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

  const statusLabelMap = useMemo(() => {
    return new Map(
      statusOptions.map((option) => [
        normalizeStatusKey(
          option.value
        ),
        option.label,
      ])
    );
  }, [statusOptions]);

  /*
   * Dropdown ưu tiên danh sách từ API trạng thái.
   * Nếu API trạng thái thiếu mã đang tồn tại trong đơn,
   * tự bổ sung để vẫn có thể lọc.
   */
  const statusFilterOptions = useMemo(() => {
    const optionMap = new Map();

    statusOptions.forEach((option) => {
      const key =
        normalizeStatusKey(
          option.value
        );

      if (!key) {
        return;
      }

      optionMap.set(key, {
        value: key,
        label:
          option.label ||
          STATUS_FALLBACK_LABELS[
            key
          ] ||
          formatStatusCode(
            option.value
          ),
      });
    });

    consignments.forEach((item) => {
      const rawStatus =
        getItemStatus(item);

      const key =
        normalizeStatusKey(
          rawStatus
        );

      if (
        !key ||
        optionMap.has(key)
      ) {
        return;
      }

      optionMap.set(key, {
        value: key,
        label:
          STATUS_FALLBACK_LABELS[
            key
          ] ||
          formatStatusCode(
            rawStatus
          ),
      });
    });

    return Array.from(
      optionMap.values()
    ).sort((first, second) =>
      String(first.label).localeCompare(
        String(second.label),
        "vi"
      )
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

  const getStatusLabel = (status) => {
    const normalizedStatus =
      normalizeStatusKey(status);

    /*
     * Luôn ưu tiên bảng tiếng Việt nội bộ.
     * Không để label tiếng Anh từ API ghi đè lên giao diện.
     */
    return (
      STATUS_FALLBACK_LABELS[
        normalizedStatus
      ] ||
      statusLabelMap.get(
        normalizedStatus
      ) ||
      getVietnameseStatusLabel(
        status
      )
    );
  };

  const getStatusClassName = (status) => {
    const normalizedStatus =
      normalizeStatusKey(status);

    if (
      [
        "DEPOSIT_PAID",
        "DEPOSIT_CONFIRMED",
        "PARTIALLY_PAID",
        "PARTIALLY_REFUNDED",
      ].includes(normalizedStatus)
    ) {
      return "deposit-paid";
    }

    if (
      [
        "COMPLETED",
        "COMPLETE",
        "DONE",
        "FINISHED",
        "DELIVERED",
        "PAID",
        "FULLY_PAID",
        "PAYMENT_CONFIRMED",
        "APPROVED",
        "CONFIRMED",
        "CUSTOMS_CLEARED",
        "INSPECTION_COMPLETED",
        "PACKED",
        "WAREHOUSE_RECEIVED",
        "RECEIVED",
        "STORED",
        "READY_FOR_SHIPMENT",
        "REFUNDED",
      ].includes(normalizedStatus)
    ) {
      return "completed";
    }

    if (
      [
        "CANCELED",
        "CANCELLED",
        "CANCEL",
        "REJECTED",
        "QUOTATION_REJECTED",
        "QUOTATION_EXPIRED",
        "PAYMENT_FAILED",
        "PAYMENT_EXPIRED",
        "DELIVERY_FAILED",
        "FAILED",
        "DELETED",
      ].includes(normalizedStatus)
    ) {
      return "canceled";
    }

    if (
      [
        "WAITING_QUOTATION",
        "PENDING_QUOTATION",
        "QUOTATION_SENT",
        "QUOTATION_CONFIRMED",
        "QUOTED",
        "QUOTATION_ACCEPTED",
      ].includes(normalizedStatus)
    ) {
      return "quotation";
    }

    if (
      [
        "SHIPPING",
        "IN_TRANSIT",
        "OUT_FOR_DELIVERY",
        "RETURNING",
        "RETURNED",
      ].includes(normalizedStatus)
    ) {
      return "shipping";
    }

    if (
      [
        "WAITING_DEPOSIT",
        "DEPOSIT_PENDING",
        "PENDING_DEPOSIT",
        "WAITING_PAYMENT",
        "PENDING_PAYMENT",
        "PAYMENT_PENDING",
        "PENDING",
        "PENDING_REVIEW",
        "WAITING_REVIEW",
        "WAITING_INSPECTION",
        "WAITING_PACKING",
        "WAITING_WAREHOUSE",
        "WAITING_CONFIRMATION",
        "UNDER_REVIEW",
        "ON_HOLD",
        "CUSTOMS_HOLD",
        "NEW",
        "CREATED",
        "SUBMITTED",
      ].includes(normalizedStatus)
    ) {
      return "pending";
    }

    if (
      [
        "PROCESSING",
        "IN_PROGRESS",
        "PACKING",
        "INSPECTING",
        "CUSTOMS_CLEARANCE",
        "CUSTOMS_PROCESSING",
      ].includes(normalizedStatus)
    ) {
      return "processing";
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
              placeholder="Tìm mã vận đơn, sản phẩm, người nhận..."
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
    </div>
  );
};

export default ConsignmentHistoryList;