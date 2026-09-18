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
 * @param {{ stage?: string, stageText?: string, compact?: boolean }} props
 */
export default function TrackingStageBar({ stage, stageText, compact = false }) {
  const currentIndex = getTrackingStepIndex(stage);
  const warning = isWarningStage(stage);

  return (
    <div className={`tracking-stage-bar ${compact ? "tracking-stage-bar--compact" : ""}`}>
      <ol className="tracking-stage-bar__steps">
        {TRACKING_STEPS.map((step, index) => {
          const state =
            index < currentIndex
              ? "done"
              : index === currentIndex
                ? warning
                  ? "warning"
                  : "current"
                : "todo";

          return (
            <li
              key={step.key}
              className={`tracking-stage-bar__step tracking-stage-bar__step--${state}`}
            >
              <span className="tracking-stage-bar__dot">{index + 1}</span>
              <span className="tracking-stage-bar__label">{step.title}</span>
            </li>
          );
        })}
      </ol>

      {!compact ? (
        <p className={`tracking-stage-bar__now ${warning ? "is-warning" : ""}`}>
          {getTrackingStageLabel(stage, stageText)}
        </p>
      ) : null}
    </div>
  );
}
