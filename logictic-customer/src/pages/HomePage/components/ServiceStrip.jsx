import { useState } from "react";
import {
  ShoppingCartOutlined,
  InboxOutlined,
} from "@ant-design/icons";

import { SERVICE_TABS } from "../data/homeData";
import "./ServiceStrip.css";

const SERVICE_ICONS = {
  "Mua hộ": <ShoppingCartOutlined />,
  "Ký gửi": <InboxOutlined />,
};

export default function ServiceStrip({
  activeIndex,
  onChange,
}) {
  const [internalActiveIndex, setInternalActiveIndex] =
    useState(0);

  if (
    !Array.isArray(SERVICE_TABS) ||
    SERVICE_TABS.length === 0
  ) {
    return null;
  }

  const isControlled = Number.isInteger(activeIndex);

  const selectedIndex = isControlled
    ? activeIndex
    : internalActiveIndex;

  const handleSelect = (index, service) => {
    if (!isControlled) {
      setInternalActiveIndex(index);
    }

    onChange?.(index, service);
  };

  const handleKeyDown = (event, currentIndex) => {
    let nextIndex = currentIndex;

    if (
      event.key === "ArrowRight" ||
      event.key === "ArrowDown"
    ) {
      nextIndex =
        (currentIndex + 1) % SERVICE_TABS.length;
    } else if (
      event.key === "ArrowLeft" ||
      event.key === "ArrowUp"
    ) {
      nextIndex =
        (currentIndex - 1 + SERVICE_TABS.length) %
        SERVICE_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = SERVICE_TABS.length - 1;
    } else {
      return;
    }

    event.preventDefault();

    handleSelect(
      nextIndex,
      SERVICE_TABS[nextIndex]
    );

    document
      .getElementById(
        `service-strip-tab-${nextIndex}`
      )
      ?.focus();
  };

  return (
    <section
      className="service-strip-section"
      aria-label="Lựa chọn dịch vụ"
    >
      <div className="service-strip-section__container">
        <div
          className="service-strip-section__tabs"
          role="tablist"
          aria-label="Dịch vụ mua hộ và ký gửi"
        >
          {SERVICE_TABS.map((item, index) => {
            const isActive =
              selectedIndex === index;

            return (
              <button
                key={`${item.num}-${item.label}`}
                id={`service-strip-tab-${index}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                className={`service-strip-section__tab ${
                  isActive ? "is-active" : ""
                }`}
                onClick={() =>
                  handleSelect(index, item)
                }
                onKeyDown={(event) =>
                  handleKeyDown(event, index)
                }
              >
                <span className="service-strip-section__number">
                  {item.num}
                </span>

                <span className="service-strip-section__icon">
                  {SERVICE_ICONS[item.label] || "📦"}
                </span>

                <span className="service-strip-section__content">
                  <small>Dịch vụ</small>
                  <strong>{item.label}</strong>
                </span>

                <span
                  className="service-strip-section__indicator"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}