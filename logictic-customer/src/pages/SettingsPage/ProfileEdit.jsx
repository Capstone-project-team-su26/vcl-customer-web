import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Button,
  CircularProgress,
} from "@mui/material";

import {
  updateUserProfileApi,
} from "../../api/Auth/authService";

import {
  getDistrictsByProvinceCode,
  getProvinces,
  getWardsByDistrictCode,
} from "../../api/addressApi";

import AuthNotify from "../../utils/AuthNotify";

const COUNTRY_LIST = [
  { code: "VN", name: "Vietnam", label: "Việt Nam" },
  { code: "US", name: "United States", label: "Hoa Kỳ" },
  { code: "SG", name: "Singapore", label: "Singapore" },
  { code: "JP", name: "Japan", label: "Nhật Bản" },
  { code: "KR", name: "South Korea", label: "Hàn Quốc" },
  { code: "CN", name: "China", label: "Trung Quốc" },
  { code: "TH", name: "Thailand", label: "Thái Lan" },
  { code: "MY", name: "Malaysia", label: "Malaysia" },
  { code: "AU", name: "Australia", label: "Úc" },
  { code: "DE", name: "Germany", label: "Đức" },
  { code: "FR", name: "France", label: "Pháp" },
  { code: "GB", name: "United Kingdom", label: "Vương quốc Anh" },
];

const EMPTY_ADDRESS_FORM = {
  provinceCode: "",
  districtCode: "",
  wardCode: "",
  detailAddress: "",
};

const normalizeCountryValue = (country) => {
  const value = String(country || "")
    .trim()
    .toLowerCase();

  if (
    value === "việt nam" ||
    value === "viet nam" ||
    value === "vn" ||
    value === "vietnam"
  ) {
    return "Vietnam";
  }

  const matchedCountry = COUNTRY_LIST.find((item) => {
    return (
      item.name.toLowerCase() === value ||
      item.label.toLowerCase() === value ||
      item.code.toLowerCase() === value
    );
  });

  return matchedCountry?.name || country || "Vietnam";
};

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "AbortError" ||
    error?.name === "CanceledError"
  );
};

const getOptionLabel = (
  options,
  selectedValue
) => {
  return (
    options.find(
      (option) =>
        String(option.value) ===
        String(selectedValue)
    )?.label || ""
  );
};

export default function ProfileEdit({
  profile,
  loading,
  onUpdated,
}) {
  const [formData, setFormData] =
    useState({
      fullName: "",
      phone: "",
      country: "Vietnam",
      address: "",
    });

  const [
    addressForm,
    setAddressForm,
  ] = useState({
    ...EMPTY_ADDRESS_FORM,
  });

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
    loadingProvinces,
    setLoadingProvinces,
  ] = useState(false);

  const [
    loadingDistricts,
    setLoadingDistricts,
  ] = useState(false);

  const [
    loadingWards,
    setLoadingWards,
  ] = useState(false);

  const [
    addressTouched,
    setAddressTouched,
  ] = useState(false);

  const [errors, setErrors] =
    useState({});

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const isVietnam =
    normalizeCountryValue(
      formData.country
    ) === "Vietnam";

  /* =========================================================
     ĐỔ DỮ LIỆU PROFILE VÀO FORM
     ========================================================= */

  useEffect(() => {
    if (!profile) {
      return;
    }

    setFormData({
      fullName:
        profile.fullName || "",
      phone: profile.phone || "",
      country:
        normalizeCountryValue(
          profile.country
        ),
      address:
        profile.address || "",
    });

    setAddressForm({
      ...EMPTY_ADDRESS_FORM,
    });

    setDistrictOptions([]);
    setWardOptions([]);
    setAddressTouched(false);
    setErrors({});
  }, [profile]);

  /* =========================================================
     TẢI TỈNH / THÀNH PHỐ
     ========================================================= */

  useEffect(() => {
    if (!isVietnam) {
      setProvinceOptions([]);
      setDistrictOptions([]);
      setWardOptions([]);
      return undefined;
    }

    const controller =
      new AbortController();

    const fetchProvinces =
      async () => {
        try {
          setLoadingProvinces(true);

          const data =
            await getProvinces({
              signal:
                controller.signal,
            });

          setProvinceOptions(
            Array.isArray(data)
              ? data
              : []
          );
        } catch (error) {
          if (
            isCanceledRequest(error)
          ) {
            return;
          }

          console.error(
            "Lỗi tải tỉnh/thành phố:",
            error
          );

          setProvinceOptions([]);

          AuthNotify.error(
            "Không tải được tỉnh/thành phố",
            error?.message ||
              "Vui lòng thử lại sau."
          );
        } finally {
          if (
            !controller.signal.aborted
          ) {
            setLoadingProvinces(
              false
            );
          }
        }
      };

    fetchProvinces();

    return () => {
      controller.abort();
    };
  }, [isVietnam]);

  /* =========================================================
     TẢI QUẬN / HUYỆN
     ========================================================= */

  useEffect(() => {
    if (
      !isVietnam ||
      !addressForm.provinceCode
    ) {
      setDistrictOptions([]);
      setWardOptions([]);
      return undefined;
    }

    const controller =
      new AbortController();

    const fetchDistricts =
      async () => {
        try {
          setLoadingDistricts(true);

          const data =
            await getDistrictsByProvinceCode(
              addressForm.provinceCode,
              {
                signal:
                  controller.signal,
              }
            );

          setDistrictOptions(
            Array.isArray(data)
              ? data
              : []
          );
        } catch (error) {
          if (
            isCanceledRequest(error)
          ) {
            return;
          }

          console.error(
            "Lỗi tải quận/huyện:",
            error
          );

          setDistrictOptions([]);
          setWardOptions([]);

          AuthNotify.error(
            "Không tải được quận/huyện",
            error?.message ||
              "Vui lòng thử lại sau."
          );
        } finally {
          if (
            !controller.signal.aborted
          ) {
            setLoadingDistricts(
              false
            );
          }
        }
      };

    fetchDistricts();

    return () => {
      controller.abort();
    };
  }, [
    isVietnam,
    addressForm.provinceCode,
  ]);

  /* =========================================================
     TẢI PHƯỜNG / XÃ
     ========================================================= */

  useEffect(() => {
    if (
      !isVietnam ||
      !addressForm.districtCode
    ) {
      setWardOptions([]);
      return undefined;
    }

    const controller =
      new AbortController();

    const fetchWards = async () => {
      try {
        setLoadingWards(true);

        const data =
          await getWardsByDistrictCode(
            addressForm.districtCode,
            {
              signal:
                controller.signal,
            }
          );

        setWardOptions(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        if (
          isCanceledRequest(error)
        ) {
          return;
        }

        console.error(
          "Lỗi tải phường/xã:",
          error
        );

        setWardOptions([]);

        AuthNotify.error(
          "Không tải được phường/xã",
          error?.message ||
            "Vui lòng thử lại sau."
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoadingWards(false);
        }
      }
    };

    fetchWards();

    return () => {
      controller.abort();
    };
  }, [
    isVietnam,
    addressForm.districtCode,
  ]);

  /* =========================================================
     LẤY TÊN ĐỊA CHỈ ĐÃ CHỌN
     ========================================================= */

  const provinceName = useMemo(
    () =>
      getOptionLabel(
        provinceOptions,
        addressForm.provinceCode
      ),
    [
      provinceOptions,
      addressForm.provinceCode,
    ]
  );

  const districtName = useMemo(
    () =>
      getOptionLabel(
        districtOptions,
        addressForm.districtCode
      ),
    [
      districtOptions,
      addressForm.districtCode,
    ]
  );

  const wardName = useMemo(
    () =>
      getOptionLabel(
        wardOptions,
        addressForm.wardCode
      ),
    [
      wardOptions,
      addressForm.wardCode,
    ]
  );

  /* =========================================================
     GHÉP ĐỊA CHỈ HOÀN CHỈNH
     ========================================================= */

  useEffect(() => {
    if (
      !isVietnam ||
      !addressTouched
    ) {
      return;
    }

    const fullAddress = [
      addressForm.detailAddress.trim(),
      wardName,
      districtName,
      provinceName,
    ]
      .filter(Boolean)
      .join(", ");

    setFormData((previous) => ({
      ...previous,
      address: fullAddress,
    }));
  }, [
    isVietnam,
    addressTouched,
    addressForm.detailAddress,
    provinceName,
    districtName,
    wardName,
  ]);

  const clearError = (fieldName) => {
    setErrors((previous) => {
      if (!previous[fieldName]) {
        return previous;
      }

      return {
        ...previous,
        [fieldName]: "",
      };
    });
  };

  /* =========================================================
     INPUT CƠ BẢN
     ========================================================= */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    if (name === "phone") {
      const onlyNumbers =
        value.replace(
          /[^0-9]/g,
          ""
        );

      const maxLength =
        isVietnam ? 10 : 15;

      if (
        onlyNumbers.length >
        maxLength
      ) {
        return;
      }

      setFormData((previous) => ({
        ...previous,
        phone: onlyNumbers,
      }));
    } else {
      setFormData((previous) => ({
        ...previous,
        [name]: value,
      }));
    }

    clearError(name);
  };

  const handleCountryChange = (
    event
  ) => {
    const nextCountry =
      event.target.value;

    setFormData((previous) => ({
      ...previous,
      country: nextCountry,
      address: "",
    }));

    setAddressForm({
      ...EMPTY_ADDRESS_FORM,
    });

    setDistrictOptions([]);
    setWardOptions([]);
    setAddressTouched(false);

    clearError("country");
    clearError("address");
    clearError("provinceCode");
    clearError("districtCode");
    clearError("wardCode");
  };

  const handleProvinceChange = (
    event
  ) => {
    setAddressTouched(true);

    setAddressForm(
      (previous) => ({
        ...previous,
        provinceCode:
          event.target.value,
        districtCode: "",
        wardCode: "",
      })
    );

    setDistrictOptions([]);
    setWardOptions([]);

    clearError("provinceCode");
    clearError("districtCode");
    clearError("wardCode");
    clearError("address");
  };

  const handleDistrictChange = (
    event
  ) => {
    setAddressTouched(true);

    setAddressForm(
      (previous) => ({
        ...previous,
        districtCode:
          event.target.value,
        wardCode: "",
      })
    );

    setWardOptions([]);

    clearError("districtCode");
    clearError("wardCode");
    clearError("address");
  };

  const handleWardChange = (
    event
  ) => {
    setAddressTouched(true);

    setAddressForm(
      (previous) => ({
        ...previous,
        wardCode:
          event.target.value,
      })
    );

    clearError("wardCode");
    clearError("address");
  };

  const handleDetailAddressChange = (
    event
  ) => {
    setAddressTouched(true);

    setAddressForm(
      (previous) => ({
        ...previous,
        detailAddress:
          event.target.value,
      })
    );

    clearError("address");
  };

  /* =========================================================
     VALIDATE
     ========================================================= */

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName =
        "Vui lòng nhập họ và tên.";
    }

    if (!formData.phone.trim()) {
      newErrors.phone =
        "Vui lòng nhập số điện thoại.";
    } else if (
      isVietnam &&
      formData.phone.length !== 10
    ) {
      newErrors.phone =
        "Số điện thoại Việt Nam phải có đúng 10 chữ số.";
    } else if (
      formData.phone.length < 8
    ) {
      newErrors.phone =
        "Số điện thoại phải có ít nhất 8 chữ số.";
    }

    if (!formData.country) {
      newErrors.country =
        "Vui lòng chọn quốc gia.";
    }

    if (isVietnam) {
      /*
       * Có địa chỉ cũ và chưa chọn lại dropdown:
       * cho phép giữ nguyên địa chỉ cũ.
       */
      if (
        addressTouched ||
        !formData.address.trim()
      ) {
        if (
          !addressForm.provinceCode
        ) {
          newErrors.provinceCode =
            "Vui lòng chọn tỉnh/thành phố.";
        }

        if (
          !addressForm.districtCode
        ) {
          newErrors.districtCode =
            "Vui lòng chọn quận/huyện.";
        }

        if (
          !addressForm.wardCode
        ) {
          newErrors.wardCode =
            "Vui lòng chọn phường/xã.";
        }

        if (
          !addressForm.detailAddress.trim()
        ) {
          newErrors.address =
            "Vui lòng nhập số nhà, tên đường.";
        }
      }
    } else if (
      !formData.address.trim()
    ) {
      newErrors.address =
        "Vui lòng nhập địa chỉ.";
    }

    setErrors(newErrors);

    if (
      Object.keys(newErrors).length >
      0
    ) {
      AuthNotify.warning(
        "Thông tin chưa hợp lệ",
        "Vui lòng kiểm tra lại các trường bắt buộc."
      );

      return false;
    }

    return true;
  };

  /* =========================================================
     SESSION
     ========================================================= */

  const syncSessionUser = (
    updatedProfile
  ) => {
    try {
      const userString =
        sessionStorage.getItem(
          "user"
        );

      const currentUser =
        userString
          ? JSON.parse(userString)
          : {};

      const mergedUser = {
        ...currentUser,
        ...updatedProfile,
      };

      sessionStorage.setItem(
        "user",
        JSON.stringify(mergedUser)
      );

      if (
        updatedProfile.fullName
      ) {
        sessionStorage.setItem(
          "fullName",
          updatedProfile.fullName
        );
      }

      if (updatedProfile.phone) {
        sessionStorage.setItem(
          "phone",
          updatedProfile.phone
        );
      }
    } catch (error) {
      console.error(
        "Lỗi đồng bộ session user:",
        error
      );
    }
  };

  /* =========================================================
     SUBMIT
     ========================================================= */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      fullName:
        formData.fullName.trim(),
      phone: formData.phone.trim(),
      country:
        formData.country.trim(),
      address:
        formData.address.trim(),
    };

    try {
      setSubmitting(true);

      const updated =
        await updateUserProfileApi(
          payload
        );

      const mergedProfile = {
        ...profile,
        ...updated,
        ...payload,
      };

      syncSessionUser(
        mergedProfile
      );

      onUpdated?.(mergedProfile);

      AuthNotify.success(
        "Cập nhật thành công",
        "Thông tin cá nhân và địa chỉ đã được lưu."
      );
    } catch (error) {
      const errorMessage =
        error?.response?.data
          ?.message ||
        error?.response?.data
          ?.title ||
        error?.message ||
        "Cập nhật thông tin không thành công. Vui lòng thử lại.";

      AuthNotify.error(
        "Lỗi cập nhật",
        errorMessage
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    if (!profile) {
      return;
    }

    setFormData({
      fullName:
        profile.fullName || "",
      phone: profile.phone || "",
      country:
        normalizeCountryValue(
          profile.country
        ),
      address:
        profile.address || "",
    });

    setAddressForm({
      ...EMPTY_ADDRESS_FORM,
    });

    setDistrictOptions([]);
    setWardOptions([]);
    setAddressTouched(false);
    setErrors({});
  };

  if (loading) {
    return (
      <div className="profile-edit-card profile-edit-loading">
        <div className="profile-skeleton line wide" />
        <div className="profile-skeleton line" />
        <div className="profile-skeleton line" />
        <div className="profile-skeleton line tall" />
      </div>
    );
  }

  return (
    <div className="profile-edit-card">
      <div className="profile-edit-header">
        <h3>
          Cập nhật thông tin
        </h3>

        <p>
          Chỉnh sửa thông tin liên hệ và
          địa chỉ của bạn
        </p>
      </div>

      <form
        className="profile-edit-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="profile-form-group">
          <label>Email</label>

          <input
            type="email"
            value={profile?.email || ""}
            disabled
            className="profile-form-input disabled"
          />

          <span className="profile-form-hint">
            Email không thể thay đổi
          </span>
        </div>

        <div className="profile-form-group">
          <label>
            Họ và tên{" "}
            <span className="required">
              *
            </span>
          </label>

          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            className={`profile-form-input ${
              errors.fullName
                ? "error"
                : ""
            }`}
            placeholder="Nhập họ và tên"
          />

          {errors.fullName && (
            <span className="profile-form-error">
              {errors.fullName}
            </span>
          )}
        </div>

        <div className="profile-form-row">
          <div className="profile-form-group">
            <label>
              Số điện thoại{" "}
              <span className="required">
                *
              </span>
            </label>

            <input
              type="tel"
              name="phone"
              inputMode="numeric"
              value={formData.phone}
              onChange={handleChange}
              className={`profile-form-input ${
                errors.phone
                  ? "error"
                  : ""
              }`}
              placeholder={
                isVietnam
                  ? "0987654321"
                  : "Số điện thoại"
              }
            />

            {errors.phone && (
              <span className="profile-form-error">
                {errors.phone}
              </span>
            )}
          </div>

          <div className="profile-form-group">
            <label>
              Quốc gia{" "}
              <span className="required">
                *
              </span>
            </label>

            <select
              name="country"
              value={formData.country}
              onChange={
                handleCountryChange
              }
              className={`profile-form-input ${
                errors.country
                  ? "error"
                  : ""
              }`}
            >
              {COUNTRY_LIST.map(
                (country) => (
                  <option
                    key={country.code}
                    value={country.name}
                  >
                    {country.label}
                  </option>
                )
              )}
            </select>

            {errors.country && (
              <span className="profile-form-error">
                {errors.country}
              </span>
            )}
          </div>
        </div>

        {isVietnam ? (
          <section className="profile-address-section">
            <div className="profile-address-header">
              <div>
                <h4>
                  Địa chỉ tại Việt Nam
                </h4>

                <p>
                  Chọn tỉnh/thành phố,
                  quận/huyện và phường/xã.
                </p>
              </div>

              {(loadingProvinces ||
                loadingDistricts ||
                loadingWards) && (
                <CircularProgress
                  size={18}
                />
              )}
            </div>

            {!addressTouched &&
              formData.address && (
                <div className="profile-current-address">
                  <span>
                    Địa chỉ hiện tại
                  </span>

                  <strong>
                    {formData.address}
                  </strong>

                  <small>
                    Chọn tỉnh/thành phố
                    để nhập lại địa chỉ.
                  </small>
                </div>
              )}

            <div className="profile-address-grid">
              <div className="profile-form-group">
                <label>
                  Tỉnh/Thành phố{" "}
                  <span className="required">
                    *
                  </span>
                </label>

                <select
                  value={
                    addressForm.provinceCode
                  }
                  onChange={
                    handleProvinceChange
                  }
                  disabled={
                    loadingProvinces
                  }
                  className={`profile-form-input ${
                    errors.provinceCode
                      ? "error"
                      : ""
                  }`}
                >
                  <option value="">
                    {loadingProvinces
                      ? "Đang tải tỉnh/thành phố..."
                      : "Chọn tỉnh/thành phố"}
                  </option>

                  {provinceOptions.map(
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

                {errors.provinceCode && (
                  <span className="profile-form-error">
                    {
                      errors.provinceCode
                    }
                  </span>
                )}
              </div>

              <div className="profile-form-group">
                <label>
                  Quận/Huyện{" "}
                  <span className="required">
                    *
                  </span>
                </label>

                <select
                  value={
                    addressForm.districtCode
                  }
                  onChange={
                    handleDistrictChange
                  }
                  disabled={
                    !addressForm.provinceCode ||
                    loadingDistricts
                  }
                  className={`profile-form-input ${
                    errors.districtCode
                      ? "error"
                      : ""
                  }`}
                >
                  <option value="">
                    {loadingDistricts
                      ? "Đang tải quận/huyện..."
                      : "Chọn quận/huyện"}
                  </option>

                  {districtOptions.map(
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

                {errors.districtCode && (
                  <span className="profile-form-error">
                    {
                      errors.districtCode
                    }
                  </span>
                )}
              </div>

              <div className="profile-form-group">
                <label>
                  Phường/Xã{" "}
                  <span className="required">
                    *
                  </span>
                </label>

                <select
                  value={
                    addressForm.wardCode
                  }
                  onChange={
                    handleWardChange
                  }
                  disabled={
                    !addressForm.districtCode ||
                    loadingWards
                  }
                  className={`profile-form-input ${
                    errors.wardCode
                      ? "error"
                      : ""
                  }`}
                >
                  <option value="">
                    {loadingWards
                      ? "Đang tải phường/xã..."
                      : "Chọn phường/xã"}
                  </option>

                  {wardOptions.map(
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

                {errors.wardCode && (
                  <span className="profile-form-error">
                    {errors.wardCode}
                  </span>
                )}
              </div>

              <div className="profile-form-group">
                <label>
                  Số nhà, tên đường{" "}
                  <span className="required">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  value={
                    addressForm.detailAddress
                  }
                  onChange={
                    handleDetailAddressChange
                  }
                  className={`profile-form-input ${
                    errors.address
                      ? "error"
                      : ""
                  }`}
                  placeholder="Ví dụ: Số 15, hẻm 32"
                />

                {errors.address && (
                  <span className="profile-form-error">
                    {errors.address}
                  </span>
                )}
              </div>
            </div>

            {addressTouched &&
              formData.address && (
                <div className="profile-address-preview">
                  <span>
                    Địa chỉ hoàn chỉnh
                  </span>

                  <strong>
                    {formData.address}
                  </strong>
                </div>
              )}
          </section>
        ) : (
          <div className="profile-form-group">
            <label>
              Địa chỉ{" "}
              <span className="required">
                *
              </span>
            </label>

            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={`profile-form-input ${
                errors.address
                  ? "error"
                  : ""
              }`}
              placeholder="Nhập địa chỉ đầy đủ"
            />

            {errors.address && (
              <span className="profile-form-error">
                {errors.address}
              </span>
            )}
          </div>
        )}

        <div className="profile-form-actions">
      

          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{
              height: "42px",
              borderRadius: "10px",
              textTransform: "none",
              fontSize: "14px",
              fontWeight: 600,
              backgroundColor:
                "#2563eb",
              boxShadow:
                "0 4px 12px rgba(37, 99, 235, 0.2)",
              minWidth: "140px",
              "&:hover": {
                backgroundColor:
                  "#1d4ed8",
              },
            }}
          >
            {submitting ? (
              <CircularProgress
                size={20}
                sx={{
                  color: "#ffffff",
                }}
              />
            ) : (
              "Lưu thay đổi"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
