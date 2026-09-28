/**
 * BẢNG ĐIỀU KHIỂN CỦA KHÁCH = danh sách VIỆC CẦN LÀM, không phải bảng thống kê.
 *
 * Trả lời đúng một câu khách hỏi khi vừa đăng nhập: "hôm nay tôi phải làm gì?".
 * Việc nào còn phải làm nằm trên, việc đã xong xuống dưới dạng thẻ mờ, hàng đang chạy
 * gom thành một dải nhỏ để khách biết đơn không nằm im.
 *
 * Số liệu lấy từ MỘT endpoint (`/api/customers/me/dashboard`) gộp cả ký gửi lẫn mua hộ.
 * Bản cũ gọi hai endpoint danh sách rồi tự cộng ở trình duyệt: kéo cả trăm đơn về máy
 * khách, bỏ sót toàn bộ luồng mua hộ, và thẻ "chờ xác nhận đã nhận" luôn bằng 0 vì nó đi
 * tìm đơn ở trạng thái mà hệ thống không bao giờ ghi vào đơn.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Spin } from "antd";
import {
  CustomerServiceOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
  ShoppingOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";

import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";

import { getCustomerDashboardApi } from "@features/dashboard/api/dashboardApi";
import {
  CONSIGNMENT_ORDERS_PATH,
  CREATE_ORDER_TABS,
  PURCHASE_ORDERS_PATH,
  createOrderPath,
} from "@features/orders/constants/orderPaths";

import DashboardCharts from "@features/dashboard/components/DashboardCharts/DashboardCharts";
import { PROGRESS_STAGES } from "./Dashboard.helpers";
import "./Dashboard.css";

const EMPTY_BOARD = {
  actions: [],
  inProgress: {},
  totalAmountDue: 0,
  totalRefundIncoming: 0,
  stats: null,
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({ key: null, board: EMPTY_BOARD, error: "" });

  /* Khoá yêu cầu thay cho cờ `loading` riêng: state chỉ đổi trong callback của promise. */
  const loading = state.key !== refreshKey;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getCustomerDashboardApi({ signal })
      .then((board) => {
        if (signal.aborted) return;
        setState({ key: refreshKey, board, error: "" });
      })
      .catch((error) => {
        if (signal.aborted || isCanceledError(error)) return;

        setState({
          key: refreshKey,
          board: EMPTY_BOARD,
          error: getApiErrorMessage(error, "Không tải được việc cần làm của bạn."),
        });
      });

    return () => controller.abort();
  }, [refreshKey]);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  const { board } = state;
  const progress = board.inProgress || {};

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
          <h2>Bảng điều khiển</h2>
          <p>
            {loading
              ? "Đang đọc tình hình đơn của bạn…"
              : progress.total > 0
                ? `${progress.total} đơn đang đi tiếp. Việc cần bạn xử lý xem ở mục Đơn ký gửi, Đơn mua hộ và Thanh toán.`
                : "Chưa có đơn nào đang chạy. Tạo đơn mới ở lối tắt bên dưới."}
          </p>
        </div>

        <button type="button" className="todo-dashboard__reload" onClick={reload}>
          <ReloadOutlined />
          Tải lại
        </button>
      </header>

      {state.error ? <Alert type="error" showIcon message={state.error} /> : null}

      {loading ? (
        <div className="todo-dashboard__loading">
          <Spin size="large" />
        </div>
      ) : (
        <>
          <section className="todo-progress">
            <div className="todo-progress__head">
              <h3>Hàng đang chạy</h3>
              <p>
                {progress.total > 0
                  ? `${progress.total} đơn đang đi tiếp, bạn không phải làm gì.`
                  : "Chưa có đơn nào đang chạy."}
              </p>
            </div>

            <div className="todo-progress__row">
              {PROGRESS_STAGES.map((stage) => (
                <div
                  key={stage.key}
                  className={`todo-stage ${progress[stage.key] > 0 ? "is-active" : ""}`}
                >
                  <strong>{progress[stage.key] ?? 0}</strong>
                  <span>{stage.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Thống kê để nhìn lại — đặt sau việc cần làm và hàng đang chạy. */}
          <DashboardCharts stats={board.stats} />
        </>
      )}

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
