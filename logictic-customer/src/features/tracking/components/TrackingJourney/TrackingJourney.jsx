import { useMemo } from "react";
import { Empty, Table, Tag, Tooltip } from "antd";
import {
  ClockCircleOutlined,
  CopyOutlined,
  EnvironmentOutlined,
  RocketOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";

import SectionCard from "@shared/components/SectionCard/SectionCard";
import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import { formatVietnamDateTime } from "@shared/utils/timeUtc";
import {
  getPackageStatusLabel,
  getTrackingStageLabel,
  isWarningStage,
} from "@features/tracking/constants/trackingStages";

import "./TrackingJourney.css";

const formatTime = (value) => (value ? formatVietnamDateTime(value) : "—");

const copyText = async (text) => {
  try {
    await globalThis.navigator?.clipboard?.writeText(String(text));
    AuthNotify.success("Đã sao chép", String(text));
  } catch {
    AuthNotify.warning("Không sao chép được", "Vui lòng chọn và sao chép thủ công.");
  }
};

/**
 * Ba khối chi tiết của hành trình: chuyến vận chuyển (hãng + mã vận đơn + ngày dự kiến),
 * từng kiện (đơn tách chuyến thì mỗi kiện một chặng) và dòng thời gian.
 *
 * `events` server sắp cũ → mới; ở đây đảo lại để mốc mới nhất nằm trên cùng — khách mở
 * màn này gần như luôn để hỏi "giờ hàng đang ở đâu".
 *
 * @param {{ tracking: object }} props
 */
export default function TrackingJourney({ tracking }) {
  const parcels = tracking?.parcels || [];
  const shipments = tracking?.shipments || [];

  const events = useMemo(
    () =>
      [...(tracking?.events || [])].sort(
        (a, b) => new Date(b?.time || 0) - new Date(a?.time || 0),
      ),
    [tracking?.events],
  );

  const parcelColumns = [
    { title: "Mã kiện", dataIndex: "packageCode", key: "packageCode", render: (v) => <strong>{v || "—"}</strong> },
    { title: "Hàng", dataIndex: "productName", key: "productName", render: (v) => v || "—" },
    {
      title: "Chặng",
      key: "stage",
      render: (_, row) => (
        <Tag color={isWarningStage(row.stage) ? "orange" : "blue"}>
          {getTrackingStageLabel(row.stage, row.stageText)}
        </Tag>
      ),
    },
    {
      title: "Trạng thái kiện",
      dataIndex: "packageStatus",
      key: "packageStatus",
      render: (v) => getPackageStatusLabel(v),
    },
    { title: "Chuyến", dataIndex: "shipmentCode", key: "shipmentCode", render: (v) => v || "—" },
  ];

  return (
    <>
      <SectionCard
        icon={<RocketOutlined />}
        title="Chuyến vận chuyển"
        subtitle="Hãng vận chuyển và mã vận đơn để bạn tự tra trên trang của hãng."
      >
        {shipments.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Hàng chưa lên chuyến nào — kho sẽ xếp chuyến gần nhất."
          />
        ) : (
          <div className="tracking-journey__shipments">
            {shipments.map((shipment) => (
              <article key={shipment.shipmentCode} className="tracking-journey__shipment">
                <div className="tracking-journey__shipment-top">
                  <strong>{shipment.shipmentCode}</strong>
                  <Tag color={isWarningStage(shipment.status) ? "orange" : "blue"}>
                    {getTrackingStageLabel(shipment.status, shipment.statusText)}
                  </Tag>
                </div>

                <dl className="section-card__facts">
                  <div>
                    <dt>Hãng vận chuyển</dt>
                    <dd>{shipment.carrierName || "—"}</dd>
                  </div>
                  <div>
                    <dt>Mã vận đơn của hãng</dt>
                    <dd>
                      {shipment.carrierTrackingCode ? (
                        <span className="tracking-journey__code">
                          {shipment.carrierTrackingCode}
                          <Tooltip title="Sao chép">
                            <CopyOutlined onClick={() => copyText(shipment.carrierTrackingCode)} />
                          </Tooltip>
                        </span>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Bàn giao lúc</dt>
                    <dd>{formatTime(shipment.handedOverAt)}</dd>
                  </div>
                  <div>
                    <dt>Dự kiến về</dt>
                    <dd>{formatTime(shipment.estimatedArrivalDate)}</dd>
                  </div>
                </dl>

                {shipment.packageCodes?.length ? (
                  <p className="section-card__hint">
                    Kiện trên chuyến: {shipment.packageCodes.join(", ")}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={<UnorderedListOutlined />}
        title={`Từng kiện (${parcels.length})`}
        subtitle={
          tracking?.isSplitAcrossStages
            ? "Các kiện của đơn đang đi tách chuyến — chặng của đơn tính theo kiện chậm nhất."
            : "Chặng hiện tại của từng kiện trong đơn."
        }
      >
        <Table
          size="small"
          rowKey={(row) => row.parcelId || row.packageCode}
          columns={parcelColumns}
          dataSource={parcels}
          pagination={false}
          scroll={{ x: 640 }}
          locale={{ emptyText: "Chưa có kiện nào." }}
        />
      </SectionCard>

      <SectionCard
        icon={<ClockCircleOutlined />}
        title="Dòng thời gian"
        subtitle="Mỗi mốc bạn cũng nhận được thông báo trong chuông thông báo."
      >
        {events.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có mốc nào." />
        ) : (
          <ol className="tracking-journey__timeline">
            {events.map((event, index) => (
              <li
                key={`${event.time}-${event.stage}-${index}`}
                className={`tracking-journey__event ${index === 0 ? "is-latest" : ""} ${
                  isWarningStage(event.stage) ? "is-warning" : ""
                }`}
              >
                <span className="tracking-journey__event-dot" />
                <div className="tracking-journey__event-body">
                  <div className="tracking-journey__event-head">
                    <strong>{event.title || getTrackingStageLabel(event.stage)}</strong>
                    <time>{formatTime(event.time)}</time>
                  </div>
                  {event.message ? <p>{event.message}</p> : null}
                  {event.location || event.shipmentCode ? (
                    <span className="tracking-journey__event-meta">
                      {event.location ? (
                        <>
                          <EnvironmentOutlined /> {event.location}
                        </>
                      ) : null}
                      {event.location && event.shipmentCode ? " · " : null}
                      {event.shipmentCode ? `Chuyến ${event.shipmentCode}` : null}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </>
  );
}
