import { InfoCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { Checkbox } from "antd";

import {
  estimateItemServiceFee,
  formatItemServiceAmount,
  formatItemServiceFee,
  getItemServiceCondition,
  isPercentageItemService,
  meetsItemServiceCondition,
  sumSelectedItemServiceFees,
} from "./PackageItemServices.helpers";
import "./PackageItemServices.css";

/**
 * Chọn dịch vụ cho MỘT kiện (items[].services[]). Danh sách lấy từ
 * GET /api/orders/consignments/item-services theo tuyến + phương án của đơn.
 *
 * Mỗi dòng dịch vụ nói đủ ba điều, thay vì chỉ một dòng đơn giá như trước:
 *   1. ĐƠN GIÁ  — mức phí theo quy tắc (3% giá trị kiện, 10.000 đ/kiện...);
 *   2. CÁCH TÍNH — công thức thay số của chính kiện này (3% × 1.500.000 đ = 45.000 đ),
 *      kèm ghi chú khi bị chặn bởi mức tối thiểu / tối đa;
 *   3. THÀNH TIỀN tạm tính — con số khách sẽ thấy trong báo giá.
 *
 * Trước đây màn chỉ hiện đơn giá nên khách phải đợi tới lúc nhân viên phát hành báo giá mới
 * biết phải trả bao nhiêu, và không có gì trên màn giải thích vì sao ra con số đó.
 */
export default function PackageItemServices({
  packageIndex,
  services = [],
  selectedIds = [],
  declaredValue,
  packageDraft = null,
  loading = false,
  error = "",
  needsRoute = false,
  disabled = false,
  onChange,
}) {
  const selectedSet = new Set(selectedIds);

  /* Cũ chỉ truyền declaredValue; giữ lại để không vỡ nơi gọi chưa cập nhật. */
  const pkg = packageDraft || { declaredValue };

  const hasDeclaredValue = Number(pkg.declaredValue) > 0;

  const selectedTotal = sumSelectedItemServiceFees(services, selectedIds, pkg);

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
      <>
        <ul className="pis-list">
          {services.map((service) => {
            const id = service.pricingRuleId;
            const checked = selectedSet.has(id);
            const needsValue =
              isPercentageItemService(service) && !hasDeclaredValue;

            const estimate = estimateItemServiceFee(service, pkg);

            /* Ví dụ: bảo hiểm 3% chỉ cho kiện khai giá từ 5.000.000 đ. */
            const condition = getItemServiceCondition(service);
            const meetsCondition = meetsItemServiceCondition(service, pkg);

            return (
              <li
                key={id}
                className={["pis-item", checked && "is-checked"]
                  .filter(Boolean)
                  .join(" ")}
              >
                <Checkbox
                  checked={checked}
                  /* Chưa đủ điều kiện thì không cho chọn mới, nhưng vẫn cho bỏ chọn cái đã chọn. */
                  disabled={
                    disabled || ((needsValue || !meetsCondition) && !checked)
                  }
                  onChange={(event) => toggle(id, event.target.checked)}
                >
                  <span className="pis-name">
                    {service.name || service.code}
                  </span>

                  <span className="pis-fee">
                    {formatItemServiceFee(service)}
                  </span>
                </Checkbox>

                {service.description && (
                  <p className="pis-desc">{service.description}</p>
                )}

                {condition && (
                  <p
                    className={[
                      "pis-condition",
                      !meetsCondition && "is-unmet",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {condition.text}
                    {!meetsCondition &&
                      " Kiện này chưa đạt mức đó nên chưa chọn được."}
                  </p>
                )}

                {/* Cách tính của đúng kiện này — để không ai phải tự nhẩm. */}
                {estimate.ready ? (
                  <div className="pis-estimate">
                    <span className="pis-estimate__formula">
                      {estimate.formula}
                    </span>

                    {estimate.clamped === "min" && (
                      <span className="pis-estimate__note">
                        áp mức tối thiểu
                      </span>
                    )}

                    {estimate.clamped === "max" && (
                      <span className="pis-estimate__note">
                        áp mức tối đa
                      </span>
                    )}

                    <strong className="pis-estimate__amount">
                      {formatItemServiceAmount(estimate.amount)}
                    </strong>
                  </div>
                ) : (
                  <p className="pis-desc is-muted">
                    Nhập {estimate.missing} của kiện để xem phí tạm tính.
                  </p>
                )}

                {needsValue && (
                  <p className="pis-desc is-warning">
                    Nhập giá trị kiện hàng lớn hơn 0 để chọn dịch vụ này.
                  </p>
                )}

                {checked && !meetsCondition && (
                  <p className="pis-desc is-warning">
                    Kiện đã đổi giá trị nên không còn đủ điều kiện. Bỏ chọn dịch
                    vụ này, nếu không hệ thống sẽ từ chối khi tạo đơn.
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <div className="pis-summary">
          <span>Phí dịch vụ tạm tính cho kiện {packageIndex}</span>

          <strong>{formatItemServiceAmount(selectedTotal)}</strong>
        </div>

        <p className="pis-footnote">
          <InfoCircleOutlined /> Số trên là tạm tính theo khai báo của bạn. Phí
          chính thức nằm trong báo giá do nhân viên phát hành; dịch vụ tính theo
          cân nặng hoặc thể tích sẽ tính lại theo số đo thật khi kho cân đo.
        </p>
      </>
    );
  };

  return (
    <div className="input-field-group pis-root">
      <label className="field-label">
        DỊCH VỤ CHO KIỆN {packageIndex}
        <span className="pis-optional">
          {" "}
          (tuỳ chọn, tính phí riêng cho kiện này)
        </span>
      </label>

      {renderBody()}
    </div>
  );
}
