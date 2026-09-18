/*
 * Tách khỏi ConsignmentListDetailUI.jsx: các hàm ở đây là hàm thuần,
 * chỉ phụ thuộc tham số và bảng tra cứu tĩnh, nên để riêng cho component chỉ còn phần dựng giao diện.
 */

import { PACKAGE_CONFIGURATION_LABELS } from "./ConsignmentListDetailUI.constants";

export const isWoodCrateDisplayRule = (rule) => {
  const searchableValue = [
    rule?.ruleCode,
    rule?.ruleType,
    rule?.ruleName,
  ]
    .map((value) =>
      String(value || "")
        .trim()
        .toUpperCase(),
    )
    .join(" ");

  return (
    searchableValue.includes("WOOD_CRATE") ||
    searchableValue.includes("WOOD_BOX") ||
    searchableValue.includes("THÙNG GỖ")
  );
};

export const getRecordReferenceUrls = (record = {}) => {
  const urls = [];

  const addUrl = (value) => {
    const url = String(value || "").trim();

    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  };

  if (Array.isArray(record.referenceUrls)) {
    record.referenceUrls.forEach(addUrl);
  }

  addUrl(record.referenceUrl);

  return urls;
};

export const getPackageConfigurationDisplay = (
  configuration = {},
) => {
  const configCode = String(
    configuration?.configCode || "CUSTOM",
  )
    .trim()
    .toUpperCase();

  const translated =
    PACKAGE_CONFIGURATION_LABELS[configCode];

  return {
    configCode,
    configClass: configCode
      .toLowerCase()
      .replaceAll("_", "-"),
    displayName:
      translated?.name ||
      String(
        configuration?.configName ||
          "Cấu hình đóng gói",
      ).trim(),
    displaySize:
      translated?.size ||
      configCode.replaceAll("_", " "),
  };
};

export const formatPackageDimensions = (
  configuration,
) => {
  if (!configuration) {
    return "-";
  }

  if (
    String(configuration.configCode || "")
      .trim()
      .toUpperCase() === "CUSTOM"
  ) {
    return "Kích thước tùy chỉnh";
  }

  return `${configuration.length ?? 0} × ${
    configuration.width ?? 0
  } × ${configuration.height ?? 0} cm`;
};
