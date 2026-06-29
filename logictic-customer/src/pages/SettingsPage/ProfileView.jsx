import React from "react";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
} from "@ant-design/icons";

export default function ProfileView({ profile, loading }) {
  const avatarLetter =
    profile?.fullName?.trim()?.charAt(0)?.toUpperCase() || "U";

  if (loading) {
    return (
      <div className="profile-view-card profile-view-loading">
        <div className="profile-skeleton avatar" />
        <div className="profile-skeleton line wide" />
        <div className="profile-skeleton line" />
        <div className="profile-skeleton line" />
        <div className="profile-skeleton line" />
      </div>
    );
  }

  const fields = [
    {
      icon: <UserOutlined />,
      label: "Họ và tên",
      value: profile?.fullName || "—",
    },
    {
      icon: <MailOutlined />,
      label: "Email",
      value: profile?.email || "—",
    },
    {
      icon: <PhoneOutlined />,
      label: "Số điện thoại",
      value: profile?.phone || "—",
    },
    {
      icon: <GlobalOutlined />,
      label: "Quốc gia",
      value: profile?.country || "—",
    },
    {
      icon: <EnvironmentOutlined />,
      label: "Địa chỉ",
      value: profile?.address || "—",
    },
    {
      icon: <IdcardOutlined />,
      label: "Mã khách hàng",
      value: profile?.userId || profile?.id || profile?.customerId || "—",
    },
  ];

  return (
    <div className="profile-view-card">
      <div className="profile-view-header">
        <div className="profile-view-avatar">{avatarLetter}</div>
        <div>
          <h3>{profile?.fullName || "Khách hàng"}</h3>
          <p>{profile?.email || "Chưa có email"}</p>
        </div>
      </div>

      <div className="profile-view-divider" />

      <div className="profile-view-fields">
        {fields.map((field) => (
          <div className="profile-view-field" key={field.label}>
            <span className="profile-view-field-icon">{field.icon}</span>
            <div>
              <span className="profile-view-field-label">{field.label}</span>
              <span className="profile-view-field-value">{field.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
