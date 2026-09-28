/* =========================================================
   orderTodoRows.js — MỘT nguồn cho hai con số trên mỗi mục menu đơn hàng:

     - Số ĐỎ  = đơn đang CHỜ BẠN (khách) xử lý   → isWaitingOnCustomer / countWaitingOnCustomer
     - Số XÁM = đơn ĐANG CHẠY, VCL đang xử lý     → isInProgressForVcl  / countInProgress

   Các chỗ hiện những con số này phải đọc từ đây, không tự đếm riêng:
     - dòng tô cam trên danh sách đơn (OrderList),
     - câu tóm tắt "N đơn đang chờ bạn xử lý" trên danh sách,
     - hai số trên mục menu "Đơn ký gửi" / "Đơn mua hộ" (useOrderTodoCounts).

   Trước đây badge đếm riêng (chỉ đơn QUOTATION_SENT) còn danh sách đếm mọi việc khách
   phải bấm (báo giá, cọc, đợt cuối, bổ sung thông tin, chọn cách nhận hàng...), nên cùng
   một khách thấy menu ghi 4 mà danh sách ghi 7. Và đơn vừa tạo (chờ VCL duyệt/báo giá)
   không hiện gì trên menu — khách tưởng đơn chưa được gửi.

   Cả hai định nghĩa đọc cùng MỘT trường: todo.tone mà OrderList.helpers gán cho mỗi dòng
   (quyết định cả màu dòng lẫn chữ "việc cần làm"):
     - "action" → chờ khách (dòng tô cam)            → số đỏ
     - "wait"   → VCL/hệ thống đang làm (đơn vừa tạo, đang báo giá, đang xử lý, đang
                  vận chuyển, đang giao...)          → số xám
     - "done"   → hoàn tất / huỷ / từ chối           → không có badge, chỉ vào "tổng"
   Mỗi dòng chỉ có một tone nên ba tập KHÔNG bao giờ chồng nhau, và phủ kín:
   đỏ + xám + đã xong = tổng số đơn (tooltip menu và câu tóm tắt đầu danh sách ghi đủ ba).

   Đếm trên TOÀN BỘ đơn của khách: đi hết mọi trang của API danh sách chứ không dừng ở
   trang đầu.

   ĐƠN KHO PUR-…-n (backend sinh khi VCL đặt nhà cung cấp cho yêu cầu mua hộ, OrderType =
   PURCHASE) nằm chung bảng với đơn ký gửi nhưng là việc của ĐƠN MUA HỘ:
     - "Đơn ký gửi": getConsignmentsApi luôn gửi orderType=CONSIGNMENT và tự lọc lại
       (lưới an toàn cho backend cũ) → không bao giờ có đơn kho PUR;
     - "Đơn mua hộ": khoản tất toán Sale đã phát hành cho đơn kho PUR gắn vào dòng yêu cầu
       mua hộ sở hữu nó (tone "action" → số đỏ Đơn mua hộ).
   Hai loại đơn vì vậy không đếm trùng một đơn kho nào.
   ========================================================= */

/* Import sâu: chỉ cần hàm gọi danh sách, barrel kéo theo cả các trang (CSS toàn cục). */
import { getConsignmentsApi } from "@features/consignment/api/consignmentApi";
import { getPurchaseRequestsApi } from "@features/purchase/api/purchaseRequestApi";
import { getAwaitingSettlementApi } from "@features/settlement/api/settlementApi";

import { ORDER_KINDS } from "@features/orders/constants/orderPaths";
import {
  groupPurchaseSettlementsByRequest,
  sortByNewest,
  toConsignmentRow,
  toPurchaseRow,
} from "@features/orders/pages/OrderList/OrderList.helpers";

/* Khách thường chỉ có vài chục đơn: một trang là đủ, nhưng vẫn đi tiếp nếu còn trang. */
const PAGE_SIZE = 100;

/* Chặn vòng lặp nếu backend trả totalPages sai — 50 × 100 đơn là quá đủ cho một khách. */
const MAX_PAGES = 50;

const readItems = (response) => {
  const body = response?.data ?? response;

  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.items)) return body.data.items;

  return [];
};

/**
 * Gọi hết mọi trang. Dựa vào totalPages backend trả (tính theo pageSize backend thật sự
 * dùng), không dựa vào "trang ít hơn PAGE_SIZE dòng" — backend có giới hạn pageSize thấp
 * hơn thì cách đó dừng sớm và đếm thiếu.
 */
const fetchAllPages = async (fetchPage) => {
  const items = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await fetchPage(page);
    const pageItems = readItems(response);

    items.push(...pageItems);

    const totalPages = Number(response?.totalPages) || 1;
    if (pageItems.length === 0 || page >= totalPages) break;
  }

  return items;
};

const settledItems = (result) =>
  result.status === "fulfilled" && Array.isArray(result.value) ? result.value : [];

/**
 * Tải toàn bộ đơn của một loại và quy về dòng danh sách (kèm việc khách cần làm).
 * Lỗi của API danh sách được ném ra; lỗi của danh sách chờ tất toán thì bỏ qua (dòng
 * vẫn hiện, chỉ thiếu số tiền đợt cuối).
 *
 * @param {"ky-gui" | "mua-ho"} kind
 * @param {{ signal?: AbortSignal }} [options]
 */
export const loadOrderRows = async (kind, { signal } = {}) => {
  if (kind === ORDER_KINDS.purchase) {
    const [listResult, settlementResult] = await Promise.allSettled([
      fetchAllPages((page) => getPurchaseRequestsApi(page, PAGE_SIZE, { signal })),
      /* Đơn kho PUR đã về VN chờ khách tất toán — việc của đơn mua hộ, xem đầu file. */
      getAwaitingSettlementApi({ signal }),
    ]);

    if (listResult.status === "rejected") throw listResult.reason;

    const requests = listResult.value;
    const settlementsByRequestId = groupPurchaseSettlementsByRequest(
      settledItems(settlementResult),
      requests,
    );

    return sortByNewest(requests.map((item) => toPurchaseRow(item, settlementsByRequestId)));
  }

  const [listResult, settlementResult] = await Promise.allSettled([
    /* getConsignmentsApi luôn gửi orderType=CONSIGNMENT và lọc bỏ đơn kho PUR — xem đầu file. */
    fetchAllPages((page) =>
      getConsignmentsApi({ params: { pageNumber: page, pageSize: PAGE_SIZE }, signal }),
    ),
    /* Khoản đợt cuối Sale đã phát hành — để dòng đơn ghi rõ số tiền phải trả. */
    getAwaitingSettlementApi({ signal }),
  ]);

  if (listResult.status === "rejected") throw listResult.reason;

  /* Chỉ khớp theo orderId của đơn ký gửi đã tải, nên dòng tất toán của đơn kho PUR ở đây
     không bao giờ được dùng — nó được đếm bên "Đơn mua hộ". */
  const dueByOrderId = new Map(
    settledItems(settlementResult).map((item) => [String(item?.orderId), item]),
  );

  return sortByNewest(listResult.value.map((item) => toConsignmentRow(item, dueByOrderId)));
};

/* Tone do OrderList.helpers gán — xem chú thích đầu file. */
const TONE_WAITING_ON_CUSTOMER = "action";
const TONE_FINISHED = "done";

/** Dòng này đang chờ khách bấm một việc (dòng tô cam). */
export const isWaitingOnCustomer = (row) => row?.todo?.tone === TONE_WAITING_ON_CUSTOMER;

/** Đơn đã hoàn tất / đã huỷ / bị từ chối — không vào số đỏ lẫn số xám. */
export const isFinishedOrder = (row) => row?.todo?.tone === TONE_FINISHED;

/**
 * Đơn đang chạy, chờ VCL/hệ thống (chưa hoàn tất, chưa huỷ, không phải việc của khách):
 * đơn vừa tạo chờ duyệt, đang lên báo giá, đang mua/gom hàng, đang vận chuyển, đang giao...
 *
 * Định nghĩa là "không phải action, không phải done" chứ không so đúng "wait": dòng có tone
 * lạ/thiếu (dữ liệu hỏng) vẫn rơi vào nhóm này — giống nhánh default của hai hàm resolve…Todo
 * trong OrderList.helpers (trạng thái lạ → "VCL đang xử lý đơn"). Nhờ vậy ba nhóm luôn phủ
 * kín: đỏ + xám + đã xong = tổng số đơn, không đơn nào lọt ra ngoài.
 */
export const isInProgressForVcl = (row) =>
  Boolean(row) && !isWaitingOnCustomer(row) && !isFinishedOrder(row);

const countRows = (rows, predicate) =>
  Array.isArray(rows) ? rows.filter(predicate).length : 0;

/** Số đơn đang chờ khách xử lý trong một tập dòng (số đỏ). */
export const countWaitingOnCustomer = (rows) => countRows(rows, isWaitingOnCustomer);

/** Số đơn VCL đang xử lý trong một tập dòng (số xám). */
export const countInProgress = (rows) => countRows(rows, isInProgressForVcl);

/** Số đơn đã xong / đã huỷ trong một tập dòng (không có badge). */
export const countFinished = (rows) => countRows(rows, isFinishedOrder);

/**
 * Mọi con số của một tập dòng — dạng dữ liệu mà badge menu và câu tóm tắt đầu danh sách
 * cùng dùng. total = waiting + inProgress + finished (ba nhóm rời nhau, phủ kín).
 * @returns {{ waiting: number, inProgress: number, finished: number, total: number }}
 */
export const summarizeOrderCounts = (rows) => ({
  waiting: countWaitingOnCustomer(rows),
  inProgress: countInProgress(rows),
  finished: countFinished(rows),
  total: countRows(rows, Boolean),
});

/* ---------------------------------------------------------- *
 * Đồng bộ badge với danh sách vừa tải                         *
 * ---------------------------------------------------------- */

const ORDER_TODO_COUNT_EVENT = "vcl:order-todo-count";
const ORDER_COUNTS_REFRESH_EVENT = "vcl:order-counts-refresh";

const isCount = (value) => Number.isFinite(value) && value >= 0;

/**
 * Danh sách đơn vừa tải xong (kể cả bấm "Tải lại") thì báo hai con số của nó cho badge
 * menu, để hai chỗ luôn cùng một bản dữ liệu, không chờ badge tự tải lại.
 *
 * @param {"ky-gui" | "mua-ho"} kind
 * @param {{ waiting: number, inProgress: number, finished: number, total: number }} counts
 *   thường là summarizeOrderCounts(rows)
 */
export const publishOrderTodoCount = (kind, { waiting, inProgress, finished, total } = {}) => {
  globalThis.window?.dispatchEvent?.(
    new globalThis.CustomEvent(ORDER_TODO_COUNT_EVENT, {
      detail: { kind, waiting, inProgress, finished, total },
    }),
  );
};

/** @returns {() => void} hàm huỷ đăng ký */
export const subscribeOrderTodoCount = (listener) => {
  const handler = (event) => {
    const { kind, waiting, inProgress, finished, total } = event?.detail || {};
    if (
      Object.values(ORDER_KINDS).includes(kind) &&
      [waiting, inProgress, finished, total].every(isCount)
    ) {
      listener({ kind, waiting, inProgress, finished, total });
    }
  };

  globalThis.window?.addEventListener?.(ORDER_TODO_COUNT_EVENT, handler);
  return () => globalThis.window?.removeEventListener?.(ORDER_TODO_COUNT_EVENT, handler);
};

/**
 * Yêu cầu badge menu tải lại ngay — gọi sau khi khách vừa tạo đơn (ký gửi / mua hộ)
 * thành công, để số xám tăng ngay thay vì chờ lần làm mới định kỳ.
 */
export const requestOrderCountsRefresh = () => {
  globalThis.window?.dispatchEvent?.(new globalThis.CustomEvent(ORDER_COUNTS_REFRESH_EVENT));
};

/** @returns {() => void} hàm huỷ đăng ký */
export const subscribeOrderCountsRefresh = (listener) => {
  const handler = () => listener();

  globalThis.window?.addEventListener?.(ORDER_COUNTS_REFRESH_EVENT, handler);
  return () => globalThis.window?.removeEventListener?.(ORDER_COUNTS_REFRESH_EVENT, handler);
};
