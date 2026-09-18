import { EMPTY_PACKAGE_SERVICES } from "@features/purchase/components/PackageOptionalServicesS1/PackageOptionalServicesS1";

/*
 * Tách dữ liệu tĩnh của trang mua hộ ra khỏi component để phần JSX chỉ còn
 * phần hiển thị, đồng thời tránh khởi tạo lại các object mặc định mỗi lần render.
 */

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_ITEM = 5;

export const INITIAL_FORM = {
  route: "",
  shippingOption: "",
  receiverName: "",
  receiverPhone: "",
  selectedDeliveryAddress: "",
  optionalServices: {
    ...EMPTY_PACKAGE_SERVICES,
  },
  generalNote: "",
};

export const INITIAL_ADDRESS_SELECT = {
  provinceCode: "",
  districtCode: "",
  wardCode: "",
};
