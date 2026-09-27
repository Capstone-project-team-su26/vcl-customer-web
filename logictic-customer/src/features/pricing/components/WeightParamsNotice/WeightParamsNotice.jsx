import { WEIGHT_PARAMS_ERROR_MESSAGE } from "@features/pricing/hooks/useWeightPricingParams";

import "./WeightParamsNotice.css";

/*
 * Thay cho khối kết quả khi hệ số DIM / cân tối thiểu chưa có: đang tải thì báo
 * đang tải, lỗi thì báo lỗi + nút thử lại. Không bao giờ hiện số tạm tính đoán mò.
 */
const WeightParamsNotice = ({ status, onRetry }) => {
  if (status === "ready") return null;

  if (status === "loading") {
    return (
      <div className="weight-params-notice" role="status">
        Đang tải hệ số quy đổi thể tích và cân tối thiểu từ hệ thống…
      </div>
    );
  }

  return (
    <div className="weight-params-notice weight-params-notice--error" role="alert">
      <span>{WEIGHT_PARAMS_ERROR_MESSAGE}</span>
      {onRetry && (
        <button type="button" className="weight-params-notice__retry" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
};

export default WeightParamsNotice;
