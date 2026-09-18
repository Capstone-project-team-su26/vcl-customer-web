import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, Empty, Input, Select, Switch, Table, Tag } from "antd";
import { CompassOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";

import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";
import { formatVietnamDateTime } from "@shared/utils/timeUtc";
import { getTrackedOrdersApi } from "@features/tracking/api/orderTrackingApi";
import {
  TRACKING_STAGE_FILTERS,
  getTrackingStageLabel,
  isWarningStage,
} from "@features/tracking/constants/trackingStages";
import { orderTrackingDetailPath } from "@features/tracking/constants/trackingPaths";

import "./OrderTrackingList.css";

const PAGE_SIZE = 10;

/**
 * Theo dõi đơn hàng — danh sách đơn đã có hàng ở kho hoặc đang trên đường
 * (GET /api/orders/consignments/tracking, tài liệu xuất kho L1 + hàng về VN G).
 *
 * Bộ lọc nằm trên URL (?search=&stage=&finished=1&page=) để thông báo "Đơn VCL-...: Hàng
 * đã khởi hành" dẫn thẳng tới đúng đơn, và F5 không mất bộ lọc.
 * Mặc định server bỏ đơn đã giao xong; bật "Gồm đơn đã giao" để xem cả.
 */
export default function OrderTrackingList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const stage = searchParams.get("stage") || "";
  const includeFinished = searchParams.get("finished") === "1";
  const pageNumber = Math.max(1, Number(searchParams.get("page")) || 1);

  const [reloadKey, setReloadKey] = useState(0);

  /* Kết quả gắn với đúng bộ lọc đã tạo ra nó: lệch khoá = đang tải (khỏi setState trong effect). */
  const requestKey = `${search}|${stage}|${includeFinished}|${pageNumber}|${reloadKey}`;
  const [result, setResult] = useState({ key: null, page: null, error: "" });

  useEffect(() => {
    const controller = new AbortController();

    getTrackedOrdersApi(
      { search, stage, includeFinished, pageNumber, pageSize: PAGE_SIZE },
      { signal: controller.signal },
    )
      .then((page) => setResult({ key: requestKey, page, error: "" }))
      .catch((error) => {
        if (!isCanceledError(error)) {
          setResult({ key: requestKey, page: null, error: getApiErrorMessage(error) });
        }
      });

    return () => controller.abort();
  }, [search, stage, includeFinished, pageNumber, requestKey]);

  const loading = result.key !== requestKey;

  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(patch).forEach(([key, value]) => {
      if (value === "" || value === null || value === undefined || value === false) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });

    /* Đổi bộ lọc thì về trang 1, trừ khi chính là đổi trang. */
    if (!("page" in patch)) next.delete("page");

    setSearchParams(next);
  };

  const columns = useMemo(
    () => [
      {
        title: "Mã đơn",
        dataIndex: "consignmentCode",
        key: "consignmentCode",
        render: (value) => <strong>{value}</strong>,
      },
      {
        title: "Chặng hiện tại",
        key: "stage",
        render: (_, row) => (
          <Tag color={isWarningStage(row.currentStage) ? "orange" : "blue"}>
            {getTrackingStageLabel(row.currentStage, row.currentStageText)}
          </Tag>
        ),
      },
      { title: "Số kiện", dataIndex: "parcelCount", key: "parcelCount", width: 90 },
      {
        title: "Chuyến",
        key: "shipments",
        render: (_, row) => (row.shipmentCodes?.length ? row.shipmentCodes.join(", ") : "—"),
      },
      {
        title: "Mốc mới nhất",
        key: "lastEvent",
        render: (_, row) =>
          row.lastEventAt ? (
            <>
              <div>{row.lastEventTitle || "—"}</div>
              <small className="order-tracking-list__muted">
                {formatVietnamDateTime(row.lastEventAt)}
              </small>
            </>
          ) : (
            "—"
          ),
      },
      {
        title: "Dự kiến về",
        dataIndex: "estimatedArrivalDate",
        key: "eta",
        render: (value) => (value ? formatVietnamDateTime(value) : "—"),
      },
      {
        title: "",
        key: "action",
        width: 110,
        render: (_, row) => (
          <Button
            type="link"
            onClick={(event) => {
              event.stopPropagation();
              navigate(orderTrackingDetailPath(row.orderId));
            }}
          >
            Theo dõi
          </Button>
        ),
      },
    ],
    [navigate],
  );

  const page = result.page;

  return (
    <div className="order-tracking-list">
      <header className="order-tracking-list__head">
        <div>
          <h1>
            <CompassOutlined /> Theo dõi đơn hàng
          </h1>
          <p>
            Đơn đã có hàng ở kho hoặc đang trên đường về Việt Nam. Bấm vào một đơn để xem
            hành trình, giữ hàng, tất toán, đặt giao và xử lý sự cố.
          </p>
        </div>
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => setReloadKey((key) => key + 1)}
        >
          Tải lại
        </Button>
      </header>

      <div className="order-tracking-list__filters">
        <Input.Search
          allowClear
          placeholder="Tìm theo mã đơn hoặc mã chuyến"
          prefix={<SearchOutlined />}
          /* Không điều khiển: key theo ?search= để thông báo dẫn tới mã khác thì ô tự đổi theo. */
          key={search}
          defaultValue={search}
          onSearch={(value) => updateParams({ search: value.trim() })}
          style={{ maxWidth: 360 }}
        />
        <Select
          value={stage}
          options={TRACKING_STAGE_FILTERS}
          onChange={(value) => updateParams({ stage: value })}
          style={{ minWidth: 220 }}
        />
        <label className="order-tracking-list__switch">
          <Switch
            checked={includeFinished}
            onChange={(checked) => updateParams({ finished: checked ? "1" : "" })}
          />
          Gồm đơn đã giao / hoàn thành
        </label>
      </div>

      {result.error && !loading ? (
        <Alert type="error" showIcon title={result.error} />
      ) : (
        <Table
          rowKey="orderId"
          loading={loading}
          columns={columns}
          dataSource={page?.items || []}
          scroll={{ x: 900 }}
          onRow={(row) => ({
            onClick: () => navigate(orderTrackingDetailPath(row.orderId)),
            style: { cursor: "pointer" },
          })}
          pagination={{
            current: page?.pageNumber || pageNumber,
            pageSize: PAGE_SIZE,
            total: page?.totalCount || 0,
            showSizeChanger: false,
            onChange: (next) => updateParams({ page: next }),
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  includeFinished
                    ? "Không có đơn nào khớp bộ lọc."
                    : "Chưa có đơn nào đang có hàng ở kho hoặc trên đường. Đơn chưa gửi hàng tới kho xem ở mục Đơn đang xử lý."
                }
              />
            ),
          }}
        />
      )}
    </div>
  );
}
