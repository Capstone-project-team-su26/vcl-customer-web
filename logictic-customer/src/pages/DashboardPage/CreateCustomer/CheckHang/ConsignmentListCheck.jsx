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
import SearchIcon from "@mui/icons-material/Search";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";

import AuthNotify from "../../../../utils/AuthNotify";
import { getConsignmentsApi } from "../../../../api/OrderApi/consignmentApi";
import { getConsignmentStatusesApi } from "../../../../api/OrderApi/consignmentStatusApi";

import {
  apiToUtcIso,
  formatUtcDateTime,
  formatVietnamDateTime,
} from "../../../../utils/timeUtc";

import "./ConsignmentListCheck.css";

const { RangePicker } = DatePicker;

const DEFAULT_PAGE_SIZE = 5;

/* =========================================================
   HELPERS
   ========================================================= */

const isCanceledRequest = (error) =>
  axios.isCancel(error) ||
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

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

const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .toUpperCase();

const formatStatusCode = (status) => {
  const normalizedStatus =
    normalizeStatus(status);

  if (!normalizedStatus) {
    return "-";
  }

  return normalizedStatus
    .replaceAll("_", " ")
    .replaceAll("-", " ");
};

const QUOTATION_SENT_STATUS_KEYWORDS = [
  "da gui bao gia",
  "da_gui_bao_gia",
  "da-gui-bao-gia",
  "đã gửi báo giá",
  "sent quotation",
  "sent_quotation",
  "sent-quotation",
  "quotation sent",
  "quotation_sent",
  "quotation-sent",
  "quote sent",
  "quote_sent",
  "quote-sent",
  "sent quotation to customer",
  "sent_quotation_to_customer",
  "quotation_sent_to_customer",
  "customer quotation sent",
  "customer_quotation_sent",
  "da bao gia",
  "da_bao_gia",
  "da-bao-gia",
  "đã báo giá",
  "quoted",
  "price quoted",
  "price_quoted",
];

const isQuotationSentStatus = (
  status,
  statusLabelMap = new Map()
) => {
  const rawStatus = String(status || "").trim();

  if (!rawStatus) {
    return false;
  }

  const normalizedStatusKey =
    normalizeStatus(rawStatus);

  const statusLabel =
    statusLabelMap.get(
      normalizedStatusKey
    ) || "";

  const searchableStatus =
    normalizeText(
      `${rawStatus} ${formatStatusCode(
        rawStatus
      )} ${statusLabel}`
    ).replace(/\s+/g, " ");

  return QUOTATION_SENT_STATUS_KEYWORDS.some(
    (keyword) =>
      searchableStatus.includes(
        normalizeText(keyword).replace(
          /\s+/g,
          " "
        )
      )
  );
};

const findArrayFromResult = (
  result,
  extraKeys = []
) => {
  const candidates = [
    result,
    result?.data,
    result?.items,
    result?.results,
    result?.data?.items,
    result?.data?.results,
    ...extraKeys.flatMap((key) => [
      result?.[key],
      result?.data?.[key],
    ]),
  ];

  return (
    candidates.find(Array.isArray) || []
  );
};

const normalizeStatusOptions = (
  result
) =>
  findArrayFromResult(result, [
    "statuses",
    "consignmentStatuses",
  ])
    .map((item) => {
      if (
        typeof item === "string" ||
        typeof item === "number"
      ) {
        const value =
          normalizeStatus(item);

        return {
          value,
          label:
            formatStatusCode(value),
        };
      }

      const value = normalizeStatus(
        item?.value ??
          item?.code ??
          item?.status ??
          item?.statusCode ??
          item?.id ??
          ""
      );

      const label = String(
        item?.label ??
          item?.name ??
          item?.displayName ??
          item?.statusName ??
          item?.description ??
          formatStatusCode(value)
      ).trim();

      return {
        value,
        label,
      };
    })
    .filter(
      (option) =>
        option.value &&
        option.label
    );

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
 * Lấy YYYY-MM-DD theo UTC để lọc ngày không bị lệch múi giờ.
 */
const getUtcDateOnly = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return null;
  }

  return utcIso.slice(0, 10);
};

/**
 * Gắn field UTC vào item API.
 */
const normalizeConsignmentTime = (item) => {
  if (!item) {
    return item;
  }

  return {
    ...item,
    createdAtUtc: normalizeApiTimeToUtc(item.createdAt),
    updatedAtUtc: normalizeApiTimeToUtc(item.updatedAt),
    quotationCreatedAtUtc: normalizeApiTimeToUtc(
      item.quotationCreatedAt ||
        item?.quotation?.createdAt
    ),
    quotationExpiredAtUtc: normalizeApiTimeToUtc(
      item.quotationExpiredAt ||
        item?.quotation?.expiredAt
    ),
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
  const value = String(text || "").trim();

  if (!value) {
    throw new Error("Không có nội dung để sao chép.");
  }

  if (
    navigator.clipboard?.writeText &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");

  textArea.value = value;
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

const getTrackingCode = (item) => {
  const code =
    item?.consignmentCode ||
    item?.trackingCode ||
    item?.waybillCode ||
    item?.shipmentCode ||
    item?.domesticTrackingCode;

  return (
    String(code || "").trim() ||
    "Chưa được cấp mã"
  );
};

const getOrderCode = (item) => {
  const code =
    item?.orderCode ||
    item?.orderId;

  return (
    String(code || "").trim() ||
    "-"
  );
};


/**
 * Chuẩn hóa tên sản phẩm từ nhiều dạng dữ liệu API:
 * - Chuỗi: "Sản phẩm 1 và Sản phẩm 2"
 * - Chuỗi có dấu phẩy, dấu chấm phẩy, dấu | hoặc xuống dòng
 * - Mảng chuỗi / mảng object
 * - Chuỗi JSON
 */
const extractProductNames = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(
      extractProductNames
    );
  }

  if (
    typeof value === "object"
  ) {
    const nestedCandidates = [
      value.productName,
      value.itemName,
      value.name,
      value.title,
      value.product?.productName,
      value.product?.name,
      value.items,
      value.products,
      value.productNames,
      value.itemNames,
    ];

    return nestedCandidates.flatMap(
      extractProductNames
    );
  }

  const text = String(value).trim();

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
      return extractProductNames(
        JSON.parse(text)
      );
    } catch {
      // Không phải JSON hợp lệ, xử lý như chuỗi thông thường.
    }
  }

  return text
    .split(
      /\s*(?:\r?\n+|;|\||,|\s+và\s+|\s+and\s+|\s*&\s*)\s*/giu
    )
    .map((name) => name.trim())
    .filter(Boolean);
};

const getProductNames = (item) => {
  const candidates = [
    item?.items,
    item?.products,
    item?.productNames,
    item?.itemNames,
    item?.productName,
    item?.itemName,
  ];

  const names = candidates.flatMap(
    extractProductNames
  );

  const uniqueNames = [];
  const seenNames = new Set();

  names.forEach((name) => {
    const normalizedName =
      normalizeText(name);

    if (
      !normalizedName ||
      seenNames.has(normalizedName)
    ) {
      return;
    }

    seenNames.add(normalizedName);
    uniqueNames.push(name);
  });

  return uniqueNames;
};

/* =========================================================
   COMPONENT
   ========================================================= */

const ConsignmentList = () => {
  const navigate = useNavigate();
  const manualRefreshRef = useRef(false);

  const [
    consignments,
    setConsignments,
  ] = useState([]);

  const [loading, setLoading] =
    useState(false);

  const [
    loadingStatuses,
    setLoadingStatuses,
  ] = useState(false);

  const [
    statusOptions,
    setStatusOptions,
  ] = useState([]);

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

  const [
    copiedTrackingCode,
    setCopiedTrackingCode,
  ] = useState("");

  const copyResetTimerRef =
    useRef(null);

  /* =========================================================
     FETCH CONSIGNMENTS
     ========================================================= */

  const fetchAllConsignments =
    useCallback(async (signal) => {
      const response =
        await getConsignmentsApi({
          signal,
        });

      return extractConsignmentItems(
        response
      );
    }, []);

  const fetchConsignments =
    useCallback(
      async (signal) => {
        try {
          setLoading(true);

          const items =
            await fetchAllConsignments(
              signal
            );

          setConsignments(
            items.map(
              normalizeConsignmentTime
            )
          );
          return true;
        } catch (error) {
          if (
            isCanceledRequest(error)
          ) {
            return false;
          }

          console.error(
            "Lỗi khi lấy danh sách ký gửi:",
            error
          );

          AuthNotify.error(
            "Không tải được danh sách",
            getApiErrorMessage(
              error,
              "Không thể tải danh sách ký gửi."
            )
          );

          setConsignments([]);
          return false;
        } finally {
          if (!signal?.aborted) {
            setLoading(false);
          }
        }
      },
      [fetchAllConsignments]
    );

  const fetchStatuses =
    useCallback(
      async (signal) => {
        try {
          setLoadingStatuses(true);

          const result =
            await getConsignmentStatusesApi({
              signal,
            });

          setStatusOptions(
            normalizeStatusOptions(
              result
            )
          );

          return true;
        } catch (error) {
          if (
            isCanceledRequest(error)
          ) {
            return false;
          }

          console.error(
            "Lỗi khi lấy trạng thái:",
            error
          );

          AuthNotify.error(
            "Không tải được trạng thái",
            getApiErrorMessage(
              error,
              "Không thể tải danh sách trạng thái."
            )
          );

          setStatusOptions([]);
          return false;
        } finally {
          if (!signal?.aborted) {
            setLoadingStatuses(
              false
            );
          }
        }
      },
      []
    );

  useEffect(() => {
    const controller =
      new AbortController();

    const loadPageData = async () => {
      const [
        consignmentsLoaded,
        statusesLoaded,
      ] = await Promise.all([
        fetchConsignments(
          controller.signal
        ),
        fetchStatuses(
          controller.signal
        ),
      ]);

      if (
        controller.signal.aborted
      ) {
        return;
      }

      if (
        manualRefreshRef.current
      ) {
        manualRefreshRef.current =
          false;

        if (
          consignmentsLoaded &&
          statusesLoaded
        ) {
          AuthNotify.success(
            "Làm mới thành công",
            "Danh sách báo giá và trạng thái đã được cập nhật."
          );
        }
      }
    };

    loadPageData();

    return () => {
      controller.abort();
    };
  }, [
    fetchConsignments,
    fetchStatuses,
    refreshKey,
  ]);

  useEffect(
    () => () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(
          copyResetTimerRef.current
        );
      }
    },
    []
  );

  /* =========================================================
     STATUS LABEL
     ========================================================= */

  const statusLabelMap = useMemo(
    () =>
      new Map(
        statusOptions.map(
          (option) => [
            normalizeStatus(
              option.value
            ),
            option.label,
          ]
        )
      ),
    [statusOptions]
  );

  const getStatusLabel =
    useCallback(
      (status) => {
        const normalizedStatus =
          normalizeStatus(status);

        return (
          statusLabelMap.get(
            normalizedStatus
          ) ||
          formatStatusCode(
            normalizedStatus
          ) ||
          "-"
        );
      },
      [statusLabelMap]
    );

  const getStatusClassName = (
    status
  ) =>
    String(
      status || "unknown"
    )
      .trim()
      .toLowerCase()
      .replaceAll("_", "-");

  const getConsignmentTypeLabel = (
    type
  ) => {
    const normalizedType =
      normalizeStatus(type);

    if (
      normalizedType === "EXPRESS"
    ) {
      return "HỎA TỐC";
    }

    if (
      normalizedType === "STANDARD"
    ) {
      return "TIÊU CHUẨN";
    }

    return type || "-";
  };

  /* =========================================================
     DATE RANGE
     ========================================================= */

  const disabledRangeDate = (
    currentDate,
    info
  ) => {
    const fromDate =
      info?.from;

    if (
      !currentDate ||
      !fromDate
    ) {
      return false;
    }

    return currentDate.isBefore(
      fromDate,
      "day"
    );
  };

  const handleDateRangeChange = (
    dates
  ) => {
    if (
      !Array.isArray(dates) ||
      !dates[0] ||
      !dates[1]
    ) {
      setDateRangeInput(null);
      setPageNumber(1);
      return;
    }

    const startDate = dayjs(
      dates[0]
    ).startOf("day");

    const endDate = dayjs(
      dates[1]
    ).startOf("day");

    if (
      endDate.isBefore(
        startDate,
        "day"
      )
    ) {
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
     FILTER
     ========================================================= */

  const filteredConsignments =
    useMemo(() => {
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

      return consignments.filter(
        (item) => {
          const matchesQuotationSent =
            isQuotationSentStatus(
              item.status,
              statusLabelMap
            );

          if (!matchesQuotationSent) {
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
            item.itemNames,
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

          const targetDate =
            getUtcDateOnly(
              item.quotationCreatedAtUtc ||
                item.quotationCreatedAt ||
                item.statusUpdatedAt ||
                item.createdAtUtc ||
                item.createdAt
            );

          const matchesStartDate =
            !startDate ||
            (targetDate !== null &&
              targetDate >=
                startDate);

          const matchesEndDate =
            !endDate ||
            (targetDate !== null &&
              targetDate <=
                endDate);

          return (
            matchesSearch &&
            matchesStartDate &&
            matchesEndDate
          );
        }
      ).sort((a, b) => {
        const getQuotationTime = (item) => {
          const rawIso =
            item.quotationCreatedAtUtc ||
            item.quotationCreatedAt ||
            item.statusUpdatedAt ||
            item.createdAtUtc ||
            item.createdAt;

          if (!rawIso) return 0;
          const timeMs = new Date(rawIso).getTime();
          return Number.isNaN(timeMs) ? 0 : timeMs;
        };

        return getQuotationTime(b) - getQuotationTime(a);
      });
    }, [
      consignments,
      dateRangeInput,
      searchInput,
      statusLabelMap,
    ]);

  /* =========================================================
     PAGINATION
     ========================================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredConsignments.length /
        DEFAULT_PAGE_SIZE
    )
  );

  const visibleConsignments =
    useMemo(() => {
      const startIndex =
        (pageNumber - 1) *
        DEFAULT_PAGE_SIZE;

      return filteredConsignments.slice(
        startIndex,
        startIndex +
          DEFAULT_PAGE_SIZE
      );
    }, [
      filteredConsignments,
      pageNumber,
    ]);

  useEffect(() => {
    if (
      pageNumber > totalPages
    ) {
      setPageNumber(totalPages);
    }
  }, [
    pageNumber,
    totalPages,
  ]);

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
      (previous) =>
        previous + 1
    );
  };

  const handleCopyTrackingCode = async (
    event,
    item
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const trackingCode =
      getTrackingCode(item);

    if (
      !trackingCode ||
      trackingCode ===
        "Chưa được cấp mã"
    ) {
      AuthNotify.warning(
        "Chưa có mã vận đơn",
        "Đơn ký gửi chưa được cấp mã vận đơn để sao chép."
      );
      return;
    }

    try {
      await copyTextToClipboard(
        trackingCode
      );

      setCopiedTrackingCode(
        trackingCode
      );

      AuthNotify.success(
        "Sao chép thành công",
        `Đã sao chép mã vận đơn ${trackingCode}.`
      );

      if (copyResetTimerRef.current) {
        window.clearTimeout(
          copyResetTimerRef.current
        );
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
    setPageNumber(
      nextPageNumber
    );

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

  const handleViewDetail = (
    item
  ) => {
    if (!item?.orderId) {
      AuthNotify.error(
        "Không thể mở chi tiết",
        "Không tìm thấy mã đơn hàng."
      );
      return;
    }

    navigate(
      `/quotations/${item.orderId}`,
      {
        state: {
          consignment: item,
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

  const hasActiveFilter =
    Boolean(
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
            THEO DÕI BÁO GIÁ KÍ GỬI 
          </h1>

          <p className="page-subtitle">
            Hệ thống tra cứu thông
            tin trạng thái lô hàng
            thời gian thực
          </p>
        </div>

        <div className="page-summary">
          <strong>
            {
              filteredConsignments.length
            }
          </strong>

          <span>Lô hàng</span>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-fields">
          <Space
            size="middle"
            wrap
          >
            <Input
              prefix={
                <SearchIcon className="filter-search-icon" />
              }
              placeholder="Tìm mã đơn, mã vận đơn, người nhận..."
              value={searchInput}
              allowClear
              className="filter-search-input"
              onChange={
                handleSearchChange
              }
            />


            <RangePicker
              value={
                dateRangeInput
              }
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
            startIcon={
              <AutorenewIcon />
            }
            onClick={
              handleResetClick
            }
            disabled={loading || loadingStatuses}
            className="filter-reset-button"
          >
            LÀM MỚI
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="vcl-loading-box">
          <CircularProgress
            size={38}
          />

          <div>
            Đang cập nhật trạng thái
            dữ liệu...
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
                  Không tìm thấy yêu cầu báo giá kí gửi
                </h3>

                <p>
                Chỉ hiển thị các yêu cầu có trạng thái Đã báo giá. Hãy thay đổi từ khóa hoặc khoảng ngày tìm kiếm.
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
                      key={
                        item.orderId ||
                        getTrackingCode(
                          item
                        )
                      }
                      className="consignment-card"
                      role="button"
                      tabIndex={0}
                      aria-label={`Xem chi tiết lô hàng ${getTrackingCode(
                        item
                      )}`}
                      onClick={() =>
                        handleViewDetail(
                          item
                        )
                      }
                      onKeyDown={(
                        event
                      ) =>
                        handleCardKeyDown(
                          event,
                          item
                        )
                      }
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
                                disabled={
                                  getTrackingCode(item) ===
                                  "Chưa được cấp mã"
                                }
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
                              {item.route ||
                                "-"}
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
                          className="view-detail-button"
                          onClick={(
                            event
                          ) => {
                            event.stopPropagation();

                            handleViewDetail(
                              item
                            );
                          }}
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
                          className="tag-quotation-date-badge"
                          title={formatDateUtcTitle(
                            item.quotationCreatedAtUtc ||
                              item.quotationCreatedAt ||
                              item.statusUpdatedAt
                          )}
                        >
                          🏷️ Ngày báo giá:{" "}
                          <strong>
                            {formatDate(
                              item.quotationCreatedAtUtc ||
                                item.quotationCreatedAt ||
                                item.statusUpdatedAt ||
                                item.createdAt
                            )}
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

                                <span className="product-count-badge">
                                  {productNames.length}{" "}
                                  sản phẩm
                                </span>
                              </div>

                              {productNames.length > 0 ? (
                                <div
                                  className="product-name-list"
                                  aria-label="Danh sách sản phẩm"
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
                                        <span className="product-name-index">
                                          {productIndex + 1}
                                        </span>

                                        <strong
                                          className="product-name-value"
                                          title={
                                            productName
                                          }
                                        >
                                          {
                                            productName
                                          }
                                        </strong>
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <div className="product-name-empty">
                                  Chưa cập nhật sản phẩm
                                </div>
                              )}
                            </div>

                            {/* <div className="sku-tag">
                              Mã đơn:{" "}
                              {getOrderCode(
                                item
                              )}
                            </div> */}

                            <div className="receiver-phone">
                              SĐT:{" "}
                              {item.receiverPhone ||
                                "-"}
                            </div>

                            <div className="receiver-address">
                              Địa chỉ:{" "}
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
                              LOẠI VẬN
                              CHUYỂN
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
                mục trên trang này, tổng
                cộng{" "}
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
