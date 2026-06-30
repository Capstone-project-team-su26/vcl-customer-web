import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  CheckOutlined,
  CloseOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  LoadingOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";

import { Switch } from "antd";

import "./ConsignmentOrder.css";

import AuthNotify from "../../../../utils/AuthNotify";
import { createConsignmentApi } from "../../../../api/OrderApi/consignmentApi";
import { uploadPackageImage } from "../../../../api/OrderApi/imageUploadApi";
import { compressImage } from "../../../../utils/compressImage";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ROUTE_OPTIONS = [
  {
    value: "TQ-VN",
    label: "Trung Quốc - Việt Nam (TQ-VN)",
  },
];

const SHIPPING_OPTIONS = [
  {
    value: "Express",
    label: "Hỏa tốc (Express)",
  },
  {
    value: "Standard",
    label: "Tiêu chuẩn (Standard)",
  },
];

const PRODUCT_TYPE_OPTIONS = [
  {
    value: "Electronics",
    label: "Electronics (Thiết bị điện tử)",
  },
  {
    value: "Accessories",
    label: "Accessories (Phụ kiện)",
  },
  {
    value: "Clothes",
    label: "Clothes (Quần áo / Giày dép)",
  },
  {
    value: "Cosmetics",
    label: "Cosmetics (Mỹ phẩm)",
  },
  {
    value: "Others",
    label: "Others (Khác)",
  },
];

const createUniqueId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const createEmptyPackage = () => ({
  id: createUniqueId(),
  productName: "",
  productType: "",
  quantity: "",
  weight: "",
  width: "",
  height: "",
  length: "",
  declaredValue: "",
  trackingCode: "",
  note: "",
  images: [],
});

const createEmptyFormErrors = () => ({
  route: "",
  shippingOption: "",
  receiverName: "",
  receiverPhone: "",
  selectedDeliveryAddress: "",
});

/**
 * Chặn số âm, dấu cộng và ký hiệu số khoa học.
 */
const preventInvalidNumberKeys = (event) => {
  if (["-", "+", "e", "E"].includes(event.key)) {
    event.preventDefault();
  }
};

/**
 * Chỉ giữ số nguyên không âm.
 */
const sanitizeInteger = (rawValue) => {
  return String(rawValue ?? "").replace(/\D/g, "");
};

/**
 * Chỉ giữ số thập phân không âm và tối đa một dấu chấm.
 */
const sanitizeDecimal = (rawValue) => {
  let value = String(rawValue ?? "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  const firstDotIndex = value.indexOf(".");

  if (firstDotIndex !== -1) {
    value =
      value.slice(0, firstDotIndex + 1) +
      value
        .slice(firstDotIndex + 1)
        .replace(/\./g, "");
  }

  if (value.startsWith(".")) {
    value = `0${value}`;
  }

  return value;
};

const FieldError = ({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <div className="field-error-message">
      <ExclamationCircleOutlined />
      <span>{message}</span>
    </div>
  );
};

export default function ConsignmentOrder() {
  const navigate = useNavigate();
  const fileInputRefs = useRef({});
  const packagesRef = useRef([]);

  const [inspectPackage, setInspectPackage] =
    useState(true);

  const [activeLightboxImg, setActiveLightboxImg] =
    useState(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [submitMessage, setSubmitMessage] = useState(
    "Đang chuẩn bị tạo đơn..."
  );

  /*
   * Để trống ban đầu nhằm bắt buộc người dùng chọn.
   */
  const [route, setRoute] = useState("");
  const [shippingOption, setShippingOption] =
    useState("");

  const [receiverName, setReceiverName] =
    useState("");

  const [receiverPhone, setReceiverPhone] =
    useState("");

  /*
   * Không để [""] vì sẽ tạo ra một địa chỉ rỗng.
   */
  const [addressList, setAddressList] = useState([]);

  const [
    selectedDeliveryAddress,
    setSelectedDeliveryAddress,
  ] = useState("");

  const [isAddingAddress, setIsAddingAddress] =
    useState(false);

  const [newAddressInput, setNewAddressInput] =
    useState("");

  const [newAddressError, setNewAddressError] =
    useState("");

  const [packages, setPackages] = useState([
    createEmptyPackage(),
  ]);

  const [formErrors, setFormErrors] = useState(
    createEmptyFormErrors
  );

  const [packageErrors, setPackageErrors] =
    useState({});

  /*
   * Giữ danh sách package mới nhất để dọn preview URL
   * khi component bị unmount.
   */
  useEffect(() => {
    packagesRef.current = packages;
  }, [packages]);

  useEffect(() => {
    return () => {
      packagesRef.current.forEach((pkg) => {
        pkg.images.forEach((image) => {
          if (image.previewUrl) {
            URL.revokeObjectURL(
              image.previewUrl
            );
          }
        });
      });
    };
  }, []);

  const getFieldClassName = (
    baseClassName,
    errorMessage
  ) => {
    return [
      baseClassName,
      errorMessage ? "input-has-error" : "",
    ]
      .filter(Boolean)
      .join(" ");
  };

  const clearFormError = (field) => {
    setFormErrors((previous) => ({
      ...previous,
      [field]: "",
    }));
  };

  const clearPackageError = (
    packageId,
    field
  ) => {
    setPackageErrors((previous) => ({
      ...previous,
      [packageId]: {
        ...(previous[packageId] || {}),
        [field]: "",
      },
    }));
  };

  const setPackageFieldError = (
    packageId,
    field,
    message
  ) => {
    setPackageErrors((previous) => ({
      ...previous,
      [packageId]: {
        ...(previous[packageId] || {}),
        [field]: message,
      },
    }));
  };

  const scrollToFirstError = () => {
    window.setTimeout(() => {
      const firstErrorElement =
        document.querySelector(
          [
            ".input-has-error",
            ".upload-has-error",
            ".address-list-has-error",
          ].join(", ")
        );

      firstErrorElement?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  };

  /* =======================================================
     ADDRESS
     ======================================================= */

  const handleSaveAddress = () => {
    const trimmedAddress =
      newAddressInput.trim();

    if (!trimmedAddress) {
      setNewAddressError(
        "Vui lòng nhập địa chỉ nhận hàng."
      );
      return;
    }

    const addressExists = addressList.some(
      (address) =>
        address.trim().toLowerCase() ===
        trimmedAddress.toLowerCase()
    );

    if (addressExists) {
      setNewAddressError(
        "Địa chỉ này đã có trong danh sách."
      );
      return;
    }

    setAddressList((previous) => [
      ...previous,
      trimmedAddress,
    ]);

    setSelectedDeliveryAddress(trimmedAddress);
    setNewAddressInput("");
    setNewAddressError("");
    setIsAddingAddress(false);

    clearFormError(
      "selectedDeliveryAddress"
    );

    AuthNotify.success(
      "Đã thêm địa chỉ",
      "Địa chỉ nhận hàng mới đã được lưu."
    );
  };

  const handleCancelAddAddress = () => {
    setNewAddressInput("");
    setNewAddressError("");
    setIsAddingAddress(false);
  };

  const handleSelectAddress = (address) => {
    if (isSubmitting || !address?.trim()) {
      return;
    }

    setSelectedDeliveryAddress(address);
    clearFormError(
      "selectedDeliveryAddress"
    );
  };

  const handleReceiverPhoneChange = (event) => {
    const digitsOnly = event.target.value
      .replace(/\D/g, "")
      .slice(0, 10);

    setReceiverPhone(digitsOnly);
    clearFormError("receiverPhone");
  };

  /* =======================================================
     PACKAGE INPUT
     ======================================================= */

  const handleInputChange = (
    packageId,
    field,
    value
  ) => {
    setPackages((previous) =>
      previous.map((pkg) =>
        pkg.id === packageId
          ? {
              ...pkg,
              [field]: value,
            }
          : pkg
      )
    );

    clearPackageError(packageId, field);
  };

  const handleIntegerChange = (
    packageId,
    field,
    rawValue
  ) => {
    handleInputChange(
      packageId,
      field,
      sanitizeInteger(rawValue)
    );
  };

  const handleDecimalChange = (
    packageId,
    field,
    rawValue
  ) => {
    handleInputChange(
      packageId,
      field,
      sanitizeDecimal(rawValue)
    );
  };

  const handleDecimalBlur = (
    packageId,
    field,
    rawValue
  ) => {
    if (!rawValue) {
      return;
    }

    let normalizedValue = rawValue;

    if (normalizedValue.endsWith(".")) {
      normalizedValue =
        normalizedValue.slice(0, -1);
    }

    if (
      normalizedValue !== "" &&
      Number(normalizedValue) >= 0
    ) {
      handleInputChange(
        packageId,
        field,
        normalizedValue
      );
    }
  };

  /* =======================================================
     VALIDATION
     ======================================================= */

  const validateForm = () => {
    const nextFormErrors =
      createEmptyFormErrors();

    const nextPackageErrors = {};

    if (!route) {
      nextFormErrors.route =
        "Vui lòng chọn tuyến hàng.";
    }

    if (!shippingOption) {
      nextFormErrors.shippingOption =
        "Vui lòng chọn phương thức vận chuyển.";
    }

    if (!receiverName.trim()) {
      nextFormErrors.receiverName =
        "Vui lòng nhập tên người nhận.";
    } else if (
      receiverName.trim().length < 2
    ) {
      nextFormErrors.receiverName =
        "Tên người nhận phải có ít nhất 2 ký tự.";
    }

    const normalizedPhone =
      receiverPhone.trim();

    if (!normalizedPhone) {
      nextFormErrors.receiverPhone =
        "Vui lòng nhập số điện thoại.";
    } else if (
      !/^0\d{9}$/.test(normalizedPhone)
    ) {
      nextFormErrors.receiverPhone =
        "Số điện thoại phải có 10 số và bắt đầu bằng số 0.";
    }

    if (!selectedDeliveryAddress.trim()) {
      nextFormErrors.selectedDeliveryAddress =
        "Vui lòng thêm và chọn địa chỉ nhận hàng.";
    }

    packages.forEach((pkg) => {
      const errors = {};

      if (!pkg.productName.trim()) {
        errors.productName =
          "Vui lòng nhập tên sản phẩm.";
      }

      if (!pkg.productType) {
        errors.productType =
          "Vui lòng chọn loại hàng hóa.";
      }

      const quantity = Number(pkg.quantity);

      if (pkg.quantity === "") {
        errors.quantity =
          "Vui lòng nhập số lượng.";
      } else if (
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        errors.quantity =
          "Số lượng phải là số nguyên từ 1 trở lên.";
      }

      const declaredValue = Number(
        pkg.declaredValue
      );

      if (pkg.declaredValue === "") {
        errors.declaredValue =
          "Vui lòng nhập giá trị khai báo.";
      } else if (
        !Number.isFinite(declaredValue) ||
        declaredValue < 0
      ) {
        errors.declaredValue =
          "Giá trị khai báo không được là số âm.";
      }

      const weight = Number(pkg.weight);

      if (pkg.weight === "") {
        errors.weight =
          "Vui lòng nhập cân nặng.";
      } else if (
        !Number.isFinite(weight) ||
        weight <= 0
      ) {
        errors.weight =
          "Cân nặng phải lớn hơn 0.";
      }

      const length = Number(pkg.length);

      if (pkg.length === "") {
        errors.length =
          "Vui lòng nhập chiều dài.";
      } else if (
        !Number.isFinite(length) ||
        length <= 0
      ) {
        errors.length =
          "Chiều dài phải lớn hơn 0.";
      }

      const width = Number(pkg.width);

      if (pkg.width === "") {
        errors.width =
          "Vui lòng nhập chiều rộng.";
      } else if (
        !Number.isFinite(width) ||
        width <= 0
      ) {
        errors.width =
          "Chiều rộng phải lớn hơn 0.";
      }

      const height = Number(pkg.height);

      if (pkg.height === "") {
        errors.height =
          "Vui lòng nhập chiều cao.";
      } else if (
        !Number.isFinite(height) ||
        height <= 0
      ) {
        errors.height =
          "Chiều cao phải lớn hơn 0.";
      }

      if (!pkg.note.trim()) {
        errors.note =
          "Vui lòng nhập ghi chú kiện hàng.";
      }

      if (
        !Array.isArray(pkg.images) ||
        pkg.images.length === 0
      ) {
        errors.images =
          "Vui lòng tải ít nhất 1 ảnh sản phẩm.";
      }

      nextPackageErrors[pkg.id] = errors;
    });

    setFormErrors(nextFormErrors);
    setPackageErrors(nextPackageErrors);

    const hasFormError = Object.values(
      nextFormErrors
    ).some(Boolean);

    const hasPackageError = Object.values(
      nextPackageErrors
    ).some((errors) =>
      Object.values(errors).some(Boolean)
    );

    if (hasFormError || hasPackageError) {
      AuthNotify.warning(
        "Thông tin chưa đầy đủ",
        "Vui lòng kiểm tra các trường được đánh dấu màu đỏ."
      );

      scrollToFirstError();
      return false;
    }

    return true;
  };

  /* =======================================================
     IMAGE
     ======================================================= */

  const handleDropzoneClick = (packageId) => {
    if (isSubmitting) {
      return;
    }

    fileInputRefs.current[
      packageId
    ]?.click();
  };

  const handleFileChange = (
    packageId,
    event
  ) => {
    const files = Array.from(
      event.target.files || []
    );

    if (files.length === 0) {
      return;
    }

    const invalidFile = files.find(
      (file) =>
        !file.type.startsWith("image/")
    );

    if (invalidFile) {
      AuthNotify.warning(
        "File không hợp lệ",
        "Chỉ được tải lên các file hình ảnh."
      );

      event.target.value = "";
      return;
    }

    const oversizedFile = files.find(
      (file) =>
        file.size > MAX_IMAGE_SIZE
    );

    if (oversizedFile) {
      AuthNotify.warning(
        "Ảnh quá lớn",
        `Ảnh "${oversizedFile.name}" vượt quá dung lượng 5MB.`
      );

      event.target.value = "";
      return;
    }

    const newImageObjects = files.map(
      (file) => ({
        id: createUniqueId(),
        fileObj: file,
        previewUrl:
          URL.createObjectURL(file),
      })
    );

    setPackages((previous) =>
      previous.map((pkg) =>
        pkg.id === packageId
          ? {
              ...pkg,
              images: [
                ...pkg.images,
                ...newImageObjects,
              ],
            }
          : pkg
      )
    );

    clearPackageError(
      packageId,
      "images"
    );

    AuthNotify.success(
      "Đã chọn ảnh",
      `Đã thêm ${files.length} ảnh cho kiện hàng.`
    );

    event.target.value = "";
  };

  const handleRemoveImage = (
    event,
    packageId,
    targetId,
    previewUrl
  ) => {
    event.stopPropagation();

    if (isSubmitting) {
      return;
    }

    setPackages((previous) =>
      previous.map((pkg) => {
        if (pkg.id !== packageId) {
          return pkg;
        }

        const remainingImages =
          pkg.images.filter(
            (image) =>
              image.id !== targetId
          );

        if (remainingImages.length === 0) {
          setPackageFieldError(
            packageId,
            "images",
            "Vui lòng tải ít nhất 1 ảnh sản phẩm."
          );
        }

        return {
          ...pkg,
          images: remainingImages,
        };
      })
    );

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (
      activeLightboxImg === previewUrl
    ) {
      setActiveLightboxImg(null);
    }
  };

  const revokePackageImages = (pkg) => {
    pkg.images.forEach((image) => {
      if (image.previewUrl) {
        URL.revokeObjectURL(
          image.previewUrl
        );
      }
    });
  };

  /* =======================================================
     PACKAGE ACTIONS
     ======================================================= */

  const handleAddPackage = () => {
    if (isSubmitting) {
      return;
    }

    setPackages((previous) => [
      ...previous,
      createEmptyPackage(),
    ]);
  };

  const handleDeletePackage = (
    packageId
  ) => {
    if (isSubmitting) {
      return;
    }

    if (packages.length <= 1) {
      AuthNotify.warning(
        "Không thể xóa",
        "Yêu cầu phải có tối thiểu 1 kiện hàng."
      );
      return;
    }

    const targetPackage = packages.find(
      (pkg) => pkg.id === packageId
    );

    if (targetPackage) {
      revokePackageImages(targetPackage);
    }

    setPackages((previous) =>
      previous.filter(
        (pkg) => pkg.id !== packageId
      )
    );

    setPackageErrors((previous) => {
      const nextErrors = {
        ...previous,
      };

      delete nextErrors[packageId];

      return nextErrors;
    });

    delete fileInputRefs.current[
      packageId
    ];
  };

  /* =======================================================
     SUBMIT
     ======================================================= */

  const handleCreateOrder = async () => {
    if (isSubmitting) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const unifiedNote =
        packages
          .map((pkg) => pkg.note.trim())
          .filter(Boolean)
          .join(", ") || "Hàng ký gửi";

      const items = [];

      for (
        let index = 0;
        index < packages.length;
        index += 1
      ) {
        const pkg = packages[index];

        setSubmitMessage(
          `Đang xử lý ảnh kiện ${
            index + 1
          }/${packages.length}...`
        );

        let referenceUrl = null;

        try {
          const firstImage =
            pkg.images[0];

          const compressedFile =
            await compressImage(
              firstImage.fileObj
            );

          referenceUrl =
            await uploadPackageImage(
              compressedFile
            );
        } catch (uploadError) {
          console.error(
            "Upload ảnh thất bại:",
            uploadError
          );

          throw new Error(
            `Không upload được ảnh kiện ${
              index + 1
            }. Vui lòng thử lại hoặc chọn ảnh khác.`
          );
        }

        items.push({
          productName:
            pkg.productName.trim(),

          productType: pkg.productType,

          quantity: Number(pkg.quantity),

          weight: Number(pkg.weight),

          width: Number(pkg.width),

          height: Number(pkg.height),

          length: Number(pkg.length),

          declaredValue: Number(
            pkg.declaredValue
          ),

          referenceUrl,

          domesticTrackingCode:
            pkg.trackingCode.trim() ||
            null,
        });
      }

      setSubmitMessage(
        "Đang gửi yêu cầu tạo đơn ký gửi..."
      );

      const orderPayload = {
        route,
        shippingOption,

        receiverName:
          receiverName.trim(),

        receiverPhone:
          receiverPhone.trim(),

        receiverAddress:
          selectedDeliveryAddress.trim(),

        requiresInspection:
          Boolean(inspectPackage),

        note: unifiedNote,
        items,
      };

      const result =
        await createConsignmentApi(
          orderPayload
        );

      if (!result) {
        throw new Error(
          "Máy chủ không trả về kết quả tạo đơn."
        );
      }

      AuthNotify.success(
        "Tạo đơn thành công",
        "Đơn hàng ký gửi đã được tiếp nhận."
      );

      navigate("/processing-orders");
    } catch (error) {
      console.error(
        "Lỗi tạo đơn ký gửi:",
        error
      );

      const backendErrors =
        error.response?.data?.errors;

      const status =
        error.response?.status;

      let errorMessage =
        "Không thể tạo đơn ký gửi. Vui lòng thử lại.";

      if (
        error.message
          ?.toLowerCase()
          .includes("upload")
      ) {
        errorMessage = error.message;
      } else if (backendErrors) {
        errorMessage = Object.entries(
          backendErrors
        )
          .map(([key, value]) => {
            const messages =
              Array.isArray(value)
                ? value.join(", ")
                : String(value);

            return `${key}: ${messages}`;
          })
          .join(" | ");
      } else if (
        error.response?.data?.message
      ) {
        errorMessage =
          error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (status === 500) {
        errorMessage =
          "Máy chủ xử lý thất bại. Vui lòng kiểm tra lại thông tin và ảnh sản phẩm.";
      }

      AuthNotify.error(
        "Giao dịch thất bại",
        errorMessage
      );
    } finally {
      setIsSubmitting(false);
      setSubmitMessage(
        "Đang chuẩn bị tạo đơn..."
      );
    }
  };

  return (
    <div
      className={[
        "consignment-container",
        isSubmitting
          ? "consignment-is-submitting"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="back-navigation"
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!isSubmitting) {
            navigate(-1);
          }
        }}
        onKeyDown={(event) => {
          if (
            !isSubmitting &&
            (event.key === "Enter" ||
              event.key === " ")
          ) {
            navigate(-1);
          }
        }}
      >
        <LeftOutlined className="back-icon" />
        <span>QUAY LẠI</span>
      </div>

      <div className="consignment-layout-grid">
        {/* CỘT TRÁI */}
        <div className="layout-left-fixed-sidebar">
          <div className="page-header-title-box">
            <div className="title-icon-orange">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect
                  x="1"
                  y="3"
                  width="15"
                  height="13"
                />

                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />

                <circle
                  cx="5.5"
                  cy="18.5"
                  r="2.5"
                />

                <circle
                  cx="18.5"
                  cy="18.5"
                  r="2.5"
                />
              </svg>
            </div>

            <div className="title-text-group">
              <h2>KÝ GỬI HÀNG HÓA</h2>
              <p>TẠO ĐƠN HÀNG MỚI</p>
            </div>
          </div>

          <div className="left-unified-wrapper-box">
            <div className="left-inner-section">
              <div className="input-field-group">
                <label className="field-label required-label">
                  <EnvironmentOutlined />
                  TUYẾN HÀNG
                </label>

                <select
                  value={route}
                  disabled={isSubmitting}
                  aria-invalid={
                    Boolean(formErrors.route)
                  }
                  className={getFieldClassName(
                    "custom-select",
                    formErrors.route
                  )}
                  onChange={(event) => {
                    setRoute(
                      event.target.value
                    );

                    clearFormError("route");
                  }}
                >
                  <option value="">
                    -- Chọn tuyến hàng --
                  </option>

                  {ROUTE_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>

                <FieldError
                  message={formErrors.route}
                />
              </div>
            </div>

            <div className="left-inner-section border-top-dash">
              <div className="input-field-group">
                <label className="field-label required-label">
                  <EnvironmentOutlined />
                  HÌNH THỨC VẬN CHUYỂN
                </label>

                <select
                  value={shippingOption}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(
                    formErrors.shippingOption
                  )}
                  className={getFieldClassName(
                    "custom-select",
                    formErrors.shippingOption
                  )}
                  onChange={(event) => {
                    setShippingOption(
                      event.target.value
                    );

                    clearFormError(
                      "shippingOption"
                    );
                  }}
                >
                  <option value="">
                    -- Chọn hình thức vận chuyển --
                  </option>

                  {SHIPPING_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>

                <FieldError
                  message={
                    formErrors.shippingOption
                  }
                />
              </div>
            </div>

            <div className="left-inner-section border-top-dash">
              <div
                className="input-field-group"
                style={{
                  marginBottom: 12,
                }}
              >
                <label className="field-label required-label">
                  TÊN NGƯỜI NHẬN
                </label>

                <input
                  type="text"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(
                    formErrors.receiverName
                  )}
                  className={getFieldClassName(
                    "custom-input",
                    formErrors.receiverName
                  )}
                  placeholder="Nhập tên người nhận..."
                  value={receiverName}
                  onChange={(event) => {
                    setReceiverName(
                      event.target.value
                    );

                    clearFormError(
                      "receiverName"
                    );
                  }}
                />

                <FieldError
                  message={
                    formErrors.receiverName
                  }
                />
              </div>

              <div className="input-field-group">
                <label className="field-label required-label">
                  SỐ ĐIỆN THOẠI
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(
                    formErrors.receiverPhone
                  )}
                  className={getFieldClassName(
                    "custom-input",
                    formErrors.receiverPhone
                  )}
                  placeholder="Nhập số điện thoại..."
                  value={receiverPhone}
                  onChange={
                    handleReceiverPhoneChange
                  }
                />

                <FieldError
                  message={
                    formErrors.receiverPhone
                  }
                />
              </div>
            </div>

            <div className="left-inner-section border-top-dash">
              <label className="field-label">
                <EnvironmentOutlined />
                ĐỊA CHỈ ĐANG CHỌN
              </label>

              <div
                className={getFieldClassName(
                  "static-display-box address-received-highlight",
                  formErrors.selectedDeliveryAddress
                )}
              >
                {selectedDeliveryAddress ||
                  "Chưa chọn địa chỉ"}
              </div>

              <FieldError
                message={
                  formErrors.selectedDeliveryAddress
                }
              />
            </div>

            <div className="left-inner-section border-top-dash">
              <div className="inner-section-title required-label">
                CHỌN ĐỊA CHỈ NHẬN HÀNG
              </div>

              {!isAddingAddress ? (
                <>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    className="btn-add-address"
                    onClick={() => {
                      setIsAddingAddress(true);
                      setNewAddressError("");
                    }}
                  >
                    <PlusOutlined />
                    THÊM ĐỊA CHỈ NHẬN HÀNG
                  </button>

                  {addressList.length > 0 ? (
                    <div
                      className={[
                        "address-scroll-container",
                        formErrors.selectedDeliveryAddress
                          ? "address-list-has-error"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {addressList.map(
                        (address, index) => (
                          <div
                            key={`${address}-${index}`}
                            role="button"
                            tabIndex={0}
                            className={[
                              "address-item-clickable",
                              selectedDeliveryAddress ===
                              address
                                ? "is-active"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() =>
                              handleSelectAddress(
                                address
                              )
                            }
                            onKeyDown={(event) => {
                              if (
                                event.key ===
                                  "Enter" ||
                                event.key === " "
                              ) {
                                event.preventDefault();

                                handleSelectAddress(
                                  address
                                );
                              }
                            }}
                          >
                            <span className="address-text-truncate">
                              {address}
                            </span>

                            {selectedDeliveryAddress ===
                              address && (
                              <CheckOutlined className="check-active-icon" />
                            )}
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className={[
                        "address-empty-message",
                        formErrors.selectedDeliveryAddress
                          ? "address-list-has-error"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      Chưa có địa chỉ nhận
                      hàng. Hãy thêm địa chỉ
                      mới.
                    </div>
                  )}
                </>
              ) : (
                <div className="add-address-inline-form">
                  <label className="field-label required-label">
                    ĐỊA CHỈ NHẬN HÀNG MỚI
                  </label>

                  <input
                    type="text"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(
                      newAddressError
                    )}
                    className={getFieldClassName(
                      "custom-input small-input",
                      newAddressError
                    )}
                    placeholder="Nhập địa chỉ nhận hàng..."
                    value={newAddressInput}
                    onChange={(event) => {
                      setNewAddressInput(
                        event.target.value
                      );

                      setNewAddressError("");
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter"
                      ) {
                        event.preventDefault();
                        handleSaveAddress();
                      }
                    }}
                  />

                  <FieldError
                    message={newAddressError}
                  />

                  <div className="inline-form-actions">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      className="btn-inline-cancel"
                      onClick={
                        handleCancelAddAddress
                      }
                    >
                      Hủy
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      className="btn-inline-save"
                      onClick={handleSaveAddress}
                    >
                      <CheckOutlined />
                      Lưu địa chỉ
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="left-inner-section border-top-dash toggle-row">
              <div className="toggle-icon-box">
                <SafetyCertificateOutlined className="shield-icon" />
              </div>

              <div className="toggle-text-info">
                <h4>YÊU CẦU KIỂM HÀNG</h4>

                <p>
                  Khai mở kiểm đếm số lượng
                  thực tế tại kho.
                </p>
              </div>

              <Switch
                checked={inspectPackage}
                disabled={isSubmitting}
                onChange={setInspectPackage}
              />
            </div>
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div className="layout-right-scrollable-form">
          <div className="scrollable-content-wrapper">
            {packages.map((pkg, index) => {
              const errors =
                packageErrors[pkg.id] || {};

              return (
                <div
                  key={pkg.id}
                  className="form-main-card"
                  style={{
                    marginBottom: "1.5rem",
                  }}
                >
                  <div className="form-step-header">
                    <div className="step-header-left">
                      <div className="step-number-circle">
                        {index + 1}
                      </div>

                      <h3>
                        THÔNG TIN SẢN PHẨM
                        KIỆN THỨ {index + 1}
                      </h3>
                    </div>

                    {packages.length > 1 && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        className="btn-delete-package"
                        onClick={() =>
                          handleDeletePackage(
                            pkg.id
                          )
                        }
                      >
                        <DeleteOutlined />
                        Xóa kiện
                      </button>
                    )}
                  </div>

                  <div className="form-row-2col">
                    <div className="input-field-group">
                      <label className="field-label required-label">
                        TÊN SẢN PHẨM
                      </label>

                      <input
                        type="text"
                        disabled={isSubmitting}
                        placeholder="Nhập tên sản phẩm..."
                        aria-invalid={Boolean(
                          errors.productName
                        )}
                        className={getFieldClassName(
                          "custom-input",
                          errors.productName
                        )}
                        value={pkg.productName}
                        onChange={(event) =>
                          handleInputChange(
                            pkg.id,
                            "productName",
                            event.target.value
                          )
                        }
                      />

                      <FieldError
                        message={
                          errors.productName
                        }
                      />
                    </div>

                    <div className="input-field-group">
                      <label className="field-label required-label">
                        LOẠI HÀNG HÓA
                      </label>

                      <select
                        disabled={isSubmitting}
                        aria-invalid={Boolean(
                          errors.productType
                        )}
                        className={getFieldClassName(
                          "custom-select",
                          errors.productType
                        )}
                        value={pkg.productType}
                        onChange={(event) =>
                          handleInputChange(
                            pkg.id,
                            "productType",
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          -- Chọn loại hàng hóa --
                        </option>

                        {PRODUCT_TYPE_OPTIONS.map(
                          (option) => (
                            <option
                              key={
                                option.value
                              }
                              value={
                                option.value
                              }
                            >
                              {option.label}
                            </option>
                          )
                        )}
                      </select>

                      <FieldError
                        message={
                          errors.productType
                        }
                      />
                    </div>
                  </div>

                  <div className="form-row-2col">
                    <div className="input-field-group">
                      <label className="field-label required-label">
                        SỐ LƯỢNG
                      </label>

                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={isSubmitting}
                        placeholder="Nhập số lượng sản phẩm..."
                        aria-invalid={Boolean(
                          errors.quantity
                        )}
                        className={getFieldClassName(
                          "custom-input",
                          errors.quantity
                        )}
                        value={pkg.quantity}
                        onKeyDown={
                          preventInvalidNumberKeys
                        }
                        onChange={(event) =>
                          handleIntegerChange(
                            pkg.id,
                            "quantity",
                            event.target.value
                          )
                        }
                      />

                      <FieldError
                        message={
                          errors.quantity
                        }
                      />
                    </div>

                    <div className="input-field-group">
                      <label className="field-label required-label">
                        GIÁ TRỊ ĐƠN HÀNG (VND)
                      </label>

                      <input
                        type="text"
                        inputMode="decimal"
                        disabled={isSubmitting}
                        placeholder="Nhập giá trị khai báo..."
                        aria-invalid={Boolean(
                          errors.declaredValue
                        )}
                        className={getFieldClassName(
                          "custom-input",
                          errors.declaredValue
                        )}
                        value={
                          pkg.declaredValue
                        }
                        onKeyDown={
                          preventInvalidNumberKeys
                        }
                        onChange={(event) =>
                          handleDecimalChange(
                            pkg.id,
                            "declaredValue",
                            event.target.value
                          )
                        }
                        onBlur={(event) =>
                          handleDecimalBlur(
                            pkg.id,
                            "declaredValue",
                            event.target.value
                          )
                        }
                      />

                      <FieldError
                        message={
                          errors.declaredValue
                        }
                      />
                    </div>
                  </div>

                  <div className="form-row-4col">
                    {[
                      {
                        field: "weight",
                        label: "CÂN NẶNG (KG)",
                        placeholder:
                          "Nhập cân nặng...",
                      },
                      {
                        field: "length",
                        label: "DÀI (CM)",
                        placeholder:
                          "Nhập chiều dài...",
                      },
                      {
                        field: "width",
                        label: "RỘNG (CM)",
                        placeholder:
                          "Nhập chiều rộng...",
                      },
                      {
                        field: "height",
                        label: "CAO (CM)",
                        placeholder:
                          "Nhập chiều cao...",
                      },
                    ].map((fieldItem) => (
                      <div
                        key={fieldItem.field}
                        className="input-field-group"
                      >
                        <label className="field-label required-label">
                          {fieldItem.label}
                        </label>

                        <input
                          type="text"
                          inputMode="decimal"
                          disabled={isSubmitting}
                          placeholder={
                            fieldItem.placeholder
                          }
                          aria-invalid={Boolean(
                            errors[
                              fieldItem.field
                            ]
                          )}
                          className={getFieldClassName(
                            "custom-input",
                            errors[
                              fieldItem.field
                            ]
                          )}
                          value={
                            pkg[
                              fieldItem.field
                            ]
                          }
                          onKeyDown={
                            preventInvalidNumberKeys
                          }
                          onChange={(event) =>
                            handleDecimalChange(
                              pkg.id,
                              fieldItem.field,
                              event.target.value
                            )
                          }
                          onBlur={(event) =>
                            handleDecimalBlur(
                              pkg.id,
                              fieldItem.field,
                              event.target.value
                            )
                          }
                        />

                        <FieldError
                          message={
                            errors[
                              fieldItem.field
                            ]
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div
                    className="input-field-group"
                    style={{
                      marginBottom: "1.25rem",
                    }}
                  >
                    <label className="field-label">
                      MÃ VẬN ĐƠN NỘI ĐỊA
                      (DOMESTIC TRACKING CODE)
                    </label>

                    <input
                      type="text"
                      disabled={isSubmitting}
                      placeholder="Bỏ trống nếu chưa có mã..."
                      className="custom-input"
                      value={pkg.trackingCode}
                      onChange={(event) =>
                        handleInputChange(
                          pkg.id,
                          "trackingCode",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="input-field-group">
                    <label className="field-label required-label">
                      GHI CHÚ KIỆN HÀNG
                    </label>

                    <textarea
                      disabled={isSubmitting}
                      placeholder="Mô tả đặc điểm, ghi chú bổ sung cho kiện hàng..."
                      aria-invalid={Boolean(
                        errors.note
                      )}
                      className={getFieldClassName(
                        "custom-textarea",
                        errors.note
                      )}
                      rows={2}
                      value={pkg.note}
                      onChange={(event) =>
                        handleInputChange(
                          pkg.id,
                          "note",
                          event.target.value
                        )
                      }
                    />

                    <FieldError
                      message={errors.note}
                    />
                  </div>

                  <div className="input-field-group package-image-section">
                    <label className="field-label required-label">
                      ẢNH SẢN PHẨM KIỆN{" "}
                      {index + 1}
                    </label>

                    <input
                      type="file"
                      ref={(element) => {
                        fileInputRefs.current[
                          pkg.id
                        ] = element;
                      }}
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      disabled={isSubmitting}
                      style={{
                        display: "none",
                      }}
                      onChange={(event) =>
                        handleFileChange(
                          pkg.id,
                          event
                        )
                      }
                    />

                    <div
                      role="button"
                      tabIndex={0}
                      aria-disabled={isSubmitting}
                      className={[
                        "upload-dropzone-box-clickable",
                        errors.images
                          ? "upload-has-error"
                          : "",
                        isSubmitting
                          ? "upload-is-disabled"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() =>
                        handleDropzoneClick(
                          pkg.id
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                            "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();

                          handleDropzoneClick(
                            pkg.id
                          );
                        }
                      }}
                    >
                      <CloudUploadOutlined className="upload-big-icon" />

                      <span className="upload-main-text">
                        Bấm để chọn ảnh cho
                        kiện hàng này
                      </span>

                      <span className="upload-sub-text">
                        Hỗ trợ JPG, PNG, WEBP
                        — tối đa 5MB/ảnh
                      </span>
                    </div>

                    <FieldError
                      message={errors.images}
                    />

                    {pkg.images.length > 0 && (
                      <div className="image-previews-grid animation-fade-in">
                        {pkg.images.map(
                          (image) => (
                            <div
                              key={image.id}
                              className="preview-image-item"
                              onClick={() =>
                                setActiveLightboxImg(
                                  image.previewUrl
                                )
                              }
                            >
                              <img
                                src={
                                  image.previewUrl
                                }
                                alt={`Kiện ${
                                  index + 1
                                }`}
                              />

                              <button
                                type="button"
                                disabled={
                                  isSubmitting
                                }
                                className="btn-remove-preview-img"
                                onClick={(event) =>
                                  handleRemoveImage(
                                    event,
                                    pkg.id,
                                    image.id,
                                    image.previewUrl
                                  )
                                }
                              >
                                <CloseOutlined />
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div
              role="button"
              tabIndex={0}
              aria-disabled={isSubmitting}
              className={[
                "add-package-dashed-trigger",
                isSubmitting
                  ? "add-package-disabled"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={handleAddPackage}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();
                  handleAddPackage();
                }
              }}
            >
              <PlusCircleOutlined className="plus-dashed-icon" />
              <span>THÊM KIỆN HÀNG MỚI</span>
            </div>

            <div className="sticky-action-notice-bar">
              <div className="notice-left-message">
                <InfoCircleOutlined className="info-notice-icon" />

                <p>
                  <strong>LƯU Ý:</strong>{" "}
                  Đơn hàng sẽ được nhân viên
                  VCL kiểm tra và xác nhận lại
                  thông tin trước khi xử lý.
                </p>
              </div>

              <button
                type="button"
                className="btn-final-submit-order"
                onClick={handleCreateOrder}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <LoadingOutlined spin />
                    ĐANG TẠO ĐƠN...
                  </>
                ) : (
                  "TẠO ĐƠN HÀNG NGAY"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isSubmitting && (
        <div
          className="create-order-loading-overlay"
          role="status"
          aria-live="polite"
        >
          <div className="create-order-loading-card">
            <div className="create-order-loading-icon">
              <LoadingOutlined spin />
            </div>

            <h3>ĐANG TẠO ĐƠN KÝ GỬI</h3>

            <p>{submitMessage}</p>

            <div className="create-order-loading-bar">
              <span />
            </div>

            <small>
              Vui lòng không đóng hoặc tải
              lại trang.
            </small>
          </div>
        </div>
      )}

      {activeLightboxImg && (
        <div
          className="lightbox-overlay-modal"
          onClick={() =>
            setActiveLightboxImg(null)
          }
        >
          <div
            className="lightbox-content-box animate-zoom-in"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <img
              src={activeLightboxImg}
              alt="Phóng to"
              className="lightbox-main-img"
            />
          </div>

          <span className="lightbox-hint-text">
            Bấm vào vùng trống để đóng cửa
            sổ
          </span>
        </div>
      )}
    </div>
  );
}