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
import { Switch } from "antd";

import AuthNotify from "../../../../utils/AuthNotify";

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

import "./ConsignmentBuyOrder.css";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const UPLOAD_IMAGE_API_URL =
  "https://api-vcl.purintech.id.vn/api/uploads/image";

const INITIAL_FORM = {
  route: "",
  receiverName: "",
  receiverPhone: "",
  selectedDeliveryAddress: "",
  requiresInspection: true,
  requiresQuantityCheck: true,
  generalNote: "",
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

const sanitizeInteger = (value) =>
  String(value ?? "").replace(/\D/g, "");

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

const uploadImageDirectly = async (
  file
) => {
  if (!(file instanceof File)) {
    throw new Error(
      "File ảnh không hợp lệ."
    );
  }

  if (
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type)
  ) {
    throw new Error(
      "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP."
    );
  }

  if (
    file.size > MAX_IMAGE_SIZE
  ) {
    throw new Error(
      "Dung lượng ảnh không được vượt quá 5MB."
    );
  }

  const token =
    sessionStorage.getItem(
      "accessToken"
    ) ||
    localStorage.getItem(
      "accessToken"
    );

  if (!token) {
    throw new Error(
      "Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại."
    );
  }

  const formData =
    new FormData();

  formData.append(
    "file",
    file,
    file.name
  );

  let response;

  try {
    response = await fetch(
      UPLOAD_IMAGE_API_URL,
      {
        method: "POST",
        headers: {
          Accept: "text/plain",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );
  } catch {
    throw new Error(
      "Không thể kết nối đến máy chủ upload ảnh."
    );
  }

  const responseText =
    await response.text();

  let responseData =
    responseText;

  if (responseText) {
    try {
      responseData =
        JSON.parse(responseText);
    } catch {
      responseData =
        responseText;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem(
        "accessToken"
      );
      localStorage.removeItem(
        "accessToken"
      );

      window.location.href =
        "/login";

      throw new Error(
        "Phiên đăng nhập đã hết hạn."
      );
    }

    const serverMessage =
      typeof responseData === "string"
        ? responseData
        : responseData?.message ||
          responseData?.title ||
          responseData?.error;

    throw new Error(
      serverMessage ||
        `Upload ảnh thất bại (${response.status}).`
    );
  }

  const imageUrl =
    extractUploadedImageUrl(
      responseData
    );

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
      "Vui lòng chọn tuyến hàng.";
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
    activeLightboxImg,
    setActiveLightboxImg,
  ] = useState(null);

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

          setRouteOptions(
            normalizeOptionList(
              routesResult,
              ["routes"]
            )
          );

          setProductTypeOptions(
            normalizeOptionList(
              productTypesResult,
              ["productTypes"]
            )
          );
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

  const handleSaveAddress =
    async () => {
      const address =
        newAddressInput.trim();

      if (
        isSubmitting ||
        isSavingAddress
      ) {
        return;
      }

      if (!address) {
        setNewAddressError(
          "Vui lòng nhập địa chỉ nhận hàng."
        );
        return;
      }

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
          await createDeliveryAddressApi({
            address,
          });

        let refreshedAddresses;

        try {
          refreshedAddresses =
            await loadDeliveryAddresses();
        } catch {
          const createdAddress =
            normalizeDeliveryAddress(
              createdResult?.data ||
                createdResult,
              addressList.length
            ) || {
              id: createUniqueId(),
              apiId: "",
              address,
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

        setNewAddressInput("");
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
            await uploadImageDirectly(
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

        const result =
          await createPurchaseRequestApi({
            route: form.route,
            receiverName:
              form.receiverName.trim(),
            receiverPhone:
              form.receiverPhone.trim(),
            receiverAddress:
              form.selectedDeliveryAddress.trim(),
            requiresInspection:
              form.requiresInspection,
            requiresQuantityCheck:
              form.requiresQuantityCheck,
            generalNote:
              form.generalNote.trim(),
            items: requestItems,
          });

        AuthNotify.success(
          "Tạo yêu cầu thành công",
          result?.message ||
            "Yêu cầu mua hộ đã được tiếp nhận."
        );

        navigate("/processing-orders");
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
              <SelectField
                label="TUYẾN HÀNG"
                value={form.route}
                error={
                  formErrors.route
                }
                options={
                  routeOptions
                }
                loading={
                  isLoadingOptions
                }
                disabled={
                  isSubmitting
                }
                placeholder="-- Chọn tuyến hàng --"
                onChange={(value) =>
                  updateForm(
                    "route",
                    value
                  )
                }
              />
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

                  <input
                    type="text"
                    value={
                      newAddressInput
                    }
                    disabled={
                      isSubmitting ||
                      isSavingAddress
                    }
                    placeholder="Nhập địa chỉ nhận hàng..."
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
                        setNewAddressInput(
                          ""
                        );
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

                    <div className="purchase-buy-input-field-group">
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

                    <div className="purchase-buy-form-row-2col">
                      <div className="purchase-buy-input-field-group">
                        <label className="purchase-buy-field-label purchase-buy-required-label">
                          WEBSITE NGUỒN
                        </label>

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

                    <div className="purchase-buy-input-field-group">
                      <label className="purchase-buy-field-label purchase-buy-required-label">
                        THUỘC TÍNH SẢN PHẨM
                      </label>

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

            <div className="purchase-buy-sticky-action-notice-bar">
              <div className="purchase-buy-notice-left-message">
                <InfoCircleOutlined className="purchase-buy-info-notice-icon" />

                <p>
                  <strong>
                    LƯU Ý:
                  </strong>{" "}
                  VCL sẽ kiểm tra link,
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
                  handleCreateBuyOrder
                }
              >
                {isSubmitting ? (
                  <>
                    <LoadingOutlined spin />
                    ĐANG TẠO YÊU CẦU...
                  </>
                ) : (
                  "TẠO YÊU CẦU MUA HỘ"
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
