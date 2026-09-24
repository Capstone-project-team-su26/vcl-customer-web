import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Spin } from "antd";
import {
  CheckCircleOutlined,
  CustomerServiceOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
  RightOutlined,
  SolutionOutlined,
  ShoppingOutlined,
  UnorderedListOutlined,
  WalletOutlined,
} from "@ant-design/icons";

import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";
import { formatVnd } from "@shared/utils/formatNumber";

/* Import sâu: chỉ cần hàm gọi danh sách, barrel kéo theo cả các trang (CSS toàn cục). */
import { getConsignmentsApi } from "@features/consignment/api/consignmentApi";
import { normalizeOrderStatus } from "@features/consignment/constants/orderStatus";
import { getAwaitingSettlementApi } from "@features/settlement/api/settlementApi";

import {
  CONSIGNMENT_ORDERS_PATH,
  CREATE_ORDER_TABS,
  ORDER_KINDS,
  PURCHASE_ORDERS_PATH,
  createOrderPath,
  orderListPath,
} from "@features/orders/constants/orderPaths";
import { ORDER_STAGES } from "@features/orders/pages/OrderList/OrderList.helpers";

import "./Dashboard.css";

const PAGE_SIZE = 100;

const readItems = (response) => {
  const body = response?.data ?? response;

  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.items)) return body.data.items;

  return [];
};

const EMPTY_SUMMARY = {
  quotationCount: 0,
  paymentCount: 0,
  paymentAmount: 0,
  deliveredCount: 0,
};

/**
 * Gom danh sách đơn ký gửi + hàng chờ tất toán thành 3 con số "việc cần làm".
 *
 * Tiền phải trả lấy theo đợt Sale ĐÃ phát hành (awaiting-settlement) vì chỉ khoản đó mới
 * có số cụ thể; đơn đang chờ cọc / chờ tất toán mà Sale chưa phát hành thì vẫn đếm vào
 * số đơn nhưng không cộng tiền — thà thiếu tiền còn hơn hiện một con số sai.
 */
const buildSummary = (consignments, settlements) => {
  const summary = { ...EMPTY_SUMMARY };
  const payableOrderIds = new Set();

  for (const item of settlements) {
    if (Number(item?.pendingPaymentAmount) > 0) {
      payableOrderIds.add(String(item.orderId));
      summary.paymentAmount += Number(item.pendingPaymentAmount);
    }
  }

  for (const item of consignments) {
    const status = normalizeOrderStatus(item?.status) || "";

    if (status === "QUOTATION_SENT") summary.quotationCount += 1;
    if (status === "DELIVERED") summary.deliveredCount += 1;
    if (status === "WAITING_DEPOSIT" || status === "WAITING_PAYMENT") {
      payableOrderIds.add(String(item?.orderId));
    }
  }

  summary.paymentCount = payableOrderIds.size;

  return summary;
};

/**
 * Bảng điều khiển = danh sách VIỆC CẦN LÀM, không phải bảng thống kê.
 *
 * Bản cũ vẽ đủ thứ số liệu tổng quan nhưng không trả lời được câu khách thật sự hỏi khi
 * vừa đăng nhập: "hôm nay tôi phải làm gì?". Giờ chỉ còn 3 thẻ đếm, bấm vào là mở thẳng
 * danh sách đơn đã lọc sẵn đúng việc đó.
 */
export default function Dashboard() {
  const navigate = useNavigate();

  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({
    key: null,
    summary: EMPTY_SUMMARY,
    error: "",
  });

  /* Khoá yêu cầu thay cho cờ `loading` riêng: state chỉ đổi trong callback của promise,
     không setState thẳng trong thân effect. */
  const loading = state.key !== refreshKey;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    Promise.allSettled([
      getConsignmentsApi({
        params: { pageNumber: 1, pageSize: PAGE_SIZE },
        signal,
      }),
      getAwaitingSettlementApi({ signal }),
    ]).then(([consignmentResult, settlementResult]) => {
      if (signal.aborted) return;

      if (
        consignmentResult.status === "rejected" &&
        isCanceledError(consignmentResult.reason)
      ) {
        return;
      }

      setState({
        key: refreshKey,
        summary: buildSummary(
          consignmentResult.status === "fulfilled"
            ? readItems(consignmentResult.value)
            : [],
          settlementResult.status === "fulfilled" ? settlementResult.value : [],
        ),
        error:
          consignmentResult.status === "rejected"
            ? getApiErrorMessage(
                consignmentResult.reason,
                "Không tải được việc cần làm của bạn.",
              )
            : "",
      });
    });

    return () => controller.abort();
  }, [refreshKey]);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  const { summary } = state;

  const cards = [
    {
      key: "quotation",
      icon: <SolutionOutlined />,
      tone: "amber",
      count: summary.quotationCount,
      title: "Báo giá chờ bạn xác nhận",
      hint: "Báo giá có hạn hiệu lực — để quá hạn là phải báo giá lại từ đầu.",
      emptyHint: "Không có báo giá nào đang chờ bạn.",
      to: orderListPath({
        kind: ORDER_KINDS.consignment,
        stage: ORDER_STAGES.awaitingQuotation,
      }),
    },
    {
      key: "payment",
      icon: <WalletOutlined />,
      tone: "rose",
      count: summary.paymentCount,
      title: "Khoản chờ bạn thanh toán",
      hint:
        summary.paymentAmount > 0
          ? `Tổng đã chốt: ${formatVnd(summary.paymentAmount)}`
          : "Nhân viên đang chốt số tiền cuối cho các đơn này.",
      emptyHint: "Bạn không còn khoản nào phải trả.",
      to: orderListPath({
        kind: ORDER_KINDS.consignment,
        stage: ORDER_STAGES.awaitingPayment,
      }),
    },
    {
      key: "delivered",
      icon: <CheckCircleOutlined />,
      tone: "emerald",
      count: summary.deliveredCount,
      title: "Đơn chờ bạn xác nhận đã nhận",
      hint: "Xác nhận sớm để VCL chốt đơn; khiếu nại chỉ mở trong 3 ngày sau khi giao.",
      emptyHint: "Không có đơn nào chờ bạn xác nhận.",
      to: orderListPath({
        kind: ORDER_KINDS.consignment,
        stage: ORDER_STAGES.delivered,
      }),
    },
  ];

  const shortcuts = [
    {
      key: "create-consignment",
      icon: <PlusCircleOutlined />,
      label: "Tạo đơn ký gửi",
      to: createOrderPath(CREATE_ORDER_TABS.consignment),
    },
    {
      key: "create-purchase",
      icon: <PlusCircleOutlined />,
      label: "Tạo đơn mua hộ",
      to: createOrderPath(CREATE_ORDER_TABS.purchase),
    },
    {
      key: "consignment-orders",
      icon: <UnorderedListOutlined />,
      label: "Xem đơn ký gửi",
      to: CONSIGNMENT_ORDERS_PATH,
    },
    {
      key: "purchase-orders",
      icon: <ShoppingOutlined />,
      label: "Xem đơn mua hộ",
      to: PURCHASE_ORDERS_PATH,
    },
    {
      key: "cskh",
      icon: <CustomerServiceOutlined />,
      label: "Trò chuyện với CSKH",
      to: "/customer-service-chat",
    },
  ];

  return (
    <div className="todo-dashboard">
      <header className="todo-dashboard__head">
        <div>
          <h2>Việc cần làm</h2>
          <p>
            Ba việc dưới đây đang chờ bạn. Bấm vào thẻ là mở thẳng danh sách đơn đã lọc
            sẵn đúng việc đó.
          </p>
        </div>

        <button type="button" className="todo-dashboard__reload" onClick={reload}>
          <ReloadOutlined />
          Tải lại
        </button>
      </header>

      {state.error ? (
        <Alert type="error" showIcon message={state.error} />
      ) : null}

      {loading ? (
        <div className="todo-dashboard__loading">
          <Spin size="large" />
        </div>
      ) : (
        <div className="todo-dashboard__cards">
          {cards.map((card) => (
            <button
              key={card.key}
              type="button"
              className={`todo-card todo-card--${card.tone} ${
                card.count > 0 ? "is-due" : ""
              }`}
              onClick={() => navigate(card.to)}
            >
              <span className="todo-card__icon">{card.icon}</span>

              <span className="todo-card__body">
                <strong className="todo-card__count">{card.count}</strong>
                <span className="todo-card__title">{card.title}</span>
                <small className="todo-card__hint">
                  {card.count > 0 ? card.hint : card.emptyHint}
                </small>
              </span>

              <RightOutlined className="todo-card__arrow" />
            </button>
          ))}
        </div>
      )}

      {/* Nói thẳng phạm vi con số: luồng mua hộ phía FE còn chạy dữ liệu mẫu nên không
          được cộng vào đây, kẻo khách tưởng đơn mua hộ của mình đã được tính. */}
      <p className="todo-dashboard__note">
        Ba con số trên đếm đơn <strong>ký gửi</strong> lấy từ hệ thống thật. Đơn mua hộ
        hiện còn chạy dữ liệu mẫu nên chưa được tính vào đây — bạn xem chúng ở{" "}
        <button
          type="button"
          className="todo-dashboard__link"
          onClick={() => navigate(PURCHASE_ORDERS_PATH)}
        >
          mục Đơn mua hộ
        </button>
        .
      </p>

      <section className="todo-dashboard__shortcuts">
        <h3>Lối tắt</h3>

        <div className="todo-dashboard__shortcut-row">
          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.key}
              type="button"
              className="todo-shortcut"
              onClick={() => navigate(shortcut.to)}
            >
              {shortcut.icon}
              {shortcut.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
