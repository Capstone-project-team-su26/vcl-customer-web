// Module "pricing" sở hữu toàn bộ phần bảng giá công khai: các trang giới thiệu
// biểu phí (mua hộ, ký gửi, vận chuyển quốc tế, phí dịch vụ), công cụ ước tính
// chi phí, và service gọi API quy tắc tính giá.
// Barrel này là cửa duy nhất cho module khác dùng lại, nhờ đó khi cấu trúc thư
// mục bên trong thay đổi thì chỗ import bên ngoài không phải sửa theo.

export { default as BuyForMePricing } from "./pages/BuyForMePricing/BuyForMePricing";
export { default as ConsignmentPricing } from "./pages/ConsignmentPricing/ConsignmentPricing";
export { default as InternationalShippingPricing } from "./pages/InternationalShippingPricing/InternationalShippingPricing";
export { default as PricingCalculator } from "./pages/PricingCalculator/PricingCalculator";
export { default as ServiceFeesPricing } from "./pages/ServiceFeesPricing/ServiceFeesPricing";

// Service export cả object mặc định lẫn từng hàm rời, và cả hai kiểu đều đang
// được dùng ngoài module nên phải giữ lại đủ hai đường import.
export { default as pricingRuleService } from "./api/pricingRuleService";
export * from "./api/pricingRuleService";
