import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import axios from "@shared/api/requestCancel";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import AuthNotify from "@shared/components/AuthNotify/AuthNotify";

import {
  getConsignmentDetailApi,
  getProductTypesApi,
  cancelConsignmentApi,
} from "@features/consignment/api/consignmentApi";
import { getConsignmentStatusesApi } from "@features/consignment/api/consignmentStatusApi";
import { getOrderStatusLabel } from "@features/consignment/constants/orderStatus";
import pricingRuleService from "@features/pricing/api/pricingRuleService";

import ConsignmentListDetailUI from "@features/consignment/components/ConsignmentListDetailUI/ConsignmentListDetailUI";
import ReceivingNoteCard from "@features/receiving/components/ReceivingNoteCard/ReceivingNoteCard";
import DeliveryTrackingCard from "@features/delivery/components/DeliveryTrackingCard/DeliveryTrackingCard";
import OrderTimelineCard from "@features/consignment/components/OrderTimelineCard/OrderTimelineCard";
/* Import sâu có chủ đích (không qua barrel): barrel tracking / delivery kéo theo trang của
   module đó, làm đổi thứ tự nạp CSS toàn app (ARCHITECTURE mục 4). */
import OrderJourneyCard from "@features/tracking/components/OrderJourneyCard/OrderJourneyCard";
import ParcelHandlingCard from "@features/delivery/components/ParcelHandlingCard/ParcelHandlingCard";

import {
  HIDDEN_ADDITIONAL_SERVICE_CODES,
  IMPORT_TAX_RULE_CODE,
  PRICING_RULE_VI_LABELS,
  VAT_RULE_CODE,
  WOOD_CRATE_RULE_CODE,
} from "./ConsignmentListDetail.constants";

import {
  calculateDimWeight,
  formatCbm,
  formatDateTime,
  formatDateTimeUtcTitle,
  formatDimWeight,
  formatMoney,
  formatNumberWithDots,
  formatPercent,
  formatPricingRuleCode,
  formatPricingRuleFee,
  formatPricingRuleFeeDetail,
  formatWeight,
  getApiErrorMessage,
  getConsignmentTypeLabel,
  getDisplayCode,
  getItemPackageConfigurationId,
  getPackageConfigurationFee,
  getPricingRuleCodesFromConsignment,
  getPricingRuleColorClass,
  getPricingRuleDisplayName,
  getPricingRuleIdsFromConsignment,
  getPricingRuleObjectsFromConsignment,
  getQuotationStatusLabel,
  getQuoteTypeLabel,
  getStatusClassName,
  isWoodCratePricingRule,
  normalizeConsignmentTime,
  normalizeItemReferenceUrls,
  normalizePackageConfigurationFromApi,
  normalizePackageConfigurationId,
  normalizePackageConfigurationList,
  normalizePricingRuleCode,
  normalizePricingRuleFromApi,
  normalizePricingRuleId,
  normalizePricingRuleOptions,
  normalizeProductType,
  normalizeProductTypeOptions,
  normalizeStatus,
  normalizeStatusOptions,
  normalizeVolumetricDivisorRule,
  toFiniteNumberOrNull,
  translateConsignmentNote,
} from "./ConsignmentListDetail.helpers";

/*
 * Giữ lại trong file này vì hàm chạm vào DOM và clipboard,
 * không phải hàm thuần như các helper đã tách ra.
 */
const copyTextToClipboard = async (text) => {
  const value = String(text || "").trim();

  if (!value) {
    throw new Error("Không có nội dung để sao chép.");
  }

  if (navigator.clipboard?.writeText && window.isSecureContext) {
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

const ConsignmentListDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();

  /*
   * Có thể nhận dữ liệu tóm tắt từ trang danh sách.
   * Component vẫn gọi API để lấy đầy đủ customer,
   * items và quotation.
   */
  const summaryData = location.state?.consignment || null;

  const [consignment, setConsignment] = useState(null);

  const [copiedConsignmentCode, setCopiedConsignmentCode] = useState("");

  const copyResetTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  const [, setStatusOptions] = useState([]);

  const [productTypeOptions, setProductTypeOptions] = useState([]);

  const [pricingRuleOptions, setPricingRuleOptions] = useState([]);

  const [pricingRuleError, setPricingRuleError] = useState("");

  const [
    packageConfigurations,
    setPackageConfigurations,
  ] = useState([]);

  const [
    packageConfigurationLoading,
    setPackageConfigurationLoading,
  ] = useState(true);

  const [
    packageConfigurationError,
    setPackageConfigurationError,
  ] = useState("");

  const [volumetricDivisorRule, setVolumetricDivisorRule] = useState(null);

  const [volumetricRuleError, setVolumetricRuleError] = useState("");

  const [volumetricRuleLoading, setVolumetricRuleLoading] = useState(true);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const [cancelReason, setCancelReason] = useState("");

  const [cancelReasonError, setCancelReasonError] = useState("");

  const [isCancelling, setIsCancelling] = useState(false);

  const [fullTextPreview, setFullTextPreview] = useState({
    open: false,
    title: "",
    content: "",
  });

  /* =======================================================
     LẤY RIÊNG HỆ SỐ QUY ĐỔI THỂ TÍCH
     ======================================================= */

  const fetchVolumetricDivisorRule = useCallback(async (signal) => {
    try {
      setVolumetricRuleLoading(true);
      setVolumetricRuleError("");

      console.info(
        "[Consignment Detail] GET /api/pricing-rules → VOLUMETRIC_DIVISOR",
      );

      const result = await pricingRuleService.getVolumetricDivisorRule({
        signal,
      });

      const normalizedRule = normalizeVolumetricDivisorRule(result);

      if (!normalizedRule) {
        throw new Error(
          "Không tìm thấy quy tắc VOLUMETRIC_DIVISOR đang ACTIVE hoặc value không hợp lệ.",
        );
      }

      setVolumetricDivisorRule(normalizedRule);

      console.info(
        "[Consignment Detail] VOLUMETRIC_DIVISOR đang áp dụng:",
        normalizedRule,
      );
    } catch (error) {
      if (
        axios.isCancel(error) ||
        error?.code === "ERR_CANCELED" ||
        error?.name === "AbortError"
      ) {
        return;
      }

      console.error("[Consignment Detail] Lỗi tải VOLUMETRIC_DIVISOR:", error);

      setVolumetricDivisorRule(null);
      setVolumetricRuleError(
        getApiErrorMessage(
          error,
          "Không thể tải hệ số quy đổi thể tích từ API.",
        ),
      );
    } finally {
      if (!signal?.aborted) {
        setVolumetricRuleLoading(false);
      }
    }
  }, []);

  /* =======================================================
     LẤY CHI TIẾT KÝ GỬI
     ======================================================= */

  const fetchConsignmentDetail = useCallback(
    async (signal) => {
      if (!orderId) {
        setErrorMessage("Không tìm thấy mã đơn hàng.");

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        setPackageConfigurationLoading(true);
        setPackageConfigurationError("");

        const [
          detailResult,
          statusesResult,
          productTypesResult,
          pricingRulesResult,
          packageConfigurationsResult,
        ] = await Promise.allSettled([
          getConsignmentDetailApi(orderId, {
            signal,
          }),
          getConsignmentStatusesApi({
            signal,
          }),
          getProductTypesApi({
            signal,
          }),
          pricingRuleService.getPricingRules({
            signal,
            onlyActive: false,
          }),
          pricingRuleService.getPackageConfigurations({
            signal,
            onlyActive: false,
          }),
        ]);

        if (detailResult.status === "rejected") {
          throw detailResult.reason;
        }

        const detailResponse = detailResult.value;

        const responseData =
          detailResponse?.data?.data ??
          detailResponse?.data ??
          detailResponse;

        if (!responseData) {
          throw new Error(
            "API không trả về dữ liệu chi tiết lô hàng.",
          );
        }

        /*
         * Dữ liệu từ trang danh sách chỉ có một số field tóm tắt.
         * Ghép với API chi tiết để không làm mất pricingRuleIds/itemNames.
         */
        const preferNonEmptyArray = (
          primary,
          fallback,
        ) =>
          Array.isArray(primary) &&
          primary.length > 0
            ? primary
            : Array.isArray(fallback)
              ? fallback
              : [];

        const mergedResponseData = {
          ...(summaryData &&
          typeof summaryData === "object"
            ? summaryData
            : {}),
          ...responseData,
          pricingRuleIds:
            preferNonEmptyArray(
              responseData?.pricingRuleIds,
              summaryData?.pricingRuleIds,
            ),
          selectedPricingRuleIds:
            preferNonEmptyArray(
              responseData
                ?.selectedPricingRuleIds,
              summaryData
                ?.selectedPricingRuleIds,
            ),
          selectedRuleCodes:
            preferNonEmptyArray(
              responseData
                ?.selectedRuleCodes,
              summaryData
                ?.selectedRuleCodes,
            ),
          pricingRuleCodes:
            preferNonEmptyArray(
              responseData
                ?.pricingRuleCodes,
              summaryData
                ?.pricingRuleCodes,
            ),
          pricingRules:
            preferNonEmptyArray(
              responseData?.pricingRules,
              summaryData?.pricingRules,
            ),
          selectedPricingRules:
            preferNonEmptyArray(
              responseData
                ?.selectedPricingRules,
              summaryData
                ?.selectedPricingRules,
            ),
          additionalServices:
            preferNonEmptyArray(
              responseData
                ?.additionalServices,
              summaryData
                ?.additionalServices,
            ),
          optionalServices:
            responseData?.optionalServices &&
            typeof responseData
              .optionalServices ===
              "object"
              ? {
                  ...(summaryData
                    ?.optionalServices ||
                    {}),
                  ...responseData
                    .optionalServices,
                }
              : summaryData
                  ?.optionalServices ||
                {},
          itemNames:
            preferNonEmptyArray(
              responseData?.itemNames,
              summaryData?.itemNames,
            ),
        };

        setConsignment(
          normalizeConsignmentTime(
            mergedResponseData,
          ),
        );

        if (statusesResult.status === "fulfilled") {
          setStatusOptions(normalizeStatusOptions(statusesResult.value));
        } else if (
          !axios.isCancel(statusesResult.reason) &&
          statusesResult.reason?.code !== "ERR_CANCELED"
        ) {
          console.error(
            "Lỗi khi lấy danh sách trạng thái:",
            statusesResult.reason,
          );
        }

        if (productTypesResult.status === "fulfilled") {
          setProductTypeOptions(
            normalizeProductTypeOptions(productTypesResult.value),
          );
        } else if (
          !axios.isCancel(productTypesResult.reason) &&
          productTypesResult.reason?.code !== "ERR_CANCELED"
        ) {
          console.error(
            "Lỗi khi lấy danh sách loại sản phẩm:",
            productTypesResult.reason,
          );
        }


        if (pricingRulesResult.status === "fulfilled") {
          const normalizedPricingRules =
            normalizePricingRuleOptions(
              pricingRulesResult.value,
            );

          setPricingRuleOptions(normalizedPricingRules);
          setPricingRuleError("");

          console.info(
            "[Consignment Detail] Pricing rules dùng để hiển thị tên dịch vụ:",
            normalizedPricingRules,
          );
        } else if (
          !axios.isCancel(pricingRulesResult.reason) &&
          pricingRulesResult.reason?.code !== "ERR_CANCELED"
        ) {
          console.error(
            "Lỗi khi lấy danh sách dịch vụ bổ sung:",
            pricingRulesResult.reason,
          );

          setPricingRuleOptions([]);
          setPricingRuleError(
            getApiErrorMessage(
              pricingRulesResult.reason,
              "Không thể tải tên dịch vụ bổ sung.",
            ),
          );
        }

        if (
          packageConfigurationsResult.status ===
          "fulfilled"
        ) {
          const normalizedConfigurations =
            normalizePackageConfigurationList(
              packageConfigurationsResult.value,
            );

          setPackageConfigurations(
            normalizedConfigurations,
          );
          setPackageConfigurationError("");

          console.info(
            "[Consignment Detail] Cấu hình thùng từ API:",
            normalizedConfigurations,
          );
        } else if (
          !axios.isCancel(
            packageConfigurationsResult.reason,
          ) &&
          packageConfigurationsResult.reason?.code !==
            "ERR_CANCELED"
        ) {
          console.error(
            "Lỗi khi lấy cấu hình thùng:",
            packageConfigurationsResult.reason,
          );

          setPackageConfigurations([]);
          setPackageConfigurationError(
            getApiErrorMessage(
              packageConfigurationsResult.reason,
              "Không thể tải cấu hình thùng.",
            ),
          );
        }
      } catch (error) {
        if (axios.isCancel(error) || error?.code === "ERR_CANCELED") {
          return;
        }

        console.error("Lỗi khi lấy chi tiết ký gửi:", error);

        const apiMessage =
          error?.response?.data?.message ||
          error?.response?.data?.title ||
          error?.message ||
          "Không thể tải chi tiết lô hàng.";

        setErrorMessage(apiMessage);

        /*
         * Nếu API lỗi, dùng dữ liệu tóm tắt
         * từ trang danh sách làm dự phòng.
         */
        if (summaryData) {
          setConsignment(normalizeConsignmentTime(summaryData));
        } else {
          setConsignment(null);
        }

        AuthNotify.error("Không tải được dữ liệu", apiMessage);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setPackageConfigurationLoading(false);
        }
      }
    },
    [orderId, summaryData],
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchConsignmentDetail(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchConsignmentDetail]);

  useEffect(() => {
    const controller = new AbortController();

    fetchVolumetricDivisorRule(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchVolumetricDivisorRule]);

  useEffect(
    () => () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    },
    [],
  );

  const handleReload = () => {
    const detailController = new AbortController();
    const pricingController = new AbortController();

    fetchConsignmentDetail(detailController.signal);
    fetchVolumetricDivisorRule(pricingController.signal);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleCopyConsignmentCode = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const consignmentCode = getDisplayCode(consignment);

    if (!consignmentCode || consignmentCode === "Chưa được cấp mã") {
      AuthNotify.warning(
        "Chưa có mã vận đơn",
        "Đơn ký gửi chưa được cấp mã vận đơn để sao chép.",
      );
      return;
    }

    try {
      await copyTextToClipboard(consignmentCode);

      setCopiedConsignmentCode(consignmentCode);

      AuthNotify.success(
        "Sao chép thành công",
        `Đã sao chép mã vận đơn ${consignmentCode}.`,
      );

      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }

      copyResetTimerRef.current = window.setTimeout(() => {
        setCopiedConsignmentCode("");
      }, 1800);
    } catch (error) {
      console.error("Không thể sao chép mã vận đơn:", error);

      AuthNotify.error(
        "Sao chép thất bại",
        "Không thể sao chép mã vận đơn. Vui lòng thử lại.",
      );
    }
  };

  const handleOpenCancelModal = () => {
    if (!consignment || !orderId) {
      AuthNotify.error(
        "Không thể hủy đơn",
        "Không tìm thấy thông tin đơn hàng để hủy.",
      );
      return;
    }

    if (normalizeStatus(consignment.status) === "CANCELLED") {
      AuthNotify.warning(
        "Đơn đã được hủy",
        "Đơn ký gửi này đã được hủy trước đó.",
      );
      return;
    }

    setCancelReason("");
    setCancelReasonError("");
    setIsCancelModalOpen(true);
  };

  const handleCloseCancelModal = () => {
    if (isCancelling) {
      return;
    }

    setIsCancelModalOpen(false);
    setCancelReason("");
    setCancelReasonError("");
  };

  const handleCancelConsignment = async () => {
    const reason = cancelReason.trim();

    if (!reason) {
      const validationMessage = "Vui lòng nhập lý do hủy đơn.";

      setCancelReasonError(validationMessage);

      AuthNotify.warning("Thiếu lý do hủy", validationMessage);

      return;
    }

    if (reason.length < 5) {
      const validationMessage = "Lý do hủy phải có ít nhất 5 ký tự.";

      setCancelReasonError(validationMessage);

      AuthNotify.warning("Lý do chưa hợp lệ", validationMessage);

      return;
    }

    try {
      setIsCancelling(true);
      setCancelReasonError("");

      await cancelConsignmentApi(orderId, reason);

      setIsCancelModalOpen(false);
      setCancelReason("");

      AuthNotify.success(
        "Hủy đơn thành công",
        "Đơn ký gửi đã được hủy và chuyển vào lịch sử.",
      );

      navigate("/history/consignment", {
        replace: true,
        state: {
          refresh: true,
          cancelledOrderId: orderId,
        },
      });

      const refreshController = new AbortController();

      await fetchConsignmentDetail(refreshController.signal);
    } catch (error) {
      if (
        axios.isCancel(error) ||
        error?.code === "ERR_CANCELED" ||
        error?.name === "AbortError"
      ) {
        return;
      }

      const responseStatus = error?.response?.status;

      const apiMessage = getApiErrorMessage(error, "Không thể hủy đơn ký gửi.");

      setCancelReasonError(apiMessage);

      if (responseStatus === 401) {
        sessionStorage.removeItem("accessToken");
        localStorage.removeItem("accessToken");

        AuthNotify.error(
          "Phiên đăng nhập hết hạn",
          "Vui lòng đăng nhập lại để tiếp tục.",
        );

        navigate("/login");
        return;
      }

      AuthNotify.error("Hủy đơn thất bại", apiMessage);
    } finally {
      setIsCancelling(false);
    }
  };

  /* Nhãn trạng thái đơn lấy từ module dùng chung (mã cũ được chuẩn hóa). */
  const getStatusLabel = useCallback(
    (status) => getOrderStatusLabel(normalizeStatus(status)),
    [],
  );

  const productTypeLabelMap = useMemo(
    () =>
      new Map(
        productTypeOptions.map((option) => [
          normalizeProductType(option.value),
          option.label,
        ]),
      ),
    [productTypeOptions],
  );

  const getProductTypeLabel = useCallback(
    (productType) => {
      const normalizedProductType = normalizeProductType(productType);

      if (!normalizedProductType) {
        return "-";
      }

      return (
        productTypeLabelMap.get(normalizedProductType) ||
        String(productType).trim()
      );
    },
    [productTypeLabelMap],
  );

  const pricingRuleMap = useMemo(
    () =>
      new Map(
        pricingRuleOptions.map((rule) => [
          normalizePricingRuleId(rule.id),
          rule,
        ]),
      ),
    [pricingRuleOptions],
  );

  const pricingRuleCodeMap = useMemo(
    () =>
      new Map(
        pricingRuleOptions
          .filter((rule) => rule.ruleCode)
          .map((rule) => [
            normalizePricingRuleCode(
              rule.ruleCode,
            ),
            rule,
          ]),
      ),
    [pricingRuleOptions],
  );

  const selectedPricingRules = useMemo(() => {
    const selectedRuleMap = new Map();

    const appendRule = (
      rawRule,
      fallback = {},
    ) => {
      const normalizedRule =
        normalizePricingRuleFromApi({
          ...fallback,
          ...(rawRule || {}),
        });

      const ruleCode =
        normalizePricingRuleCode(
          normalizedRule.ruleCode ||
            normalizedRule.ruleType,
        );

      if (
        ruleCode &&
        HIDDEN_ADDITIONAL_SERVICE_CODES.has(
          ruleCode,
        )
      ) {
        return;
      }

      const pricingRuleId = String(
        normalizedRule.id ||
          normalizedRule.pricingRuleId ||
          fallback?.pricingRuleId ||
          "",
      ).trim();

      const key =
        ruleCode ||
        normalizePricingRuleId(
          pricingRuleId,
        );

      if (!key) {
        return;
      }

      const nextRule = {
        ...normalizedRule,
        id:
          normalizedRule.id ||
          pricingRuleId,
        pricingRuleId:
          pricingRuleId ||
          normalizedRule.id ||
          ruleCode,
        ruleCode,
        isMissing: Boolean(
          fallback?.isMissing,
        ),
      };

      nextRule.feeLabel =
        formatPricingRuleFee(nextRule);

      nextRule.feeDetail =
        formatPricingRuleFeeDetail(
          nextRule,
        );

      selectedRuleMap.set(key, {
        ...(selectedRuleMap.get(key) ||
          {}),
        ...nextRule,
      });
    };

    getPricingRuleObjectsFromConsignment(
      consignment,
    ).forEach((rawRule) => {
      const rawId = String(
        rawRule?.id ||
          rawRule?.pricingRuleId ||
          "",
      ).trim();

      const rawCode =
        normalizePricingRuleCode(
          rawRule?.ruleCode ||
            rawRule?.code ||
            rawRule?.ruleType,
        );

      const matchedRule =
        (rawId &&
          pricingRuleMap.get(
            normalizePricingRuleId(
              rawId,
            ),
          )) ||
        (rawCode &&
          pricingRuleCodeMap.get(
            rawCode,
          )) ||
        null;

      appendRule({
        ...(matchedRule || {}),
        ...rawRule,
      });
    });

    getPricingRuleIdsFromConsignment(
      consignment,
    ).forEach((pricingRuleId) => {
      const normalizedSelectedId =
        normalizePricingRuleId(
          pricingRuleId,
        );

      const alreadyAdded =
        Array.from(
          selectedRuleMap.values(),
        ).some(
          (rule) =>
            normalizePricingRuleId(
              rule?.id ||
                rule?.pricingRuleId,
            ) === normalizedSelectedId,
        );

      if (alreadyAdded) {
        return;
      }

      const matchedRule =
        pricingRuleMap.get(
          normalizedSelectedId,
        );

      if (matchedRule) {
        appendRule(matchedRule, {
          pricingRuleId,
        });

        return;
      }

      appendRule(
        {
          id: pricingRuleId,
          pricingRuleId,
          ruleName:
            "Dịch vụ chưa xác định",
        },
        {
          pricingRuleId,
          isMissing: true,
        },
      );
    });

    getPricingRuleCodesFromConsignment(
      consignment,
    ).forEach((ruleCode) => {
      const matchedRule =
        pricingRuleCodeMap.get(
          ruleCode,
        );

      appendRule(
        matchedRule || {
          ruleCode,
          ruleName:
            PRICING_RULE_VI_LABELS[
              ruleCode
            ] ||
            formatPricingRuleCode(
              ruleCode,
            ),
        },
        {
          isMissing: !matchedRule,
        },
      );
    });

    const appendLegacyRule = (
      ruleCode,
      enabled,
    ) => {
      if (!enabled) {
        return;
      }

      const matchedRule =
        pricingRuleCodeMap.get(
          ruleCode,
        ) ||
        pricingRuleOptions.find(
          (rule) =>
            normalizePricingRuleCode(
              rule.ruleType,
            ) === ruleCode ||
            normalizePricingRuleCode(
              rule.ruleCode,
            ).includes(ruleCode),
        );

      appendRule(
        matchedRule || {
          ruleCode,
          ruleName:
            PRICING_RULE_VI_LABELS[
              ruleCode
            ] ||
            formatPricingRuleCode(
              ruleCode,
            ),
        },
        {
          isMissing: !matchedRule,
        },
      );
    };

    appendLegacyRule(
      "WOOD_CRATE",
      Boolean(
        consignment?.requiresWoodenCrate ||
          consignment
            ?.optionalServices
            ?.requiresWoodenCrate,
      ),
    );

    appendLegacyRule(
      "SUR_INSPECTION",
      Boolean(
        consignment?.requiresInspection ||
          consignment
            ?.optionalServices
            ?.requiresInspection,
      ),
    );

    if (
      consignment?.requiresInsurance ||
      consignment?.optionalServices
        ?.requiresInsurance
    ) {
      const insuranceRule =
        pricingRuleOptions.find(
          (rule) =>
            normalizePricingRuleCode(
              rule.ruleCode,
            ).includes(
              "INSURANCE",
            ) ||
            normalizePricingRuleCode(
              rule.ruleType,
            ).includes(
              "INSURANCE",
            ),
        );

      appendRule(
        insuranceRule || {
          ruleCode: "INSURANCE",
          ruleName:
            PRICING_RULE_VI_LABELS
              .INSURANCE,
        },
        {
          isMissing: !insuranceRule,
        },
      );
    }

    return Array.from(
      selectedRuleMap.values(),
    ).sort((first, second) =>
      getPricingRuleDisplayName(
        first,
      ).localeCompare(
        getPricingRuleDisplayName(
          second,
        ),
        "vi",
      ),
    );
  }, [
    consignment,
    pricingRuleCodeMap,
    pricingRuleMap,
    pricingRuleOptions,
  ]);

  const packageConfigurationMap = useMemo(
    () =>
      new Map(
        packageConfigurations.map(
          (configuration) => [
            normalizePackageConfigurationId(
              configuration.id,
            ),
            configuration,
          ],
        ),
      ),
    [packageConfigurations],
  );

  const hasWoodCrateService = useMemo(
    () =>
      Boolean(
        consignment?.requiresWoodenCrate,
      ) ||
      selectedPricingRules.some((rule) => {
        const searchableValue = [
          rule?.ruleCode,
          rule?.ruleType,
          rule?.ruleName,
        ]
          .map((value) =>
            String(value || "")
              .trim()
              .toUpperCase(),
          )
          .join(" ");

        return (
          searchableValue.includes("WOOD_CRATE") ||
          searchableValue.includes("WOOD_BOX") ||
          searchableValue.includes("THÙNG GỖ")
        );
      }),
    [
      consignment?.requiresWoodenCrate,
      selectedPricingRules,
    ],
  );

  const translatedConsignmentNote = useMemo(
    () =>
      translateConsignmentNote(
        consignment?.note,
        pricingRuleOptions,
      ),
    [consignment?.note, pricingRuleOptions],
  );

  const volumetricDivisor = useMemo(
    () => toFiniteNumberOrNull(volumetricDivisorRule?.value),
    [volumetricDivisorRule],
  );

  const getRecordProductType = useCallback((record) => {
    const productType = record?.productType;

    if (productType && typeof productType === "object") {
      return (
        productType.value ||
        productType.code ||
        productType.productTypeCode ||
        productType.productTypeId ||
        productType.id ||
        productType.name ||
        productType.productTypeName ||
        ""
      );
    }

    return (
      productType ||
      record?.productTypeCode ||
      record?.productTypeId ||
      record?.productTypeName ||
      ""
    );
  }, []);

  const handleOpenFullText = useCallback((title, content) => {
    const normalizedContent = String(content ?? "").trim();

    if (!normalizedContent || normalizedContent === "-") {
      return;
    }

    setFullTextPreview({
      open: true,
      title,
      content: normalizedContent,
    });
  }, []);

  const handleCloseFullText = useCallback(() => {
    setFullTextPreview({
      open: false,
      title: "",
      content: "",
    });
  }, []);

  /* =======================================================
     DỮ LIỆU TRUYỀN CHO FILE UI
     ======================================================= */

  const displayCode = getDisplayCode(consignment);
  const statusClass = getStatusClassName(consignment?.status);
  const isAlreadyCancelled =
    normalizeStatus(consignment?.status) === "CANCELLED";

  const quotationStatusClass = getStatusClassName(
    consignment?.quotation?.status,
  );

  const items = useMemo(() => {
    const detailItems = Array.isArray(
      consignment?.items,
    )
      ? consignment.items
      : [];

    return detailItems.map((item, index) => {
      const packageConfigurationId =
        getItemPackageConfigurationId(item);

      /*
       * API chi tiết đã trả object packageConfiguration đầy đủ.
       * Ưu tiên dùng object này để hiển thị ngay, không cần đoán.
       */
      const embeddedPackageConfiguration =
        item?.packageConfiguration &&
        typeof item.packageConfiguration === "object" &&
        !Array.isArray(item.packageConfiguration)
          ? normalizePackageConfigurationFromApi(
              item.packageConfiguration,
            )
          : null;

      /*
       * Chỉ fallback sang GET /api/package-configurations
       * khi API chi tiết chưa trả object cấu hình.
       */
      const matchedPackageConfiguration =
        !embeddedPackageConfiguration &&
        packageConfigurationId
          ? packageConfigurationMap.get(
              normalizePackageConfigurationId(
                packageConfigurationId,
              ),
            ) || null
          : null;

      const packageConfiguration =
        embeddedPackageConfiguration ||
        matchedPackageConfiguration ||
        null;

      const referenceUrls =
        normalizeItemReferenceUrls(item);

      return {
        ...item,
        id:
          item?.id ||
          item?.itemId ||
          item?.orderItemId ||
          `consignment-item-${index + 1}`,
        referenceUrl:
          referenceUrls[0] ||
          item?.referenceUrl ||
          "",
        referenceUrls,
        packageConfigurationId,
        packageConfiguration,
        packageConfigurationStatus:
          packageConfiguration
            ? "RESOLVED"
            : packageConfigurationId
              ? "NOT_FOUND"
              : hasWoodCrateService
                ? "MISSING_CONFIGURATION"
                : "NOT_USED",
      };
    });
  }, [
    consignment?.items,
    packageConfigurationMap,
    hasWoodCrateService,
  ]);

  const woodCrateFeeSummary = useMemo(() => {
    if (!hasWoodCrateService) {
      return {
        enabled: false,
        orderFee: 0,
        configurationFee: 0,
        totalFee: 0,
        configuredPackageCount: 0,
        packageCount: items.length,
      };
    }

    const woodRule =
      pricingRuleCodeMap.get(
        WOOD_CRATE_RULE_CODE,
      ) ||
      pricingRuleOptions.find(
        isWoodCratePricingRule,
      ) ||
      null;

    /*
     * Phí thùng gỗ tính theo cỡ thùng của từng kiện (packageConfigurations
     * trong catalog, đọc qua pricingRuleService). Rule WOOD_CRATE không còn
     * mức cố định theo đơn; chỉ cộng khi catalog thật sự khai một giá trị.
     */
    const orderFee =
      toFiniteNumberOrNull(woodRule?.value) ?? 0;

    const configuredItems = items.filter(
      (item) => item?.packageConfiguration,
    );

    const configurationFee = configuredItems.reduce(
      (total, item) =>
        total +
        getPackageConfigurationFee(
          item.packageConfiguration,
          item,
        ),
      0,
    );

    return {
      enabled: true,
      orderFee,
      configurationFee,
      totalFee: orderFee + configurationFee,
      configuredPackageCount:
        configuredItems.length,
      packageCount: items.length,
      rule: woodRule,
    };
  }, [
    hasWoodCrateService,
    items,
    pricingRuleCodeMap,
    pricingRuleOptions,
  ]);

  const taxRuleInfo = useMemo(() => {
    const vatRule =
      pricingRuleCodeMap.get(VAT_RULE_CODE) ||
      pricingRuleOptions.find(
        (rule) =>
          normalizePricingRuleCode(
            rule?.ruleCode,
          ) === VAT_RULE_CODE,
      ) ||
      null;

    const importTaxRule =
      pricingRuleCodeMap.get(
        IMPORT_TAX_RULE_CODE,
      ) ||
      pricingRuleOptions.find(
        (rule) =>
          normalizePricingRuleCode(
            rule?.ruleCode,
          ) === IMPORT_TAX_RULE_CODE,
      ) ||
      null;

    return {
      vatPercent: formatPercent(
        vatRule?.value,
      ),
      vatDescription:
        vatRule?.description || "",
      vatConditionType:
        vatRule?.conditionType || null,
      importTaxPercent: formatPercent(
        importTaxRule?.value,
      ),
      importTaxDescription:
        importTaxRule?.description || "",
      importTaxConditionType:
        importTaxRule?.conditionType || null,
    };
  }, [
    pricingRuleCodeMap,
    pricingRuleOptions,
  ]);

  const displaySelectedPricingRules =
    useMemo(
      () =>
        selectedPricingRules.map((rule) => {
          if (!isWoodCratePricingRule(rule)) {
            return rule;
          }

          return {
            ...rule,
            feeLabel: formatMoney(
              woodCrateFeeSummary.totalFee,
            ),
            feeDetail: [
              /* Chỉ nêu phí toàn đơn khi catalog thật sự khai một mức. */
              woodCrateFeeSummary.orderFee > 0 &&
                `${formatMoney(
                  woodCrateFeeSummary.orderFee,
                )} phí dịch vụ / toàn đơn`,
              `${formatMoney(
                woodCrateFeeSummary.configurationFee,
              )} tổng phí cấu hình thùng`,
              `${woodCrateFeeSummary.configuredPackageCount}/${woodCrateFeeSummary.packageCount} kiện đã có cấu hình`,
            ]
              .filter(Boolean)
              .join(" • "),
            orderFee:
              woodCrateFeeSummary.orderFee,
            configurationFee:
              woodCrateFeeSummary.configurationFee,
            totalFee:
              woodCrateFeeSummary.totalFee,
          };
        }),
      [
        selectedPricingRules,
        woodCrateFeeSummary,
      ],
    );

  const customer = consignment?.customer || {};
  const quotation = consignment?.quotation || null;
  const totalPackageCount = items.length;

  const calculatedTotalDimWeight = volumetricDivisor
    ? items.reduce((total, item) => {
        const dimWeight = calculateDimWeight(
          item.length,
          item.width,
          item.height,
          volumetricDivisor,
        );

        return total + (dimWeight ?? 0);
      }, 0)
    : null;

  const apiVolumetricWeight = toFiniteNumberOrNull(
    consignment?.volumetricWeight ?? quotation?.volumetricWeight,
  );

  const totalDimWeight = Number.isFinite(calculatedTotalDimWeight)
    ? calculatedTotalDimWeight
    : apiVolumetricWeight;

  const summaryCards = consignment
    ? [
        {
          label: "Loại vận chuyển",
          value: getConsignmentTypeLabel(consignment.consignmentType),
        },
        {
          label: "Tuyến vận chuyển",
          value: consignment.route || "-",
        },
        {
          label: "Tổng trọng lượng kiện hàng",
          value: formatWeight(consignment.totalWeight),
          suffix: "kg",
        },
        {
          label: "Tổng thể tích kiện hàng",
          value: formatNumberWithDots(consignment.totalVolume),
          suffix:
            toFiniteNumberOrNull(consignment.totalVolume) > 0
              ? `cm³ (≈ ${formatCbm(consignment.totalVolume)} m³)`
              : "cm³",
        },
        {
          label: "Tổng số kiện hàng",
          value: totalPackageCount,
          suffix: "kiện",
        },

      ]
    : [];

  return (
    <>
    <ConsignmentListDetailUI
      loading={loading}
      consignment={consignment}
      customer={customer}
      quotation={quotation}
      items={items}
      errorMessage={errorMessage}
      hasSummaryData={Boolean(summaryData)}
      volumetricRuleLoading={volumetricRuleLoading}
      volumetricRuleError={volumetricRuleError}
      displayCode={displayCode}
      copiedConsignmentCode={copiedConsignmentCode}
      statusClass={statusClass}
      statusLabel={getStatusLabel(consignment?.status)}
      quotationStatusClass={quotationStatusClass}
      quotationStatusLabel={getQuotationStatusLabel(quotation?.status)}
      quoteTypeLabel={getQuoteTypeLabel(quotation?.quoteType)}
      consignmentTypeLabel={getConsignmentTypeLabel(
        consignment?.consignmentType,
      )}
      summaryCards={summaryCards}
      selectedPricingRules={displaySelectedPricingRules}
      pricingRuleError={pricingRuleError}
      woodCrateFeeSummary={woodCrateFeeSummary}
      taxRuleInfo={taxRuleInfo}
      packageConfigurationLoading={
        packageConfigurationLoading
      }
      packageConfigurationError={
        packageConfigurationError
      }
      hasWoodCrateService={
        hasWoodCrateService
      }
      translatedConsignmentNote={translatedConsignmentNote}
      volumetricDivisor={volumetricDivisor}
      fullTextPreview={fullTextPreview}
      cancelReason={cancelReason}
      cancelReasonError={cancelReasonError}
      isCancelModalOpen={isCancelModalOpen}
      isCancelling={isCancelling}
      isAlreadyCancelled={isAlreadyCancelled}
      onBack={handleBack}
      onReload={handleReload}
      onCopyConsignmentCode={handleCopyConsignmentCode}
      onOpenFullText={handleOpenFullText}
      onCloseFullText={handleCloseFullText}
      onOpenCancelModal={handleOpenCancelModal}
      onCloseCancelModal={handleCloseCancelModal}
      onConfirmCancel={handleCancelConsignment}
      onCancelReasonChange={(value) => {
        setCancelReason(value);

        if (cancelReasonError) {
          setCancelReasonError("");
        }
      }}
      getPackageConfigurationFee={getPackageConfigurationFee}
      getProductTypeLabel={getProductTypeLabel}
      getRecordProductType={getRecordProductType}
      getRuleDisplayName={getPricingRuleDisplayName}
      getRuleColorClass={getPricingRuleColorClass}
      calculateDimWeight={calculateDimWeight}
      formatDimWeight={formatDimWeight}
      formatWeight={formatWeight}
      formatMoney={formatMoney}
      formatDateTime={formatDateTime}
      formatDateTimeTitle={formatDateTimeUtcTitle}
    />
    {/* Phiếu tiếp nhận kho: tự ẩn khi đơn chưa có phiếu, nên đặt thẳng ở đây được. */}
    <ReceivingNoteCard orderId={consignment?.orderId || consignment?.id || orderId} />
    {/* Hành trình thật (chặng, chuyến, ngày dự kiến) + lối vào màn Theo dõi đơn; tự ẩn khi
        đơn chưa có hàng ở kho. */}
    <OrderJourneyCard orderId={consignment?.orderId || consignment?.id || orderId} />
    {/* Chọn giao ngay / gửi kho VN cho TỪNG kiện (lựa chọn lúc tạo đơn chỉ là mặc định cả
        đơn); tự ẩn khi đơn chưa có kiện. */}
    <ParcelHandlingCard orderId={consignment?.orderId || consignment?.id || orderId} />
    <OrderTimelineCard orderId={consignment?.orderId || consignment?.id || orderId} />
    <DeliveryTrackingCard orderId={consignment?.orderId || consignment?.id || orderId} />
    </>
  );
};

export default ConsignmentListDetail;
