import { useCallback, useEffect, useState } from "react";

import { getWeightPricingParams } from "@features/pricing/api/pricingRuleService";

/*
 * Hệ số DIM + cân tối thiểu THẬT cho các trang tính giá phía khách.
 *
 * Nguồn: GET /api/pricing-rules (rule VOLUMETRIC_DIVISOR, MIN_WEIGHT) — cùng số
 * backend dùng khi báo giá. Admin đổi ở màn "Tham số vận hành" là các trang đổi theo.
 *
 * status:
 *   "loading" — đang tải, chưa ra kết quả;
 *   "ready"   — có đủ hai số, được phép tính;
 *   "error"   — không tải được: trang KHÔNG tự đoán số, chỉ hiện thông báo + nút thử lại.
 */
export const WEIGHT_PARAMS_ERROR_MESSAGE =
  "Chưa tải được hệ số quy đổi thể tích và cân tối thiểu từ hệ thống, nên chưa thể tạm tính. Vui lòng thử lại.";

const useWeightPricingParams = () => {
  const [state, setState] = useState({
    status: "loading",
    volumetricDivisor: null,
    minimumWeight: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getWeightPricingParams({ signal: controller.signal })
      .then((params) => {
        if (controller.signal.aborted) return;

        const volumetricDivisor = Number(params?.volumetricDivisor);
        const minimumWeight = Number(params?.minimumWeight);

        if (!(volumetricDivisor > 0) || !Number.isFinite(minimumWeight)) {
          throw new Error("Tham số cân từ hệ thống không hợp lệ.");
        }

        setState({ status: "ready", volumetricDivisor, minimumWeight });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        console.error("Không tải được hệ số quy đổi thể tích / cân tối thiểu:", error);
        setState({ status: "error", volumetricDivisor: null, minimumWeight: null });
      });

    return () => {
      controller.abort();
    };
  }, [reloadKey]);

  const retry = useCallback(() => {
    setState({ status: "loading", volumetricDivisor: null, minimumWeight: null });
    setReloadKey((key) => key + 1);
  }, []);

  return {
    ...state,
    isReady: state.status === "ready",
    retry,
  };
};

export default useWeightPricingParams;
