// Module "policies" gom toàn bộ các trang chính sách công khai (quy định chung, vận chuyển,
// thanh toán, hủy/hoàn, bảo hiểm, miễn trừ, bảo mật, đặt hàng). Barrel này là cửa duy nhất
// ra ngoài, để router chỉ phụ thuộc vào tên trang chứ không phụ thuộc đường dẫn thư mục bên trong.
export { default as GeneralRulesPolicy } from "./pages/GeneralRulesPolicy/GeneralRulesPolicy";
export { default as ShippingPolicy } from "./pages/ShippingPolicy/ShippingPolicy";
export { default as PaymentPolicy } from "./pages/PaymentPolicy/PaymentPolicy";
export { default as CancellationRefundPolicy } from "./pages/CancellationRefundPolicy/CancellationRefundPolicy";
export { default as CargoInsurancePolicy } from "./pages/CargoInsurancePolicy/CargoInsurancePolicy";
export { default as LiabilityDisclaimerPolicy } from "./pages/LiabilityDisclaimerPolicy/LiabilityDisclaimerPolicy";
export { default as PrivacyPolicy } from "./pages/PrivacyPolicy/PrivacyPolicy";
export { default as OrderingPolicy } from "./pages/OrderingPolicy/OrderingPolicy";
