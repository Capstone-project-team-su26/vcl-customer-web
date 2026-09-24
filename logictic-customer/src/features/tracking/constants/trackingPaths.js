/**
 * Đường dẫn màn theo dõi đơn.
 *
 * Từ đợt gộp IA, màn "Theo dõi đơn hàng" riêng không còn: hành trình là MỘT TAB của
 * trang chi tiết đơn `/orders/:orderId/hanh-trinh`, và danh sách theo dõi nhập vào
 * danh sách đơn ký gửi `/orders/ky-gui`.
 *
 * File này giữ lại vì các khối của settlement / delivery đang import theo đường dẫn cũ,
 * nhưng KHÔNG còn định nghĩa gì của riêng nó — chỉ xuất lại bảng đường dẫn của feature
 * "orders" để hai nơi không bao giờ lệch nhau. Code mới hãy import thẳng
 * `@features/orders/constants/orderPaths`.
 */
export {
  CONSIGNMENT_ORDERS_PATH,
  ORDER_TABS,
  orderDetailPath,
} from "@features/orders/constants/orderPaths";
