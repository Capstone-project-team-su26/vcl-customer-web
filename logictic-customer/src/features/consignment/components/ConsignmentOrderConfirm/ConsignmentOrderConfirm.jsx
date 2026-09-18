import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckCircleOutlined,
  CheckOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  LoadingOutlined,
  SafetyCertificateOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import {
  Carousel,
  Image,
  Tag,
  Tooltip,
} from "antd";

import {
  HIDDEN_SERVICE_CODES,
  SERVICE_DESCRIPTIONS,
} from "./ConsignmentOrderConfirm.constants";
import { formatItemServiceFee } from "@features/consignment/components/PackageItemServices/PackageItemServices.helpers";
import {
  calculatePackageVolume,
  calculateWoodCrateSummary,
  formatNumber,
  formatVnd,
  getConfigurationDisplay,
  getConfigurationFee,
  getLoadingProgress,
  getLoadingStage,
  getOptionLabel,
  getPackageId,
  getRulePriceLabel,
  getServiceClassName,
  getServiceLabel,
  getWoodCrateOrderFee,
  hasVietnameseCharacters,
  isWoodCrateServiceCode,
  normalizeCode,
  normalizeConfiguration,
  normalizeFullAddress,
  normalizeId,
  normalizePackageImages,
  normalizePricingRule,
  translateSubmitMessage,
} from "./ConsignmentOrderConfirm.helpers";

import "./ConsignmentOrderConfirm.css";

function PriceInfoLabel({
  label,
  tooltip,
}) {
  return (
    <span className="consignment-confirm-price-info-label">
      <span>{label}</span>

      <Tooltip
        title={tooltip}
        placement="top"
        mouseEnterDelay={0.12}
      >
        <button
          type="button"
          className="consignment-confirm-price-info-button"
          aria-label={`Giải thích ${label}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <InfoCircleOutlined />
        </button>
      </Tooltip>
    </span>
  );
}

function SummaryItem({
  label,
  value,
  fullWidth = false,
  tone = "",
}) {
  const hasValue =
    value !== null &&
    value !== undefined &&
    value !== "";

  return (
    <div
      className={[
        "consignment-confirm-summary-item",
        fullWidth &&
          "is-full-width",
        tone && `is-${tone}`,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{label}</span>

      <strong>
        {hasValue
          ? value
          : "Chưa có thông tin"}
      </strong>
    </div>
  );
}

function ServiceCard({ service }) {
  return (
    <article className={`consignment-confirm-service-card ${getServiceClassName(service.code)}`}>
      <div className="service-card-header">
        <div className="service-card-title">
          <span className="service-icon-badge">
            <CheckOutlined />
          </span>
          <strong className="service-name">{service.label}</strong>
        </div>
        <span className="service-price-badge">{service.priceLabel}</span>
      </div>
      {service.description && (
        <p className="service-description">{service.description}</p>
      )}
    </article>
  );
}

function WoodCrateSummary({ summary }) {
  if (!summary?.enabled) {
    return null;
  }

  return (
    <section className="consignment-confirm-wood-summary">
      <div className="wood-summary-header">
        <div className="wood-summary-title">
          <SafetyCertificateOutlined className="wood-summary-icon" />
          <div>
            <h4>Chi phí đóng thùng gỗ đơn hàng</h4>
            <p>Phí thùng gỗ tính theo cỡ thùng chọn cho từng kiện hàng (theo bảng cấu hình thùng).</p>
          </div>
        </div>
        <Tag color="orange" className="wood-summary-count-tag">
          {summary.selectedCount}/{summary.packageCount} kiện đã chọn thùng
        </Tag>
      </div>

      <div className="wood-cost-formula-bar">
        {/* Phí thùng gỗ tính theo cỡ từng kiện; chỉ hiện phí toàn đơn khi catalog khai mức > 0. */}
        {summary.orderServiceFee > 0 && (
          <>
            <div className="wood-cost-step">
              <span className="cost-step-label">Phí dịch vụ đóng thùng toàn đơn</span>
              <strong className="cost-step-val">{formatVnd(summary.orderServiceFee)}</strong>
            </div>
            <span className="cost-formula-op">+</span>
          </>
        )}
        <div className="wood-cost-step">
          <span className="cost-step-label">Tổng giá thùng theo kiện</span>
          <strong className="cost-step-val">{formatVnd(summary.configurationFee)}</strong>
        </div>
        <span className="cost-formula-op">=</span>
        <div className="wood-cost-step is-total-step">
          <span className="cost-step-label">Tổng phí đóng thùng gỗ</span>
          <strong className="cost-step-total">{formatVnd(summary.totalFee)}</strong>
        </div>
      </div>

      {summary.rows.length > 0 && (
        <div className="wood-itemized-breakdown">
          <div className="wood-breakdown-head">
            <span className="wood-breakdown-title-badge">CHI TIẾT THEO KIỆN HÀNG</span>
            <p>Phân bổ kích thước thùng gỗ và chi phí tương ứng của từng kiện</p>
          </div>
          <div className="wood-breakdown-rows">
            {summary.rows.map((row) => (
              <div key={row.packageId} className="wood-breakdown-row">
                <div className="wood-row-left">
                  <span className="wood-row-num">#{row.packageIndex}</span>
                  <div className="wood-row-product-info">
                    <strong className="wood-row-product-name">{row.productName}</strong>
                    <span className="wood-row-sub">Kích thước kiện hàng: {row.packageDimensions}</span>
                  </div>
                </div>

                <div className="wood-row-center">
                  <Tag color="blue" className="wood-size-tag">{row.configurationSize}</Tag>
                  <div className="wood-row-config-info">
                    <strong className="wood-config-name">{row.configurationName}</strong>
                    <span className="wood-row-sub">Kích thước thùng gỗ: {row.configurationDimensions}</span>
                  </div>
                </div>

                <div className="wood-row-right">
                  <span className="wood-price-label">Giá thùng kiện này</span>
                  <strong className="wood-row-price">{formatVnd(row.packageFee)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PackageConfigurationCard({
  pkg,
  packageIndex,
  selectedConfiguration,
}) {
  if (!selectedConfiguration) {
    return null;
  }

  const { name, size } = getConfigurationDisplay(selectedConfiguration);
  const packageFee = getConfigurationFee(selectedConfiguration, pkg);
  const isCustomConfiguration = normalizeCode(selectedConfiguration?.configCode) === "CUSTOM";
  const boxLength = isCustomConfiguration ? pkg?.length : selectedConfiguration?.length;
  const boxWidth = isCustomConfiguration ? pkg?.width : selectedConfiguration?.width;
  const boxHeight = isCustomConfiguration ? pkg?.height : selectedConfiguration?.height;

  return (
    <div className="confirm-box-config">
      <div className="confirm-box-config__main-row">
        <div className="confirm-box-config__info">
          <SafetyCertificateOutlined className="confirm-box-config__icon" />
          <div className="confirm-box-config__details">
            <div className="confirm-box-config__title-line">
              <span className="confirm-box-config__label">Cấu hình đóng thùng gỗ:</span>
              <strong className="confirm-box-config__name">{name}</strong>
              <Tag color="blue" className="confirm-box-config__tag">{size}</Tag>
            </div>
            <p className="confirm-box-config__specs">
              Kích thước thùng: <strong>{formatNumber(boxLength)} × {formatNumber(boxWidth)} × {formatNumber(boxHeight)} cm</strong>
              <span className="dot-divider">•</span>
              {isCustomConfiguration ? (
                <span>Đơn giá: <strong>{formatVnd(selectedConfiguration?.packageFee)} / 1.000 cm³ (tính theo thể tích)</strong></span>
              ) : (
                <span>Tải trọng tối đa: <strong>{formatNumber(selectedConfiguration?.maxWeight)} kg</strong></span>
              )}
            </p>
          </div>
        </div>

        <div className="confirm-box-config__price-pill">
          <span className="price-pill-label">{isCustomConfiguration ? "Tổng giá thùng (theo thể tích)" : "Giá thùng kiện này"}</span>
          <strong className="price-pill-value">{formatVnd(packageFee)}</strong>
        </div>
      </div>
    </div>
  );
}

export default function ConsignmentOrderConfirm({
  form = {},
  packages = [],
  routeOptions = [],
  shippingOptions = [],
  productTypeOptions = [],
  itemServiceOptions = [],
  pricingRules = [],
  packageConfigurations = [],
  masterDataLoading = false,
  masterDataError = "",
  isSubmitting,
  submitMessage,
  onBack,
  onConfirm,
}) {
  const loadingProgress =
    useMemo(
      () =>
        getLoadingProgress(
          submitMessage,
        ),
      [submitMessage],
    );

  const loadingStage = useMemo(
    () =>
      getLoadingStage(
        loadingProgress,
      ),
    [loadingProgress],
  );

  useEffect(() => {
    if (!isSubmitting) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [isSubmitting]);

  const normalizedPricingRules =
    useMemo(
      () =>
        (
          Array.isArray(pricingRules)
            ? pricingRules
            : []
        ).map(
          normalizePricingRule,
        ),
      [pricingRules],
    );

  const normalizedConfigurations =
    useMemo(
      () =>
        (
          Array.isArray(
            packageConfigurations,
          )
            ? packageConfigurations
            : []
        ).map(
          normalizeConfiguration,
        ),
      [packageConfigurations],
    );

  const pricingRuleById = useMemo(
    () =>
      new Map(
        normalizedPricingRules.map(
          (rule) => [
            normalizeId(rule.id),
            rule,
          ],
        ),
      ),
    [normalizedPricingRules],
  );

  const pricingRuleByCode =
    useMemo(
      () =>
        new Map(
          normalizedPricingRules.map(
            (rule) => [
              rule.ruleCode,
              rule,
            ],
          ),
        ),
      [normalizedPricingRules],
    );

  const configurationById =
    useMemo(
      () =>
        new Map(
          normalizedConfigurations.map(
            (configuration) => [
              normalizeId(
                configuration.id,
              ),
              configuration,
            ],
          ),
        ),
      [normalizedConfigurations],
    );

  const optionalServices =
    form?.optionalServices || {};

  /* Dịch vụ theo kiện: pricingRuleId → { name, code, calculationType, value, ... }. */
  const itemServiceById = useMemo(
    () =>
      new Map(
        (Array.isArray(itemServiceOptions) ? itemServiceOptions : []).map(
          (service) => [service.pricingRuleId, service],
        ),
      ),
    [itemServiceOptions],
  );

  const getPackageServices = (pkg) =>
    (pkg?.serviceIds || [])
      .map((id) => itemServiceById.get(id))
      .filter(Boolean);

  const packageServiceCount = packages.reduce(
    (total, pkg) => total + getPackageServices(pkg).length,
    0,
  );

  /*
   * Đây là nguồn sự thật duy nhất để quyết định có hiển thị
   * dịch vụ, phí và kích thước thùng gỗ hay không.
   * Dữ liệu packageConfigurationId do API gợi ý trả về không
   * được phép tự kích hoạt giao diện đóng thùng.
   */
  const woodCrateSelected =
    optionalServices
      ?.requiresWoodenCrate === true;

  const woodCrateOrderFee =
    useMemo(
      () =>
        getWoodCrateOrderFee({
          optionalServices,
          pricingRuleByCode,
        }),
      [
        optionalServices,
        pricingRuleByCode,
      ],
    );

  const selectedServices =
    useMemo(() => {
      const selectedRuleCodes = [
        optionalServices?.selectedRuleCodes,
        optionalServices?.selectedPricingRuleCodes,
        optionalServices?.pricingRuleCodes,
        optionalServices?.selectedServiceCodes,
        optionalServices?.serviceCodes,
      ]
        .filter(Array.isArray)
        .flat();

      const selectedPricingRuleIds = [
        optionalServices?.selectedPricingRuleIds,
        optionalServices?.pricingRuleIds,
        optionalServices?.selectedServiceIds,
        optionalServices?.serviceIds,
      ]
        .filter(Array.isArray)
        .flat();

      const selectedRuleObjects = [
        optionalServices?.selectedRules,
        optionalServices?.selectedPricingRules,
        optionalServices?.selectedServices,
        optionalServices?.services,
      ]
        .filter(Array.isArray)
        .flat()
        .filter(
          (item) =>
            item &&
            typeof item === "object",
        );

      const serviceMap = new Map();

      const findRuleByCode = (rawCode) => {
        const code = normalizeCode(rawCode);

        if (!code) {
          return null;
        }

        return (
          pricingRuleByCode.get(code) ||
          normalizedPricingRules.find(
            (rule) =>
              rule.ruleCode === code ||
              rule.ruleType === code,
          ) ||
          null
        );
      };

      const appendCode = (
        rawCode,
        fallback = {},
      ) => {
        const requestedCode =
          normalizeCode(rawCode);

        if (
          !requestedCode ||
          HIDDEN_SERVICE_CODES.has(
            requestedCode,
          ) ||
          requestedCode.includes("PURCHASE") ||
          requestedCode.includes("VAT") ||
          requestedCode.includes("IMPORT_TAX")
        ) {
          return;
        }

        /*
         * WOOD_CRATE chỉ được xem là đã chọn khi cờ
         * requiresWoodenCrate thực sự bằng true.
         * Vì vậy dữ liệu gợi ý thùng còn sót lại hoặc
         * selectedRuleCodes cũ không thể tự làm dịch vụ
         * đóng thùng gỗ xuất hiện trên màn hình xác nhận.
         */
        if (
          isWoodCrateServiceCode(
            requestedCode,
          ) &&
          !woodCrateSelected
        ) {
          return;
        }

        const rule =
          findRuleByCode(requestedCode) ||
          fallback?.rule ||
          null;

        const normalizedRule =
          rule
            ? normalizePricingRule(
                rule,
              )
            : null;

        const code =
          normalizeCode(
            normalizedRule?.ruleCode ||
              requestedCode,
          );

        if (
          !code ||
          HIDDEN_SERVICE_CODES.has(code)
        ) {
          return;
        }

        if (
          isWoodCrateServiceCode(code) &&
          !woodCrateSelected
        ) {
          return;
        }

        serviceMap.set(code, {
          code,
          label: getServiceLabel(
            code,
            normalizedRule?.ruleName ||
              fallback?.label,
          ),
          description:
            SERVICE_DESCRIPTIONS[code] ||
            (
              hasVietnameseCharacters(
                normalizedRule
                  ?.description,
              )
                ? normalizedRule
                    ?.description
                : ""
            ) ||
            fallback?.description ||
            "",
          priceLabel:
            fallback?.priceLabel ||
            getRulePriceLabel(
              normalizedRule,
            ),
        });
      };

      selectedRuleCodes.forEach(
        (code) => appendCode(code),
      );

      selectedPricingRuleIds.forEach(
        (id) => {
          const rule =
            pricingRuleById.get(
              normalizeId(id),
            );

          if (rule) {
            appendCode(
              rule.ruleCode,
              { rule },
            );
          }
        },
      );

      selectedRuleObjects.forEach(
        (item) => {
          const rawCode =
            item?.ruleCode ||
            item?.code ||
            item?.serviceCode ||
            item?.ruleType;

          if (rawCode) {
            appendCode(rawCode, {
              rule: item,
              label:
                item?.ruleName ||
                item?.name ||
                item?.label,
              description:
                item?.description,
              priceLabel:
                item?.priceLabel,
            });
            return;
          }

          const rawId =
            item?.id ||
            item?.pricingRuleId ||
            item?.serviceId;

          const rule =
            pricingRuleById.get(
              normalizeId(rawId),
            );

          if (rule) {
            appendCode(
              rule.ruleCode,
              { rule },
            );
          }
        },
      );

      if (woodCrateSelected) {
        appendCode(
          "WOOD_CRATE",
          {
            priceLabel:
              woodCrateOrderFee > 0
                ? `${formatVnd(
                    woodCrateOrderFee,
                  )} / toàn bộ đơn`
                : undefined,
          },
        );
      }

      if (
        optionalServices
          ?.requiresInspection ||
        form?.inspectPackage
      ) {
        appendCode(
          "SUR_INSPECTION",
        );
      }

      if (
        optionalServices
          ?.requiresInsurance
      ) {
        const insuranceRule =
          normalizedPricingRules.find(
            (rule) =>
              rule.ruleCode.includes(
                "INSURANCE",
              ) ||
              rule.ruleType.includes(
                "INSURANCE",
              ),
          );

        appendCode(
          insuranceRule?.ruleCode ||
            "INSURANCE",
          {
            rule: insuranceRule,
          },
        );
      }

      if (
        optionalServices
          ?.requiresPacking
      ) {
        appendCode("PACKING");
      }

      return Array.from(
        serviceMap.values(),
      );
    }, [
      form?.inspectPackage,
      normalizedPricingRules,
      optionalServices,
      pricingRuleByCode,
      pricingRuleById,
      woodCrateOrderFee,
      woodCrateSelected,
    ]);

  const selectedConfigurationByPackage =
    useMemo(() => {
      const selectedMap = new Map();

      /*
       * Không chọn đóng thùng gỗ thì bỏ qua toàn bộ cấu hình thùng,
       * kể cả packageConfigurationId đã từng được API AI gợi ý.
       */
      if (!woodCrateSelected) {
        return selectedMap;
      }

      const savedList =
        Array.isArray(
          optionalServices
            ?.selectedPackageConfigurations,
        )
          ? optionalServices
              .selectedPackageConfigurations
          : [];

      const configurationIdMap =
        optionalServices
          ?.packageConfigurationByPackageId &&
        typeof optionalServices
          .packageConfigurationByPackageId ===
          "object"
          ? optionalServices
              .packageConfigurationByPackageId
          : {};

      packages.forEach(
        (pkg, index) => {
          const packageId =
            String(
              pkg?.id ||
                pkg?.packageId ||
                `package-${index + 1}`,
            ).trim();

          const savedItem =
            savedList.find(
              (item) =>
                String(
                  item?.packageId ||
                    "",
                ).trim() ===
                packageId,
            ) || null;

          const configurationId =
            String(
              pkg
                ?.packageConfigurationId ||
                savedItem
                  ?.packageConfigurationId ||
                configurationIdMap[
                  packageId
                ] ||
                "",
            ).trim();

          const apiConfiguration =
            configurationById.get(
              normalizeId(
                configurationId,
              ),
            ) || null;

          const mergedConfiguration =
            apiConfiguration ||
            (
              savedItem &&
              typeof savedItem ===
                "object"
                ? normalizeConfiguration(
                    savedItem,
                  )
                : null
            );

          if (
            mergedConfiguration
          ) {
            selectedMap.set(
              packageId,
              {
                ...mergedConfiguration,
                ...savedItem,
                id:
                  mergedConfiguration.id ||
                  configurationId,
              },
            );
          }
        },
      );

      return selectedMap;
    }, [
      configurationById,
      optionalServices,
      packages,
      woodCrateSelected,
    ]);

  const missingWoodCratePackages = useMemo(() => {
    if (!woodCrateSelected) {
      return [];
    }

    return packages
      .map((pkg, index) => ({
        packageId: getPackageId(pkg, index),
        packageIndex: index + 1,
        productName: String(
          pkg?.productName || `Kiện hàng ${index + 1}`,
        ).trim(),
      }))
      .filter(
        (item) =>
          !selectedConfigurationByPackage.has(item.packageId),
      );
  }, [
    packages,
    selectedConfigurationByPackage,
    woodCrateSelected,
  ]);

  const woodCrateSelectionComplete =
    !woodCrateSelected ||
    (packages.length > 0 &&
      missingWoodCratePackages.length === 0);

  const woodCratePricingSummary =
    useMemo(
      () =>
        calculateWoodCrateSummary({
          optionalServices,
          packages,
          selectedConfigurationByPackage,
          pricingRuleByCode,
        }),
      [
        optionalServices,
        packages,
        selectedConfigurationByPackage,
        pricingRuleByCode,
      ],
    );

  const totals = useMemo(
    () =>
      packages.reduce(
        (result, pkg) => ({
          quantity:
            result.quantity +
            Number(
              pkg.quantity || 0,
            ),

          weight:
            result.weight +
            Number(
              pkg.weight || 0,
            ),

          declaredValue:
            result.declaredValue +
            Number(
              pkg.declaredValue ||
                0,
            ),

          volume:
            result.volume +
            calculatePackageVolume(
              pkg,
            ),

          images:
            result.images +
            normalizePackageImages(
              pkg,
            ).length,
        }),
        {
          quantity: 0,
          weight: 0,
          declaredValue: 0,
          volume: 0,
          images: 0,
        },
      ),
    [packages],
  );

  const routeLabel =
    getOptionLabel(
      routeOptions,
      form.route,
      "route",
    );

  const shippingLabel =
    getOptionLabel(
      shippingOptions,
      form.shippingOption,
      "shipping",
    );

  /*
   * Khách bỏ trống ô này cũng gửi đơn được, nên nói rõ mặc định là gì thay vì để dấu "-"
   * rồi khách tưởng hệ thống chưa ghi nhận.
   */
  const destinationHandlingLabel =
    {
      DIRECT_DELIVERY:
        "Giao ngay khi về Việt Nam",
      STORE_AT_VN:
        "Gửi lại kho Việt Nam",
    }[
      form?.defaultDestinationHandling
    ] || "Chưa chọn — mặc định giao ngay";

  const receiverAddress =
    normalizeFullAddress(
      form
        ?.selectedDeliveryAddress,
    ) ||
    normalizeFullAddress(
      form?.receiverAddress,
    );

  const inspectionRequested =
    Boolean(form?.inspectPackage) ||
    Boolean(
      optionalServices
        ?.requiresInspection,
    );

  return (
    <div className="consignment-confirm-page">
      <div className="consignment-confirm-shell">
        {/* Top bar with Stepper */}
        <div className="consignment-confirm-topbar">
          <button
            type="button"
            className="consignment-confirm-back"
            disabled={isSubmitting}
            onClick={onBack}
          >
            <LeftOutlined />
            <span>Quay lại chỉnh sửa</span>
          </button>

          <div className="consignment-confirm-stepper">
            <span className="stepper-step is-completed">
              <CheckCircleOutlined /> 1. Tạo đơn
            </span>
            <span className="stepper-divider" />
            <span className="stepper-step is-active">
              <ShoppingOutlined /> 2. Xác nhận thông tin
            </span>
            <span className="stepper-divider" />
            <span className="stepper-step">
              <CheckCircleOutlined /> 3. Hoàn tất
            </span>
          </div>

          <div className="consignment-confirm-status">
            <CheckCircleOutlined />
            <span>Thông tin hợp lệ</span>
          </div>
        </div>

        {/* Hero Banner Header */}
        <div className="consignment-confirm-hero">
          <div className="consignment-confirm-hero-copy">
            <span className="consignment-confirm-hero-eyebrow">
              XÁC NHẬN TẠO ĐƠN KÝ GỬI
            </span>
            <h1>Kiểm tra thông tin chi tiết lô hàng</h1>
            <p>
              Vui lòng xem lại thông tin người nhận, tuyến hàng, dịch vụ bổ sung và các kiện hàng trước khi gửi yêu cầu.
            </p>
          </div>

          <div className="consignment-confirm-hero-stats">
            <div>
              <span>Số kiện</span>
              <strong>{packages.length}</strong>
            </div>
            <div>
              <span>Tổng sản phẩm</span>
              <strong>{formatNumber(totals.quantity)}</strong>
            </div>
            <div>
              <span>Tổng khối lượng</span>
              <strong>{formatNumber(totals.weight)} kg</strong>
            </div>
            <div>
              <span>Số dịch vụ</span>
              <strong>{selectedServices.length + packageServiceCount}</strong>
            </div>
          </div>
        </div>

        {/* Notices */}
        {masterDataLoading && (
          <div className="consignment-confirm-api-notice is-loading">
            <LoadingOutlined spin />
            <span>Đang tải tên dịch vụ, mức giá và cấu hình thùng...</span>
          </div>
        )}

        {!masterDataLoading && masterDataError && (
          <div className="consignment-confirm-api-notice is-error">
            <InfoCircleOutlined />
            <span>Không thể tải đầy đủ tên dịch vụ, mức giá hoặc cấu hình thùng. Vui lòng quay lại và thử lại.</span>
          </div>
        )}

        {/* 2-Column Checkout Review Layout Grid */}
        <div className="consignment-confirm-main-grid">
          {/* Left Column: Packages, Services & Notes */}
          <div className="consignment-confirm-left-col">
            {/* Packages Section */}
            <div className="consignment-confirm-section">
              <div className="consignment-confirm-section-title">
                <span><ShoppingOutlined /></span>
                <div>
                  <h2>Danh sách kiện hàng ({packages.length} kiện)</h2>
                  <p>Chi tiết từng kiện hàng, mã vận đơn, thông số kích thước và ảnh sản phẩm.</p>
                </div>
              </div>

              <div className="consignment-confirm-package-list">
                {packages.map((pkg, index) => {
                  const packageVolume = calculatePackageVolume(pkg);
                  const images = normalizePackageImages(pkg);
                  const packageId = getPackageId(pkg, index);
                  const selectedConfiguration = selectedConfigurationByPackage.get(packageId) || null;
                  const productName = String(pkg?.productName || "Chưa có tên sản phẩm").trim();
                  const productTypeLabel = getOptionLabel(productTypeOptions, pkg.productType, "productType");

                  return (
                    <article key={packageId} className="confirm-package-card">
                      <header className="confirm-package-card__header">
                        <div className="confirm-package-card__identity">
                          <span className="confirm-package-card__number">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <small>KIỆN HÀNG #{index + 1}</small>
                            <h3>{productName}</h3>
                          </div>
                        </div>

                        <div className="confirm-package-card__quick-stats">
                          <div>
                            <span>Số lượng</span>
                            <strong>{formatNumber(pkg.quantity)} sản phẩm</strong>
                          </div>
                          <div>
                            <span>Khối lượng</span>
                            <strong>{formatNumber(pkg.weight)} kg</strong>
                          </div>
                          {Number(pkg.declaredValue) > 0 && (
                            <div className="is-value">
                              <span>Giá trị khai báo</span>
                              <strong>{formatVnd(pkg.declaredValue)}</strong>
                            </div>
                          )}
                        </div>
                      </header>

                      <div className="confirm-package-card__body">
                        <div className="confirm-package-overview">
                          <section className="confirm-package-media">
                            <div className="confirm-package-block-title">
                              <span className="media-title-label">HÌNH ẢNH SẢN PHẨM</span>
                              <span className="media-count-badge">
                                {images.length > 0 ? `${images.length} ảnh` : "Chưa có ảnh"}
                              </span>
                            </div>

                            {images.length > 0 ? (
                              <Image.PreviewGroup>
                                <Carousel
                                  className="confirm-package-carousel"
                                  autoplay={images.length > 1}
                                  autoplaySpeed={3200}
                                  pauseOnHover
                                  dots={images.length > 1}
                                >
                                  {images.map((image, imageIndex) => (
                                    <div key={image.id} className="confirm-package-carousel__slide">
                                      <Image
                                        src={image.previewUrl}
                                        alt={`Ảnh ${imageIndex + 1} của ${productName}`}
                                        className="confirm-package-carousel__image"
                                        preview={{ mask: "Xem ảnh" }}
                                      />
                                      <span className="confirm-package-carousel__counter">
                                        Ảnh {imageIndex + 1}/{images.length}
                                      </span>
                                    </div>
                                  ))}
                                </Carousel>
                              </Image.PreviewGroup>
                            ) : (
                              <div className="confirm-package-media__empty">
                                <ShoppingOutlined />
                                <strong>Chưa có hình ảnh</strong>
                                <span>Chưa tải lên ảnh đính kèm.</span>
                              </div>
                            )}
                          </section>

                          <section className="confirm-product-info">
                            <div className="confirm-product-info__header">
                              <div className="product-title-group">
                                <h3>{productName}</h3>
                                <Tag color="blue">{productTypeLabel}</Tag>
                              </div>
                            </div>

                            <div className="confirm-product-info__specs-table">
                              <div className="specs-row">
                                {(pkg.trackingCode?.trim() || pkg?.domesticTrackingCode?.trim()) && (
                                  <div className="specs-cell">
                                    <span>Mã vận đơn nội địa:</span>
                                    <strong className="tracking-code-val">
                                      {pkg.trackingCode?.trim() || pkg?.domesticTrackingCode?.trim()}
                                    </strong>
                                  </div>
                                )}
                                <div className="specs-cell">
                                  <span>Số lượng:</span>
                                  <strong>{formatNumber(pkg.quantity)} sản phẩm</strong>
                                </div>
                                <div className="specs-cell">
                                  <span>Khối lượng:</span>
                                  <strong>{formatNumber(pkg.weight)} kg</strong>
                                </div>
                                {Number(pkg.declaredValue) > 0 && (
                                  <div className="specs-cell">
                                    <span>Giá trị khai báo:</span>
                                    <strong className="declared-val">{formatVnd(pkg.declaredValue)}</strong>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="confirm-package-dimensions-bar">
                              <div className="dim-bar-left">
                                <span className="dim-bar-label">Kích thước kiện hàng (Dài × Rộng × Cao):</span>
                                <strong className="dim-bar-val">{formatNumber(pkg.length)} × {formatNumber(pkg.width)} × {formatNumber(pkg.height)} cm</strong>
                              </div>
                              <div className="dim-bar-right">
                                <span className="dim-bar-label">Thể tích:</span>
                                <strong className="dim-bar-volume">{formatNumber(packageVolume)} cm³</strong>
                              </div>
                            </div>

                            <div className="confirm-package-services">
                              <span className="confirm-package-services__label">Dịch vụ của kiện:</span>
                              {getPackageServices(pkg).length > 0 ? (
                                <ul>
                                  {getPackageServices(pkg).map((service) => (
                                    <li key={service.pricingRuleId}>
                                      <strong>{service.name || service.code}</strong>
                                      <span>{formatItemServiceFee(service)}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <em>Không chọn thêm dịch vụ</em>
                              )}
                            </div>
                          </section>
                        </div>

                        {woodCrateSelected && selectedConfiguration && (
                          <PackageConfigurationCard
                            pkg={pkg}
                            packageIndex={index + 1}
                            selectedConfiguration={selectedConfiguration}
                          />
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* Services Section */}
            <div className="consignment-confirm-section">
              <div className="consignment-confirm-section-title">
                <span><SafetyCertificateOutlined /></span>
                <div>
                  <h2>Dịch vụ & Tiện ích</h2>
                  <p>Quy trình vận chuyển & các dịch vụ được đăng ký đi kèm đơn ký gửi.</p>
                </div>
              </div>

              {(selectedServices.length > 0 || woodCrateSelected) ? (
                <>
                  {selectedServices.length > 0 && (
                    <div className="consignment-confirm-service-list">
                      {selectedServices.map((service) => (
                        <ServiceCard key={service.code} service={service} />
                      ))}
                    </div>
                  )}

                  {woodCrateSelected && (
                    <>
                      <WoodCrateSummary summary={woodCratePricingSummary} />
                      {!woodCrateSelectionComplete && (
                        <div className="consignment-confirm-api-notice is-error" style={{ marginTop: 12 }}>
                          <InfoCircleOutlined />
                          <span>
                            Chưa chọn đủ kích thước thùng gỗ cho các kiện: {missingWoodCratePackages.map((item) => item.productName).join(", ")}.
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="consignment-confirm-service-card is-sapphire">
                  <div className="service-card-left">
                    <div className="service-icon-badge">
                      <CheckOutlined />
                    </div>
                    <div className="service-card-info">
                      <div className="service-card-title-row">
                        <strong>Vận chuyển tiêu chuẩn</strong>
                        <span className="service-price-badge">Tiêu chuẩn VCL Việt Nam Logistics</span>
                      </div>
                      <p className="service-description" style={{ margin: "4px 0 0 0" }}>
                        Đơn hàng áp dụng quy trình vận chuyển & theo dõi hành trình tiêu chuẩn của Việt Nam Logistics (VCL).
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Note Section - Only show if note is filled */}
            {Boolean(form.note?.trim()) && (
              <div className="consignment-confirm-section">
                <div className="consignment-confirm-section-title">
                  <span><InfoCircleOutlined /></span>
                  <div>
                    <h2>Ghi chú đơn hàng</h2>
                    <p>Thông tin ghi chú đính kèm cho đơn ký gửi.</p>
                  </div>
                </div>
                <p className="consignment-confirm-note">
                  {form.note.trim()}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Receiver Info, Order Cost Breakdown & Confirmation Action */}
          <div className="consignment-confirm-right-col">
            {/* Delivery Info Card */}
            <div className="consignment-confirm-sidebar-card">
              <div className="sidebar-card-header">
                <EnvironmentOutlined className="sidebar-card-icon" />
                <div>
                  <h3>Thông tin giao nhận</h3>
                  <p>Tuyến hàng & địa chỉ người nhận</p>
                </div>
              </div>

              <div className="sidebar-info-list">
                <div className="sidebar-info-row is-highlight">
                  <span>Tuyến vận chuyển</span>
                  <strong>{routeLabel}</strong>
                </div>

                <div className="sidebar-info-row">
                  <span>Hình thức vận chuyển</span>
                  <strong>{shippingLabel}</strong>
                </div>

                <div className="sidebar-info-row">
                  <span>Người nhận hàng</span>
                  <strong>{form.receiverName}</strong>
                </div>

                <div className="sidebar-info-row">
                  <span>Số điện thoại</span>
                  <strong>{form.receiverPhone}</strong>
                </div>

                <div className="sidebar-info-row is-address">
                  <span>Địa chỉ giao hàng</span>
                  <strong>{receiverAddress}</strong>
                </div>

                <div className="sidebar-info-row">
                  <span>Khi hàng về Việt Nam</span>
                  <strong>{destinationHandlingLabel}</strong>
                </div>
              </div>
            </div>

            {/* Order Metrics Breakdown Card */}
            <div className="consignment-confirm-sidebar-card">
              <div className="sidebar-card-header">
                <ShoppingOutlined className="sidebar-card-icon" />
                <div>
                  <h3>Tổng quan đơn hàng</h3>
                  <p>Tổng hợp thông số & giá trị</p>
                </div>
              </div>

              <div className="sidebar-metrics-grid">
                <div className="metric-row">
                  <span>Tổng số kiện hàng</span>
                  <strong>{packages.length} kiện</strong>
                </div>
                <div className="metric-row">
                  <span>Tổng số sản phẩm</span>
                  <strong>{formatNumber(totals.quantity)} sản phẩm</strong>
                </div>
                <div className="metric-row">
                  <span>Tổng khối lượng</span>
                  <strong>{formatNumber(totals.weight)} kg</strong>
                </div>
                <div className="metric-row">
                  <span>Tổng thể tích</span>
                  <strong>{formatNumber(totals.volume)} cm³</strong>
                </div>
                <div className="metric-row is-highlight-green">
                  <span>Tổng giá trị khai báo</span>
                  <strong>{formatVnd(totals.declaredValue)}</strong>
                </div>

                {woodCrateSelected && (
                  <div className="metric-row is-highlight-amber">
                    <span>Tổng phí đóng thùng</span>
                    <strong>{formatVnd(woodCratePricingSummary.totalFee)}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Action Panel Card */}
            <div className="consignment-confirm-sidebar-card is-action-card">
              <div className="consignment-confirm-warning">
                <SafetyCertificateOutlined />
                <span>
                  Vui lòng kiểm tra kỹ thông tin. Sau khi xác nhận, hệ thống sẽ tiến hành gửi yêu cầu tạo đơn.
                </span>
              </div>

              <div className="sidebar-action-buttons">
                <button
                  type="button"
                  className="consignment-confirm-button is-primary"
                  disabled={isSubmitting || masterDataLoading || !woodCrateSelectionComplete}
                  onClick={onConfirm}
                >
                  {isSubmitting ? (
                    <>
                      <LoadingOutlined spin />
                      ĐANG TẠO ĐƠN...
                    </>
                  ) : !woodCrateSelectionComplete ? (
                    <>
                      <InfoCircleOutlined />
                      CHƯA CHỌN ĐỦ KÍCH THƯỚC THÙNG
                    </>
                  ) : (
                    <>
                      <CheckCircleOutlined />
                      XÁC NHẬN TẠO ĐƠN KÝ GỬI
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="consignment-confirm-button is-secondary"
                  disabled={isSubmitting}
                  onClick={onBack}
                >
                  <LeftOutlined /> Quay lại chỉnh sửa
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isSubmitting && (
        <div
          className="consignment-confirm-loading-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consignment-loading-title"
          aria-describedby="consignment-loading-description"
        >
          <div className="consignment-confirm-loading-card">
            <div className="consignment-confirm-loading-header">
              <div
                className="consignment-confirm-loading-visual"
                aria-hidden="true"
              >
                <span className="consignment-confirm-loading-orbit" />

                <span className="consignment-confirm-loading-icon">
                  <LoadingOutlined spin />
                </span>
              </div>

              <div className="consignment-confirm-loading-copy">
                <span className="consignment-confirm-loading-eyebrow">
                  HỆ THỐNG ĐANG XỬ LÝ
                </span>

                <h3 id="consignment-loading-title">
                  Đang tạo đơn ký gửi
                </h3>

                <p id="consignment-loading-description">
                  {translateSubmitMessage(
                    submitMessage,
                  )}
                </p>
              </div>
            </div>

            <div className="consignment-confirm-loading-progress">
              <div className="consignment-confirm-loading-progress-info">
                <span>
                  Tiến trình xử lý
                </span>

                <strong>
                  {loadingProgress}%
                </strong>
              </div>

              <div
                className="consignment-confirm-loading-progress-track"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={
                  loadingProgress
                }
              >
                <span
                  style={{
                    width: `${loadingProgress}%`,
                  }}
                />
              </div>
            </div>

            <div className="consignment-confirm-loading-steps">
              {[
                "Kiểm tra dữ liệu",
                "Tải ảnh kiện hàng",
                "Gửi yêu cầu tạo đơn",
              ].map(
                (
                  stepLabel,
                  index,
                ) => {
                  const stepNumber =
                    index + 1;

                  const isCompleted =
                    loadingStage >
                    stepNumber;

                  const isActive =
                    loadingStage ===
                    stepNumber;

                  return (
                    <div
                      key={
                        stepLabel
                      }
                      className={[
                        "consignment-confirm-loading-step",
                        isCompleted &&
                          "is-completed",
                        isActive &&
                          "is-active",
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(" ")}
                    >
                      <span className="consignment-confirm-loading-step-dot">
                        {isCompleted ? (
                          <CheckCircleOutlined />
                        ) : (
                          stepNumber
                        )}
                      </span>

                      <span>
                        {stepLabel}
                      </span>
                    </div>
                  );
                },
              )}
            </div>

            <div className="consignment-confirm-loading-safe-note">
              <SafetyCertificateOutlined />

              <span>
                Dữ liệu đang được xử lý an
                toàn. Vui lòng không đóng,
                quay lại hoặc tải lại trang.
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}