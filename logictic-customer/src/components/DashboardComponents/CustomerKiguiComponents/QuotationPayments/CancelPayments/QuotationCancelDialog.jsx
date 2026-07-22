import React, {
  useEffect,
  useState,
} from "react";

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

/**
 * Popup hủy/từ chối báo giá, tách riêng khỏi luồng thanh toán.
 *
 * Component tự quản lý nội dung lý do và validation.
 * Component cha chỉ cần xử lý gọi API thông qua onConfirm(reason).
 */
const QuotationCancelDialog = ({
  open,
  loading = false,
  consignmentCode = "-",
  totalAmount = 0,
  formatMoney = (value) => String(value ?? 0),
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setReasonError("");
    }
  }, [open]);

  const handleReasonChange = (event) => {
    const nextReason = String(event?.target?.value || "").slice(0, 500);

    setReason(nextReason);

    if (nextReason.trim().length >= 3) {
      setReasonError("");
    }
  };

  const handleClose = () => {
    if (loading) {
      return;
    }

    onClose?.();
  };

  const handleConfirm = () => {
    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      setReasonError("Vui lòng nhập lý do từ chối báo giá.");
      return;
    }

    if (normalizedReason.length < 3) {
      setReasonError("Lý do từ chối phải có ít nhất 3 ký tự.");
      return;
    }

    onConfirm?.(normalizedReason);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      disableEscapeKeyDown={loading}
      fullWidth
      maxWidth="sm"
      className="quotation-quotation-dialog quotation-reject-dialog"
      PaperProps={{
        className: "quotation-dialog-paper quotation-reject-dialog-paper",
      }}
    >
      <DialogTitle className="quotation-dialog-title quotation-reject-dialog-title">
        <div className="quotation-dialog-title-icon is-danger">
          <CloseRoundedIcon />
        </div>

        <div className="quotation-dialog-title-content">
          <strong>Hủy / từ chối báo giá</strong>

          <span>
            Vui lòng nhập lý do để bộ phận phụ trách hỗ trợ bạn tốt hơn.
          </span>
        </div>
      </DialogTitle>

      <DialogContent className="quotation-dialog-content quotation-reject-dialog-content">
        <div className="quotation-dialog-summary quotation-reject-summary">
          <div>
            <span>Mã vận đơn</span>
            <strong>{consignmentCode}</strong>
          </div>

          <div>
            <span>Tổng báo giá</span>
            <strong>{formatMoney(totalAmount)}</strong>
          </div>
        </div>

        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={4}
          maxRows={7}
          value={reason}
          onChange={handleReasonChange}
          error={Boolean(reasonError)}
          helperText={reasonError || `${reason.length}/500 ký tự`}
          disabled={loading}
          label="Lý do từ chối"
          placeholder="Ví dụ: Chi phí hiện tại chưa phù hợp với ngân sách của tôi..."
          className="quotation-rejection-reason-field"
          slotProps={{
            htmlInput: {
              maxLength: 500,
            },
          }}
        />

        <div className="quotation-reject-dialog-note">
          <span>Lưu ý</span>

          <p>
            Sau khi xác nhận, báo giá sẽ chuyển sang trạng thái đã từ chối.
          </p>
        </div>
      </DialogContent>

      <DialogActions className="quotation-dialog-actions quotation-reject-dialog-actions">
        <Button
          type="button"
          variant="outlined"
          color="inherit"
          onClick={handleClose}
          disabled={loading}
          className="quotation-reject-cancel-button"
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
              <CloseRoundedIcon />
            )
          }
          onClick={handleConfirm}
          disabled={loading || reason.trim().length < 3}
          className="quotation-reject-confirm-button"
        >
          {loading ? "Đang từ chối..." : "Xác nhận từ chối"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuotationCancelDialog;
