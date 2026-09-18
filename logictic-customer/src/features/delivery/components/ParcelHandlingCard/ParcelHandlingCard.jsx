import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Radio, Spin, Table, Tooltip } from "antd";
import { LockOutlined, SwapOutlined } from "@ant-design/icons";

import SectionCard from "@shared/components/SectionCard/SectionCard";
import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";
import {
  PARCEL_HANDLING,
  PARCEL_HANDLING_LABELS,
  getParcelHandlingApi,
  updateParcelHandlingApi,
} from "@features/delivery/api/destinationHandlingApi";
/* Import sâu có chủ đích: barrel @features/tracking kéo theo các trang (kể cả trang công
   khai OrderLookup có CSS toàn cục) vào sớm, làm đổi thứ tự nạp CSS của app
   (ARCHITECTURE mục 4). Chỉ lấy đúng file hằng số. */
import { getPackageStatusLabel } from "@features/tracking/constants/trackingStages";

const HANDLING_OPTIONS = [
  { value: PARCEL_HANDLING.DIRECT_DELIVERY, label: PARCEL_HANDLING_LABELS.DIRECT_DELIVERY },
  { value: PARCEL_HANDLING.STORE_AT_VN, label: PARCEL_HANDLING_LABELS.STORE_AT_VN },
];

/**
 * Chọn GIAO NGAY hay GỬI KHO VN cho từng kiện (tài liệu hàng về VN mục B).
 *
 * Lúc tạo đơn khách chọn một hướng mặc định cho cả đơn (DestinationHandlingChoice); khi
 * hàng về, khách chia được từng kiện. Kiện đã vào phiếu nhập kho VN / yêu cầu giao / đã
 * giao / đã huỷ thì server khoá (`canChange=false`) và nói lý do — hiện khoá kèm lý do
 * thay vì ẩn kiện, để khách hiểu vì sao không đổi được.
 *
 * @param {{ orderId: string, refreshKey?: number, onChanged?: () => void }} props
 */
export default function ParcelHandlingCard({ orderId, refreshKey = 0, onChanged }) {
  const [state, setState] = useState({ loading: true, rows: [], error: "" });
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    getParcelHandlingApi(orderId, { signal: controller.signal })
      .then((rows) => {
        setState({ loading: false, rows, error: "" });
        setDraft({});
      })
      .catch((error) => {
        if (!isCanceledError(error)) {
          setState({ loading: false, rows: [], error: getApiErrorMessage(error) });
        }
      });

    return () => controller.abort();
  }, [orderId, refreshKey]);

  const changedItems = useMemo(
    () =>
      state.rows
        .filter((row) => draft[row.parcelId] && draft[row.parcelId] !== row.handling)
        .map((row) => ({ parcelId: row.parcelId, handling: draft[row.parcelId] })),
    [state.rows, draft],
  );

  const handleSave = async () => {
    setSaving(true);

    try {
      const { rows, message } = await updateParcelHandlingApi(orderId, changedItems);

      setState({ loading: false, rows, error: "" });
      setDraft({});
      AuthNotify.success(message || "Đã cập nhật hướng xử lý kiện.");
      onChanged?.();
    } catch (error) {
      AuthNotify.error("Không lưu được lựa chọn", getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  /* Đơn chưa có kiện nào (chưa tới kho) thì không có gì để chọn — ẩn cả thẻ. */
  if (!state.loading && !state.error && state.rows.length === 0) {
    return null;
  }

  const columns = [
    { title: "Mã kiện", dataIndex: "packageCode", key: "packageCode", render: (v) => <strong>{v}</strong> },
    {
      title: "Trạng thái",
      dataIndex: "packageStatus",
      key: "packageStatus",
      render: (v) => getPackageStatusLabel(v),
    },
    {
      title: "Khi hàng về Việt Nam",
      key: "handling",
      render: (_, row) => {
        const value = draft[row.parcelId] || row.handling;

        if (!row.canChange) {
          return (
            <Tooltip title={row.lockedReason || "Kiện đã khoá, không đổi được."}>
              <span>
                <LockOutlined /> {PARCEL_HANDLING_LABELS[row.handling] || row.handling}
                <br />
                <small style={{ color: "#5b6b80" }}>{row.lockedReason}</small>
              </span>
            </Tooltip>
          );
        }

        return (
          <Radio.Group
            size="small"
            optionType="button"
            buttonStyle="solid"
            options={HANDLING_OPTIONS}
            value={value}
            onChange={(event) =>
              setDraft((current) => ({ ...current, [row.parcelId]: event.target.value }))
            }
          />
        );
      },
    },
  ];

  return (
    <SectionCard
      icon={<SwapOutlined />}
      title="Giao ngay hay gửi kho Việt Nam"
      subtitle="Chọn riêng cho từng kiện: kiện giao ngay đi thẳng tới bạn, kiện gửi kho được xếp lên kệ kho Việt Nam (tính phí lưu kho sau thời gian miễn phí)."
      extra={
        <Button
          type="primary"
          disabled={changedItems.length === 0}
          loading={saving}
          onClick={handleSave}
        >
          Lưu lựa chọn{changedItems.length ? ` (${changedItems.length})` : ""}
        </Button>
      }
    >
      {state.loading ? (
        <Spin />
      ) : state.error ? (
        <Alert type="error" showIcon title={state.error} />
      ) : (
        <Table
          size="small"
          rowKey="parcelId"
          columns={columns}
          dataSource={state.rows}
          pagination={false}
          scroll={{ x: 560 }}
        />
      )}
    </SectionCard>
  );
}
