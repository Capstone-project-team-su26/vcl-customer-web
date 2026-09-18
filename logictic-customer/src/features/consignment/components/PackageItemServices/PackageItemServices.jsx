import { InfoCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { Checkbox } from "antd";

import {
  formatItemServiceFee,
  isPercentageItemService,
} from "./PackageItemServices.helpers";
import "./PackageItemServices.css";

/**
 * Chọn dịch vụ cho MỘT kiện (items[].services[]). Danh sách lấy từ
 * GET /api/orders/consignments/item-services theo tuyến + phương án của đơn.
 */
export default function PackageItemServices({
  packageIndex,
  services = [],
  selectedIds = [],
  declaredValue,
  loading = false,
  error = "",
  needsRoute = false,
  disabled = false,
  onChange,
}) {
  const selectedSet = new Set(selectedIds);
  const hasDeclaredValue = Number(declaredValue) > 0;

  const toggle = (pricingRuleId, checked) => {
    const next = checked
      ? [...selectedIds, pricingRuleId]
      : selectedIds.filter((id) => id !== pricingRuleId);

    onChange?.(Array.from(new Set(next)));
  };

  const renderBody = () => {
    if (needsRoute) {
      return (
        <p className="pis-hint">
          <InfoCircleOutlined /> Chọn tuyến hàng và hình thức vận chuyển để xem
          dịch vụ áp dụng.
        </p>
      );
    }

    if (loading) {
      return (
        <p className="pis-hint">
          <LoadingOutlined spin /> Đang tải dịch vụ...
        </p>
      );
    }

    if (error) {
      return <p className="pis-hint is-error">{error}</p>;
    }

    if (!services.length) {
      return (
        <p className="pis-hint">Phương án này chưa có dịch vụ chọn thêm.</p>
      );
    }

    return (
      <ul className="pis-list">
        {services.map((service) => {
          const id = service.pricingRuleId;
          const checked = selectedSet.has(id);
          const needsValue = isPercentageItemService(service) && !hasDeclaredValue;

          return (
            <li
              key={id}
              className={["pis-item", checked && "is-checked"]
                .filter(Boolean)
                .join(" ")}
            >
              <Checkbox
                checked={checked}
                disabled={disabled || (needsValue && !checked)}
                onChange={(event) => toggle(id, event.target.checked)}
              >
                <span className="pis-name">{service.name || service.code}</span>
                <span className="pis-fee">{formatItemServiceFee(service)}</span>
              </Checkbox>

              {service.description && (
                <p className="pis-desc">{service.description}</p>
              )}

              {needsValue && (
                <p className="pis-desc is-warning">
                  Nhập giá trị kiện hàng lớn hơn 0 để chọn dịch vụ này.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="input-field-group pis-root">
      <label className="field-label">
        DỊCH VỤ CHO KIỆN {packageIndex}
        <span className="pis-optional"> (tuỳ chọn, tính phí riêng cho kiện này)</span>
      </label>

      {renderBody()}
    </div>
  );
}
