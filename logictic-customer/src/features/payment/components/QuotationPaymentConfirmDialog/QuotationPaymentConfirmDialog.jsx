import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PaymentRoundedIcon from "@mui/icons-material/PaymentRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

/*
 * Tỷ lệ cọc mặc định đọc API THẬT (GET /api/additional-service-fees, DEPOSIT_RATE).
 * Luồng mua hộ truyền sẵn customDepositAmount do backend tính nên không gọi hàm này;
 * màn báo giá ký gửi truyền loadDepositRate = cùng hàm thật.
 */
import { getDepositRate as getDefaultDepositRate } from "@features/pricing/api/pricingRuleService";

/**
 * Giá trị lựa chọn mặc định (luồng mua hộ, vẫn mock):
 * ONLINE → component cha gọi confirm-and-pay với paymentMethod = "SEPAY".
 *
 * Màn báo giá ký gửi truyền paymentMethodOptions riêng (PAYOS / OFFLINE) và
 * onConfirm nhận đúng value của lựa chọn đó.
 */
export const PAYMENT_METHODS =
  Object.freeze({
    OFFLINE: "OFFLINE",
    ONLINE: "ONLINE",
  });

/**
 * Mỗi lựa chọn: { value, title, subtitle, badge, icon } và tuỳ chọn:
 * - requiresDepositRate: chỉ chọn được khi đã tải được tỷ lệ cọc
 *   (mặc định true với ONLINE, false với lựa chọn khác);
 * - getSubtitle(ctx), getNoteTitle(ctx), getNoteText(ctx): chữ động theo
 *   ctx = { depositPercent, depositAmount, remainingAmount, depositRateLoading,
 *   depositRateError, formatMoney };
 * - selectedLabel, confirmLabel.
 * Lựa chọn nào không khai báo thì dùng chữ mặc định của luồng mua hộ (SePay).
 */
const PAYMENT_METHOD_OPTIONS = [
  {
    value: PAYMENT_METHODS.ONLINE,
    title: "Thanh toán online qua SePay",
    subtitle:
      "Thanh toán tiền cọc qua SePay bằng mã VietQR do hệ thống cung cấp.",
    badge: "SePay",
    icon: CreditCardRoundedIcon,
  },
];

const optionRequiresDepositRate = (option) =>
  option?.requiresDepositRate ??
  option?.value === PAYMENT_METHODS.ONLINE;


const normalizeApiError = (
  error,
  fallbackMessage,
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.title ||
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage
  );
};

/**
 * Popup lựa chọn cách xác nhận báo giá chính thức.
 *
 * onConfirm nhận:
 * - PAYMENT_METHODS.OFFLINE
 * - PAYMENT_METHODS.ONLINE
 *
 * Hai cách xác định số tiền cọc:
 * - customDepositAmount (luồng mua hộ): số backend trả sẵn trong báo giá — ĐÚNG số confirm-and-pay
 *   sẽ tạo khoản thu. Hộp thoại không tải tỷ lệ, không hiện nhãn %, không tự tính gì thêm;
 *   customRemainingAmount / depositBreakdown cũng lấy từ backend.
 * - không truyền customDepositAmount (ký gửi): tỷ lệ lấy từ API theo feeCode DEPOSIT_RATE.
 */
const QuotationPaymentConfirmDialog = ({
  open,
  loading = false,
  consignmentCode = "-",
  totalAmount = 0,
  customDepositAmount = null,
  customDepositDescription = "",
  /* Luồng mua hộ: phần còn lại do backend trả (không lấy tổng trừ cọc ở FE). */
  customRemainingAmount = null,
  remainingLabel = "Số tiền còn lại",
  /* [{ label, amount }] — các dòng số tiền backend trả, chỉ để hiển thị. */
  depositBreakdown = null,
  formatMoney = (value) =>
    Number(value || 0).toLocaleString(
      "vi-VN",
      {
        style: "currency",
        currency: "VND",
      },
    ),
  onClose,
  onConfirm,
  /* Các prop dưới đây có mặc định giữ nguyên hành vi luồng mua hộ. */
  paymentMethodOptions = PAYMENT_METHOD_OPTIONS,
  defaultMethod = PAYMENT_METHODS.ONLINE,
  loadDepositRate: depositRateLoader = getDefaultDepositRate,
  gatewayText = "qua cổng thanh toán SePay.",
  depositLabel = "Tiền cọc khi thanh toán online",
  depositNote = "",
}) => {
  const [
    selectedMethod,
    setSelectedMethod,
  ] = useState("");

  const [
    methodError,
    setMethodError,
  ] = useState("");

  const [
    depositRateData,
    setDepositRateData,
  ] = useState(null);

  const [
    depositRateLoading,
    setDepositRateLoading,
  ] = useState(false);

  const [
    depositRateError,
    setDepositRateError,
  ] = useState("");

  const hasCustomDeposit =
    customDepositAmount !== null && customDepositAmount !== undefined;

  /**
   * Gọi API lấy:
   *
   * {
   *   feeCode: "DEPOSIT_RATE",
   *   calculationType: "PERCENTAGE",
   *   value: 50,
   *   unit: "%",
   *   isActive: true
   * }
   */
  const loadDepositRate =
    useCallback(async (signal) => {
      setDepositRateLoading(true);
      setDepositRateError("");

      try {
        const result =
          await depositRateLoader({
            signal,
            activeOnly: true,
          });

        if (signal?.aborted) {
          return;
        }

        const rateValue = Number(
          result?.value,
        );

        if (
          !Number.isFinite(rateValue) ||
          rateValue < 0 ||
          rateValue > 100
        ) {
          throw new Error(
            "Tỷ lệ cọc từ hệ thống không hợp lệ.",
          );
        }

        const feeCode = String(
          result?.feeCode || "",
        )
          .trim()
          .toUpperCase();

        if (
          feeCode !== "DEPOSIT_RATE"
        ) {
          throw new Error(
            "API không trả về cấu hình DEPOSIT_RATE.",
          );
        }

        const calculationType =
          String(
            result?.calculationType ||
            "",
          )
            .trim()
            .toUpperCase();

        if (
          calculationType !==
          "PERCENTAGE"
        ) {
          throw new Error(
            "DEPOSIT_RATE phải có kiểu tính PERCENTAGE.",
          );
        }

        if (
          result?.isActive === false
        ) {
          throw new Error(
            "Tỷ lệ cọc hiện không hoạt động.",
          );
        }

        setDepositRateData({
          ...result,
          value: rateValue,
        });
      } catch (error) {
        if (
          error?.name === "AbortError" ||
          error?.name ===
          "CanceledError" ||
          error?.code ===
          "ERR_CANCELED"
        ) {
          return;
        }

        console.error(
          "Lỗi lấy tỷ lệ cọc:",
          error?.response?.data ||
          error,
        );

        setDepositRateData(null);

        setDepositRateError(
          normalizeApiError(
            error,
            "Không thể tải tỷ lệ cọc từ hệ thống.",
          ),
        );
      } finally {
        if (!signal?.aborted) {
          setDepositRateLoading(false);
        }
      }
    }, [depositRateLoader]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const controller =
      new AbortController();

    setSelectedMethod(defaultMethod);
    setMethodError("");
    setDepositRateData(null);
    setDepositRateError("");

    /* Số cọc đã có sẵn từ backend thì không tải tỷ lệ (tránh nhãn % không liên quan). */
    if (!hasCustomDeposit) {
      loadDepositRate(
        controller.signal,
      );
    }

    return () => {
      controller.abort();
    };
  }, [open, loadDepositRate, defaultMethod, hasCustomDeposit]);

  const normalizedTotalAmount =
    useMemo(() => {
      const number = Number(
        totalAmount,
      );

      return Number.isFinite(number)
        ? Math.max(number, 0)
        : 0;
    }, [totalAmount]);

  /**
   * API trả value = 50 nghĩa là 50%.
   *
   * Khi tính tiền:
   * 50 / 100 = 0.5
   */
  const depositPercent =
    useMemo(() => {
      const value = Number(
        depositRateData?.value,
      );

      if (
        !Number.isFinite(value)
      ) {
        return null;
      }

      return Math.min(
        Math.max(value, 0),
        100,
      );
    }, [depositRateData]);

  const depositRate =
    useMemo(() => {
      if (depositPercent === null) {
        return null;
      }

      return depositPercent / 100;
    }, [depositPercent]);

  const depositAmount =
    useMemo(() => {
      if (customDepositAmount !== null && customDepositAmount !== undefined) {
        return Math.max(Number(customDepositAmount || 0), 0);
      }

      if (depositRate === null) {
        return 0;
      }

      return (
        normalizedTotalAmount *
        depositRate
      );
    }, [
      customDepositAmount,
      normalizedTotalAmount,
      depositRate,
    ]);

  const remainingAmount =
    useMemo(() => {
      if (customRemainingAmount !== null && customRemainingAmount !== undefined) {
        return Math.max(Number(customRemainingAmount || 0), 0);
      }

      return Math.max(
        normalizedTotalAmount -
        depositAmount,
        0,
      );
    }, [
      customRemainingAmount,
      normalizedTotalAmount,
      depositAmount,
    ]);

  const selectedOption =
    paymentMethodOptions.find(
      (option) =>
        option.value === selectedMethod,
    ) || null;

  const isOffline =
    selectedMethod ===
    PAYMENT_METHODS.OFFLINE;

  /* "Cần tỷ lệ cọc" — với luồng mua hộ chính là lựa chọn ONLINE. */
  const isOnline =
    optionRequiresDepositRate(
      selectedOption,
    );

  const canUseOnlinePayment =
    hasCustomDeposit ||
    (!depositRateLoading &&
      !depositRateError &&
      depositPercent !== null);

  const textContext = {
    depositPercent,
    depositAmount,
    remainingAmount,
    depositRateLoading,
    depositRateError,
    formatMoney,
  };

  const selectedMethodLabel =
    selectedOption?.selectedLabel ??
    (isOnline
      ? "Thanh toán online qua SePay"
      : isOffline
        ? "Xác nhận báo giá offline"
        : "");

  const handleClose = () => {
    if (loading) {
      return;
    }

    onClose?.();
  };

  const handleSelectMethod = (
    method,
  ) => {
    if (loading) {
      return;
    }

    if (
      optionRequiresDepositRate(
        paymentMethodOptions.find(
          (option) =>
            option.value === method,
        ),
      ) &&
      !canUseOnlinePayment
    ) {
      setMethodError(
        depositRateError ||
        "Đang tải tỷ lệ cọc. Vui lòng thử lại.",
      );

      return;
    }

    setSelectedMethod(method);
    setMethodError("");
  };

  const handleRetryDepositRate =
    () => {
      if (
        loading ||
        depositRateLoading
      ) {
        return;
      }

      const controller =
        new AbortController();

      loadDepositRate(
        controller.signal,
      );
    };

  const handleConfirm = () => {
    if (!selectedOption) {
      setMethodError(
        "Vui lòng chọn một cách xác nhận báo giá.",
      );

      return;
    }

    if (
      isOnline &&
      !canUseOnlinePayment
    ) {
      setMethodError(
        "Không thể thanh toán online khi chưa tải được tỷ lệ cọc.",
      );

      return;
    }

    /**
     * Vẫn giữ API component cha nhận method.
     *
     * Có thể nhận thêm depositRateData ở tham số thứ hai
     * để dùng khi cần kiểm tra hoặc hiển thị.
     */
    onConfirm?.(
      selectedMethod,
      isOnline
        ? {
          depositRate:
            depositPercent,
          depositAmount,
          remainingAmount,
          fee:
            depositRateData,
        }
        : null,
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      disableEscapeKeyDown={
        loading
      }
      fullWidth
      maxWidth="sm"
      className="quotation-quotation-dialog quotation-payment-dialog"
      PaperProps={{
        className:
          "quotation-dialog-paper quotation-payment-dialog-paper",
        style: {
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          borderRadius: "16px",
        },
      }}
    >
      <DialogTitle className="quotation-dialog-title quotation-payment-dialog-title">
        <div className="quotation-dialog-title-icon is-payment">
          <PaymentRoundedIcon />
        </div>

        <div className="quotation-dialog-title-content">
          <strong>
            Xác nhận thanh toán báo giá
          </strong>

          <span>
            {hasCustomDeposit
              ? `Thanh toán ${formatMoney(depositAmount)} `
              : "Thanh toán cọc "}
            {hasCustomDeposit
              ? ""
              : depositRateLoading
                ? "..."
                : depositPercent !==
                  null
                  ? `${depositPercent}%`
                  : "theo cấu hình hệ thống"}{" "}
            {gatewayText}
          </span>
        </div>

      </DialogTitle>

      <DialogContent className="quotation-dialog-content quotation-payment-dialog-content">
        <div className="quotation-dialog-summary quotation-payment-summary">
          <div className="is-consignment" style={{ minHeight: "50px", padding: "8px 12px", gap: "2px", gridTemplateRows: "auto auto" }}>
            <span>
              Mã vận đơn
            </span>

            <strong>
              {consignmentCode}
            </strong>
          </div>

          <div className="is-total">
            <span>
              Tổng báo giá
            </span>

            <strong>
              {formatMoney(
                normalizedTotalAmount,
              )}
            </strong>
          </div>

          <div
            className="is-deposit"
            style={{
              /* Số cọc từ backend không phải một tỷ lệ → không hiện nhãn %. */
              "--quotation-deposit-percent":
                hasCustomDeposit
                  ? "none"
                  : `"${depositPercent ?? 0}%"`,
            }}
          >
            <span>
              {depositLabel}
            </span>

            {hasCustomDeposit ? (
              <>
                <strong>
                  {formatMoney(
                    depositAmount,
                  )}
                </strong>

                {customDepositDescription && (
                  <small>
                    {customDepositDescription}
                  </small>
                )}
              </>
            ) : depositRateLoading ? (
              <div className="quotation-deposit-rate-loading">
                <CircularProgress
                  size={18}
                  thickness={5}
                />

                <small>
                  Đang tải tỷ lệ
                  cọc...
                </small>
              </div>
            ) : depositRateError ? (
              <div className="quotation-deposit-rate-error">
                <strong>
                  Chưa xác định
                </strong>

                <small>
                  {
                    depositRateError
                  }
                </small>

                <Button
                  type="button"
                  size="small"
                  startIcon={
                    <RefreshRoundedIcon />
                  }
                  onClick={
                    handleRetryDepositRate
                  }
                  disabled={
                    loading ||
                    depositRateLoading
                  }
                >
                  Thử lại
                </Button>
              </div>
            ) : (
              <>
                <strong>
                  {formatMoney(
                    depositAmount,
                  )}
                </strong>

                <small>
                  Tương đương{" "}
                  {depositPercent}%
                  tổng giá trị báo
                  giá
                  {depositNote
                    ? ` ${depositNote}`
                    : ""}
                </small>
              </>
            )}
          </div>

          {hasCustomDeposit && Array.isArray(depositBreakdown) && depositBreakdown.length > 0 && (
            <div
              className="quotation-deposit-breakdown-card"
              style={{
                gridColumn: "1 / -1",
                background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                border: "1px solid #bae6fd",
                borderRadius: "8px",
                padding: "6px 10px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "6px",
                fontSize: "0.78rem",
                color: "#334155",
                fontFamily: "inherit",
              }}
            >
              {depositBreakdown.map((line) => (
                <div
                  key={line.label}
                  style={{
                    background: "#ffffff",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid #e0f2fe",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#475569", fontWeight: 500 }}>{line.label}</span>
                  <strong style={{ color: "#0284c7", fontSize: "0.84rem", whiteSpace: "nowrap", marginLeft: "8px", fontWeight: 700 }}>
                    {formatMoney(line.amount)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <section
          className="quotation-payment-method-selector"
          aria-labelledby="quotation-payment-method-title"
        >
          <div className="quotation-payment-method-heading">
            <div>
              <span id="quotation-payment-method-title">
                Cách xác nhận
              </span>

              <strong>
                Chọn một phương
                thức để tiếp tục
              </strong>
            </div>

            {selectedMethodLabel && (
              <small>
                {
                  selectedMethodLabel
                }
              </small>
            )}
          </div>

          <div
            className="quotation-payment-method-options"
            role="radiogroup"
            aria-label="Cách xác nhận báo giá"
          >
            {paymentMethodOptions.map(
              (option) => {
                const MethodIcon =
                  option.icon;

                const selected =
                  selectedMethod ===
                  option.value;

                const isOnlineOption =
                  optionRequiresDepositRate(
                    option,
                  );

                const optionDisabled =
                  loading ||
                  (isOnlineOption &&
                    !canUseOnlinePayment);

                const methodClassName =
                  option.value.toLowerCase();

                let subtitle =
                  option.subtitle;

                if (
                  isOnlineOption &&
                  depositRateLoading
                ) {
                  subtitle =
                    "Đang tải tỷ lệ cọc từ hệ thống...";
                }

                if (
                  isOnlineOption &&
                  depositRateError
                ) {
                  subtitle =
                    "Chưa thể thanh toán online vì không tải được tỷ lệ cọc.";
                }

                if (
                  isOnlineOption &&
                  canUseOnlinePayment
                ) {
                  subtitle = hasCustomDeposit
                    ? `Thanh toán ${formatMoney(depositAmount)} qua SePay bằng mã VietQR do hệ thống cung cấp.`
                    : `Thanh toán cọc ${depositPercent}% qua SePay bằng mã VietQR do hệ thống cung cấp.`;
                }

                if (
                  typeof option.getSubtitle ===
                  "function"
                ) {
                  subtitle =
                    option.getSubtitle(
                      textContext,
                    ) || subtitle;
                }

                return (
                  <button
                    key={
                      option.value
                    }
                    type="button"
                    role="radio"
                    aria-checked={
                      selected
                    }
                    aria-disabled={
                      optionDisabled
                    }
                    className={[
                      "quotation-payment-method-option",
                      selected &&
                      "is-selected",
                      optionDisabled &&
                      "is-disabled",
                      `is-${methodClassName}`,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      handleSelectMethod(
                        option.value,
                      )
                    }
                    disabled={
                      optionDisabled
                    }
                  >
                    <span className="quotation-payment-method-option-icon">
                      <MethodIcon />
                    </span>

                    <span className="quotation-payment-method-option-content">
                      <strong>
                        {option.title}
                      </strong>

                      <small>
                        {subtitle}
                      </small>
                    </span>

                    <span className="quotation-payment-method-option-side">
                      <b>
                        {
                          option.badge
                        }
                      </b>

                      <i
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                );
              },
            )}
          </div>

          {methodError && (
            <p
              className="quotation-payment-method-error"
              role="alert"
            >
              {methodError}
            </p>
          )}
        </section>

        <div className="quotation-payment-dialog-note">
          <InfoOutlinedIcon />

          <div>
            <strong>
              {typeof selectedOption?.getNoteTitle ===
              "function"
                ? selectedOption.getNoteTitle(
                  textContext,
                )
                : isOnline
                  ? hasCustomDeposit
                    ? `Thanh toán ${formatMoney(depositAmount)} qua SePay`
                    : `Thanh toán cọc ${depositPercent}% qua SePay`
                  : "Thông tin xử lý thanh toán"}
            </strong>

            <p>
              {typeof selectedOption?.getNoteText ===
              "function"
                ? selectedOption.getNoteText(
                  textContext,
                )
                : isOnline
                  ? `Bạn sẽ thanh toán trước ${formatMoney(
                    depositAmount,
                  )} qua VietQR. ${remainingLabel} là ${formatMoney(
                    remainingAmount,
                  )}.`
                  : depositRateLoading
                    ? "Hệ thống đang tải tỷ lệ cọc..."
                    : depositRateError
                      ? "Không tải được tỷ lệ cọc nên thanh toán online tạm thời chưa khả dụng."
                      : `Hệ thống sẽ chuyển sang trang SePay/VietQR để thanh toán cọc ${depositPercent}%.`}
            </p>
          </div>

        </div>
      </DialogContent>

      <DialogActions className="quotation-dialog-actions quotation-payment-dialog-actions">
        <Button
          type="button"
          variant="outlined"
          color="inherit"
          onClick={handleClose}
          disabled={loading}
          className="quotation-dialog-cancel-button"
        >
          Quay lại
        </Button>

        <Button
          type="button"
          variant="contained"
          startIcon={
            loading ? (
              <CircularProgress
                size={17}
                thickness={5}
              />
            ) : (
              <PaymentRoundedIcon />
            )
          }
          onClick={handleConfirm}
          disabled={
            loading ||
            !selectedMethod ||
            (isOnline &&
              !canUseOnlinePayment)
          }
          className="quotation-payment-confirm-button"
        >
          {loading
            ? "Đang xử lý..."
            : selectedOption?.confirmLabel ??
              (isOnline
                ? "Thanh toán qua SePay"
                : isOffline
                  ? "Xác nhận báo giá offline"
                  : "Tiếp tục")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuotationPaymentConfirmDialog;