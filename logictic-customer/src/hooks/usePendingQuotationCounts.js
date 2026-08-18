import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";

import { getConsignmentsApi } from "../api/OrderApi/consignmentApi";
import { getPurchaseRequestsApi } from "../api/PurchaseAPI/purchaseRequestApi";

/**
 * Đếm số kiện đang chờ khách xác nhận báo giá, cho menu bên trái hiện số.
 *
 * Trước đây khách phải tự bấm vào mới biết có báo giá mới hay không — báo giá có hạn hiệu lực
 * nên để lâu là hết hạn, mất luôn đơn.
 *
 * Điều kiện đếm bám đúng cái hai màn danh sách đang lọc, để số trên menu không bao giờ lệch với
 * số dòng khách thấy khi bấm vào:
 *   - Ký gửi : đơn ở trạng thái QUOTATION_SENT
 *   - Mua hộ : yêu cầu ở QUOTED hoặc QUOTATION_SENT
 */

/** Tự làm mới định kỳ để khách đang mở sẵn tab vẫn thấy báo giá mới. */
const REFRESH_INTERVAL_MS = 3 * 60 * 1000;

const PAGE_SIZE = 10;

const readItems = (response) => {
  const body = response?.data ?? response;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  return [];
};

const normalizeStatus = (status) =>
  String(status ?? "").trim().toUpperCase();

const isPurchaseQuoted = (status) => {
  const normalized = normalizeStatus(status);
  return normalized === "QUOTED" || normalized === "QUOTATION_SENT";
};

const isCanceled = (error) =>
  error?.name === "CanceledError" ||
  error?.code === "ERR_CANCELED" ||
  error?.name === "AbortError";

/**
 * @returns {{ consignment: number, purchase: number, total: number, refresh: () => void }}
 */
export const usePendingQuotationCounts = () => {
  const [counts, setCounts] = useState({
    consignment: 0,
    purchase: 0,
    total: 0,
  });

  const location = useLocation();
  const controllerRef = useRef(null);

  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    // Hai nguồn độc lập: một cái hỏng thì bên còn lại vẫn hiện số, đừng giấu cả hai.
    const [consignmentResult, purchaseResult] = await Promise.allSettled([
      getConsignmentsApi({
        params: { pageNumber: 1, pageSize: PAGE_SIZE, status: "QUOTATION_SENT" },
        signal: controller.signal,
      }),
      getPurchaseRequestsApi(1, PAGE_SIZE, { signal: controller.signal }),
    ]);

    if (controller.signal.aborted) return;

    setCounts((current) => {
      const consignment =
        consignmentResult.status === "fulfilled"
          ? readItems(consignmentResult.value).length
          : current.consignment;

      const purchase =
        purchaseResult.status === "fulfilled"
          ? readItems(purchaseResult.value).filter((item) =>
              isPurchaseQuoted(item?.status),
            ).length
          : current.purchase;

      return { consignment, purchase, total: consignment + purchase };
    });

    [consignmentResult, purchaseResult]
      .filter((r) => r.status === "rejected" && !isCanceled(r.reason))
      .forEach((r) =>
        console.error("Không đếm được kiện chờ báo giá:", r.reason?.message || r.reason),
      );
  }, []);

  // Tải lại mỗi lần đổi trang: khách vừa chốt xong một báo giá quay ra là số phải giảm ngay,
  // chứ chờ hết chu kỳ 3 phút thì tưởng bấm hụt.
  useEffect(() => {
    load();
  }, [load, location.pathname]);

  useEffect(() => {
    const timer = window.setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
      controllerRef.current?.abort();
    };
  }, [load]);

  return { ...counts, refresh: load };
};

export default usePendingQuotationCounts;
