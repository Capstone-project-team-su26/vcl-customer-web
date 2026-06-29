import React, { useCallback, useEffect, useState } from "react";
import { getUserProfileApi } from "../../api/Auth/authService";
import AuthNotify from "../../utils/AuthNotify";
import ProfileView from "./ProfileView";
import ProfileEdit from "./ProfileEdit";
import "./ProfileConfig.css";

export default function ProfileConfig() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUserProfileApi();
      setProfile(data);
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.title ||
        "Không thể tải thông tin cá nhân. Vui lòng thử lại.";
      AuthNotify.error("Lỗi tải dữ liệu", errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileUpdated = (updatedProfile) => {
    setProfile(updatedProfile);
  };

  return (
    <div className="profile-config-page">
      <div className="profile-config-header">
        <h2>Cấu hình tài khoản</h2>
        <p>Xem và cập nhật thông tin cá nhân của bạn</p>
      </div>

      <div className="profile-config-grid">
        <section className="profile-config-section">
          <div className="profile-section-title">
            <span className="profile-section-badge view">Xem</span>
            <h4>Thông tin cá nhân</h4>
          </div>
          <ProfileView profile={profile} loading={loading} />
        </section>

        <section className="profile-config-section">
          <div className="profile-section-title">
            <span className="profile-section-badge edit">Sửa</span>
            <h4>Chỉnh sửa hồ sơ</h4>
          </div>
          <ProfileEdit
            profile={profile}
            loading={loading}
            onUpdated={handleProfileUpdated}
          />
        </section>
      </div>
    </div>
  );
}
