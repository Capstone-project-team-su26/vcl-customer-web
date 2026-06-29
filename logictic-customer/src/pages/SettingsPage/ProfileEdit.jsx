import React, { useEffect, useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import { updateUserProfileApi } from "../../api/Auth/authService";
import AuthNotify from "../../utils/AuthNotify";

const COUNTRY_LIST = [
  { code: "VN", name: "Vietnam" },
  { code: "US", name: "United States" },
  { code: "SG", name: "Singapore" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "TH", name: "Thailand" },
  { code: "MY", name: "Malaysia" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
];

export default function ProfileEdit({ profile, loading, onUpdated }) {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    country: "Vietnam",
    address: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile) return;

    setFormData({
      fullName: profile.fullName || "",
      phone: profile.phone || "",
      country: profile.country || "Vietnam",
      address: profile.address || "",
    });
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const onlyNums = value.replace(/[^0-9]/g, "");
      const maxLength = formData.country === "Vietnam" ? 10 : 15;
      if (onlyNums.length > maxLength) return;
      setFormData((prev) => ({ ...prev, phone: onlyNums }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let valid = true;

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ và tên.";
      valid = false;
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại.";
      valid = false;
    } else if (formData.country === "Vietnam" && formData.phone.length !== 10) {
      newErrors.phone = "Số điện thoại tại Việt Nam phải có đúng 10 chữ số.";
      valid = false;
    } else if (formData.phone.length < 8) {
      newErrors.phone = "Số điện thoại không hợp lệ (tối thiểu 8 số).";
      valid = false;
    }

    if (!formData.country) {
      newErrors.country = "Vui lòng chọn quốc gia.";
      valid = false;
    }

    if (!formData.address.trim()) {
      newErrors.address = "Vui lòng nhập địa chỉ.";
      valid = false;
    }

    setErrors(newErrors);

    if (!valid) {
      AuthNotify.warning("Cảnh báo", "Vui lòng hoàn thiện đầy đủ thông tin.");
    }

    return valid;
  };

  const syncSessionUser = (updatedProfile) => {
    try {
      const userStr = sessionStorage.getItem("user");
      const currentUser = userStr ? JSON.parse(userStr) : {};
      const merged = { ...currentUser, ...updatedProfile };
      sessionStorage.setItem("user", JSON.stringify(merged));

      if (updatedProfile.fullName) {
        sessionStorage.setItem("fullName", updatedProfile.fullName);
      }
    } catch (error) {
      console.error("Lỗi đồng bộ session user:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const updated = await updateUserProfileApi(formData);
      const mergedProfile = { ...profile, ...updated, ...formData };

      syncSessionUser(mergedProfile);
      onUpdated?.(mergedProfile);

      AuthNotify.success("Thành công", "Cập nhật thông tin cá nhân hoàn tất!");
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.title ||
        "Cập nhật thông tin không thành công. Vui lòng thử lại.";
      AuthNotify.error("Lỗi cập nhật", errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    if (!profile) return;

    setFormData({
      fullName: profile.fullName || "",
      phone: profile.phone || "",
      country: profile.country || "Vietnam",
      address: profile.address || "",
    });
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
        <h3>Cập nhật thông tin</h3>
        <p>Chỉnh sửa thông tin liên hệ và địa chỉ của bạn</p>
      </div>

      <form className="profile-edit-form" onSubmit={handleSubmit} noValidate>
        <div className="profile-form-group">
          <label>Email</label>
          <input
            type="email"
            value={profile?.email || ""}
            disabled
            className="profile-form-input disabled"
          />
          <span className="profile-form-hint">Email không thể thay đổi</span>
        </div>

        <div className="profile-form-group">
          <label>
            Họ và tên <span className="required">*</span>
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            className={`profile-form-input ${errors.fullName ? "error" : ""}`}
            placeholder="Nhập họ và tên"
          />
          {errors.fullName && <span className="profile-form-error">{errors.fullName}</span>}
        </div>

        <div className="profile-form-row">
          <div className="profile-form-group">
            <label>
              Số điện thoại <span className="required">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`profile-form-input ${errors.phone ? "error" : ""}`}
              placeholder={formData.country === "Vietnam" ? "0987654321" : "Số điện thoại"}
            />
            {errors.phone && <span className="profile-form-error">{errors.phone}</span>}
          </div>

          <div className="profile-form-group">
            <label>
              Quốc gia <span className="required">*</span>
            </label>
            <select
              name="country"
              value={formData.country}
              onChange={(e) => {
                handleChange(e);
                setFormData((prev) => ({ ...prev, phone: "" }));
              }}
              className={`profile-form-input ${errors.country ? "error" : ""}`}
            >
              {COUNTRY_LIST.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.country && <span className="profile-form-error">{errors.country}</span>}
          </div>
        </div>

        <div className="profile-form-group">
          <label>
            Địa chỉ <span className="required">*</span>
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className={`profile-form-input ${errors.address ? "error" : ""}`}
            placeholder="123 Đường ABC, Quận 1..."
          />
          {errors.address && <span className="profile-form-error">{errors.address}</span>}
        </div>

        <div className="profile-form-actions">
          <button
            type="button"
            className="profile-btn secondary"
            onClick={handleReset}
            disabled={submitting}
          >
            Hoàn tác
          </button>

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
              backgroundColor: "#2563eb",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
              minWidth: "140px",
              "&:hover": {
                backgroundColor: "#1d4ed8",
              },
            }}
          >
            {submitting ? (
              <CircularProgress size={20} sx={{ color: "#ffffff" }} />
            ) : (
              "Lưu thay đổi"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
