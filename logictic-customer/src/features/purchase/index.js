// Module "purchase" sở hữu toàn bộ luồng mua hộ: khách tạo yêu cầu mua hộ, theo dõi
// danh sách yêu cầu đang chờ, xem chi tiết, rồi duyệt/từ chối/thanh toán báo giá.
// Barrel này là cửa duy nhất cho router và các feature khác, nhờ đó cấu trúc thư mục
// bên trong còn tự do thay đổi mà không kéo theo hàng loạt chỗ import bên ngoài.

// Ba màn còn lại. ConsignmentBuyOrder là form đặt mua hộ (nhúng trong /create-order);
// hai màn chi tiết gắn vào /orders/mua-ho/:requestId và .../bao-gia.
// Hai màn danh sách cũ (PurchaseRequestPendingList, BuyForMeQuotationList) đã xoá —
// danh sách đơn duy nhất /orders?type=mua-ho thay cả hai.
export { default as ConsignmentBuyOrder } from "./pages/ConsignmentBuyOrder/ConsignmentBuyOrder";
export { default as PurchaseRequestDetail } from "./pages/PurchaseRequestDetail/PurchaseRequestDetail";
export { default as BuyForMeQuotationListDetail } from "./pages/BuyForMeQuotationListDetail/BuyForMeQuotationListDetail";

// Hai khối dựng nên form đặt mua hộ. Chúng nằm ở components/ chứ không lồng trong
// trang nên vẫn thuộc mặt công khai của module, dùng lại được cho luồng mua hộ khác.
export { default as ConsignmentBuyOrderConfirm } from "./components/ConsignmentBuyOrderConfirm/ConsignmentBuyOrderConfirm";

// Giữ nguyên tên có hậu tố S1: bản mua hộ này khác bản PackageOptionalServices bên
// consignment, để trùng tên là hai module đá nhau khi cùng import vào một chỗ.
export { default as PackageOptionalServicesS1 } from "./components/PackageOptionalServicesS1/PackageOptionalServicesS1";
// Giá trị rỗng mặc định của khối dịch vụ, trang cha cần để khởi tạo state form.
export { EMPTY_PACKAGE_SERVICES } from "./components/PackageOptionalServicesS1/PackageOptionalServicesS1";

// Toàn bộ hàm gọi API mua hộ đều là public: dashboard, chat, lịch sử và kho đều dùng lại.
// File này có export default nhưng đó chỉ là bí danh của createPurchaseRequestApi
// (đã nằm trong export * bên dưới), nên không tạo thêm tên thứ hai cho cùng một hàm.
export * from "./api/purchaseRequestApi";
