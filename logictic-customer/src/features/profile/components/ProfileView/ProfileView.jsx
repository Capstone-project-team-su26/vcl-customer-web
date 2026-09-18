import React from "react";

import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  WarningOutlined,
} from "@ant-design/icons";

const STATUS_LABELS = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngừng hoạt động",
  PENDING: "Đang chờ",
  PENDING_REVIEW: "Chờ xét duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
  SUSPENDED: "Tạm khóa",
  BLOCKED: "Đã khóa",
  LOCKED: "Đã khóa",
  DISABLED: "Đã vô hiệu hóa",
  DELETED: "Đã xóa",
  VERIFIED: "Đã xác minh",
  UNVERIFIED: "Chưa xác minh",
};

const normalizeStatus = (status) => {
  return String(status || "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
};

const getStatusLabel = (status) => {
  const normalizedStatus =
    normalizeStatus(status);

  if (!normalizedStatus) {
    return "Chưa xác định";
  }

  return (
    STATUS_LABELS[normalizedStatus] ||
    normalizedStatus
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/^./, (character) =>
        character.toUpperCase()
      )
  );
};

const getStatusClassName = (status) => {
  const normalizedStatus =
    normalizeStatus(status);

  if (
    [
      "ACTIVE",
      "APPROVED",
      "VERIFIED",
    ].includes(normalizedStatus)
  ) {
    return "is-active";
  }

  if (
    [
      "PENDING",
      "PENDING_REVIEW",
      "UNVERIFIED",
    ].includes(normalizedStatus)
  ) {
    return "is-pending";
  }

  if (
    [
      "INACTIVE",
      "SUSPENDED",
      "DISABLED",
    ].includes(normalizedStatus)
  ) {
    return "is-inactive";
  }

  if (
    [
      "REJECTED",
      "BLOCKED",
      "LOCKED",
      "DELETED",
    ].includes(normalizedStatus)
  ) {
    return "is-danger";
  }

  return "is-neutral";
};

const getStatusIcon = (status) => {
  const normalizedStatus =
    normalizeStatus(status);

  if (
    [
      "ACTIVE",
      "APPROVED",
      "VERIFIED",
    ].includes(normalizedStatus)
  ) {
    return <CheckCircleOutlined />;
  }

  if (
    [
      "PENDING",
      "PENDING_REVIEW",
      "UNVERIFIED",
    ].includes(normalizedStatus)
  ) {
    return <ClockCircleOutlined />;
  }

  if (
    [
      "INACTIVE",
      "SUSPENDED",
      "DISABLED",
    ].includes(normalizedStatus)
  ) {
    return <StopOutlined />;
  }

  return <WarningOutlined />;
};

export default function ProfileView({
  profile,
  loading,
}) {
  const avatarLetter =
    profile?.fullName
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || "U";

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

  const status =
    profile?.status ||
    profile?.accountStatus ||
    profile?.userStatus ||
    "";

  const fields = [
    {
      icon: <UserOutlined />,
      label: "Họ và tên",
      value:
        profile?.fullName || "—",
    },
    {
      icon: <MailOutlined />,
      label: "Email",
      value:
        profile?.email || "—",
    },
    {
      icon: <PhoneOutlined />,
      label: "Số điện thoại",
      value:
        profile?.phone || "—",
    },
    {
      icon: <GlobalOutlined />,
      label: "Quốc gia",
      value:
        profile?.country || "—",
    },
    {
      icon:
        <EnvironmentOutlined />,
      label: "Địa chỉ",
      value:
        profile?.address || "—",
    },
    // {
    //   icon: getStatusIcon(status),
    //   label: "Trạng thái",
    //   type: "status",
    //   value: getStatusLabel(status),
    // },
    // {
    //   icon: <IdcardOutlined />,
    //   label: "Mã khách hàng",
    //   value:
    //     profile?.userId ||
    //     profile?.id ||
    //     profile?.customerId ||
    //     "—",
    // },
  ];

  return (
    <div className="profile-view-card">
      <div className="profile-view-header">
        <div className="profile-view-avatar">
          {avatarLetter}
        </div>

        <div className="profile-view-header-info">
          <div className="profile-view-name-row">
            <h3>
              {profile?.fullName ||
                "Khách hàng"}
            </h3>

            <span
              className={`profile-status-badge ${getStatusClassName(
                status
              )}`}
            >
              {getStatusIcon(status)}

              <span>
                {getStatusLabel(status)}
              </span>
            </span>
          </div>

          <p>
            {profile?.email ||
              "Chưa có email"}
          </p>
        </div>
      </div>

      <div className="profile-view-divider" />

      <div className="profile-view-fields">
        {fields.map((field) => (
          <div
            className="profile-view-field"
            key={field.label}
          >
            <span className="profile-view-field-icon">
              {field.icon}
            </span>

            <div className="profile-view-field-content">
              <span className="profile-view-field-label">
                {field.label}
              </span>

              {field.type ===
              "status" ? (
                <span
                  className={`profile-status-value ${getStatusClassName(
                    status
                  )}`}
                >
                  {field.value}
                </span>
              ) : (
                <span className="profile-view-field-value">
                  {field.value}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}