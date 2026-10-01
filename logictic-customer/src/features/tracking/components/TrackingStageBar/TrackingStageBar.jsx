import {
  TRACKING_STEPS,
  getTrackingStageLabel,
  getTrackingStepIndex,
  isWarningStage,
} from "@features/tracking/constants/trackingStages";

import "./TrackingStageBar.css";

/**
 * Thanh chặng của đơn: 7 bậc khách hiểu được, bậc hiện tại lấy theo `currentStage`
 * (chặng của kiện CHẬM NHẤT — backend đã tính). Chặng cảnh báo (trễ, tạm giữ, sự cố,
 * giao thất bại) tô cam để khách thấy ngay có chuyện, không phải đọc dòng thời gian.
 *
 * Dùng lại cho luồng khác có bậc riêng (ví dụ tiến độ đơn mua hộ 9 bậc): truyền `steps` +
 * `currentIndex` (+ `tone`, `nowText`) thay cho `stage`. Không truyền thì giữ nguyên hành vi cũ.
 *
 * `tone`:
 *   - "current"  bậc hiện tại tô xanh (mặc định);
 *   - "warning"  bậc hiện tại tô cam (cần chú ý / cần khách làm gì);
 *   - "stopped"  đơn dừng hẳn ở bậc này (huỷ / từ chối): bậc tô cam, các bậc sau mờ đi;
 *   - "done"     đơn xong: mọi bậc tới `currentIndex` đều đã qua.
 *
 * @param {{ stage?: string, stageText?: string, compact?: boolean,
 *   steps?: { key: string, title: string }[], currentIndex?: number,
 *   tone?: "current"|"warning"|"stopped"|"done", nowText?: string }} props
 */
export default function TrackingStageBar({
  stage,
  stageText,
  compact = false,
  steps,
  currentIndex: currentIndexProp,
  tone,
  nowText,
}) {
  const custom = Array.isArray(steps) && steps.length > 0;
  const items = custom ? steps : TRACKING_STEPS;
  const currentIndex = custom ? Number(currentIndexProp ?? -1) : getTrackingStepIndex(stage);
  const resolvedTone = custom ? tone || "current" : isWarningStage(stage) ? "warning" : "current";
  const warning = resolvedTone === "warning" || resolvedTone === "stopped";
  const now = custom ? nowText : getTrackingStageLabel(stage, stageText);

  const stateOf = (index) => {
    if (index < currentIndex) return "done";
    if (index > currentIndex) return resolvedTone === "stopped" ? "skipped" : "todo";
    if (resolvedTone === "done") return "done";
    return warning ? "warning" : "current";
  };

  return (
    <div
      className={[
        "tracking-stage-bar",
        compact ? "tracking-stage-bar--compact" : "",
        items.length > 7 ? "tracking-stage-bar--many" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--tracking-stage-count": items.length }}
    >
      <ol className="tracking-stage-bar__steps">
        {items.map((step, index) => {
          const state = stateOf(index);

          return (
            <li
              key={step.key}
              className={`tracking-stage-bar__step tracking-stage-bar__step--${state}`}
              aria-current={index === currentIndex ? "step" : undefined}
            >
              <span className="tracking-stage-bar__dot">{index + 1}</span>
              <span className="tracking-stage-bar__label">{step.title}</span>
            </li>
          );
        })}
      </ol>

      {!compact && now ? (
        <p
          className={[
            "tracking-stage-bar__now",
            warning ? "is-warning" : "",
            resolvedTone === "stopped" ? "is-stopped" : "",
            resolvedTone === "done" ? "is-done" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {now}
        </p>
      ) : null}
    </div>
  );
}
