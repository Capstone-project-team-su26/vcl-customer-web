import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { isCanceledError } from "@shared/utils/apiError";
import { ORDER_KINDS } from "@features/orders/constants/orderPaths";
import {
  loadOrderRows,
  subscribeOrderCountsRefresh,
  subscribeOrderTodoCount,
  summarizeOrderCounts,
} from "@features/orders/data/orderTodoRows";

/**
 * Hai con số của từng loại đơn cho mục menu bên trái:
 *   - waiting    (số ĐỎ)  = đơn đang CHỜ KHÁCH xử lý;
 *   - inProgress (số XÁM) = đơn đang chạy, VCL/hệ thống đang xử lý (đơn vừa tạo, đang báo
 *     giá, đang xử lý, đang vận chuyển...).
 * Hai tập không chồng nhau; đơn hoàn tất/huỷ không vào số nào. Định nghĩa nằm ở
 * features/orders/data/orderTodoRows.js — cùng nguồn với câu "N đơn đang chờ bạn xử lý"
 * và các dòng tô cam của trang danh sách, đếm trên toàn bộ đơn.
 *
 * Làm mới khi:
 *   - đổi trang (khách vừa xác nhận báo giá / thanh toán xong quay ra là số giảm ngay);
 *   - vừa tạo đơn xong (trang tạo đơn gọi requestOrderCountsRefresh);
 *   - cửa sổ được focus lại (vừa trả tiền ở tab cổng thanh toán rồi quay về);
 *   - định kỳ 3 phút (tab mở sẵn vẫn thấy báo giá mới);
 *   - trang danh sách vừa tải / bấm "Tải lại" (nhận thẳng con số của danh sách).
 *
 * @returns {{ "ky-gui": { waiting: number, inProgress: number },
 *             "mua-ho": { waiting: number, inProgress: number } }}
 */

const REFRESH_INTERVAL_MS = 3 * 60 * 1000;

/* Focus liên tục (bấm qua lại giữa hai cửa sổ) không cần tải lại mỗi lần. */
const FOCUS_MIN_GAP_MS = 10 * 1000;

const KINDS = [ORDER_KINDS.consignment, ORDER_KINDS.purchase];

const EMPTY_KIND_COUNTS = Object.freeze({ waiting: 0, inProgress: 0 });

const EMPTY_COUNTS = Object.freeze({
  [ORDER_KINDS.consignment]: EMPTY_KIND_COUNTS,
  [ORDER_KINDS.purchase]: EMPTY_KIND_COUNTS,
});

const sameCounts = (a, b) => a?.waiting === b?.waiting && a?.inProgress === b?.inProgress;

export const useOrderTodoCounts = () => {
  const { pathname } = useLocation();
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [refreshTick, setRefreshTick] = useState(0);
  const lastLoadAtRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    Promise.allSettled(KINDS.map((kind) => loadOrderRows(kind, { signal }))).then(
      (results) => {
        if (signal.aborted) return;

        lastLoadAtRef.current = Date.now();

        // Hai nguồn độc lập: một cái hỏng thì giữ số cũ của nó, bên kia vẫn cập nhật.
        setCounts((current) => {
          const next = { ...current };

          results.forEach((result, index) => {
            if (result.status !== "fulfilled") return;

            const kind = KINDS[index];
            const summary = summarizeOrderCounts(result.value);
            if (!sameCounts(current[kind], summary)) next[kind] = summary;
          });

          return KINDS.every((kind) => next[kind] === current[kind]) ? current : next;
        });

        results
          .filter((r) => r.status === "rejected" && !isCanceledError(r.reason))
          .forEach((r) =>
            console.error("Không đếm được đơn trên menu:", r.reason?.message || r.reason),
          );
      },
    );

    return () => controller.abort();
  }, [pathname, refreshTick]);

  useEffect(() => {
    const refresh = () => setRefreshTick((tick) => tick + 1);

    const handleFocus = () => {
      if (Date.now() - lastLoadAtRef.current >= FOCUS_MIN_GAP_MS) refresh();
    };

    const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", handleFocus);

    const unsubscribeCounts = subscribeOrderTodoCount(({ kind, waiting, inProgress }) => {
      lastLoadAtRef.current = Date.now();
      setCounts((current) =>
        sameCounts(current[kind], { waiting, inProgress })
          ? current
          : { ...current, [kind]: { waiting, inProgress } },
      );
    });

    const unsubscribeRefresh = subscribeOrderCountsRefresh(refresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      unsubscribeCounts();
      unsubscribeRefresh();
    };
  }, []);

  return counts;
};

export default useOrderTodoCounts;
