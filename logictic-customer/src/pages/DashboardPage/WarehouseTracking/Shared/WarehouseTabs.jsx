import React from "react";
import { NavLink } from "react-router-dom";
import { Box, ShieldCheck, Truck, Warehouse } from "lucide-react";

export function WarehouseTabs() {
  const tabs = [
    {
      to: "/warehouse/checkin",
      label: "Checkin & nhập kho",
      icon: Warehouse,
    },
    {
      to: "/warehouse/storage",
      label: "Lưu kho kiện hàng",
      icon: Box,
    },
    {
      to: "/warehouse/export",
      label: "Xuất kho kiện hàng",
      icon: Truck,
    },
    {
      to: "/warehouse/customs",
      label: "Thông quan & kho VN",
      icon: ShieldCheck,
    },
  ];

  return (
    <nav
      className="warehouse-tabs"
      aria-label="Điều hướng theo dõi kho"
    >
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            "warehouse-tab " +
            (isActive ? "warehouse-tab--active" : "")
          }
        >
          <Icon size={17} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default WarehouseTabs;
