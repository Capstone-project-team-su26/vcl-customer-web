import React, {
  useCallback,
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
  LinkOutlined,
  LoadingOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { Switch, Tooltip } from "antd";

import AuthNotify from "../../../../utils/AuthNotify";
import uploadImage from "../../../../api/Upload/UploadImage";

import {
  createDeliveryAddressApi,
  deleteDeliveryAddressApi,
  getConsignmentRoutesApi,
  getDeliveryAddressesApi,
  getProductTypesApi,
} from "../../../../api/OrderApi/consignmentApi";

import {
  createPurchaseRequestApi,
} from "../../../../api/OrderApi/purchaseRequestApi";

import {
  getDistrictsByProvinceCode,
  getFullAddressByCodes,
  getProvinces,
  getWardsByDistrictCode,
} from "../../../../api/addressApi";

import {
  getBrowserTimeInfo,
  getSyncedNowUtcIso,
} from "../../../../utils/timeUtc";

import ConsignmentBuyOrderConfirm from "../../../../components/DashboardComponents/CustomerBuyComponents/ConfirmBuy/ConsignmentBuyOrderConfirm";

import "./ConsignmentBuyOrder.css";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;


const INITIAL_FORM = {
  route: "",
  receiverName: "",
  receiverPhone: "",
  selectedDeliveryAddress: "",
  requiresInspection: true,
  requiresQuantityCheck: true,
  generalNote: "",
};

const INITIAL_ADDRESS_SELECT = {
  provinceCode: "",
  districtCode: "",
  wardCode: "",
};

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

const createEmptyItem = () => ({
  id: createUniqueId(),
  productLink: "",
  sourceWebsite: "",
  productType: "",
  productName: "",
  quantity: "",
  attributes: "",
  note: "",
  image: null,
});

const createEmptyFormErrors = () => ({
  route: "",
  receiverName: "",
  receiverPhone: "",
  selectedDeliveryAddress: "",
  generalNote: "",
});

const isCanceledRequest = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

const getApiErrorMessage = (
  error,
  fallbackMessage = "Đã xảy ra lỗi."
) => {
  const responseData =
    error?.response?.data;

  if (
    typeof responseData === "string" &&
    responseData.trim()
  ) {
    return responseData;
  }

  const validationErrors =
    responseData?.errors;

  if (
    validationErrors &&
    typeof validationErrors === "object"
  ) {
    return Object.entries(validationErrors)
      .map(([field, value]) => {
        const messages = Array.isArray(value)
          ? value.join(", ")
          : String(value);

        return `${field}: ${messages}`;
      })
      .join(" | ");
  }

  return (
    responseData?.message ||
    responseData?.title ||
    responseData?.error ||
    error?.message ||
    fallbackMessage
  );
};

const getFieldClassName = (
  baseClassName,
  errorMessage
) =>
  [
    baseClassName,
    errorMessage && "purchase-buy-input-has-error",
  ]
    .filter(Boolean)
    .join(" ");

const sanitizeInteger = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");

  // Không cho nhập 0 hoặc nhiều số 0 ở đầu.
  // Ví dụ: "0", "00" => ""; "01" => "1"; "10" vẫn giữ nguyên.
  return digits.replace(/^0+/, "");
};

const preventInvalidNumberKeys = (
  event
) => {
  if (
    ["-", "+", "e", "E", ".", ","].includes(
      event.key
    )
  ) {
    event.preventDefault();
  }
};

const findArrayFromResult = (
  result,
  extraKeys = []
) => {
  const candidates = [
    result,
    result?.data,
    result?.items,
    result?.results,
    result?.data?.items,
    result?.data?.results,
    ...extraKeys.flatMap((key) => [
      result?.[key],
      result?.data?.[key],
    ]),
  ];

  return (
    candidates.find(Array.isArray) || []
  );
};

const normalizeOptionList = (
  result,
  extraKeys = []
) =>
  findArrayFromResult(
    result,
    extraKeys
  )
    .map((item) => {
      if (
        typeof item === "string" ||
        typeof item === "number"
      ) {
        const value =
          String(item).trim();

        return {
          value,
          label: value,
        };
      }

      const value = String(
        item?.value ??
          item?.code ??
          item?.route ??
          item?.productType ??
          item?.routeId ??
          item?.productTypeId ??
          item?.id ??
          ""
      ).trim();

      const label = String(
        item?.label ??
          item?.name ??
          item?.displayName ??
          item?.routeName ??
          item?.productTypeName ??
          item?.description ??
          value
      ).trim();

      return {
        value,
        label,
      };
    })
    .filter(
      (item) =>
        item.value &&
        item.label
    );

const normalizeDeliveryAddress = (
  item,
  index = 0
) => {
  if (!item) {
    return null;
  }

  if (typeof item === "string") {
    const address = item.trim();

    return address
      ? {
          id: `address-${index}`,
          apiId: "",
          address,
          fullAddress: address,
          detailAddress: "",
          provinceCode: "",
          provinceName: "",
          districtCode: "",
          districtName: "",
          wardCode: "",
          wardName: "",
          isDefault: false,
        }
      : null;
  }

  const address = String(
    item.address ||
      item.receiverAddress ||
      item.fullAddress ||
      item.deliveryAddress ||
      ""
  ).trim();

  if (!address) {
    return null;
  }

  const apiId = String(
    item.deliveryAddressId ||
      item.addressId ||
      item.id ||
      ""
  ).trim();

  return {
    id: apiId || `address-${index}`,
    apiId,
    address,
    fullAddress: item.fullAddress || address,
    detailAddress: item.detailAddress || "",
    provinceCode: item.provinceCode || item.province_code || "",
    provinceName: item.provinceName || item.province_name || "",
    districtCode: item.districtCode || item.district_code || "",
    districtName: item.districtName || item.district_name || "",
    wardCode: item.wardCode || item.ward_code || "",
    wardName: item.wardName || item.ward_name || "",
    isDefault: Boolean(
      item.isDefault
    ),
  };
};

const normalizeDeliveryAddressList = (
  result
) =>
  findArrayFromResult(result, [
    "addresses",
    "deliveryAddresses",
  ])
    .map(normalizeDeliveryAddress)
    .filter(Boolean);

const extractUploadedImageUrl = (
  result
) => {
  const candidates = [
    result,
    result?.url,
    result?.imageUrl,
    result?.fileUrl,
    result?.path,
    result?.secureUrl,
    result?.data,
    result?.data?.url,
    result?.data?.imageUrl,
    result?.data?.fileUrl,
    result?.data?.path,
    result?.data?.secureUrl,
    result?.data?.data?.url,
    result?.data?.data?.imageUrl,
    result?.data?.data?.fileUrl,
  ];

  return (
    candidates.find(
      (item) =>
        typeof item === "string" &&
        item.trim()
    )?.trim() || ""
  );
};

const uploadPackageImage = async (file) => {
  if (!(file instanceof File)) {
    throw new Error("File ảnh không hợp lệ.");
  }

  if (
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type)
  ) {
    throw new Error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Dung lượng ảnh không được vượt quá 5MB.");
  }

  const uploadResult = await uploadImage(file);
  const imageUrl = extractUploadedImageUrl(uploadResult);

  if (!imageUrl) {
    throw new Error(
      "API upload ảnh không trả về đường dẫn ảnh hợp lệ."
    );
  }

  return imageUrl;
};

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(
      String(value || "").trim()
    );

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
};

const getSourceWebsiteFromLink = (
  value
) => {
  try {
    const url = new URL(
      String(value || "").trim()
    );

    return url.hostname.replace(
      /^www\./,
      ""
    );
  } catch {
    return "";
  }
};

const getAddressOptionName = (options, value) => {
  return (
    options.find(
      (option) => String(option.value) === String(value)
    )?.label || ""
  );
};

const getClientTimePayload = () => {
  const browserTime = getBrowserTimeInfo();
  const utcNow = getSyncedNowUtcIso();

  return {
    submittedAtUtc: utcNow,
    clientSubmittedAtUtc: utcNow,
    clientTimeZone: browserTime.timeZone,
    clientUtcOffset: browserTime.utcOffsetText,
    clientUtcOffsetMinutes: browserTime.utcOffsetMinutes,
  };
};

const validateItem = (item) => {
  const errors = {};

  if (!item.productLink.trim()) {
    errors.productLink =
      "Vui lòng nhập liên kết sản phẩm.";
  } else if (
    !isValidHttpUrl(
      item.productLink
    )
  ) {
    errors.productLink =
      "Liên kết sản phẩm phải bắt đầu bằng http:// hoặc https://.";
  }

  if (!item.sourceWebsite.trim()) {
    errors.sourceWebsite =
      "Vui lòng nhập website nguồn.";
  }

  if (!item.productType) {
    errors.productType =
      "Vui lòng chọn loại sản phẩm.";
  }

  if (!item.productName.trim()) {
    errors.productName =
      "Vui lòng nhập tên sản phẩm.";
  }

  const quantity =
    Number(item.quantity);

  if (item.quantity === "") {
    errors.quantity =
      "Vui lòng nhập số lượng.";
  } else if (
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    errors.quantity =
      "Số lượng phải là số nguyên từ 1 trở lên.";
  } else if (
    quantity > 2147483647
  ) {
    errors.quantity =
      "Số lượng vượt quá giới hạn cho phép.";
  }

  if (!item.attributes.trim()) {
    errors.attributes =
      "Vui lòng nhập thuộc tính sản phẩm.";
  }

  if (!item.image) {
    errors.image =
      "Vui lòng tải ảnh sản phẩm.";
  }

  return errors;
};

const validateBuyOrderForm = ({
  form,
  items,
}) => {
  const formErrors =
    createEmptyFormErrors();

  if (!form.route) {
    formErrors.route =
      "Hệ thống chưa tải được tuyến hàng. Vui lòng làm mới trang.";
  }

  if (!form.receiverName.trim()) {
    formErrors.receiverName =
      "Vui lòng nhập tên người nhận.";
  } else if (
    form.receiverName.trim().length <
    2
  ) {
    formErrors.receiverName =
      "Tên người nhận phải có ít nhất 2 ký tự.";
  }

  if (!form.receiverPhone.trim()) {
    formErrors.receiverPhone =
      "Vui lòng nhập số điện thoại.";
  } else if (
    !/^0\d{9}$/.test(
      form.receiverPhone.trim()
    )
  ) {
    formErrors.receiverPhone =
      "Số điện thoại phải có 10 số và bắt đầu bằng số 0.";
  }

  if (
    !form.selectedDeliveryAddress.trim()
  ) {
    formErrors.selectedDeliveryAddress =
      "Vui lòng thêm và chọn địa chỉ nhận hàng.";
  }

  const itemErrors =
    Object.fromEntries(
      items.map((item) => [
        item.id,
        validateItem(item),
      ])
    );

  const isValid =
    !Object.values(
      formErrors
    ).some(Boolean) &&
    Object.values(
      itemErrors
    ).every(
      (errors) =>
        !Object.values(
          errors
        ).some(Boolean)
    );

  return {
    isValid,
    formErrors,
    itemErrors,
  };
};

const FieldError = ({
  message,
}) => {
  if (!message) {
    return null;
  }

  return (
    <div className="purchase-buy-field-error-message">
      <ExclamationCircleOutlined />
      <span>{message}</span>
    </div>
  );
};

const SelectField = ({
  label,
  value,
  error,
  options,
  loading,
  disabled,
  placeholder,
  onChange,
}) => (
  <div className="purchase-buy-input-field-group">
    <label className="purchase-buy-field-label purchase-buy-required-label">
      <EnvironmentOutlined />
      {label}
    </label>

    <select
      value={value}
      disabled={
        disabled || loading
      }
      aria-invalid={Boolean(error)}
      className={getFieldClassName(
        "purchase-buy-custom-select",
        error
      )}
      onChange={(event) =>
        onChange(
          event.target.value
        )
      }
    >
      <option value="">
        {loading
          ? "Đang tải dữ liệu..."
          : placeholder}
      </option>

      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
        >
          {option.label}
        </option>
      ))}
    </select>

    <FieldError message={error} />
  </div>
);

export default function ConsignmentBuyOrder() {
  const navigate = useNavigate();

  const fileInputRefs =
    useRef({});

  const itemsRef =
    useRef([]);

  const [form, setForm] =
    useState(INITIAL_FORM);

  const [items, setItems] =
    useState([
      createEmptyItem(),
    ]);

  const [
    formErrors,
    setFormErrors,
  ] = useState(
    createEmptyFormErrors()
  );

  const [
    itemErrors,
    setItemErrors,
  ] = useState({});

  const [
    routeOptions,
    setRouteOptions,
  ] = useState([]);

  const [
    productTypeOptions,
    setProductTypeOptions,
  ] = useState([]);

  const [
    isLoadingOptions,
    setIsLoadingOptions,
  ] = useState(true);

  const [
    addressList,
    setAddressList,
  ] = useState([]);

  const [
    isLoadingAddresses,
    setIsLoadingAddresses,
  ] = useState(true);

  const [
    isSavingAddress,
    setIsSavingAddress,
  ] = useState(false);

  const [
    deletingAddressId,
    setDeletingAddressId,
  ] = useState("");

  const [
    isAddingAddress,
    setIsAddingAddress,
  ] = useState(false);

  const [
    newAddressInput,
    setNewAddressInput,
  ] = useState("");

  const [
    newAddressError,
    setNewAddressError,
  ] = useState("");

  const [
    newAddressSelect,
    setNewAddressSelect,
  ] = useState(
    INITIAL_ADDRESS_SELECT
  );

  const [
    provinceOptions,
    setProvinceOptions,
  ] = useState([]);

  const [
    districtOptions,
    setDistrictOptions,
  ] = useState([]);

  const [
    wardOptions,
    setWardOptions,
  ] = useState([]);

  const [
    isLoadingProvinces,
    setIsLoadingProvinces,
  ] = useState(false);

  const [
    isLoadingDistricts,
    setIsLoadingDistricts,
  ] = useState(false);

  const [
    isLoadingWards,
    setIsLoadingWards,
  ] = useState(false);

  const [
    activeLightboxImg,
    setActiveLightboxImg,
  ] = useState(null);

  const [
    isConfirming,
    setIsConfirming,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    submitMessage,
    setSubmitMessage,
  ] = useState(
    "Đang chuẩn bị tạo yêu cầu..."
  );

  const clearFormError = (
    field
  ) => {
    setFormErrors(
      (previous) => ({
        ...previous,
        [field]: "",
      })
    );
  };

  const clearItemError = (
    itemId,
    field
  ) => {
    setItemErrors(
      (previous) => ({
        ...previous,
        [itemId]: {
          ...(previous[
            itemId
          ] || {}),
          [field]: "",
        },
      })
    );
  };

  const updateForm = (
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    clearFormError(field);
  };

  const loadDeliveryAddresses =
    useCallback(
      async (
        options = {}
      ) => {
        const result =
          await getDeliveryAddressesApi(
            options
          );

        const list =
          normalizeDeliveryAddressList(
            result
          );

        setAddressList(list);

        return list;
      },
      []
    );

  useEffect(() => {
    const controller =
      new AbortController();

    const loadOptions =
      async () => {
        try {
          setIsLoadingOptions(
            true
          );

          const [
            routesResult,
            productTypesResult,
          ] =
            await Promise.all([
              getConsignmentRoutesApi({
                signal:
                  controller.signal,
              }),
              getProductTypesApi({
                signal:
                  controller.signal,
              }),
            ]);

          const normalizedRoutes =
            normalizeOptionList(
              routesResult,
              ["routes"]
            );

          const normalizedProductTypes =
            normalizeOptionList(
              productTypesResult,
              ["productTypes"]
            );

          setRouteOptions(
            normalizedRoutes
          );

          setProductTypeOptions(
            normalizedProductTypes
          );

          /*
           * Tuyến hàng được API cấp tự động.
           * Người dùng chỉ xem, không chọn lại.
           */
          setForm((previous) => {
            const currentRouteExists =
              normalizedRoutes.some(
                (option) =>
                  String(option.value) ===
                  String(previous.route)
              );

            const nextRoute =
              currentRouteExists
                ? previous.route
                : normalizedRoutes[0]?.value ||
                  "";

            if (
              nextRoute ===
              previous.route
            ) {
              return previous;
            }

            return {
              ...previous,
              route: nextRoute,
            };
          });

          if (
            normalizedRoutes.length > 0
          ) {
            setFormErrors(
              (previous) => ({
                ...previous,
                route: "",
              })
            );
          }
        } catch (error) {
          if (
            !isCanceledRequest(error)
          ) {
            AuthNotify.error(
              "Không tải được dữ liệu",
              getApiErrorMessage(
                error,
                "Không thể tải tuyến hàng hoặc loại sản phẩm."
              )
            );
          }
        } finally {
          if (
            !controller.signal
              .aborted
          ) {
            setIsLoadingOptions(
              false
            );
          }
        }
      };

    loadOptions();

    return () =>
      controller.abort();
  }, []);

  useEffect(() => {
    const controller =
      new AbortController();

    const loadAddresses =
      async () => {
        try {
          setIsLoadingAddresses(
            true
          );

          const list =
            await loadDeliveryAddresses({
              signal:
                controller.signal,
            });

          const defaultAddress =
            list.find(
              (item) =>
                item.isDefault
            );

          if (defaultAddress) {
            updateForm(
              "selectedDeliveryAddress",
              defaultAddress.address
            );
          }
        } catch (error) {
          if (
            !isCanceledRequest(error)
          ) {
            AuthNotify.error(
              "Không tải được địa chỉ",
              getApiErrorMessage(
                error,
                "Không thể tải danh sách địa chỉ nhận hàng."
              )
            );
          }
        } finally {
          if (
            !controller.signal
              .aborted
          ) {
            setIsLoadingAddresses(
              false
            );
          }
        }
      };

    loadAddresses();

    return () =>
      controller.abort();
  }, [
    loadDeliveryAddresses,
  ]);

  useEffect(() => {
    const controller =
      new AbortController();

    const loadProvinces =
      async () => {
        try {
          setIsLoadingProvinces(
            true
          );

          const provinces =
            await getProvinces({
              signal:
                controller.signal,
            });

          setProvinceOptions(
            provinces
          );
        } catch (error) {
          if (
            !isCanceledRequest(error)
          ) {
            AuthNotify.error(
              "Không tải được tỉnh/thành",
              getApiErrorMessage(
                error,
                "Không thể tải danh sách tỉnh/thành phố."
              )
            );
          }
        } finally {
          if (
            !controller.signal
              .aborted
          ) {
            setIsLoadingProvinces(
              false
            );
          }
        }
      };

    loadProvinces();

    return () =>
      controller.abort();
  }, []);

  useEffect(() => {
    const controller =
      new AbortController();

    const loadDistricts =
      async () => {
        if (
          !newAddressSelect.provinceCode
        ) {
          setDistrictOptions([]);
          setWardOptions([]);
          return;
        }

        try {
          setIsLoadingDistricts(
            true
          );

          const districts =
            await getDistrictsByProvinceCode(
              newAddressSelect.provinceCode,
              {
                signal:
                  controller.signal,
              }
            );

          setDistrictOptions(
            districts
          );
        } catch (error) {
          if (
            !isCanceledRequest(error)
          ) {
            AuthNotify.error(
              "Không tải được quận/huyện",
              getApiErrorMessage(
                error,
                "Không thể tải danh sách quận/huyện."
              )
            );
          }
        } finally {
          if (
            !controller.signal
              .aborted
          ) {
            setIsLoadingDistricts(
              false
            );
          }
        }
      };

    loadDistricts();

    return () =>
      controller.abort();
  }, [
    newAddressSelect.provinceCode,
  ]);

  useEffect(() => {
    const controller =
      new AbortController();

    const loadWards =
      async () => {
        if (
          !newAddressSelect.districtCode
        ) {
          setWardOptions([]);
          return;
        }

        try {
          setIsLoadingWards(
            true
          );

          const wards =
            await getWardsByDistrictCode(
              newAddressSelect.districtCode,
              {
                signal:
                  controller.signal,
              }
            );

          setWardOptions(wards);
        } catch (error) {
          if (
            !isCanceledRequest(error)
          ) {
            AuthNotify.error(
              "Không tải được phường/xã",
              getApiErrorMessage(
                error,
                "Không thể tải danh sách phường/xã."
              )
            );
          }
        } finally {
          if (
            !controller.signal
              .aborted
          ) {
            setIsLoadingWards(
              false
            );
          }
        }
      };

    loadWards();

    return () =>
      controller.abort();
  }, [
    newAddressSelect.districtCode,
  ]);

  useEffect(() => {
    itemsRef.current =
      items;
  }, [items]);

  useEffect(
    () => () => {
      itemsRef.current.forEach(
        (item) => {
          if (
            item.image
              ?.previewUrl
          ) {
            URL.revokeObjectURL(
              item.image
                .previewUrl
            );
          }
        }
      );
    },
    []
  );

  const scrollToFirstError =
    () => {
      window.setTimeout(() => {
        document
          .querySelector(
            ".purchase-buy-input-has-error, .purchase-buy-upload-has-error, .purchase-buy-address-list-has-error"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",
            block: "center",
          });
      }, 100);
    };

  /* ================= ADDRESS ================= */

  const resetNewAddressForm = () => {
    setNewAddressSelect(
      INITIAL_ADDRESS_SELECT
    );
    setNewAddressInput("");
    setDistrictOptions([]);
    setWardOptions([]);
  };

  const updateNewAddressSelect = (
    field,
    value
  ) => {
    setNewAddressSelect(
      (previous) => {
        if (field === "provinceCode") {
          return {
            provinceCode: value,
            districtCode: "",
            wardCode: "",
          };
        }

        if (field === "districtCode") {
          return {
            ...previous,
            districtCode: value,
            wardCode: "",
          };
        }

        return {
          ...previous,
          [field]: value,
        };
      }
    );

    setNewAddressError("");
  };

  const buildAddressPayload = async () => {
    const detailAddress =
      newAddressInput.trim();

    if (!newAddressSelect.provinceCode) {
      throw new Error(
        "Vui lòng chọn tỉnh/thành phố."
      );
    }

    if (!newAddressSelect.districtCode) {
      throw new Error(
        "Vui lòng chọn quận/huyện."
      );
    }

    if (!newAddressSelect.wardCode) {
      throw new Error(
        "Vui lòng chọn phường/xã."
      );
    }

    if (!detailAddress) {
      throw new Error(
        "Vui lòng nhập số nhà, tên đường."
      );
    }

    const provinceName =
      getAddressOptionName(
        provinceOptions,
        newAddressSelect.provinceCode
      );

    const districtName =
      getAddressOptionName(
        districtOptions,
        newAddressSelect.districtCode
      );

    const wardName =
      getAddressOptionName(
        wardOptions,
        newAddressSelect.wardCode
      );

    const addressResult =
      await getFullAddressByCodes({
        provinceCode:
          newAddressSelect.provinceCode,
        districtCode:
          newAddressSelect.districtCode,
        wardCode:
          newAddressSelect.wardCode,
        detailAddress,
      });

    const fullAddress =
      addressResult?.fullAddress ||
      [
        detailAddress,
        wardName,
        districtName,
        provinceName,
      ]
        .filter(Boolean)
        .join(", ");

    return {
      address: fullAddress,
      fullAddress,
      detailAddress,
      provinceCode:
        newAddressSelect.provinceCode,
      provinceName,
      districtCode:
        newAddressSelect.districtCode,
      districtName,
      wardCode:
        newAddressSelect.wardCode,
      wardName,
      ...getClientTimePayload(),
    };
  };

  const handleSaveAddress =
    async () => {
      if (
        isSubmitting ||
        isSavingAddress
      ) {
        return;
      }

      let addressPayload;

      try {
        addressPayload =
          await buildAddressPayload();
      } catch (error) {
        const message =
          error?.message ||
          "Vui lòng kiểm tra lại địa chỉ.";

        setNewAddressError(message);
        return;
      }

      const address =
        addressPayload.address.trim();

      const addressExists =
        addressList.some(
          (item) =>
            item.address
              .trim()
              .toLowerCase() ===
            address.toLowerCase()
        );

      if (addressExists) {
        setNewAddressError(
          "Địa chỉ này đã có trong danh sách."
        );
        return;
      }

      try {
        setIsSavingAddress(
          true
        );
        setNewAddressError("");

        const createdResult =
          await createDeliveryAddressApi(
            addressPayload
          );

        let refreshedAddresses;

        try {
          refreshedAddresses =
            await loadDeliveryAddresses();
        } catch {
          const createdAddress =
            normalizeDeliveryAddress(
              createdResult?.data ||
                createdResult ||
                addressPayload,
              addressList.length
            ) || {
              id: createUniqueId(),
              apiId: "",
              ...addressPayload,
              isDefault: false,
            };

          refreshedAddresses = [
            ...addressList,
            createdAddress,
          ];

          setAddressList(
            refreshedAddresses
          );
        }

        const selectedAddress =
          refreshedAddresses.find(
            (item) =>
              item.address
                .trim()
                .toLowerCase() ===
              address.toLowerCase()
          )?.address || address;

        updateForm(
          "selectedDeliveryAddress",
          selectedAddress
        );

        resetNewAddressForm();
        setNewAddressError("");
        setIsAddingAddress(
          false
        );

        AuthNotify.success(
          "Đã thêm địa chỉ",
          "Địa chỉ nhận hàng mới đã được lưu."
        );
      } catch (error) {
        const errorMessage =
          getApiErrorMessage(
            error,
            "Không thể lưu địa chỉ nhận hàng."
          );

        setNewAddressError(
          errorMessage
        );

        AuthNotify.error(
          "Lưu địa chỉ thất bại",
          errorMessage
        );
      } finally {
        setIsSavingAddress(
          false
        );
      }
    };

  const handleDeleteAddress =
    async (
      event,
      addressItem
    ) => {
      event.preventDefault();
      event.stopPropagation();

      if (
        isSubmitting ||
        isSavingAddress ||
        deletingAddressId
      ) {
        return;
      }

      const addressId =
        String(
          addressItem?.apiId ||
            ""
        ).trim();

      if (!addressId) {
        AuthNotify.error(
          "Không thể xóa địa chỉ",
          "Địa chỉ này không có ID hợp lệ."
        );
        return;
      }

      const confirmed =
        window.confirm(
          `Bạn có chắc muốn xóa địa chỉ "${addressItem.address}" không?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingAddressId(
          addressId
        );

        await deleteDeliveryAddressApi(
          addressId
        );

        const remainingAddresses =
          addressList.filter(
            (item) =>
              item.apiId !==
              addressId
          );

        setAddressList(
          remainingAddresses
        );

        if (
          form.selectedDeliveryAddress ===
          addressItem.address
        ) {
          updateForm(
            "selectedDeliveryAddress",
            remainingAddresses[0]
              ?.address || ""
          );
        }

        AuthNotify.success(
          "Đã xóa địa chỉ",
          "Địa chỉ nhận hàng đã được xóa."
        );
      } catch (error) {
        AuthNotify.error(
          "Xóa địa chỉ thất bại",
          getApiErrorMessage(
            error,
            "Không thể xóa địa chỉ nhận hàng."
          )
        );
      } finally {
        setDeletingAddressId(
          ""
        );
      }
    };

  /* ================= ITEMS ================= */

  const handleItemChange = (
    itemId,
    field,
    value
  ) => {
    setItems((previous) =>
      previous.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );

    clearItemError(
      itemId,
      field
    );
  };

  const handleProductLinkBlur = (
    item
  ) => {
    if (
      item.sourceWebsite.trim() ||
      !isValidHttpUrl(
        item.productLink
      )
    ) {
      return;
    }

    handleItemChange(
      item.id,
      "sourceWebsite",
      getSourceWebsiteFromLink(
        item.productLink
      )
    );
  };

  const handleAddItem = () => {
    if (!isSubmitting) {
      setItems((previous) => [
        ...previous,
        createEmptyItem(),
      ]);
    }
  };

  const handleDeleteItem = (
    itemId
  ) => {
    if (isSubmitting) {
      return;
    }

    if (items.length <= 1) {
      AuthNotify.warning(
        "Không thể xóa",
        "Yêu cầu mua hộ phải có tối thiểu 1 sản phẩm."
      );
      return;
    }

    const targetItem =
      items.find(
        (item) =>
          item.id === itemId
      );

    if (
      targetItem?.image
        ?.previewUrl
    ) {
      URL.revokeObjectURL(
        targetItem.image
          .previewUrl
      );
    }

    setItems((previous) =>
      previous.filter(
        (item) =>
          item.id !== itemId
      )
    );

    setItemErrors(
      (previous) => {
        const nextErrors = {
          ...previous,
        };

        delete nextErrors[
          itemId
        ];

        return nextErrors;
      }
    );

    delete fileInputRefs
      .current[itemId];
  };

  /* ================= IMAGE ================= */

  const handleFileChange = (
    itemId,
    event
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      AuthNotify.warning(
        "File không hợp lệ",
        `Ảnh "${file.name}" không phải JPG, PNG hoặc WEBP.`
      );
      return;
    }

    if (
      file.size >
      MAX_IMAGE_SIZE
    ) {
      AuthNotify.warning(
        "Ảnh quá lớn",
        `Ảnh "${file.name}" vượt quá 5MB.`
      );
      return;
    }

    const newImage = {
      id: createUniqueId(),
      fileObj: file,
      previewUrl:
        URL.createObjectURL(
          file
        ),
    };

    setItems((previous) =>
      previous.map((item) => {
        if (
          item.id !== itemId
        ) {
          return item;
        }

        if (
          item.image
            ?.previewUrl
        ) {
          URL.revokeObjectURL(
            item.image
              .previewUrl
          );
        }

        return {
          ...item,
          image: newImage,
        };
      })
    );

    clearItemError(
      itemId,
      "image"
    );

    AuthNotify.success(
      "Đã chọn ảnh",
      "Ảnh sản phẩm đã được thêm."
    );
  };

  const handleRemoveImage = (
    event,
    itemId,
    previewUrl
  ) => {
    event.stopPropagation();

    if (isSubmitting) {
      return;
    }

    setItems((previous) =>
      previous.map((item) =>
        item.id === itemId
          ? {
              ...item,
              image: null,
            }
          : item
      )
    );

    setItemErrors(
      (previous) => ({
        ...previous,
        [itemId]: {
          ...(previous[
            itemId
          ] || {}),
          image:
            "Vui lòng tải ảnh sản phẩm.",
        },
      })
    );

    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    if (
      activeLightboxImg ===
      previewUrl
    ) {
      setActiveLightboxImg(
        null
      );
    }
  };

  /* ================= VALIDATE & SUBMIT ================= */

  const validateForm = () => {
    const result =
      validateBuyOrderForm({
        form,
        items,
      });

    setFormErrors(
      result.formErrors
    );

    setItemErrors(
      result.itemErrors
    );

    if (!result.isValid) {
      AuthNotify.warning(
        "Thông tin chưa đầy đủ",
        "Vui lòng kiểm tra các trường được đánh dấu màu đỏ."
      );

      scrollToFirstError();
    }

    return result.isValid;
  };

  const handleOpenConfirmation =
    () => {
      if (
        isSubmitting ||
        !validateForm()
      ) {
        return;
      }

      setIsConfirming(true);

      window.setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }, 0);
    };

  const handleCloseConfirmation =
    () => {
      if (isSubmitting) {
        return;
      }

      setIsConfirming(false);

      window.setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }, 0);
    };

  const handleCreateBuyOrder =
    async () => {
      if (
        isSubmitting ||
        !validateForm()
      ) {
        return;
      }

      try {
        setIsSubmitting(true);

        const requestItems = [];

        for (
          let index = 0;
          index < items.length;
          index += 1
        ) {
          const item =
            items[index];

          setSubmitMessage(
            `Đang upload ảnh sản phẩm ${index + 1}/${items.length}...`
          );

          const imageUrl =
            await uploadPackageImage(
              item.image.fileObj
            );

          requestItems.push({
            productLink:
              item.productLink.trim(),
            sourceWebsite:
              item.sourceWebsite.trim(),
            productType:
              item.productType,
            productName:
              item.productName.trim(),
            quantity: Number(
              item.quantity
            ),
            attributes:
              item.attributes.trim(),
            note:
              item.note.trim(),
            imageUrl,
          });
        }

        setSubmitMessage(
          "Đang gửi yêu cầu mua hộ..."
        );

        const selectedAddress =
          addressList.find(
            (addressItem) =>
              addressItem.address ===
              form.selectedDeliveryAddress
          );

        const timePayload =
          getClientTimePayload();

        const result =
          await createPurchaseRequestApi({
            route: form.route,
            receiverName:
              form.receiverName.trim(),
            receiverPhone:
              form.receiverPhone.trim(),
            receiverAddress:
              form.selectedDeliveryAddress.trim(),
            receiverAddressInfo:
              selectedAddress
                ? {
                    address:
                      selectedAddress.address,
                    fullAddress:
                      selectedAddress.fullAddress ||
                      selectedAddress.address,
                    detailAddress:
                      selectedAddress.detailAddress ||
                      "",
                    provinceCode:
                      selectedAddress.provinceCode ||
                      "",
                    provinceName:
                      selectedAddress.provinceName ||
                      "",
                    districtCode:
                      selectedAddress.districtCode ||
                      "",
                    districtName:
                      selectedAddress.districtName ||
                      "",
                    wardCode:
                      selectedAddress.wardCode ||
                      "",
                    wardName:
                      selectedAddress.wardName ||
                      "",
                  }
                : null,
            requiresInspection:
              form.requiresInspection,
            requiresQuantityCheck:
              form.requiresQuantityCheck,
            generalNote:
              form.generalNote.trim(),
            items: requestItems,
            ...timePayload,
          });

        AuthNotify.success(
          "Tạo yêu cầu thành công",
          result?.message ||
            "Yêu cầu mua hộ đã được tiếp nhận."
        );

        navigate("/processing-orders/purchase-requests");
      } catch (error) {
        AuthNotify.error(
          "Tạo yêu cầu thất bại",
          getApiErrorMessage(
            error,
            "Không thể tạo yêu cầu mua hộ. Vui lòng thử lại."
          )
        );
      } finally {
        setIsSubmitting(false);

        setSubmitMessage(
          "Đang chuẩn bị tạo yêu cầu..."
        );
      }
    };

  const selectedRouteOption =
    routeOptions.find(
      (option) =>
        String(option.value) ===
        String(form.route)
    );

  const routeDisplayValue =
    selectedRouteOption?.label ||
    form.route ||
    (
      isLoadingOptions
        ? "Đang tải tuyến hàng..."
        : "Chưa có dữ liệu tuyến hàng"
    );

  if (isConfirming) {
    return (
      <ConsignmentBuyOrderConfirm
        form={form}
        items={items}
        routeOptions={routeOptions}
        productTypeOptions={
          productTypeOptions
        }
        isSubmitting={
          isSubmitting
        }
        submitMessage={
          submitMessage
        }
        onBack={
          handleCloseConfirmation
        }
        onConfirm={
          handleCreateBuyOrder
        }
      />
    );
  }

  return (
    <div
      className={[
        "purchase-buy-order-page",
        isSubmitting &&
          "purchase-buy-consignment-is-submitting",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="purchase-buy-back-navigation"
        disabled={isSubmitting}
        onClick={() =>
          navigate(-1)
        }
      >
        <LeftOutlined className="purchase-buy-back-icon" />
        <span>QUAY LẠI</span>
      </button>

      <div className="purchase-buy-consignment-layout-grid">
        <div className="purchase-buy-layout-left-fixed-sidebar">
          <div className="purchase-buy-page-header-title-box">
            <div className="purchase-buy-title-icon-orange">
              <ShoppingCartOutlined />
            </div>

            <div className="purchase-buy-title-text-group">
              <h2>MUA HỘ HÀNG HÓA</h2>
              <p>TẠO YÊU CẦU MỚI</p>
            </div>
          </div>

          <div className="purchase-buy-left-unified-wrapper-box">
            <div className="purchase-buy-left-inner-section">
              <div className="purchase-buy-input-field-group">
                <label className="purchase-buy-field-label purchase-buy-required-label">
                  <EnvironmentOutlined />
                  TUYẾN HÀNG
                </label>

                <input
                  type="text"
                  value={routeDisplayValue}
                  disabled
                  readOnly
                  title={routeDisplayValue}
                  aria-label={`Tuyến hàng được hệ thống tự động áp dụng: ${routeDisplayValue}`}
                  className={getFieldClassName(
                    "purchase-buy-custom-input purchase-buy-route-readonly-input",
                    formErrors.route
                  )}
                  style={{
                    color: "#64748b",
                    fontWeight: 700,
                    backgroundColor: "#f1f5f9",
                    borderColor: "#cbd5e1",
                    cursor: "not-allowed",
                    opacity: 0.82,
                    WebkitTextFillColor: "#64748b",
                  }}
                />

                <div
                  className="purchase-buy-route-readonly-helper"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 7,
                    color: "#94a3b8",
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  <InfoCircleOutlined />

                  <span>
                    Tuyến hàng được hệ thống
                    tự động áp dụng và không
                    thể chỉnh sửa.
                  </span>
                </div>

                <FieldError
                  message={
                    formErrors.route
                  }
                />
              </div>
            </div>

            <div className="purchase-buy-left-inner-section purchase-buy-border-top-dash">
              <div
                className="purchase-buy-input-field-group"
                style={{
                  marginBottom: 12,
                }}
              >
                <label className="purchase-buy-field-label purchase-buy-required-label">
                  TÊN NGƯỜI NHẬN
                </label>

                <input
                  type="text"
                  value={
                    form.receiverName
                  }
                  disabled={
                    isSubmitting
                  }
                  placeholder="Nhập tên người nhận..."
                  className={getFieldClassName(
                    "purchase-buy-custom-input",
                    formErrors.receiverName
                  )}
                  onChange={(event) =>
                    updateForm(
                      "receiverName",
                      event.target.value
                    )
                  }
                />

                <FieldError
                  message={
                    formErrors.receiverName
                  }
                />
              </div>

              <div className="purchase-buy-input-field-group">
                <label className="purchase-buy-field-label purchase-buy-required-label">
                  SỐ ĐIỆN THOẠI
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={
                    form.receiverPhone
                  }
                  disabled={
                    isSubmitting
                  }
                  placeholder="Nhập số điện thoại..."
                  className={getFieldClassName(
                    "purchase-buy-custom-input",
                    formErrors.receiverPhone
                  )}
                  onChange={(event) =>
                    updateForm(
                      "receiverPhone",
                      event.target.value
                        .replace(
                          /\D/g,
                          ""
                        )
                        .slice(
                          0,
                          10
                        )
                    )
                  }
                />

                <FieldError
                  message={
                    formErrors.receiverPhone
                  }
                />
              </div>
            </div>

            <div className="purchase-buy-left-inner-section purchase-buy-border-top-dash">
              <label className="purchase-buy-field-label">
                <EnvironmentOutlined />
                ĐỊA CHỈ ĐANG CHỌN
              </label>

              <div
                className={getFieldClassName(
                  "purchase-buy-static-display-box purchase-buy-address-received-highlight",
                  formErrors.selectedDeliveryAddress
                )}
              >
                {form.selectedDeliveryAddress ||
                  "Chưa chọn địa chỉ"}
              </div>

              <FieldError
                message={
                  formErrors.selectedDeliveryAddress
                }
              />
            </div>

            <div className="purchase-buy-left-inner-section purchase-buy-border-top-dash">
              <div className="purchase-buy-inner-section-title purchase-buy-required-label">
                CHỌN ĐỊA CHỈ NHẬN HÀNG
              </div>

              {!isAddingAddress ? (
                <>
                  <button
                    type="button"
                    className="purchase-buy-btn-add-address"
                    disabled={
                      isSubmitting ||
                      isLoadingAddresses ||
                      isSavingAddress ||
                      Boolean(
                        deletingAddressId
                      )
                    }
                    onClick={() => {
                      setIsAddingAddress(
                        true
                      );
                      setNewAddressError(
                        ""
                      );
                    }}
                  >
                    <PlusOutlined />
                    THÊM ĐỊA CHỈ NHẬN HÀNG
                  </button>

                  {isLoadingAddresses ? (
                    <div className="purchase-buy-address-empty-message">
                      <LoadingOutlined spin />
                      <span>
                        Đang tải danh sách địa chỉ...
                      </span>
                    </div>
                  ) : addressList.length ? (
                    <div
                      className={[
                        "purchase-buy-address-scroll-container",
                        formErrors.selectedDeliveryAddress &&
                          "purchase-buy-address-list-has-error",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {addressList.map(
                        (
                          addressItem,
                          index
                        ) => {
                          const isSelected =
                            form.selectedDeliveryAddress ===
                            addressItem.address;

                          const isDeleting =
                            deletingAddressId ===
                            addressItem.apiId;

                          return (
                            <div
                              key={
                                addressItem.id ||
                                `${addressItem.address}-${index}`
                              }
                              role="button"
                              tabIndex={0}
                              className={[
                                "purchase-buy-address-item-clickable",
                                isSelected &&
                                  "purchase-buy-is-active",
                                isDeleting &&
                                  "purchase-buy-is-deleting",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() =>
                                updateForm(
                                  "selectedDeliveryAddress",
                                  addressItem.address
                                )
                              }
                              onKeyDown={(
                                event
                              ) => {
                                if (
                                  event.key ===
                                    "Enter" ||
                                  event.key ===
                                    " "
                                ) {
                                  event.preventDefault();

                                  updateForm(
                                    "selectedDeliveryAddress",
                                    addressItem.address
                                  );
                                }
                              }}
                            >
                              <span className="purchase-buy-address-text-truncate">
                                <strong>
                                  {addressItem.address}
                                </strong>
                              </span>

                              {addressItem.isDefault && (
                                <span className="purchase-buy-address-default-badge">
                                  Mặc định
                                </span>
                              )}

                              {isSelected && (
                                <CheckOutlined className="purchase-buy-check-active-icon" />
                              )}

                              <button
                                type="button"
                                className="purchase-buy-btn-delete-address"
                                disabled={
                                  !addressItem.apiId ||
                                  isSubmitting ||
                                  isSavingAddress ||
                                  Boolean(
                                    deletingAddressId
                                  )
                                }
                                onClick={(
                                  event
                                ) =>
                                  handleDeleteAddress(
                                    event,
                                    addressItem
                                  )
                                }
                              >
                                {isDeleting ? (
                                  <LoadingOutlined spin />
                                ) : (
                                  <DeleteOutlined />
                                )}
                              </button>
                            </div>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <div
                      className={[
                        "purchase-buy-address-empty-message",
                        formErrors.selectedDeliveryAddress &&
                          "purchase-buy-address-list-has-error",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      Chưa có địa chỉ nhận hàng.
                    </div>
                  )}
                </>
              ) : (
                <div className="purchase-buy-add-address-inline-form">
                  <label className="purchase-buy-field-label purchase-buy-required-label">
                    ĐỊA CHỈ NHẬN HÀNG MỚI
                  </label>

                  <div className="purchase-buy-address-api-grid">
                    <div className="purchase-buy-input-field-group">
                      <label className="purchase-buy-field-label purchase-buy-required-label">
                        TỈNH / THÀNH PHỐ
                      </label>

                      <select
                        value={
                          newAddressSelect.provinceCode
                        }
                        disabled={
                          isSubmitting ||
                          isSavingAddress ||
                          isLoadingProvinces
                        }
                        className={getFieldClassName(
                          "purchase-buy-custom-select",
                          newAddressError &&
                            !newAddressSelect.provinceCode
                            ? newAddressError
                            : ""
                        )}
                        onChange={(event) =>
                          updateNewAddressSelect(
                            "provinceCode",
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          {isLoadingProvinces
                            ? "Đang tải tỉnh/thành..."
                            : "Chọn tỉnh/thành"}
                        </option>

                        {provinceOptions.map(
                          (province) => (
                            <option
                              key={province.value}
                              value={province.value}
                            >
                              {province.label}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="purchase-buy-input-field-group">
                      <label className="purchase-buy-field-label purchase-buy-required-label">
                        QUẬN / HUYỆN
                      </label>

                      <select
                        value={
                          newAddressSelect.districtCode
                        }
                        disabled={
                          isSubmitting ||
                          isSavingAddress ||
                          isLoadingDistricts ||
                          !newAddressSelect.provinceCode
                        }
                        className="purchase-buy-custom-select"
                        onChange={(event) =>
                          updateNewAddressSelect(
                            "districtCode",
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          {isLoadingDistricts
                            ? "Đang tải quận/huyện..."
                            : "Chọn quận/huyện"}
                        </option>

                        {districtOptions.map(
                          (district) => (
                            <option
                              key={district.value}
                              value={district.value}
                            >
                              {district.label}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="purchase-buy-input-field-group">
                      <label className="purchase-buy-field-label purchase-buy-required-label">
                        PHƯỜNG / XÃ
                      </label>

                      <select
                        value={
                          newAddressSelect.wardCode
                        }
                        disabled={
                          isSubmitting ||
                          isSavingAddress ||
                          isLoadingWards ||
                          !newAddressSelect.districtCode
                        }
                        className="purchase-buy-custom-select"
                        onChange={(event) =>
                          updateNewAddressSelect(
                            "wardCode",
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          {isLoadingWards
                            ? "Đang tải phường/xã..."
                            : "Chọn phường/xã"}
                        </option>

                        {wardOptions.map(
                          (ward) => (
                            <option
                              key={ward.value}
                              value={ward.value}
                            >
                              {ward.label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={
                      newAddressInput
                    }
                    disabled={
                      isSubmitting ||
                      isSavingAddress
                    }
                    placeholder="Số nhà, tên đường..."
                    className={getFieldClassName(
                      "purchase-buy-custom-input purchase-buy-small-input",
                      newAddressError
                    )}
                    onChange={(event) => {
                      setNewAddressInput(
                        event.target.value
                      );
                      setNewAddressError(
                        ""
                      );
                    }}
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                          "Enter" &&
                        !isSavingAddress
                      ) {
                        event.preventDefault();

                        handleSaveAddress();
                      }
                    }}
                  />

                  <div className="purchase-buy-address-preview-box">
                    <span>Địa chỉ sẽ lưu</span>
                    <strong>
                      {[
                        newAddressInput.trim(),
                        getAddressOptionName(
                          wardOptions,
                          newAddressSelect.wardCode
                        ),
                        getAddressOptionName(
                          districtOptions,
                          newAddressSelect.districtCode
                        ),
                        getAddressOptionName(
                          provinceOptions,
                          newAddressSelect.provinceCode
                        ),
                      ]
                        .filter(Boolean)
                        .join(", ") ||
                        "Chưa đủ thông tin địa chỉ"}
                    </strong>
                  </div>

                  <FieldError
                    message={
                      newAddressError
                    }
                  />

                  <div className="purchase-buy-inline-form-actions">
                    <button
                      type="button"
                      className="purchase-buy-btn-inline-cancel"
                      disabled={
                        isSubmitting ||
                        isSavingAddress
                      }
                      onClick={() => {
                        setIsAddingAddress(
                          false
                        );
                        resetNewAddressForm();
                        setNewAddressError(
                          ""
                        );
                      }}
                    >
                      Hủy
                    </button>

                    <button
                      type="button"
                      className="purchase-buy-btn-inline-save"
                      disabled={
                        isSubmitting ||
                        isSavingAddress
                      }
                      onClick={
                        handleSaveAddress
                      }
                    >
                      {isSavingAddress ? (
                        <>
                          <LoadingOutlined spin />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <CheckOutlined />
                          Lưu địa chỉ
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="purchase-buy-left-inner-section purchase-buy-border-top-dash purchase-buy-toggle-row">
              <div className="purchase-buy-toggle-icon-box">
                <SafetyCertificateOutlined />
              </div>

              <div className="purchase-buy-toggle-text-info">
                <h4>YÊU CẦU KIỂM HÀNG</h4>
                <p>
                  Kiểm tra tình trạng sản phẩm khi về kho.
                </p>
              </div>

              <Switch
                checked={
                  form.requiresInspection
                }
                disabled={
                  isSubmitting
                }
                onChange={(value) =>
                  updateForm(
                    "requiresInspection",
                    value
                  )
                }
              />
            </div>

            <div className="purchase-buy-left-inner-section purchase-buy-border-top-dash purchase-buy-toggle-row">
              <div className="purchase-buy-toggle-icon-box">
                <CheckOutlined />
              </div>

              <div className="purchase-buy-toggle-text-info">
                <h4>KIỂM SỐ LƯỢNG</h4>
                <p>
                  Đối chiếu số lượng sản phẩm thực nhận.
                </p>
              </div>

              <Switch
                checked={
                  form.requiresQuantityCheck
                }
                disabled={
                  isSubmitting
                }
                onChange={(value) =>
                  updateForm(
                    "requiresQuantityCheck",
                    value
                  )
                }
              />
            </div>

            <div className="purchase-buy-left-inner-section purchase-buy-border-top-dash">
              <div className="purchase-buy-input-field-group">
                <label className="purchase-buy-field-label">
                  GHI CHÚ CHUNG
                </label>

                <textarea
                  rows={4}
                  value={
                    form.generalNote
                  }
                  disabled={
                    isSubmitting
                  }
                  maxLength={1000}
                  placeholder="Nhập yêu cầu hoặc lưu ý chung..."
                  className="purchase-buy-custom-textarea"
                  onChange={(event) =>
                    updateForm(
                      "generalNote",
                      event.target.value
                    )
                  }
                />

                <div className="purchase-buy-sub-helper-text">
                  {form.generalNote.length}/1000 ký tự
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="purchase-buy-layout-right-scrollable-form">
          <div className="purchase-buy-scrollable-content-wrapper">
            {items.map(
              (item, index) => {
                const errors =
                  itemErrors[
                    item.id
                  ] || {};

                return (
                  <section
                    key={item.id}
                    className="purchase-buy-form-main-card"
                  >
                    <div className="purchase-buy-form-step-header">
                      <div className="purchase-buy-step-header-left">
                        <div className="purchase-buy-step-number-circle">
                          {index + 1}
                        </div>

                        <h3>
                          THÔNG TIN SẢN PHẨM{" "}
                          {index + 1}
                        </h3>
                      </div>

                      {items.length >
                        1 && (
                        <button
                          type="button"
                          disabled={
                            isSubmitting
                          }
                          className="purchase-buy-btn-delete-package"
                          onClick={() =>
                            handleDeleteItem(
                              item.id
                            )
                          }
                        >
                          <DeleteOutlined />
                          Xóa sản phẩm
                        </button>
                      )}
                    </div>

                    <div className="purchase-buy-input-field-group purchase-buy-product-link-field">
                      <label className="purchase-buy-field-label purchase-buy-required-label">
                        <LinkOutlined />
                        LINK SẢN PHẨM
                      </label>

                      <input
                        type="url"
                        value={
                          item.productLink
                        }
                        disabled={
                          isSubmitting
                        }
                        placeholder="https://example.com/san-pham..."
                        className={getFieldClassName(
                          "purchase-buy-custom-input",
                          errors.productLink
                        )}
                        onChange={(
                          event
                        ) =>
                          handleItemChange(
                            item.id,
                            "productLink",
                            event.target.value
                          )
                        }
                        onBlur={() =>
                          handleProductLinkBlur(
                            item
                          )
                        }
                      />

                      <FieldError
                        message={
                          errors.productLink
                        }
                      />
                    </div>

                    <div className="purchase-buy-form-row-2col purchase-buy-product-basic-grid">
                      <div className="purchase-buy-input-field-group">
                        <div className="purchase-buy-field-label-row">
                          <label className="purchase-buy-field-label purchase-buy-required-label">
                            WEBSITE NGUỒN
                          </label>

                          <Tooltip
    title="Nhập tên website bán sản phẩm, ví dụ: amazon.com, shopee.vn hoặc taobao.com."
    placement="top"
  >
    <InfoCircleOutlined
      style={{
        color: "#1890ff",
        cursor: "pointer",
        fontSize: "14px",
        flexShrink: 0,
      }}
    />
  </Tooltip>
                        </div>

                        <input
                          type="text"
                          value={
                            item.sourceWebsite
                          }
                          disabled={
                            isSubmitting
                          }
                          placeholder="Ví dụ: amazon.com"
                          className={getFieldClassName(
                            "purchase-buy-custom-input",
                            errors.sourceWebsite
                          )}
                          onChange={(
                            event
                          ) =>
                            handleItemChange(
                              item.id,
                              "sourceWebsite",
                              event.target.value
                            )
                          }
                        />

                        <FieldError
                          message={
                            errors.sourceWebsite
                          }
                        />
                      </div>

                      <div className="purchase-buy-input-field-group">
                        <label className="purchase-buy-field-label purchase-buy-required-label">
                          LOẠI SẢN PHẨM
                        </label>

                        <select
                          value={
                            item.productType
                          }
                          disabled={
                            isSubmitting ||
                            isLoadingOptions
                          }
                          className={getFieldClassName(
                            "purchase-buy-custom-select",
                            errors.productType
                          )}
                          onChange={(
                            event
                          ) =>
                            handleItemChange(
                              item.id,
                              "productType",
                              event.target.value
                            )
                          }
                        >
                          <option value="">
                            {isLoadingOptions
                              ? "Đang tải loại sản phẩm..."
                              : "-- Chọn loại sản phẩm --"}
                          </option>

                          {productTypeOptions.map(
                            (
                              option
                            ) => (
                              <option
                                key={
                                  option.value
                                }
                                value={
                                  option.value
                                }
                              >
                                {
                                  option.label
                                }
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

                    <div className="purchase-buy-form-row-2col">
                      <div className="purchase-buy-input-field-group">
                        <label className="purchase-buy-field-label purchase-buy-required-label">
                          TÊN SẢN PHẨM
                        </label>

                        <input
                          type="text"
                          value={
                            item.productName
                          }
                          disabled={
                            isSubmitting
                          }
                          placeholder="Nhập tên sản phẩm..."
                          className={getFieldClassName(
                            "purchase-buy-custom-input",
                            errors.productName
                          )}
                          onChange={(
                            event
                          ) =>
                            handleItemChange(
                              item.id,
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

                      <div className="purchase-buy-input-field-group">
                        <label className="purchase-buy-field-label purchase-buy-required-label">
                          SỐ LƯỢNG
                        </label>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            item.quantity
                          }
                          disabled={
                            isSubmitting
                          }
                          placeholder="Nhập số lượng..."
                          className={getFieldClassName(
                            "purchase-buy-custom-input",
                            errors.quantity
                          )}
                          onKeyDown={
                            preventInvalidNumberKeys
                          }
                          onChange={(
                            event
                          ) =>
                            handleItemChange(
                              item.id,
                              "quantity",
                              sanitizeInteger(
                                event.target.value
                              )
                            )
                          }
                        />

                        <FieldError
                          message={
                            errors.quantity
                          }
                        />
                      </div>
                    </div>

                    <div className="purchase-buy-input-field-group purchase-buy-product-attributes-field">
                      <div className="purchase-buy-field-label-row">
                        <label className="purchase-buy-field-label purchase-buy-required-label">
                          THUỘC TÍNH SẢN PHẨM
                        </label>

                        <Tooltip
  title="Nhập đặc điểm cần mua chính xác như màu sắc, kích thước, phiên bản hoặc dung lượng."
  placement="top"
>
  <InfoCircleOutlined
    role="button"
    tabIndex={0}
    aria-label="Hướng dẫn nhập thuộc tính sản phẩm"
    style={{
      color: "#1890ff",
      cursor: "pointer",
      fontSize: "14px",
      flexShrink: 0,
      marginLeft: "6px",
    }}
  />
</Tooltip>
                      </div>

                      <input
                        type="text"
                        value={
                          item.attributes
                        }
                        disabled={
                          isSubmitting
                        }
                        placeholder="Ví dụ: Màu đen, Size M, phiên bản 256GB..."
                        className={getFieldClassName(
                          "purchase-buy-custom-input",
                          errors.attributes
                        )}
                        onChange={(
                          event
                        ) =>
                          handleItemChange(
                            item.id,
                            "attributes",
                            event.target.value
                          )
                        }
                      />

                      <FieldError
                        message={
                          errors.attributes
                        }
                      />
                    </div>

                    <div className="purchase-buy-input-field-group">
                      <label className="purchase-buy-field-label">
                        GHI CHÚ SẢN PHẨM
                      </label>

                      <textarea
                        rows={3}
                        value={
                          item.note
                        }
                        disabled={
                          isSubmitting
                        }
                        maxLength={500}
                        placeholder="Nhập yêu cầu riêng cho sản phẩm..."
                        className="purchase-buy-custom-textarea"
                        onChange={(
                          event
                        ) =>
                          handleItemChange(
                            item.id,
                            "note",
                            event.target.value
                          )
                        }
                      />

                      <div className="purchase-buy-sub-helper-text">
                        {item.note.length}/500 ký tự
                      </div>
                    </div>

                    <div className="purchase-buy-input-field-group purchase-buy-package-image-section">
                      <label className="purchase-buy-field-label purchase-buy-required-label">
                        ẢNH SẢN PHẨM
                      </label>

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={
                          isSubmitting
                        }
                        style={{
                          display:
                            "none",
                        }}
                        ref={(element) => {
                          fileInputRefs.current[
                            item.id
                          ] = element;
                        }}
                        onChange={(
                          event
                        ) =>
                          handleFileChange(
                            item.id,
                            event
                          )
                        }
                      />

                      {!item.image ? (
                        <div
                          role="button"
                          tabIndex={0}
                          className={[
                            "purchase-buy-upload-dropzone-box-clickable",
                            errors.image &&
                              "purchase-buy-upload-has-error",
                            isSubmitting &&
                              "purchase-buy-upload-is-disabled",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() =>
                            fileInputRefs.current[
                              item.id
                            ]?.click()
                          }
                          onKeyDown={(
                            event
                          ) => {
                            if (
                              event.key ===
                                "Enter" ||
                              event.key ===
                                " "
                            ) {
                              event.preventDefault();

                              fileInputRefs.current[
                                item.id
                              ]?.click();
                            }
                          }}
                        >
                          <CloudUploadOutlined className="purchase-buy-upload-big-icon" />

                          <span className="purchase-buy-upload-main-text">
                            Bấm để chọn ảnh sản phẩm
                          </span>

                          <span className="purchase-buy-upload-sub-text">
                            JPG, PNG, WEBP — tối đa 5MB
                          </span>
                        </div>
                      ) : (
                        <div className="purchase-buy-image-previews-grid purchase-buy-animation-fade-in">
                          <div
                            className="purchase-buy-preview-image-item"
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              setActiveLightboxImg(
                                item.image.previewUrl
                              )
                            }
                            onKeyDown={(event) => {
                              if (
                                event.key === "Enter" ||
                                event.key === " "
                              ) {
                                event.preventDefault();
                                setActiveLightboxImg(
                                  item.image.previewUrl
                                );
                              }
                            }}
                          >
                            <img
                              src={
                                item.image.previewUrl
                              }
                              alt={
                                item.productName ||
                                `Sản phẩm ${index + 1}`
                              }
                            />

                            <button
                              type="button"
                              className="purchase-buy-btn-remove-preview-img"
                              disabled={
                                isSubmitting
                              }
                              aria-label="Xóa ảnh sản phẩm"
                              onClick={(event) =>
                                handleRemoveImage(
                                  event,
                                  item.id,
                                  item.image.previewUrl
                                )
                              }
                            >
                              <CloseOutlined />
                            </button>
                          </div>
                        </div>
                      )}

                      <FieldError
                        message={
                          errors.image
                        }
                      />
                    </div>
                  </section>
                );
              }
            )}

            <button
              type="button"
              disabled={
                isSubmitting
              }
              className={[
                "purchase-buy-add-package-dashed-trigger",
                isSubmitting &&
                  "purchase-buy-add-package-disabled",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={
                handleAddItem
              }
            >
              <PlusCircleOutlined className="purchase-buy-plus-dashed-icon" />
              <span>
                THÊM SẢN PHẨM MUA HỘ
              </span>
            </button>
            <div className="purchase-buy-input-field-group">
                <label className="purchase-buy-field-label">
                  GHI CHÚ CHUNG
                </label>

                <textarea
                  rows={4}
                  value={
                    form.generalNote
                  }
                  disabled={
                    isSubmitting
                  }
                  maxLength={1000}
                  placeholder="Nhập yêu cầu hoặc lưu ý chung..."
                  className="purchase-buy-custom-textarea"
                  onChange={(event) =>
                    updateForm(
                      "generalNote",
                      event.target.value
                    )
                  }
                />

                <div className="purchase-buy-sub-helper-text">
                  {form.generalNote.length}/1000 ký tự
                </div>
              </div>


            <div className="purchase-buy-sticky-action-notice-bar">
              <div className="purchase-buy-notice-left-message">
                <InfoCircleOutlined className="purchase-buy-info-notice-icon" />

                <p>
                  <strong>
                    LƯU Ý:
                  </strong>{" "}
                  Việt Nam Logictic sẽ kiểm tra link,
                  thuộc tính và số lượng
                  trước khi tiến hành báo giá.
                </p>
              </div>

              <button
                type="button"
                className="purchase-buy-btn-final-submit-order"
                disabled={
                  isSubmitting
                }
                onClick={
                  handleOpenConfirmation
                }
              >
                {isSubmitting ? (
                  <>
                    <LoadingOutlined spin />
                    ĐANG TẠO YÊU CẦU...
                  </>
                ) : (
                  <>
                    <CheckOutlined />
                    XÁC NHẬN YÊU CẦU MUA HỘ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isSubmitting && (
        <div
          className="purchase-buy-create-order-loading-overlay"
          role="status"
          aria-live="polite"
        >
          <div className="purchase-buy-create-order-loading-card">
            <div className="purchase-buy-create-order-loading-icon">
              <LoadingOutlined spin />
            </div>

            <h3>
              ĐANG TẠO YÊU CẦU MUA HỘ
            </h3>

            <p>{submitMessage}</p>

            <div className="purchase-buy-create-order-loading-bar">
              <span />
            </div>

            <small>
              Vui lòng không đóng hoặc tải lại trang.
            </small>
          </div>
        </div>
      )}

      {activeLightboxImg && (
        <div
          className="purchase-buy-lightbox-overlay-modal"
          onClick={() =>
            setActiveLightboxImg(
              null
            )
          }
        >
          <div
            className="purchase-buy-lightbox-content-box purchase-buy-animate-zoom-in"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <img
              src={
                activeLightboxImg
              }
              alt="Phóng to"
              className="purchase-buy-lightbox-main-img"
            />
          </div>

          <span className="purchase-buy-lightbox-hint-text">
            Bấm vào vùng trống để đóng
          </span>
        </div>
      )}
    </div>
  );
}
