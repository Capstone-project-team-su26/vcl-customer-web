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

import {
  getDepositRate,
} from "../../../../../api/ServiceApi/pricingRuleService";

/**
 * Giá trị lựa chọn nội bộ của giao diện.
 *
 * OFFLINE:
 * Component cha gọi acceptQuotationApi để xác nhận thủ công.
 *
 * ONLINE:
 * Component cha gọi confirm-and-pay với:
 * paymentMethod = "SEPAY".
 *
 * Không gửi trực tiếp ONLINE hoặc OFFLINE vào API SePay.
 */
export const PAYMENT_METHODS =
  Object.freeze({
    OFFLINE: "OFFLINE",
    ONLINE: "ONLINE",
  });

const PAYMENT_METHOD_OPTIONS = [
  {
    value: PAYMENT_METHODS.OFFLINE,
    title: "Xác nhận offline",
    subtitle:
      "Chấp nhận báo giá thủ công, không tạo giao dịch SePay và không chuyển sang trang VietQR.",
    badge: "Thủ công",
    icon: AccountBalanceRoundedIcon,
  },
  {
    value: PAYMENT_METHODS.ONLINE,
    title: "Thanh toán online",
    subtitle:
      "Thanh toán tiền cọc qua SePay bằng mã VietQR do backend cung cấp.",
    badge: "SePay",
    icon: CreditCardRoundedIcon,
  },
];

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
 * Không truyền depositRate từ component cha.
 * Tỷ lệ cọc được lấy từ API theo feeCode DEPOSIT_RATE.
 */
const QuotationPaymentConfirmDialog = ({
  open,
  loading = false,
  consignmentCode = "-",
  totalAmount = 0,
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
          await getDepositRate({
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
    }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const controller =
      new AbortController();

    setSelectedMethod("");
    setMethodError("");
    setDepositRateData(null);
    setDepositRateError("");

    loadDepositRate(
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [open, loadDepositRate]);

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
      if (depositRate === null) {
        return 0;
      }

      return (
        normalizedTotalAmount *
        depositRate
      );
    }, [
      normalizedTotalAmount,
      depositRate,
    ]);

  const remainingAmount =
    useMemo(() => {
      if (depositRate === null) {
        return normalizedTotalAmount;
      }

      return Math.max(
        normalizedTotalAmount -
          depositAmount,
        0,
      );
    }, [
      normalizedTotalAmount,
      depositAmount,
      depositRate,
    ]);

  const isOffline =
    selectedMethod ===
    PAYMENT_METHODS.OFFLINE;

  const isOnline =
    selectedMethod ===
    PAYMENT_METHODS.ONLINE;

  const canUseOnlinePayment =
    !depositRateLoading &&
    !depositRateError &&
    depositPercent !== null;

  const selectedMethodLabel =
    isOnline
      ? "Thanh toán online qua SePay"
      : isOffline
        ? "Xác nhận báo giá offline"
        : "";

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
      method ===
        PAYMENT_METHODS.ONLINE &&
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
    if (
      !Object.values(
        PAYMENT_METHODS,
      ).includes(selectedMethod)
    ) {
      setMethodError(
        "Vui lòng chọn một cách xác nhận báo giá.",
      );

      return;
    }

    if (
      selectedMethod ===
        PAYMENT_METHODS.ONLINE &&
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
      selectedMethod ===
        PAYMENT_METHODS.ONLINE
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
      }}
    >
      <DialogTitle className="quotation-dialog-title quotation-payment-dialog-title">
        <div className="quotation-dialog-title-icon is-payment">
          <PaymentRoundedIcon />
        </div>

        <div className="quotation-dialog-title-content">
          <strong>
            Chọn cách xác nhận báo giá
          </strong>

          <span>
            Xác nhận thủ công
            offline hoặc thanh toán
            cọc{" "}
            {depositRateLoading
              ? "..."
              : depositPercent !==
                  null
                ? `${depositPercent}%`
                : "theo cấu hình hệ thống"}{" "}
            qua SePay.
          </span>
        </div>
      </DialogTitle>

      <DialogContent className="quotation-dialog-content quotation-payment-dialog-content">
        <div className="quotation-dialog-summary quotation-payment-summary">
          <div className="is-consignment">
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
              "--quotation-deposit-percent":
                `"${depositPercent ?? 0}%"`,
            }}
          >
            <span>
              Tiền cọc khi thanh
              toán online
            </span>

            {depositRateLoading ? (
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
                </small>
              </>
            )}
          </div>
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
            {PAYMENT_METHOD_OPTIONS.map(
              (option) => {
                const MethodIcon =
                  option.icon;

                const selected =
                  selectedMethod ===
                  option.value;

                const isOnlineOption =
                  option.value ===
                  PAYMENT_METHODS.ONLINE;

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
                  subtitle =
                    `Thanh toán cọc ${depositPercent}% qua SePay bằng mã VietQR do backend cung cấp.`;
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
              {isOffline
                ? "Xác nhận báo giá theo hình thức thủ công"
                : isOnline
                  ? `Thanh toán cọc ${depositPercent}% qua SePay`
                  : "Thông tin xử lý thanh toán"}
            </strong>

            <p>
              {isOffline
                ? "Hệ thống chỉ ghi nhận việc bạn chấp nhận báo giá. Không tạo giao dịch SePay; bộ phận phụ trách sẽ liên hệ để xác nhận thanh toán thủ công."
                : isOnline
                  ? `Bạn sẽ thanh toán trước ${formatMoney(
                      depositAmount,
                    )} qua VietQR. Số tiền còn lại là ${formatMoney(
                      remainingAmount,
                    )}.`
                  : depositRateLoading
                    ? "Hệ thống đang tải tỷ lệ cọc. Bạn vẫn có thể chọn xác nhận offline."
                    : depositRateError
                      ? "Không tải được tỷ lệ cọc nên thanh toán online tạm thời chưa khả dụng. Bạn vẫn có thể xác nhận offline."
                      : `Online sẽ thanh toán cọc ${depositPercent}% và chuyển sang trang SePay/VietQR. Offline chỉ xác nhận báo giá và chờ nhân viên xử lý thủ công.`}
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
            : isOnline
              ? "Thanh toán qua SePay"
              : isOffline
                ? "Xác nhận báo giá offline"
                : "Tiếp tục"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuotationPaymentConfirmDialog;