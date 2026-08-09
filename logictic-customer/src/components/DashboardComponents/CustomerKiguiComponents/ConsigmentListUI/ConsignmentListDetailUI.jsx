import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Descriptions,
  Image,
  Modal,
  Table,
  Tag,
  Tooltip,
} from "antd";
import { Button, CircularProgress } from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PersonIcon from "@mui/icons-material/Person";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

import "./ConsignmentListDetailUI.css";



const SummaryCard = ({ label, value, suffix = "" }) => {
  const labelRef = useRef(null);
  const valueRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const displayValue =
    value === null || value === undefined || value === ""
      ? "-"
      : String(value);

  const fullValue = suffix ? `${displayValue} ${suffix}` : displayValue;

  const checkOverflow = useCallback(() => {
    const labelElement = labelRef.current;
    const valueElement = valueRef.current;

    setIsOverflowing(
      Boolean(
        (labelElement &&
          labelElement.scrollWidth > labelElement.clientWidth + 1) ||
          (valueElement &&
            valueElement.scrollWidth > valueElement.clientWidth + 1),
      ),
    );
  }, [displayValue, label, suffix]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(checkOverflow);
    let resizeObserver;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(checkOverflow);

      if (labelRef.current) resizeObserver.observe(labelRef.current);
      if (valueRef.current) resizeObserver.observe(valueRef.current);
    }

    window.addEventListener("resize", checkOverflow);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", checkOverflow);
    };
  }, [checkOverflow]);

  return (
    <Tooltip
      title={
        isOverflowing ? (
          <div className="detail-summary-tooltip">
            <strong>{label}</strong>
            <div>{fullValue}</div>
          </div>
        ) : null
      }
      placement="top"
    >
      <div
        className={`detail-summary-card ${
          isOverflowing ? "is-tooltip-enabled" : ""
        }`}
        aria-label={`${label}: ${fullValue}`}
      >
        <span ref={labelRef}>{label}</span>
        <strong ref={valueRef}>
          {displayValue}
          {suffix && <small> {suffix}</small>}
        </strong>
      </div>
    </Tooltip>
  );
};

const DetailNavigation = ({ onBack }) => (
  <div className="detail-navigation">
    <Button
      variant="outlined"
      color="inherit"
      startIcon={<ArrowBackIcon />}
      onClick={onBack}
      className="detail-back-button"
    >
      Quay lại danh sách
    </Button>

    <span className="detail-navigation-text">
      Danh sách ký gửi / Chi tiết
    </span>
  </div>
);

const DetailWarnings = ({
  errorMessage,
  hasSummaryData,
  volumetricRuleLoading,
  volumetricRuleError,
  packageConfigurationLoading,
  packageConfigurationError,
  hasWoodCrateService,
}) => (
  <>
    {errorMessage && hasSummaryData && (
      <div className="detail-warning-message">
        Không thể tải dữ liệu mới nhất. Đang hiển thị dữ liệu từ danh sách.
      </div>
    )}

    {volumetricRuleLoading && (
      <div className="detail-warning-message">
        Đang tải quy tắc VOLUMETRIC_DIVISOR từ hệ thống...
      </div>
    )}

    {volumetricRuleError && (
      <div className="detail-warning-message">
        {volumetricRuleError} Phần DIM không dùng hệ số cố định thay thế.
      </div>
    )}

    {hasWoodCrateService &&
      packageConfigurationLoading && (
        <div className="detail-warning-message detail-warning-info">
          Đang tải thông tin cấu hình thùng gỗ...
        </div>
      )}

    {hasWoodCrateService &&
      packageConfigurationError && (
        <div className="detail-warning-message detail-warning-error">
          {packageConfigurationError}
        </div>
      )}
  </>
);

const DetailHero = ({
  consignment,
  displayCode,
  copiedConsignmentCode,
  statusClass,
  statusLabel,
  createdAtText,
  createdAtTitle,
  onCopy,
}) => {
  const copied = copiedConsignmentCode === displayCode;

  return (
    <section className="detail-hero-section">
      <div className="detail-hero-main">
        <div className="detail-main-icon">
          <Inventory2OutlinedIcon />
        </div>

        <div className="detail-hero-content">
          <div className="detail-title-row">
            <div className="detail-code-group">
              <span className="detail-code-label">MÃ VẬN ĐƠN</span>

              <div className="detail-code-row">
                <h1 title={displayCode}>{displayCode}</h1>

                <button
                  type="button"
                  className={`detail-copy-code-button ${
                    copied ? "is-copied" : ""
                  }`}
                  onClick={onCopy}
                  disabled={displayCode === "Chưa được cấp mã"}
                >
                  {copied ? (
                    <>
                      <CheckRoundedIcon />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <ContentCopyRoundedIcon />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <span className={`detail-status-badge status-${statusClass}`}>
              {statusLabel}
            </span>
          </div>

          <div className="detail-order-metadata">
            <span>
              Loại đơn:{" "}
              <strong>
                {consignment.orderType === "CONSIGNMENT"
                  ? "KÝ GỬI"
                  : consignment.orderType || "-"}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="detail-created-time">
        <span>Ngày tạo yêu cầu</span>
        <strong title={createdAtTitle}>{createdAtText}</strong>
      </div>
    </section>
  );
};

const DetailSummary = ({ cards }) => (
  <section className="detail-summary-grid">
    {cards.map((card) => (
      <SummaryCard key={card.label} {...card} />
    ))}
  </section>
);

const PartyInformation = ({ customer, consignment }) => (
  <div className="detail-information-grid">
    <section className="detail-section-card">
      <div className="detail-section-header">
        <div className="detail-section-icon customer">
          <PersonIcon />
        </div>

        <div>
          <h2>Thông tin khách hàng</h2>
          <p>Thông tin người gửi yêu cầu ký gửi</p>
        </div>
      </div>

      <Descriptions
        bordered
        column={1}
        size="middle"
        className="detail-descriptions"
      >
        <Descriptions.Item label="Họ và tên">
          {customer.fullName || "-"}
        </Descriptions.Item>

        <Descriptions.Item label="Email">
          {customer.email ? (
            <a href={`mailto:${customer.email}`}>{customer.email}</a>
          ) : (
            "-"
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Số điện thoại">
          {customer.phone ? (
            <a href={`tel:${customer.phone}`}>{customer.phone}</a>
          ) : (
            "-"
          )}
        </Descriptions.Item>
      </Descriptions>
    </section>

    <section className="detail-section-card">
      <div className="detail-section-header">
        <div className="detail-section-icon receiver">
          <LocalShippingOutlinedIcon />
        </div>

        <div>
          <h2>Thông tin nhận hàng</h2>
          <p>Địa chỉ giao hàng sau khi hoàn tất</p>
        </div>
      </div>

      <Descriptions
        bordered
        column={1}
        size="middle"
        className="detail-descriptions"
      >
        <Descriptions.Item label="Người nhận">
          {consignment.receiverName || "-"}
        </Descriptions.Item>

        <Descriptions.Item label="Số điện thoại">
          {consignment.receiverPhone ? (
            <a href={`tel:${consignment.receiverPhone}`}>
              {consignment.receiverPhone}
            </a>
          ) : (
            "-"
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Địa chỉ nhận hàng">
          {consignment.receiverAddress || "-"}
        </Descriptions.Item>

        <Descriptions.Item label="Kiểm hàng">
          <Tag
            className={`detail-inspection-tag ${
              consignment.requiresInspection
                ? "is-inspection"
                : "no-inspection"
            }`}
          >
            <span className="detail-inspection-dot" />
            {consignment.requiresInspection
              ? "CÓ KIỂM HÀNG"
              : "KHÔNG KIỂM HÀNG"}
          </Tag>
        </Descriptions.Item>
      </Descriptions>
    </section>
  </div>
);

const ProductTableSection = ({ items, columns }) => (
  <section className="detail-section-card detail-products-section">
    <div className="detail-section-header">
      <div className="detail-section-icon product">
        <Inventory2OutlinedIcon />
      </div>

      <div>
        <h2>Danh sách kiện hàng</h2>
        <p>Thông tin chi tiết sản phẩm trong yêu cầu</p>
      </div>
    </div>

    <Table
      className="detail-product-table"
      columns={columns}
      dataSource={items}
      rowKey={(record, index) => record.id || record.itemId || index}
      pagination={false}
      scroll={{ x: 1500 }}
    />
  </section>
);

const isWoodCrateDisplayRule = (rule) => {
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

const ShippingInformation = ({
  consignment,
  statusClass,
  statusLabel,
  consignmentTypeLabel,
  selectedPricingRules = [],
  pricingRuleError,
  woodCrateFeeSummary,
  translatedNote,
  getRuleDisplayName,
  getRuleColorClass,
}) => {
  const rules = Array.isArray(
    selectedPricingRules,
  )
    ? selectedPricingRules
    : [];

  return (
    <section className="detail-section-card">
      <div className="detail-section-header">
        <div className="detail-section-icon shipping">
          <LocalShippingOutlinedIcon />
        </div>

        <div>
          <h2>Thông tin vận chuyển</h2>
          <p>Dịch vụ, mức phí và trạng thái lô hàng</p>
        </div>
      </div>

      <Descriptions
        bordered
        column={1}
        size="middle"
        className="detail-descriptions"
      >
        <Descriptions.Item label="Trạng thái">
          <span
            className={`detail-inline-status status-${statusClass}`}
          >
            {statusLabel}
          </span>
        </Descriptions.Item>

        <Descriptions.Item label="Loại vận chuyển">
          {consignmentTypeLabel}
        </Descriptions.Item>

        <Descriptions.Item label="Tuyến">
          {consignment.route || "-"}
        </Descriptions.Item>

        <Descriptions.Item label="Dịch vụ bổ sung">
          {rules.length > 0 ? (
            <div
              className="detail-pricing-rule-list"
              style={{
                display: "grid",
                gap: 10,
                width: "100%",
              }}
            >
              {rules.map((rule, index) => {
                const name =
                  getRuleDisplayName(rule);

                const feeLabel =
                  rule?.feeLabel ||
                  "Theo báo giá hệ thống";

                const isWoodCrate =
                  isWoodCrateDisplayRule(rule);

                const tooltipTitle = (
                  <div
                    style={{
                      maxWidth: 340,
                    }}
                  >
                    <strong>{name}</strong>

                    {rule?.description && (
                      <p
                        style={{
                          margin:
                            "6px 0 0",
                        }}
                      >
                        {rule.description}
                      </p>
                    )}

                    <div
                      style={{
                        marginTop: 6,
                        fontWeight: 700,
                      }}
                    >
                      Mức phí: {feeLabel}
                    </div>

                    {rule?.feeDetail && (
                      <div
                        style={{
                          marginTop: 4,
                        }}
                      >
                        {rule.feeDetail}
                      </div>
                    )}
                  </div>
                );

                return (
                  <Tooltip
                    key={
                      rule.pricingRuleId ||
                      rule.id ||
                      rule.ruleCode ||
                      index
                    }
                    title={tooltipTitle}
                    placement="top"
                  >
                    <div
                      className={`detail-pricing-rule-item ${getRuleColorClass(
                        rule,
                      )} ${
                        rule.isMissing
                          ? "service-missing"
                          : ""
                      }`}
                      style={{
                        display: "grid",
                        gap: 7,
                        padding:
                          "11px 12px",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: 10,
                        background:
                          "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <Tag
                          className={`detail-pricing-rule-tag ${getRuleColorClass(
                            rule,
                          )} ${
                            rule.isMissing
                              ? "service-missing"
                              : ""
                          }`}
                          style={{
                            margin: 0,
                          }}
                        >
                          <span className="detail-pricing-rule-dot" />
                          <span>{name}</span>
                        </Tag>

                        <strong
                          style={{
                            color:
                              rule.isMissing
                                ? "#94a3b8"
                                : "#0f172a",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {isWoodCrate
                            ? `Tổng: ${feeLabel}`
                            : feeLabel}
                        </strong>
                      </div>

                      {isWoodCrate &&
                        woodCrateFeeSummary?.enabled && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(150px, 1fr))",
                              gap: 8,
                            }}
                          >
                            {[
                              {
                                label:
                                  "Phí dịch vụ toàn đơn",
                                value:
                                  woodCrateFeeSummary.orderFee,
                              },
                              {
                                label:
                                  "Tổng phí cấu hình thùng",
                                value:
                                  woodCrateFeeSummary.configurationFee,
                              },
                              {
                                label:
                                  "Tổng phí đóng thùng gỗ",
                                value:
                                  woodCrateFeeSummary.totalFee,
                              },
                            ].map((item) => (
                              <div
                                key={item.label}
                                style={{
                                  display: "grid",
                                  gap: 3,
                                  padding: "9px 10px",
                                  borderRadius: 8,
                                  background: "#f8fafc",
                                  border:
                                    "1px solid #e2e8f0",
                                }}
                              >
                                <span
                                  style={{
                                    color: "#64748b",
                                    fontSize: 11,
                                    lineHeight: 1.35,
                                  }}
                                >
                                  {item.label}
                                </span>

                                <strong
                                  style={{
                                    color: "#0f172a",
                                    fontSize: 13,
                                  }}
                                >
                                  {typeof item.value ===
                                  "number"
                                    ? new Intl.NumberFormat(
                                        "vi-VN",
                                        {
                                          style:
                                            "currency",
                                          currency: "VND",
                                          maximumFractionDigits: 0,
                                        },
                                      ).format(item.value)
                                    : "0 ₫"}
                                </strong>
                              </div>
                            ))}
                          </div>
                        )}

                      {rule?.description && (
                        <span
                          style={{
                            color:
                              "#64748b",
                            fontSize: 13,
                            lineHeight: 1.55,
                          }}
                        >
                          {rule.description}
                        </span>
                      )}

                      {rule?.feeDetail && (
                        <small
                          style={{
                            color:
                              "#475569",
                            lineHeight: 1.5,
                          }}
                        >
                          {rule.feeDetail}
                        </small>
                      )}
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          ) : (
            <span className="detail-pending-value">
              {pricingRuleError ||
                "Không sử dụng dịch vụ bổ sung"}
            </span>
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Số dịch vụ bổ sung">
          <strong>
            {rules.length} dịch vụ
          </strong>
        </Descriptions.Item>

        <Descriptions.Item label="Ghi chú kiện hàng">
          <span className="detail-translated-note">
            {translatedNote}
          </span>
        </Descriptions.Item>
      </Descriptions>
    </section>
  );
};

const QuotationInfoLabel = ({
  label,
  description,
  details,
}) => (
  <div className="quotation-info-label">
    <span>{label}</span>

    <Tooltip
      title={
        <div className="quotation-info-tooltip">
          <strong>{label}</strong>

          {description && <p>{description}</p>}

          {details && (
            <div
              style={{
                display: "grid",
                gap: 6,
                marginTop: 8,
              }}
            >
              {details}
            </div>
          )}
        </div>
      }
      placement="top"
      trigger={["hover", "focus", "click"]}
      mouseEnterDelay={0.12}
    >
      <button
        type="button"
        className="quotation-info-trigger"
        aria-label={`Giải thích ${label}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        i
      </button>
    </Tooltip>
  </div>
);

const QuotationInformation = ({
  quotation,
  statusClass,
  statusLabel,
  quoteTypeLabel,
  taxRuleInfo = {},
  formatMoney,
  formatDateTime,
  formatDateTimeTitle,
}) => (
  <section className="detail-section-card quotation-card">
    <div className="detail-section-header">
      <div className="detail-section-icon quotation">
        <ReceiptLongOutlinedIcon />
      </div>

      <div>
        <h2>Thông tin báo giá</h2>
        <p>Chi phí dự kiến của lô hàng</p>
      </div>
    </div>

    {quotation ? (
      <>
        <div className="quotation-heading">
          <div>
            <span>Loại báo giá</span>
            <strong>{quoteTypeLabel}</strong>
          </div>

          <span className={`quotation-status status-${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        <div className="quotation-price-list">
          <div>
            <QuotationInfoLabel
              label="Cước vận chuyển dự kiến"
              description="Chi phí vận chuyển ước tính dựa trên tuyến hàng, phương thức vận chuyển và khối lượng tính cước của lô hàng."
            />

            <strong>
              {formatMoney(
                quotation.estimatedFreightCharge,
              )}
            </strong>
          </div>

          <div>
            <QuotationInfoLabel
              label="Phí dịch vụ"
              description="Khoản phí cho các dịch vụ bổ sung đang được áp dụng trong đơn, theo kết quả báo giá của hệ thống."
            />

            <strong>
              {formatMoney(quotation.serviceFee)}
            </strong>
          </div>

          <div>
            <QuotationInfoLabel
              label="Phí vận chuyển nội địa"
              description="Chi phí ước tính để vận chuyển hàng trong nội địa trước hoặc sau chặng vận chuyển quốc tế."
            />

            <strong>
              {formatMoney(
                quotation.domesticShippingFee,
              )}
            </strong>
          </div>

          <div>
            <QuotationInfoLabel
              label="Thuế và phí nhập khẩu"
              description="Mức phần trăm được lấy trực tiếp từ quy tắc thuế của bảng giá hệ thống."
              details={
                <>
                  <div>
                    Thuế nhập khẩu mặc định:{" "}
                    <strong>
                      {taxRuleInfo.importTaxPercent ||
                        "Chưa có dữ liệu từ API"}
                    </strong>
                  </div>

                  {taxRuleInfo.importTaxDescription && (
                    <span>
                      {taxRuleInfo.importTaxDescription}
                    </span>
                  )}

                  <div
                    style={{
                      height: 1,
                      margin: "8px 0 4px",
                      background:
                        "rgba(255, 255, 255, 0.18)",
                    }}
                  />

                  <div>
                    VAT dịch vụ logistics:{" "}
                    <strong>
                      {taxRuleInfo.vatPercent ||
                        "Chưa có dữ liệu từ API"}
                    </strong>
                  </div>

                  <span>
                    {taxRuleInfo.vatDescription ||
                      "VAT = (FreightCharge + ServiceFee) × 8%. Không gồm phí vận chuyển nội địa (DOMESTIC_FEE)."}
                  </span>
                </>
              }
            />

            <strong>
              {formatMoney(quotation.taxAndDuty)}
            </strong>
          </div>

          {(quotation.vat !== null &&
            quotation.vat !== undefined) && (
            <div>
              <QuotationInfoLabel
                label="VAT dịch vụ logistics"
                description="Mức phần trăm được lấy trực tiếp từ quy tắc VAT của API bảng giá."
                details={
                  <>
                    <div>
                      VAT đang áp dụng:{" "}
                      <strong>
                        {taxRuleInfo.vatPercent ||
                          "Chưa có dữ liệu từ API"}
                      </strong>
                    </div>

                    {taxRuleInfo.vatDescription && (
                      <span>
                        {taxRuleInfo.vatDescription}
                      </span>
                    )}
                  </>
                }
              />

              <strong>
                {formatMoney(quotation.vat)}
              </strong>
            </div>
          )}

          <div className="quotation-total-row">
            <QuotationInfoLabel
              label="Tổng chi phí dự kiến"
              description="Tổng tạm tính gồm cước vận chuyển, phí dịch vụ, phí vận chuyển nội địa và thuế hoặc phí nhập khẩu."
            />

            <strong>
              {formatMoney(
                quotation.totalEstimatedCost,
              )}
            </strong>
          </div>
        </div>

        <div className="quotation-time-grid">
          <div>
            <span>Ngày tạo báo giá</span>
            <strong
              title={formatDateTimeTitle(
                quotation.createdAtUtc || quotation.createdAt,
              )}
            >
              {formatDateTime(quotation.createdAtUtc || quotation.createdAt)}
            </strong>
          </div>

          <div>
            <span>Ngày hết hạn</span>
            <strong
              title={formatDateTimeTitle(
                quotation.expiredAtUtc || quotation.expiredAt,
              )}
            >
              {formatDateTime(quotation.expiredAtUtc || quotation.expiredAt)}
            </strong>
          </div>
        </div>
      </>
    ) : (
      <div className="quotation-empty">
        Chưa có báo giá cho lô hàng này.
      </div>
    )}
  </section>
);

const CancelOrderSection = ({
  isCancelling,
  isAlreadyCancelled,
  onOpen,
}) => (
  <section className="detail-cancel-bottom-section">
    <div className="detail-cancel-bottom-content">
      <h3>Hủy yêu cầu ký gửi</h3>
      <p>
        Nhấn Hủy đơn, nhập lý do và xác nhận. Hệ thống sẽ tiếp nhận và xử lý yêu cầu ngay lập tức.
      </p>
    </div>

    <button
      type="button"
      className="detail-cancel-order-button"
      disabled={isCancelling || isAlreadyCancelled}
      onClick={onOpen}
    >
      {isCancelling ? (
        <>
          <CircularProgress size={16} color="inherit" />
          Đang hủy...
        </>
      ) : (
        <>
          <CancelOutlinedIcon fontSize="small" />
          {isAlreadyCancelled ? "Đã hủy" : "Hủy đơn"}
        </>
      )}
    </button>
  </section>
);

const CancelOrderModal = ({
  open,
  reason,
  error,
  isCancelling,
  onReasonChange,
  onClose,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div
      className="cancel-order-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="cancel-order-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-order-title"
      >
        <div className="cancel-order-modal-icon">
          <CancelOutlinedIcon />
        </div>

        <div className="cancel-order-modal-content">
          <h2 id="cancel-order-title">Hủy đơn ký gửi</h2>
          <p>
            Đơn hàng sau khi hủy sẽ không thể tiếp tục xử lý. Vui lòng nhập
            lý do hủy.
          </p>

          <label htmlFor="cancel-reason" className="cancel-order-label">
            Lý do hủy
          </label>

          <textarea
            id="cancel-reason"
            rows={4}
            maxLength={500}
            value={reason}
            disabled={isCancelling}
            placeholder="Ví dụ: Tôi nhập sai thông tin đơn hàng..."
            className={`cancel-order-textarea ${error ? "has-error" : ""}`}
            onChange={(event) => onReasonChange(event.target.value)}
          />

          <div className="cancel-order-counter">{reason.length}/500</div>
          {error && <div className="cancel-order-error">{error}</div>}
        </div>

        <div className="cancel-order-modal-actions">
          <button
            type="button"
            className="cancel-order-close-button"
            disabled={isCancelling}
            onClick={onClose}
          >
            Quay lại
          </button>

          <button
            type="button"
            className="cancel-order-confirm-button"
            disabled={isCancelling || reason.trim().length < 5}
            onClick={onConfirm}
          >
            {isCancelling ? (
              <>
                <CircularProgress size={16} color="inherit" />
                Đang hủy...
              </>
            ) : (
              <>
                <CancelOutlinedIcon fontSize="small" />
                Xác nhận hủy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const FullTextPreviewModal = ({ preview, onClose }) => (
  <Modal
    open={preview.open}
    title={preview.title}
    onCancel={onClose}
    footer={null}
    centered
    width={560}
  >
    <div className="detail-full-text-content">{preview.content}</div>
  </Modal>
);


const getRecordReferenceUrls = (record = {}) => {
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

const PACKAGE_CONFIGURATION_LABELS = {
  SMALL: {
    name: "Thùng cỡ nhỏ",
    size: "CỠ NHỎ",
  },
  MEDIUM: {
    name: "Thùng cỡ vừa",
    size: "CỠ VỪA",
  },
  LARGE: {
    name: "Thùng cỡ lớn",
    size: "CỠ LỚN",
  },
  CUSTOM: {
    name: "Thùng tùy chỉnh",
    size: "TÙY CHỈNH",
  },
};

const getPackageConfigurationDisplay = (
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

const formatPackageDimensions = (
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

const PackageConfigurationCell = ({
  record,
  hasWoodCrateService,
  formatMoney,
  getPackageConfigurationFee,
}) => {
  const configuration =
    record?.packageConfiguration;

  if (configuration) {
    const {
      configClass,
      displayName,
      displaySize,
    } = getPackageConfigurationDisplay(
      configuration,
    );

    const displayFee = getPackageConfigurationFee
      ? getPackageConfigurationFee(configuration, record)
      : (configuration.estimatedFee ??
        configuration.packageFee ??
        0);

    return (
      <div
        className={`detail-package-configuration config-${configClass}`}
      >
        <div className="detail-package-configuration__header">
          <div className="detail-package-configuration__name">
            <strong>{displayName}</strong>

            <span className="detail-package-configuration__code">
              {displaySize}
            </span>
          </div>
        </div>

        <div className="detail-package-configuration__metrics">
          <div>
            <span>Kích thước thùng</span>

            <strong>
              {formatPackageDimensions(
                configuration,
              )}
            </strong>
          </div>

          <div>
            <span>Tải trọng tối đa</span>

            <strong>
              {configuration.maxWeight ?? 0} kg
            </strong>
          </div>

          <div>
            <span>Phí đóng gói</span>

            <strong>
              {formatMoney(displayFee)}
            </strong>
          </div>
        </div>
      </div>
    );
  }

  if (
    record?.packageConfigurationStatus ===
    "NOT_FOUND"
  ) {
    return (
      <div className="detail-package-configuration-state is-warning">
        <strong>
          Cấu hình không còn trong danh mục
        </strong>

        <span>
          Không thể đối chiếu cấu hình thùng đã lưu với dữ liệu hiện tại.
        </span>
      </div>
    );
  }

  if (
    record?.packageConfigurationStatus ===
    "MISSING_CONFIGURATION"
  ) {
    return (
      <div className="detail-package-configuration-state is-error">
        <strong>
          Chưa có cấu hình thùng
        </strong>

        <span>
          Đơn có dịch vụ đóng thùng nhưng kiện hàng chưa có thông tin cấu hình.
        </span>
      </div>
    );
  }

  return (
    <span className="detail-package-configuration-empty">
      {hasWoodCrateService
        ? "Chưa cập nhật cấu hình"
        : "Không sử dụng đóng thùng"}
    </span>
  );
};

const ProductImageCarousel = ({
  record,
}) => {
  const imageUrls =
    getRecordReferenceUrls(record);

  const [activeIndex, setActiveIndex] =
    useState(0);

  const [isPaused, setIsPaused] =
    useState(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [imageUrls.join("|")]);

  useEffect(() => {
    if (
      imageUrls.length <= 1 ||
      isPaused
    ) {
      return undefined;
    }

    const intervalId =
      window.setInterval(() => {
        setActiveIndex((currentIndex) =>
          (currentIndex + 1) %
          imageUrls.length,
        );
      }, 2800);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [imageUrls.length, isPaused]);

  if (!imageUrls.length) {
    return (
      <div className="detail-no-image">
        <Inventory2OutlinedIcon />
      </div>
    );
  }

  const handlePrevious = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setActiveIndex((currentIndex) =>
      currentIndex === 0
        ? imageUrls.length - 1
        : currentIndex - 1,
    );
  };

  const handleNext = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setActiveIndex((currentIndex) =>
      (currentIndex + 1) %
      imageUrls.length,
    );
  };

  return (
    <Image.PreviewGroup>
      <div
        className="detail-image-carousel"
        onMouseEnter={() =>
          setIsPaused(true)
        }
        onMouseLeave={() =>
          setIsPaused(false)
        }
        onFocusCapture={() =>
          setIsPaused(true)
        }
        onBlurCapture={() =>
          setIsPaused(false)
        }
      >
        <div className="detail-image-carousel__viewport">
          <div
            className="detail-image-carousel__track"
            style={{
              transform: `translateX(-${
                activeIndex * 100
              }%)`,
            }}
          >
            {imageUrls.map(
              (imageUrl, imageIndex) => (
                <div
                  key={`${imageUrl}-${imageIndex}`}
                  className="detail-image-carousel__slide"
                  aria-hidden={
                    imageIndex !== activeIndex
                  }
                >
                  <Image
                    src={imageUrl}
                    alt={`Ảnh ${imageIndex + 1} của ${
                      record.productName ||
                      "sản phẩm"
                    }`}
                    width={132}
                    height={92}
                    className="detail-image-carousel__image"
                    fallback=""
                    preview={{
                      mask: "Xem ảnh",
                    }}
                  />
                </div>
              ),
            )}
          </div>
        </div>

        {imageUrls.length > 1 && (
          <>
            <button
              type="button"
              className="detail-image-carousel__arrow is-previous"
              aria-label="Xem ảnh trước"
              onClick={handlePrevious}
            >
              ‹
            </button>

            <button
              type="button"
              className="detail-image-carousel__arrow is-next"
              aria-label="Xem ảnh tiếp theo"
              onClick={handleNext}
            >
              ›
            </button>

            <div className="detail-image-carousel__dots">
              {imageUrls.map(
                (_, imageIndex) => (
                  <button
                    key={imageIndex}
                    type="button"
                    className={`detail-image-carousel__dot ${
                      imageIndex === activeIndex
                        ? "is-active"
                        : ""
                    }`}
                    aria-label={`Hiển thị ảnh ${
                      imageIndex + 1
                    }`}
                    aria-current={
                      imageIndex === activeIndex
                        ? "true"
                        : undefined
                    }
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setActiveIndex(
                        imageIndex,
                      );
                    }}
                  />
                ),
              )}
            </div>

            <span className="detail-image-carousel__counter">
              {activeIndex + 1}/
              {imageUrls.length}
            </span>
          </>
        )}
      </div>
    </Image.PreviewGroup>
  );
};

const createProductColumns = ({
  volumetricDivisor,
  getProductTypeLabel,
  getRecordProductType,
  onOpenFullText,
  calculateDimWeight,
  formatDimWeight,
  formatWeight,
  formatMoney,
  hasWoodCrateService,
  getPackageConfigurationFee,
}) => [
  {
    title: "STT",
    key: "index",
    width: 65,
    align: "center",
    render: (_, __, index) => index + 1,
  },
  {
    title: "Hình ảnh",
    key: "referenceUrls",
    width: 180,
    align: "center",
    render: (_, record) => (
      <ProductImageCarousel
        record={record}
      />
    ),
  },
  {
    title: "Sản phẩm",
    dataIndex: "productName",
    key: "productName",
    width: 210,
    render: (productName, record) => {
      const displayProductName =
        productName ||
        record?.name ||
        record?.itemName ||
        record?.product?.name ||
        record?.product?.productName ||
        "-";

      return (
        <div className="detail-product-name-cell">
          <strong className="detail-product-name">
            {displayProductName}
          </strong>
        </div>
      );
    },
  },
  {
    title: "Loại sản phẩm",
    key: "productType",
    width: 170,
    align: "center",
    render: (_, record) => {
      const productTypeLabel = getProductTypeLabel(
        getRecordProductType(record),
      );

      if (!productTypeLabel || productTypeLabel === "-") {
        return <span className="detail-pending-value">Chưa cập nhật</span>;
      }

      return (
        <span className="detail-product-type-text">
          {productTypeLabel}
        </span>
      );
    },
  },
  {
    title: "Số lượng",
    dataIndex: "quantity",
    key: "quantity",
    width: 100,
    align: "center",
    render: (quantity) => quantity ?? 0,
  },
  {
    title: "Trọng lượng",
    dataIndex: "weight",
    key: "weight",
    width: 130,
    align: "center",
    render: (weight) => (
      <strong className="detail-weight-value">
        {formatWeight(weight)} kg
      </strong>
    ),
  },
  {
    title: "Kích thước",
    key: "dimensions",
    width: 180,
    render: (_, record) => (
      <span className="detail-dimension-text">
        {record.length ?? 0} × {record.width ?? 0} × {record.height ?? 0} cm
      </span>
    ),
  },
  {
    title: "Cấu hình thùng",
    key: "packageConfiguration",
    width: 310,
    render: (_, record) => (
      <PackageConfigurationCell
        record={record}
        hasWoodCrateService={
          hasWoodCrateService
        }
        formatMoney={formatMoney}
        getPackageConfigurationFee={
          getPackageConfigurationFee
        }
      />
    ),
  },
  {
    title: volumetricDivisor
      ? `DIM = (Dài × Rộng × Cao) / ${formatWeight(volumetricDivisor)}`
      : "DIM (chưa có hệ số từ API)",
    key: "dimensionalWeight",
    width: 310,
    render: (_, record) => {
      if (!volumetricDivisor) {
        return <span className="detail-pending-value">Chưa có hệ số DIM</span>;
      }

      const dimWeight = calculateDimWeight(
        record.length,
        record.width,
        record.height,
        volumetricDivisor,
      );

      if (dimWeight === null) {
        return (
          <span className="detail-pending-value">
            Thiếu thông tin kích thước
          </span>
        );
      }

      return (
        <span className="detail-dimension-text">
          ({record.length} × {record.width} × {record.height}) /{" "}
          {formatWeight(volumetricDivisor)} ={" "}
          <strong>{formatDimWeight(dimWeight)} kg</strong>
        </span>
      );
    },
  },
  {
    title: "Giá trị kiện hàng",
    dataIndex: "declaredValue",
    key: "declaredValue",
    width: 155,
    align: "right",
    render: (declaredValue) => (
      <strong className="detail-money-value">
        {formatMoney(declaredValue)}
      </strong>
    ),
  },
  {
    title: "Mã vận đơn nội địa",
    dataIndex: "domesticTrackingCode",
    key: "domesticTrackingCode",
    width: 180,
    render: (trackingCode) => {
      const displayTrackingCode = trackingCode || "Chưa cập nhật";

      if (!trackingCode) {
        return (
          <span className="detail-pending-value">
            {displayTrackingCode}
          </span>
        );
      }

      return (
        <button
          type="button"
          className="detail-domestic-code-button"
          title="Bấm để xem đầy đủ"
          onClick={() =>
            onOpenFullText("Mã vận đơn nội địa", displayTrackingCode)
          }
        >
          {displayTrackingCode}
        </button>
      );
    },
  },
  {
    title: "",
    key: "action",
    width: 70,
    align: "center",
    render: (_, record) => {
      const firstImageUrl =
        getRecordReferenceUrls(record)[0];

      return firstImageUrl ? (
        <a
          href={firstImageUrl}
          target="_blank"
          rel="noreferrer"
          className="detail-product-link"
          onClick={(event) =>
            event.stopPropagation()
          }
          aria-label="Mở ảnh sản phẩm"
        >
          <OpenInNewIcon fontSize="small" />
        </a>
      ) : null;
    },
  },
];

export default function ConsignmentListDetailUI({
  loading,
  consignment,
  customer,
  quotation,
  items,
  errorMessage,
  hasSummaryData,
  volumetricRuleLoading,
  volumetricRuleError,
  displayCode,
  copiedConsignmentCode,
  statusClass,
  statusLabel,
  quotationStatusClass,
  quotationStatusLabel,
  quoteTypeLabel,
  consignmentTypeLabel,
  summaryCards,
  selectedPricingRules,
  pricingRuleError,
  woodCrateFeeSummary,
  taxRuleInfo,
  packageConfigurationLoading,
  packageConfigurationError,
  hasWoodCrateService,
  translatedConsignmentNote,
  volumetricDivisor,
  fullTextPreview,
  cancelReason,
  cancelReasonError,
  isCancelModalOpen,
  isCancelling,
  isAlreadyCancelled,
  onBack,
  onReload,
  onCopyConsignmentCode,
  onOpenFullText,
  onCloseFullText,
  onOpenCancelModal,
  onCloseCancelModal,
  onConfirmCancel,
  onCancelReasonChange,
  getPackageConfigurationFee,
  getProductTypeLabel,
  getRecordProductType,
  getRuleDisplayName,
  getRuleColorClass,
  calculateDimWeight,
  formatDimWeight,
  formatWeight,
  formatMoney,
  formatDateTime,
  formatDateTimeTitle,
}) {
  const productColumns = useMemo(
    () =>
      createProductColumns({
        volumetricDivisor,
        getProductTypeLabel,
        getRecordProductType,
        onOpenFullText,
        calculateDimWeight,
        formatDimWeight,
        formatWeight,
        formatMoney,
        hasWoodCrateService,
        getPackageConfigurationFee,
      }),
    [
      volumetricDivisor,
      getProductTypeLabel,
      getRecordProductType,
      onOpenFullText,
      calculateDimWeight,
      formatDimWeight,
      formatWeight,
      formatMoney,
      hasWoodCrateService,
    ],
  );

  if (loading) {
    return (
      <>
        <div className="consignment-detail-page">
          <div className="detail-loading-container">
            <CircularProgress size={42} />

            <div>
              <strong>Đang tải chi tiết lô hàng</strong>
              <span>Vui lòng chờ trong giây lát...</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!consignment) {
    return (
      <>
        <div className="consignment-detail-page">
          <div className="detail-error-container">
            <div className="detail-error-icon">📦</div>
            <h2>Không tìm thấy lô hàng</h2>
            <p>{errorMessage || "Lô hàng không tồn tại hoặc đã bị xóa."}</p>

            <div className="detail-error-actions">
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<ArrowBackIcon />}
                onClick={onBack}
              >
                Quay lại
              </Button>

              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={onReload}
              >
                Thử lại
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
        <div className="consignment-detail-page">
        <DetailNavigation onBack={onBack} />

        <DetailWarnings
          errorMessage={errorMessage}
          hasSummaryData={hasSummaryData}
          volumetricRuleLoading={volumetricRuleLoading}
          volumetricRuleError={volumetricRuleError}
          packageConfigurationLoading={
            packageConfigurationLoading
          }
          packageConfigurationError={
            packageConfigurationError
          }
          hasWoodCrateService={
            hasWoodCrateService
          }
        />

        <DetailHero
          consignment={consignment}
          displayCode={displayCode}
          copiedConsignmentCode={copiedConsignmentCode}
          statusClass={statusClass}
          statusLabel={statusLabel}
          createdAtText={formatDateTime(
            consignment.createdAtUtc || consignment.createdAt,
          )}
          createdAtTitle={formatDateTimeTitle(
            consignment.createdAtUtc || consignment.createdAt,
          )}
          onCopy={onCopyConsignmentCode}
        />

        <DetailSummary cards={summaryCards} />

        <PartyInformation customer={customer} consignment={consignment} />

        <ProductTableSection items={items} columns={productColumns} />

        <div className="detail-bottom-grid">
          <ShippingInformation
            consignment={consignment}
            statusClass={statusClass}
            statusLabel={statusLabel}
            consignmentTypeLabel={consignmentTypeLabel}
            selectedPricingRules={selectedPricingRules}
            pricingRuleError={pricingRuleError}
            woodCrateFeeSummary={woodCrateFeeSummary}
            translatedNote={translatedConsignmentNote}
            getRuleDisplayName={getRuleDisplayName}
            getRuleColorClass={getRuleColorClass}
          />

          <QuotationInformation
            quotation={quotation}
            statusClass={quotationStatusClass}
            statusLabel={quotationStatusLabel}
            quoteTypeLabel={quoteTypeLabel}
            taxRuleInfo={taxRuleInfo}
            formatMoney={formatMoney}
            formatDateTime={formatDateTime}
            formatDateTimeTitle={formatDateTimeTitle}
          />
        </div>

        <CancelOrderSection
          isCancelling={isCancelling}
          isAlreadyCancelled={isAlreadyCancelled}
          onOpen={onOpenCancelModal}
        />

        <FullTextPreviewModal
          preview={fullTextPreview}
          onClose={onCloseFullText}
        />

        <CancelOrderModal
          open={isCancelModalOpen}
          reason={cancelReason}
          error={cancelReasonError}
          isCancelling={isCancelling}
          onReasonChange={onCancelReasonChange}
          onClose={onCloseCancelModal}
          onConfirm={onConfirmCancel}
        />
      </div>
    </>
  );
}

