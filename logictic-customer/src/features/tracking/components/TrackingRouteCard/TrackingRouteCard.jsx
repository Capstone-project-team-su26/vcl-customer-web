import { Tag } from "antd";
import {
  CheckCircleFilled,
  EnvironmentOutlined,
  NodeIndexOutlined,
} from "@ant-design/icons";

import SectionCard from "@shared/components/SectionCard/SectionCard";
import { formatVietnamDateTime } from "@shared/utils/timeUtc";

import "./TrackingRouteCard.css";

/**
 * LỘ TRÌNH ĐƠN — hàng phải đi qua những đâu, đã tới đâu.
 *
 * Khác dòng thời gian ở dưới: dòng thời gian kể NHỮNG GÌ ĐÃ XẢY RA, còn đây vẽ ĐƯỜNG ĐI,
 * gồm cả chặng chưa tới. Khách hỏi "hàng còn phải qua mấy chặng nữa" thì đọc khối này.
 *
 * Mọi thứ đọc thẳng từ `tracking.route` của server — chặng nào đã qua, qua lúc nào đều do
 * backend quyết. Màn hình KHÔNG suy diễn: chặng chưa có mốc thì để trống, không đoán ngày.
 *
 * @param {{ route: object | null }} props
 */
export default function TrackingRouteCard({ route }) {
  const stops = Array.isArray(route?.stops) ? route.stops : [];
  if (!route || stops.length === 0) return null;

  const reachedCount = stops.filter((stop) => stop.reached).length;

  const subtitleParts = [
    route.routeName || route.routeCode,
    route.transportModeText,
    route.estimatedTransitDays ? `dự kiến ${route.estimatedTransitDays} ngày trên đường` : "",
  ].filter(Boolean);

  return (
    <SectionCard
      icon={<NodeIndexOutlined />}
      title="Lộ trình của đơn"
      subtitle={
        subtitleParts.length
          ? subtitleParts.join(" · ")
          : "Đơn chưa được xếp tuyến, hàng vẫn đang ở kho nguồn."
      }
      extra={
        <Tag color={reachedCount === stops.length ? "green" : "blue"}>
          Đã qua {reachedCount}/{stops.length} chặng
        </Tag>
      }
    >
      <ol className="tracking-route">
        {stops.map((stop, index) => {
          /* Chặng đang đứng = chặng đã qua cuối cùng. Tô đậm để mắt dừng đúng chỗ đó. */
          const isCurrent = stop.reached && index === reachedCount - 1;
          const state = isCurrent ? "current" : stop.reached ? "done" : "todo";

          return (
            <li key={stop.key} className={`tracking-route__stop is-${state}`}>
              <span className="tracking-route__marker">
                {stop.reached ? <CheckCircleFilled /> : <span>{index + 1}</span>}
              </span>

              <div className="tracking-route__body">
                <p className="tracking-route__title">{stop.title}</p>

                {stop.subtitle ? (
                  <p className="tracking-route__where">
                    <EnvironmentOutlined /> {stop.subtitle}
                  </p>
                ) : null}

                <p className="tracking-route__time">
                  {stop.reachedAt
                    ? formatVietnamDateTime(stop.reachedAt)
                    : stop.reached
                      ? "Đã qua chặng này"
                      : "Chưa tới"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}
