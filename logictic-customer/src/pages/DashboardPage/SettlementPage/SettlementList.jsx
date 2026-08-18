/**
 * Thanh toán vận chuyển — nơi khách trả nốt tiền cho hàng đã về kho Việt Nam.
 *
 * Trước đây mục này trong menu trỏ vào một route không tồn tại nên bấm vào là ra trang lỗi;
 * khách chỉ tất toán được nếu tự mò vào lịch sử thanh toán của từng đơn.
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button, CircularProgress } from "@mui/material";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";

import { getAwaitingSettlementApi } from "../../../api/OrderApi/settlementApi";
import AuthNotify from "../../../utils/AuthNotify";

import "./SettlementList.css";

const formatMoney = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
};

export default function SettlementList() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await getAwaitingSettlementApi());
    } catch (error) {
      AuthNotify.error(
        "Không tải được danh sách",
        error?.response?.data?.message || error?.message || "Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="settlement-page">
      <header className="settlement-page__head">
        <div>
          <h1>Thanh toán vận chuyển</h1>
          <p>
            Hàng đã về kho Việt Nam. Trả nốt phần còn lại để chúng tôi xuất kho và giao tới bạn.
          </p>
        </div>

        <Button
          variant="outlined"
          startIcon={<AutorenewIcon />}
          onClick={load}
          disabled={loading}
        >
          Tải lại
        </Button>
      </header>

      {loading ? (
        <div className="settlement-page__loading">
          <CircularProgress size={30} />
          <span>Đang tải đơn của bạn…</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="settlement-page__empty">
          <Inventory2RoundedIcon />
          <strong>Bạn không có đơn nào cần tất toán</strong>
          <span>Khi hàng về tới kho Việt Nam và nhân viên chốt phí, đơn sẽ hiện ở đây.</span>
        </div>
      ) : (
        <div className="settlement-list">
          {orders.map((order) => {
            const due = order.pendingPaymentAmount;
            const canPay = Number(due) > 0 && Boolean(order.pendingCheckoutUrl);

            return (
              <article key={order.orderId} className="settlement-card">
                <div className="settlement-card__top">
                  <div>
                    <span className="settlement-card__kind">
                      {order.orderType === "PURCHASE" ? "Đơn mua hộ" : "Đơn ký gửi"}
                    </span>
                    <strong>{order.orderCode}</strong>
                  </div>

                  {canPay ? (
                    <span className="settlement-card__badge is-due">Chờ bạn thanh toán</span>
                  ) : (
                    <span className="settlement-card__badge">Chờ nhân viên chốt phí</span>
                  )}
                </div>

                <dl className="settlement-card__facts">
                  <div>
                    <dt>Hàng đã về kho</dt>
                    <dd>
                      {order.parcelCount} kiện ·{" "}
                      {Number(order.totalWeight || 0).toLocaleString("vi-VN")} kg
                    </dd>
                  </div>
                  <div>
                    <dt>Về kho lúc</dt>
                    <dd>{formatDateTime(order.arrivedAt)}</dd>
                  </div>
                  <div>
                    <dt>Giao tới</dt>
                    <dd>{order.receiverAddress || "—"}</dd>
                  </div>
                </dl>

                {order.discrepancyParcelCount > 0 && (
                  <p className="settlement-card__warning">
                    <ReportProblemRoundedIcon />
                    <span>
                      Kho ghi nhận <strong>{order.discrepancyParcelCount} kiện</strong> có chênh
                      lệch so với khai báo. Nhân viên sẽ liên hệ với bạn trước khi chốt tiền.
                    </span>
                  </p>
                )}

                <div className="settlement-card__foot">
                  {canPay ? (
                    <>
                      <div className="settlement-card__amount">
                        <span>Còn phải trả</span>
                        <strong>{formatMoney(due)}</strong>
                      </div>

                      <Button
                        variant="contained"
                        startIcon={<PaidRoundedIcon />}
                        onClick={() => window.location.assign(order.pendingCheckoutUrl)}
                      >
                        Thanh toán ngay
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="settlement-card__hint">
                        Nhân viên đang chốt phí cuối cho đơn này.
                      </span>

                      <Button
                        variant="outlined"
                        onClick={() => navigate(`/orders/${order.orderId}/payments/history`)}
                      >
                        Xem lịch sử thanh toán
                      </Button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
