import React, {
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

/**
 * Đây là giá trị lựa chọn nội bộ của giao diện.
 *
 * Lưu ý:
 * - OFFLINE: component cha gọi acceptQuotationApi để xác nhận báo giá thủ công.
 * - ONLINE: component cha gọi confirm-and-pay với paymentMethod = "SEPAY".
 *
 * Không gửi trực tiếp "ONLINE" hoặc "OFFLINE" vào API SePay.
 */
export const PAYMENT_METHODS = Object.freeze({
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
      "Thanh toán tiền cọc 50% qua SePay bằng mã VietQR do backend cung cấp.",
    badge: "SePay",
    icon: CreditCardRoundedIcon,
  },
];

/**
 * Popup lựa chọn cách xác nhận báo giá chính thức.
 *
 * onConfirm nhận một trong hai giá trị nội bộ:
 * - PAYMENT_METHODS.OFFLINE
 * - PAYMENT_METHODS.ONLINE
 */
const QuotationPaymentConfirmDialog = ({
  open,
  loading = false,
  consignmentCode = "-",
  totalAmount = 0,
  depositRate = 0.5,
  formatMoney = (value) => String(value ?? 0),
  onClose,
  onConfirm,
}) => {
  const [selectedMethod, setSelectedMethod] = useState("");
  const [methodError, setMethodError] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedMethod("");
      setMethodError("");
    }
  }, [open]);

  const normalizedTotalAmount = useMemo(() => {
    const number = Number(totalAmount);

    return Number.isFinite(number) ? Math.max(number, 0) : 0;
  }, [totalAmount]);

  const normalizedDepositRate = useMemo(() => {
    const number = Number(depositRate);

    if (!Number.isFinite(number)) {
      return 0.5;
    }

    return Math.min(Math.max(number, 0), 1);
  }, [depositRate]);

  const depositAmount = normalizedTotalAmount * normalizedDepositRate;
  const remainingAmount = Math.max(
    normalizedTotalAmount - depositAmount,
    0,
  );
  const depositPercent = Math.round(normalizedDepositRate * 100);

  const isOffline = selectedMethod === PAYMENT_METHODS.OFFLINE;
  const isOnline = selectedMethod === PAYMENT_METHODS.ONLINE;

  const selectedMethodLabel = isOnline
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

  const handleSelectMethod = (method) => {
    if (loading) {
      return;
    }

    setSelectedMethod(method);
    setMethodError("");
  };

  const handleConfirm = () => {
    if (!Object.values(PAYMENT_METHODS).includes(selectedMethod)) {
      setMethodError("Vui lòng chọn một cách xác nhận báo giá.");
      return;
    }

    onConfirm?.(selectedMethod);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      disableEscapeKeyDown={loading}
      fullWidth
      maxWidth="sm"
      className="quotation-quotation-dialog quotation-payment-dialog"
      PaperProps={{
        className: "quotation-dialog-paper quotation-payment-dialog-paper",
      }}
    >
      <DialogTitle className="quotation-dialog-title quotation-payment-dialog-title">
        <div className="quotation-dialog-title-icon is-payment">
          <PaymentRoundedIcon />
        </div>

        <div className="quotation-dialog-title-content">
          <strong>Chọn cách xác nhận báo giá</strong>

          <span>
            Xác nhận thủ công offline hoặc thanh toán cọc {depositPercent}% qua
            SePay.
          </span>
        </div>
      </DialogTitle>

      <DialogContent className="quotation-dialog-content quotation-payment-dialog-content">
        <div className="quotation-dialog-summary quotation-payment-summary">
          <div className="is-consignment">
            <span>Mã vận đơn</span>
            <strong>{consignmentCode}</strong>
          </div>

          <div className="is-total">
            <span>Tổng báo giá</span>
            <strong>{formatMoney(normalizedTotalAmount)}</strong>
          </div>

          <div
            className="is-deposit"
            style={{
              "--quotation-deposit-percent": `"${depositPercent}%"`,
            }}
          >
            <span>Tiền cọc khi thanh toán online</span>
            <strong>{formatMoney(depositAmount)}</strong>
            <small>
              Tương đương {depositPercent}% tổng giá trị báo giá
            </small>
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

              <strong>Chọn một phương thức để tiếp tục</strong>
            </div>

            {selectedMethodLabel && <small>{selectedMethodLabel}</small>}
          </div>

          <div
            className="quotation-payment-method-options"
            role="radiogroup"
            aria-label="Cách xác nhận báo giá"
          >
            {PAYMENT_METHOD_OPTIONS.map((option) => {
              const MethodIcon = option.icon;
              const selected = selectedMethod === option.value;
              const methodClassName = option.value.toLowerCase();

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={[
                    "quotation-payment-method-option",
                    selected && "is-selected",
                    `is-${methodClassName}`,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleSelectMethod(option.value)}
                  disabled={loading}
                >
                  <span className="quotation-payment-method-option-icon">
                    <MethodIcon />
                  </span>

                  <span className="quotation-payment-method-option-content">
                    <strong>{option.title}</strong>
                    <small>{option.subtitle}</small>
                  </span>

                  <span className="quotation-payment-method-option-side">
                    <b>{option.badge}</b>
                    <i aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>

          {methodError && (
            <p className="quotation-payment-method-error" role="alert">
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
                  : "Online sẽ chuyển sang trang SePay/VietQR. Offline chỉ xác nhận báo giá và chờ nhân viên xử lý thủ công."}
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
              <CircularProgress size={17} thickness={5} />
            ) : (
              <PaymentRoundedIcon />
            )
          }
          onClick={handleConfirm}
          disabled={loading || !selectedMethod}
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
