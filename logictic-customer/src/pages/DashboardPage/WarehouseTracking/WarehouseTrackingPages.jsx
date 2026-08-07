import React, { useEffect, useMemo, useState } from "react";
import {
  Link,
  NavLink,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Filter,
  MapPin,
  PackageCheck,
  Plane,
  Printer,
  Search,
  ShieldCheck,
  ShieldEllipsis,
  ShoppingCart,
  Truck,
  Warehouse,
  Weight,
} from "lucide-react";

import AuthNotify from "../../../utils/AuthNotify";
import { formatVietnamDateTime } from "../../../utils/timeUtc";
import { getConsignmentsApi } from "../../../api/OrderApi/consignmentApi";
import { getPurchaseRequestsApi } from "../../../api/PurchaseAPI/purchaseRequestApi";
import { WarehouseSummaryCards } from "./Shared/WarehouseSummaryCards";
import { KiGuiTrackingList } from "./KiGui/KiGuiTrackingList";
import { MuaHoTrackingList } from "./MuaHo/MuaHoTrackingList";


import {
  WAREHOUSE_SHIPMENTS,
  WAREHOUSE_STATUS,
  WAREHOUSE_STATUS_META,
  createTimeline,
  getWarehouseReceipt,
  getWarehouseShipment,
} from "./warehouseTrackingData";
import "./WarehouseTracking.css";


const formatTime = (value) =>
  value
    ? formatVietnamDateTime(value, { fallback: "--" }) + " (UTC+7)"
    : "--";

const formatNumber = (value, suffix = "") =>
  Number(value || 0).toLocaleString("vi-VN") + suffix;

const formatMoney = (value) =>
  value === null || value === undefined
    ? "Chưa có"
    : Number(value).toLocaleString("vi-VN") + " đ";

const presentValue = (value, fallback = "Chưa có") =>
  value === null || value === undefined || value === ""
    ? fallback
    : String(value);

const statusIcons = {
  RECEIVED: PackageCheck,
  IN_STORAGE: Warehouse,
  CUSTOMS_REVIEW: ShieldEllipsis,
  CUSTOMS_CLEARED: ShieldCheck,
  OUTBOUND_READY: FileCheck2,
  RELEASED: Truck,
  IN_TRANSIT: Plane,
};

function StatusPill({ status }) {
  const meta = WAREHOUSE_STATUS_META[status] || {
    label: status || "Chưa cập nhật",
    tone: "neutral",
  };
  const Icon = statusIcons[status] || Clock3;

  return (
    <span className={"warehouse-status warehouse-status--" + meta.tone}>
      <Icon size={15} />
      {meta.label}
    </span>
  );
}

function WarehouseTabs() {
  const tabs = [
    {
      to: "/warehouse/inventory",
      label: "Tồn kho & nhập kho",
      icon: Warehouse,
    },
    {
      to: "/warehouse/export",
      label: "Xuất kho",
      icon: Truck,
    },
    {
      to: "/warehouse/customs",
      label: "Thông quan",
      icon: ShieldCheck,
    },
    {
      to: "/warehouse/receipts",
      label: "Phiếu nhập kho",
      icon: FileText,
    },
  ];

  return (
    <nav
      className="warehouse-tabs"
      aria-label="Điều hướng theo dõi kho"
    >
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            "warehouse-tab " +
            (isActive ? "warehouse-tab--active" : "")
          }
        >
          <Icon size={17} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function PageIntro({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
}) {
  return (
    <section className="warehouse-intro">
      <div className="warehouse-intro__icon">
        <Icon size={26} />
      </div>
      <div className="warehouse-intro__copy">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? (
        <div className="warehouse-intro__action">
          {action}
        </div>
      ) : null}
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  note,
  tone = "blue",
}) {
  return (
    <article
      className={"warehouse-summary warehouse-summary--" + tone}
    >
      <div className="warehouse-summary__icon">
        <Icon size={21} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

function ShipmentProgress({ shipment, compact = false }) {
  return (
    <div
      className={
        "warehouse-progress " +
        (compact ? "warehouse-progress--compact" : "")
      }
    >
      {shipment.timeline.map((event, index) => (
        <React.Fragment key={event.key}>
          <div
            className={
              "warehouse-progress__step warehouse-progress__step--" +
              event.state
            }
          >
            <span className="warehouse-progress__dot">
              {event.state === "complete" ? (
                <Check size={14} />
              ) : (
                index + 1
              )}
            </span>
            <div>
              <strong>{event.label}</strong>
              {!compact ? (
                <small>{event.description}</small>
              ) : null}
            </div>
          </div>
          {index < shipment.timeline.length - 1 ? (
            <span
              className={
                "warehouse-progress__line " +
                (event.state === "complete"
                  ? "warehouse-progress__line--complete"
                  : "")
              }
            />
          ) : null}
        </React.Fragment>
      ))}
    </div>
  );
}

function ShipmentCard({ shipment }) {
  const navigate = useNavigate();

  return (
    <article
      className="warehouse-shipment-card"
      onClick={() =>
        navigate("/warehouse/inventory/" + shipment.id)
      }
    >
      <header>
        <div>
          <span className="warehouse-card-eyebrow">
            {shipment.serviceName}
          </span>
          <h3>{shipment.consignmentCode}</h3>
        </div>
        <StatusPill status={shipment.status} />
      </header>

      <div className="warehouse-shipment-card__route">
        <span className="warehouse-route-point" />
        <div>
          <small>Hành trình quốc tế</small>
          <strong>{shipment.route}</strong>
        </div>
        <ArrowRight size={18} />
        <div className="warehouse-location">
          <MapPin size={16} />
          <span>{shipment.internationalWarehouse.name}</span>
        </div>
      </div>

      <div className="warehouse-shipment-card__metrics">
        <div>
          <Box size={17} />
          <span>
            Số kiện
            <strong>{shipment.packageCount} kiện</strong>
          </span>
        </div>
        <div>
          <Weight size={17} />
          <span>
            Khối lượng
            <strong>
              {formatNumber(
                shipment.inbound?.actualWeight ??
                  shipment.totalWeight,
                " kg"
              )}

            </strong>
          </span>
        </div>
        <div>
          <Warehouse size={17} />
          <span>
            Vị trí
            <strong>
              {shipment.internationalWarehouse.binCode}
            </strong>
          </span>
        </div>
        <div>
          <Clock3 size={17} />
          <span>
            Lưu kho
            <strong>{shipment.storageDays} ngày</strong>
          </span>
        </div>
      </div>

      <ShipmentProgress shipment={shipment} compact />

      <footer>
        <span>
          Cập nhật {formatTime(shipment.lastUpdatedAt)}
        </span>
        <button type="button">
          Xem chi tiết <ChevronRight size={16} />
        </button>
      </footer>
    </article>
  );
}

function EmptyState({
  title = "Không có dữ liệu phù hợp",
}) {
  return (
    <div className="warehouse-empty">
      <Search size={30} />
      <strong>{title}</strong>
      <p>
        Hãy thử thay đổi từ khóa hoặc bộ lọc trạng thái.
      </p>
    </div>
  );
}

export function WarehouseInventoryPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [activeCategoryTab, setActiveCategoryTab] = useState("CONSIGNMENT");
  const [apiConsignments, setApiConsignments] = useState([]);
  const [apiPurchaseRequests, setApiPurchaseRequests] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const normalizedSearch = search.trim().toLowerCase();

  useEffect(() => {
    let isMounted = true;
    const fetchApiData = async () => {
      try {
        setApiLoading(true);
        const [consignmentsRes, purchaseRes] = await Promise.allSettled([
          getConsignmentsApi({ params: { pageNumber: 1, pageSize: 100 } }),
          getPurchaseRequestsApi(1, 100),
        ]);

        if (!isMounted) return;

        if (consignmentsRes.status === "fulfilled" && consignmentsRes.value) {
          const response = consignmentsRes.value;
          const allRawItems = Array.isArray(response?.data?.items)
            ? response.data.items
            : Array.isArray(response?.items)
            ? response.items
            : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
            ? response
            : [];

          const warehouseStatuses = [
            "CHECKED_IN",
            "WAREHOUSE_RECEIVED",
            "IN_STORAGE",
            "CUSTOMS_REVIEW",
            "CUSTOMS_CLEARED",
            "OUTBOUND_READY",
            "RELEASED",
            "IN_TRANSIT",
            "COMPLETED",
            "DELIVERED",
          ];

          // Filter items that have entered warehouse starting from CHECKED_IN
          const rawItems = allRawItems.filter((item) =>
            warehouseStatuses.includes(String(item?.status || "").trim().toUpperCase())
          );

          if (rawItems.length > 0) {
            const mapped = rawItems.map((item, index) => {

              const code = item.consignmentCode || item.trackingCode || item.code || `VCL-${index + 1}`;
              const itemNamesList = Array.isArray(item.itemNames) && item.itemNames.length > 0
                ? item.itemNames.join(", ")
                : "Kiện hàng ký gửi";

              const pkgItems = Array.isArray(item.items) && item.items.length > 0
                ? item.items.map((pkg, i) => ({
                    id: pkg.packageId || pkg.id || `pkg-${index}-${i}`,
                    packageCode: pkg.trackingCode || pkg.packageCode || `PKG-${index + 1}-${i + 1}`,
                    productName: pkg.productName || itemNamesList,
                    configuration: `${pkg.weight || item.totalWeight || 1} kg`,
                    quantity: pkg.quantity || 1,
                    actualQuantity: pkg.quantity || 1,
                    weight: pkg.weight || item.totalWeight || 1,
                    actualWeight: pkg.weight || item.totalWeight || 1,
                    volume: item.totalVolume || 0.01,
                    storageLocation: item.warehouseCode || "Zone A",
                    status: item.status || "RECEIVED",
                  }))
                : [
                    {
                      id: `pkg-${index}-0`,
                      packageCode: code,
                      productName: itemNamesList,
                      configuration: `${item.totalWeight || 1} kg`,
                      quantity: 1,
                      actualQuantity: 1,
                      weight: item.totalWeight || 1,
                      actualWeight: item.totalWeight || 1,
                      volume: item.totalVolume || 0.01,
                      storageLocation: item.warehouseCode || "Zone A",
                      status: item.status || "RECEIVED",
                    },
                  ];

              return {
                id: item.orderId || item.consignmentId || `shipment-${index}`,
                orderId: item.orderId || item.consignmentId,
                consignmentCode: code,
                consignmentType: item.consignmentType || "Standard",
                orderStatus: item.status || "DEPOSIT_PAID",
                orderType: "CONSIGNMENT",
                serviceName: item.consignmentType === "Express" ? "Ký gửi hỏa tốc" : "Ký gửi tiêu chuẩn",
                status: item.status || WAREHOUSE_STATUS.RECEIVED,
                customer: {
                  id: item.customerId || "cust-1",
                  name: item.customerName || item.receiverName || "Khách hàng",
                  fullName: item.customerName || item.receiverName || "Khách hàng",
                  phone: item.receiverPhone || "",
                },
                route: item.route || "Trung quốc --> Việt Nam",
                note: item.note || "",
                receiverName: item.receiverName || "Khách hàng",
                receiverPhone: item.receiverPhone || "",
                receiverAddress: item.receiverAddress || "",
                requiresInspection: item.requiresInspection ?? true,
                createdAt: item.createdAt || new Date().toISOString(),
                statusUpdatedAt: item.statusUpdatedAt || item.createdAt || new Date().toISOString(),
                receiptPdfUrl: item.receiptPdfUrl || null,
                internationalWarehouse: {
                  name: item.warehouseName || "Kho Quảng Châu (Trung Quốc)",
                  address: item.warehouseName || "Quảng Châu / Tokyo",
                  zone: item.warehouseRegion || "Zone A",
                  binCode: item.warehouseCode || "CN_GZ",
                },
                packageCount: pkgItems.length,
                totalQuantity: pkgItems.length,
                totalWeight: item.totalWeight || 1,
                totalVolume: item.totalVolume || 1,
                storageDays: 1,
                lastUpdatedAt: item.statusUpdatedAt || item.createdAt || new Date().toISOString(),
                items: pkgItems,
                inbound: {
                  receiptId: `RC-${code}`,
                  receivedAt: item.createdAt || new Date().toISOString(),
                  actualWeight: item.totalWeight || 1,
                  actualVolume: item.totalVolume || 1,
                  staffName: "Nhân viên kho",
                  inspectionResult: item.requiresInspection ? "Kiểm hàng kỹ" : "Tự đóng gói",
                },
                timeline: createTimeline({
                  createdAt: item.createdAt,
                  receivedAt: item.createdAt,
                  current: "received",
                  location: item.warehouseName || "Kho VCL Quốc Tế",
                }),
              };
            });
            setApiConsignments(mapped);
          }
        }


        if (purchaseRes.status === "fulfilled" && purchaseRes.value) {
          const response = purchaseRes.value;
          const allRawItems = Array.isArray(response?.items)
            ? response.items
            : Array.isArray(response?.data?.items)
            ? response.data.items
            : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
            ? response
            : [];

          const warehouseStatuses = [
            "CHECKED_IN",
            "WAREHOUSE_RECEIVED",
            "IN_STORAGE",
            "CUSTOMS_REVIEW",
            "CUSTOMS_CLEARED",
            "OUTBOUND_READY",
            "RELEASED",
            "IN_TRANSIT",
            "COMPLETED",
            "DELIVERED",
          ];

          // Filter purchase requests starting from CHECKED_IN / physical warehouse arrival
          const rawItems = allRawItems.filter((item) =>
            warehouseStatuses.includes(String(item?.status || "").trim().toUpperCase())
          );

          if (rawItems.length > 0) {
            const mapped = rawItems.map((item, index) => {

              const code = item.requestCode || item.trackingCode || item.code || `PUR-${index + 1}`;
              const pkgItems = Array.isArray(item.items) ? item.items.map((pkg, i) => ({
                id: pkg.itemId || pkg.id || `pur-pkg-${index}-${i}`,
                packageCode: pkg.trackingCode || `PUR-ITEM-${index + 1}-${i + 1}`,
                productName: pkg.productName || "Sản phẩm mua hộ",
                configuration: `${pkg.quantity || 1} SP`,
                quantity: pkg.quantity || 1,
                actualQuantity: pkg.quantity || 1,
                weight: 1,
                actualWeight: 1,
                volume: 0.01,
                storageLocation: "Zone B - Mua Hộ",
                status: item.status || "IN_STORAGE",
              })) : [];

              return {
                id: item.requestId || item.id || `pur-shipment-${index}`,
                orderId: item.requestId || item.id,
                consignmentCode: code,
                consignmentType: "Mua hộ",
                orderStatus: item.status || "APPROVED",
                orderType: "PURCHASE",
                serviceName: "Đơn mua hộ quốc tế",
                status: item.status || WAREHOUSE_STATUS.IN_STORAGE,
                customer: {
                  id: item.customerId || "cust-1",
                  name: item.receiverName || item.customerName || "Khách hàng",
                  fullName: item.receiverName || item.customerName || "Khách hàng",
                  phone: item.receiverPhone || "",
                },
                route: "Trung Quốc / Nhật Bản → Việt Nam",
                note: item.note || item.description || "",
                receiverName: item.receiverName || "Khách hàng",
                receiverPhone: item.receiverPhone || "",
                receiverAddress: item.deliveryAddress || item.receiverAddress || "",
                createdAt: item.createdAt || new Date().toISOString(),
                statusUpdatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
                internationalWarehouse: {
                  name: "Kho VCL Mua Hộ",
                  address: "Quảng Châu / Tokyo",
                  zone: "Zone B",
                  binCode: "B2-05",
                },
                packageCount: pkgItems.length || 1,
                totalQuantity: pkgItems.reduce((s, p) => s + (Number(p.quantity) || 1), 0),
                totalWeight: pkgItems.length || 1,
                totalVolume: 0.02,
                storageDays: 1,
                lastUpdatedAt: item.updatedAt || new Date().toISOString(),
                expectedVietnamAt: new Date(Date.now() + 3 * 86400000).toISOString(),
                items: pkgItems.length > 0 ? pkgItems : [
                  {
                    id: `pur-pkg-${index}-0`,
                    packageCode: code,
                    productName: item.productName || "Hàng mua hộ quốc tế",
                    configuration: "1 kg",
                    quantity: 1,
                    actualQuantity: 1,
                    weight: 1,
                    actualWeight: 1,
                    volume: 0.01,
                    storageLocation: "Zone B - Bin 02",
                    status: item.status || "IN_STORAGE",
                  }
                ],
                inbound: {
                  receiptId: `PUR-RC-${code}`,
                  receivedAt: item.createdAt || new Date().toISOString(),
                  actualWeight: pkgItems.length || 1,
                  actualVolume: 0.02,
                  staffName: "NV Mua Hộ Kho",
                  inspectionResult: "Đã kiểm hàng mua hộ",
                },
                timeline: createTimeline({
                  createdAt: item.createdAt,
                  receivedAt: item.createdAt,
                  current: "stored",
                  location: "Kho VCL Mua Hộ",
                }),
              };
            });
            setApiPurchaseRequests(mapped);
          } else {
            setApiPurchaseRequests([]);
          }
        }
      } catch (err) {
        console.error("Lỗi lấy dữ liệu kho:", err);
      } finally {
        if (isMounted) setApiLoading(false);
      }
    };

    fetchApiData();
    return () => {
      isMounted = false;
    };
  }, []);

  const sourceShipments = useMemo(() => {
    const warehouseStatuses = [
      "CHECKED_IN",
      "WAREHOUSE_RECEIVED",
      "IN_STORAGE",
      "CUSTOMS_REVIEW",
      "CUSTOMS_CLEARED",
      "OUTBOUND_READY",
      "RELEASED",
      "IN_TRANSIT",
      "COMPLETED",
      "DELIVERED",
    ];

    if (activeCategoryTab === "CONSIGNMENT") {
      return apiConsignments.filter((item) =>
        warehouseStatuses.includes(String(item.status || "").toUpperCase())
      );
    }
    return apiPurchaseRequests.filter((item) =>
      warehouseStatuses.includes(String(item.status || "").toUpperCase())
    );
  }, [activeCategoryTab, apiConsignments, apiPurchaseRequests]);




  const shipments = useMemo(
    () =>
      sourceShipments.filter((shipment) => {
        const matchesStatus =
          status === "ALL" || shipment.status === status;
        const searchable = [
          shipment.consignmentCode,
          shipment.customer?.name,
          shipment.internationalWarehouse?.name,
          ...shipment.items.flatMap((item) => [
            item.packageCode,
            item.productName,
          ]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          matchesStatus &&
          (!normalizedSearch ||
            searchable.includes(normalizedSearch))
        );
      }),
    [sourceShipments, normalizedSearch, status]
  );

  const totalPackages = sourceShipments.reduce(
    (total, shipment) =>
      total + shipment.packageCount,
    0
  );
  const totalWeight = sourceShipments.reduce(
    (total, shipment) =>
      total + (shipment.totalWeight || 0),
    0
  );


  return (
    <div className="warehouse-tracking">
      <WarehouseTabs />
      <PageIntro
        eyebrow="WAREHOUSE VISIBILITY"
        title="Theo dõi hàng trong kho quốc tế"
        description="Xem tình trạng nhập kho, vị trí lưu hàng, thông quan và hành trình xuất kho về Việt Nam trên cùng một màn hình."
        icon={Warehouse}
        action={
          <span className="warehouse-live">
            <i /> Dữ liệu cập nhật thời gian thực
          </span>
        }
      />

      <div className="warehouse-subtabs">
        <button
          type="button"
          className={`warehouse-subtab-btn ${activeCategoryTab === "CONSIGNMENT" ? "active" : ""}`}
          onClick={() => setActiveCategoryTab("CONSIGNMENT")}
        >
          <Box size={16} /> 📦 Hàng ký gửi ({apiConsignments.length || 4})
        </button>
        <button
          type="button"
          className={`warehouse-subtab-btn ${activeCategoryTab === "PURCHASE" ? "active" : ""}`}
          onClick={() => setActiveCategoryTab("PURCHASE")}
        >
          <ShoppingCart size={16} /> 🛒 Hàng mua hộ ({apiPurchaseRequests.length || 3})
        </button>
      </div>


      <WarehouseSummaryCards
        shipments={sourceShipments}
        isPurchase={activeCategoryTab === "PURCHASE"}
      />

      {activeCategoryTab === "CONSIGNMENT" ? (
        <KiGuiTrackingList
          consignments={sourceShipments}
          loading={apiLoading}
        />
      ) : (
        <MuaHoTrackingList
          purchaseRequests={sourceShipments}
          loading={apiLoading}
        />
      )}
    </div>
  );
}


function DetailRow({ label, value, accent = false }) {
  return (
    <div className="warehouse-detail-row">
      <span>{label}</span>
      <strong
        className={
          accent ? "warehouse-detail-row--accent" : ""
        }
      >
        {value || "--"}
      </strong>
    </div>
  );
}

function FullDataRow({
  label,
  value,
  wide = false,
  code = false,
}) {
  return (
    <div
      className={
        "warehouse-full-row " +
        (wide ? "warehouse-full-row--wide " : "") +
        (code ? "warehouse-full-row--code" : "")
      }
    >
      <span>{label}</span>
      <strong>{presentValue(value)}</strong>
    </div>
  );
}

function FullOrderData({ shipment }) {
  if (!shipment.orderId) {
    return null;
  }

  const quotation = shipment.quotation || {};

  return (
    <section className="warehouse-full-data">
      <div className="warehouse-full-data__heading">
        <div>
          <span>THÔNG TIN NGUYÊN BẢN</span>
          <h3>Chi tiết đầy đủ yêu cầu ký gửi</h3>
          <p>
            Dữ liệu được hiển thị đúng theo yêu cầu ký gửi
            của khách hàng.
          </p>
        </div>
        <span className="warehouse-api-status">
          <CheckCircle2 size={15} />{" "}
          {shipment.orderStatus}
        </span>
      </div>

      <div className="warehouse-full-data__grid">
        <article className="warehouse-full-card">
          <header>
            <FileCheck2 size={19} />
            <div>
              <h4>Thông tin đơn ký gửi</h4>
              <p>Consignment request</p>
            </div>
          </header>
          <div className="warehouse-full-card__rows">
            <FullDataRow
              label="Order ID"
              value={shipment.orderId}
              code
              wide
            />
            <FullDataRow
              label="Mã ký gửi"
              value={shipment.consignmentCode}
              code
            />
            <FullDataRow
              label="Trạng thái"
              value={shipment.orderStatus}
            />
            <FullDataRow
              label="Loại ký gửi"
              value={shipment.consignmentType}
            />
            <FullDataRow
              label="Loại đơn"
              value={shipment.orderType}
            />
            <FullDataRow
              label="Tổng trọng lượng"
              value={shipment.totalWeight + " kg"}
            />
            <FullDataRow
              label="Tổng thể tích"
              value={shipment.totalVolume + " m³"}
            />
            <FullDataRow
              label="Tuyến vận chuyển"
              value={shipment.apiRoute}
            />
            <FullDataRow
              label="Yêu cầu kiểm hàng"
              value={shipment.requiresInspection ? "Có" : "Không"}
            />
            <FullDataRow
              label="Ngày tạo"
              value={formatTime(shipment.createdAt)}
              wide
            />
            <FullDataRow
              label="Xác nhận thanh toán"
              value={formatTime(
                shipment.paymentConfirmedAt
              )}
              wide
            />
            <FullDataRow
              label="Cập nhật trạng thái"
              value={formatTime(shipment.statusUpdatedAt)}
              wide
            />
            <FullDataRow
              label="Ghi chú"
              value={shipment.note}
              wide
            />
          </div>
        </article>

        <article className="warehouse-full-card">
          <header>
            <MapPin size={19} />
            <div>
              <h4>Khách hàng & người nhận</h4>
              <p>Customer and receiver</p>
            </div>
          </header>
          <div className="warehouse-full-card__rows">
            <FullDataRow
              label="Tên khách hàng"
              value={shipment.customer.fullName}
            />
            <FullDataRow
              label="Số điện thoại"
              value={shipment.customer.phone}
            />
            <FullDataRow
              label="Email"
              value={shipment.customer.email}
              wide
            />
            <FullDataRow
              label="Người nhận"
              value={shipment.receiverName}
            />
            <FullDataRow
              label="Điện thoại nhận"
              value={shipment.receiverPhone}
            />
            <FullDataRow
              label="Địa chỉ nhận"
              value={shipment.receiverAddress}
              wide
            />
            <div className="warehouse-rule-box">
              <span>Pricing Rule IDs</span>
              {(shipment.pricingRuleIds || []).map(
                (ruleId) => (
                  <code key={ruleId}>{ruleId}</code>
                )
              )}
            </div>
          </div>
        </article>
      </div>

      <article className="warehouse-full-card warehouse-full-card--quotation">
        <header>
          <FileText size={19} />
          <div>
            <h4>Thông tin báo giá</h4>
            <p>Official quotation</p>
          </div>
          <span className="warehouse-quotation-badge">
            {quotation.quoteType} · {quotation.status}
          </span>
        </header>
        <div className="warehouse-quotation-layout">
          <div className="warehouse-full-card__rows">
            <FullDataRow
              label="Quotation ID"
              value={quotation.quotationId}
              code
              wide
            />
            <FullDataRow
              label="Cước vận chuyển"
              value={formatMoney(
                quotation.estimatedFreightCharge
              )}
            />
            <FullDataRow
              label="Vận chuyển nội địa"
              value={formatMoney(
                quotation.domesticShippingFee
              )}
            />
            <FullDataRow
              label="Phí dịch vụ"
              value={formatMoney(quotation.serviceFee)}
            />
            <FullDataRow
              label="Thuế và nghĩa vụ"
              value={formatMoney(quotation.taxAndDuty)}
            />
            <FullDataRow
              label="Tổng thể tích"
              value={quotation.totalVolume + " m³"}
            />
            <FullDataRow
              label="Ngày tạo"
              value={formatTime(quotation.createdAt)}
              wide
            />
            <FullDataRow
              label="Hết hạn"
              value={formatTime(quotation.expiredAt)}
              wide
            />
          </div>
          <div className="warehouse-quotation-total">
            <span>TỔNG CHI PHÍ ƯỚC TÍNH</span>
            <strong>
              {formatMoney(quotation.totalEstimatedCost)}
            </strong>
            <small>
              Báo giá chính thức đã được khách hàng chấp
              nhận
            </small>
          </div>
        </div>
      </article>
    </section>
  );
}

function FullProductDetails({ shipment }) {
  return (
    <section className="warehouse-product-details">
      {shipment.items.map((item) => {
        const configuration =
          item.packageConfiguration || {};
        const imageUrl = item.referenceUrls?.[0];

        return (
          <article
            className="warehouse-product-card"
            key={item.id}
          >
            <div className="warehouse-product-card__media">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={item.productName}
                />
              ) : (
                <Box size={34} />
              )}
            </div>
            <div className="warehouse-product-card__content">
              <header>
                <div>
                  <span>SẢN PHẨM KÝ GỬI</span>
                  <h4>{item.productName}</h4>
                  <p>{item.id}</p>
                </div>
                <span className="warehouse-product-card__package">
                  {configuration.configCode ||
                    "CHƯA CẤU HÌNH"}
                </span>
              </header>
              <div className="warehouse-product-specs">
                <FullDataRow
                  label="Product type"
                  value={item.productType}
                  code
                  wide
                />
                <FullDataRow
                  label="Số lượng"
                  value={item.quantity}
                />
                <FullDataRow
                  label="Trọng lượng"
                  value={item.weight + " kg"}
                />
                <FullDataRow
                  label="Kích thước sản phẩm"
                  value={
                    item.length +
                    " × " +
                    item.width +
                    " × " +
                    item.height
                  }
                />
                <FullDataRow
                  label="Giá trị khai báo"
                  value={formatMoney(item.declaredValue)}
                />
                <FullDataRow
                  label="Mã vận đơn nội địa"
                  value={item.domesticTrackingCode}
                />
                <FullDataRow
                  label="Volumetric weight"
                  value={item.volumetricWeight}
                />
                <FullDataRow
                  label="Package configuration ID"
                  value={item.packageConfigurationId}
                  code
                  wide
                />
              </div>

              <div className="warehouse-package-config">
                <div>
                  <span>Cấu hình kiện</span>
                  <strong>
                    {configuration.configName}
                  </strong>
                </div>
                <div>
                  <span>Kích thước kiện</span>
                  <strong>
                    {configuration.length} ×{" "}
                    {configuration.width} ×{" "}
                    {configuration.height} cm
                  </strong>
                </div>
                <div>
                  <span>Khối lượng tối đa</span>
                  <strong>
                    {configuration.maxWeight} kg
                  </strong>
                </div>
                <div>
                  <span>Phí đóng gói</span>
                  <strong>
                    {formatMoney(configuration.packageFee)}
                  </strong>
                </div>
                <div>
                  <span>Trạng thái</span>
                  <strong>{configuration.status}</strong>
                </div>
                <div>
                  <span>Phí dự kiến</span>
                  <strong>
                    {presentValue(
                      configuration.estimatedFee
                    )}
                  </strong>
                </div>
              </div>

              {imageUrl ? (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="warehouse-reference-link"
                >
                  <FileText size={14} /> Xem ảnh tham chiếu
                  gốc
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

export function WarehouseShipmentDetailPage() {
  const { shipmentId } = useParams();
  const shipment = getWarehouseShipment(shipmentId);

  if (!shipment) {
    return <WarehouseNotFound />;
  }

  const location =
    shipment.internationalWarehouse.zone +
    " · " +
    shipment.internationalWarehouse.binCode;

  return (
    <div className="warehouse-tracking">
      <Link
        className="warehouse-back"
        to="/warehouse/inventory"
      >
        <ArrowLeft size={17} /> Quay lại danh sách kho
      </Link>

      <section className="warehouse-detail-hero">
        <div>
          <span className="warehouse-card-eyebrow">
            {shipment.serviceName}
          </span>
          <h2>{shipment.consignmentCode}</h2>
          <p>
            {shipment.customer.name} ·{" "}
            {shipment.customer.phone} · {shipment.route}
          </p>
        </div>
        <StatusPill status={shipment.status} />
      </section>

      <section className="warehouse-panel warehouse-panel--timeline">
        <header className="warehouse-panel__header">
          <div>
            <h3>Hành trình xử lý</h3>
            <p>
              Mốc thời gian được lưu theo UTC và hiển thị
              UTC+7
            </p>
          </div>
        </header>
        <ShipmentProgress shipment={shipment} />
        <div className="warehouse-event-list">
          {shipment.timeline.map((event) => (
            <div
              key={event.key}
              className={
                "warehouse-event warehouse-event--" +
                event.state
              }
            >
              <span>
                {event.state === "complete" ? (
                  <Check size={14} />
                ) : (
                  <Clock3 size={14} />
                )}
              </span>
              <div>
                <strong>{event.label}</strong>
                <small>{event.description}</small>
              </div>
              <time>{formatTime(event.at)}</time>
            </div>
          ))}
        </div>
      </section>

      <section className="warehouse-detail-grid">
        <article className="warehouse-info-card">
          <header>
            <PackageCheck size={20} />
            <div>
              <h3>Thông tin nhập kho</h3>
              <p>Warehouse Receipt (WR)</p>
            </div>
          </header>
          <DetailRow
            label="Mã phiếu nhập"
            value={shipment.inbound.receiptId}
            accent
          />
          <DetailRow
            label="Thời gian nhận"
            value={formatTime(shipment.inbound.receivedAt)}
          />
          <DetailRow
            label="Kho nhận"
            value={shipment.internationalWarehouse.name}
          />
          <DetailRow
            label="Vị trí lưu"
            value={location}
          />
          <DetailRow
            label="Nhân viên kiểm nhận"
            value={shipment.inbound.staffName}
          />
          <Link
            className="warehouse-card-action"
            to={
              "/warehouse/receipts/" +
              shipment.inbound.receiptId
            }
          >
            Xem phiếu nhập kho <ChevronRight size={16} />
          </Link>
        </article>

        <article className="warehouse-info-card">
          <header>
            <ShieldCheck size={20} />
            <div>
              <h3>Thông tin thông quan</h3>
              <p>Customs clearance</p>
            </div>
          </header>
          <DetailRow
            label="Trạng thái"
            value={
              shipment.customs.status === "CUSTOMS_CLEARED"
                ? "Đã thông quan"
                : shipment.customs.status ===
                    "CUSTOMS_REVIEW"
                  ? "Đang kiểm tra hồ sơ"
                  : "Chưa tạo hồ sơ"
            }
            accent
          />
          <DetailRow
            label="Mã tờ khai"
            value={shipment.customs.declarationCode}
          />
          <DetailRow
            label="Phân luồng"
            value={shipment.customs.channel}
          />
          <DetailRow
            label="Ngày nộp"
            value={formatTime(shipment.customs.submittedAt)}
          />
          <DetailRow
            label="Ngày thông quan"
            value={formatTime(shipment.customs.clearedAt)}
          />
          <Link
            className="warehouse-card-action"
            to="/warehouse/customs"
          >
            Xem hồ sơ thông quan{" "}
            <ChevronRight size={16} />
          </Link>
        </article>

        <article className="warehouse-info-card">
          <header>
            <Truck size={20} />
            <div>
              <h3>Thông tin xuất kho</h3>
              <p>Warehouse Release Order (WRO)</p>
            </div>
          </header>
          <DetailRow
            label="Mã phiếu xuất"
            value={shipment.outbound.wroCode}
            accent
          />
          <DetailRow
            label="Đơn vị vận chuyển"
            value={shipment.outbound.carrier}
          />
          <DetailRow
            label="Mã vận đơn"
            value={shipment.outbound.trackingCode}
          />
          <DetailRow
            label="Dự kiến xuất kho"
            value={formatTime(
              shipment.outbound.expectedReleaseAt
            )}
          />
          <DetailRow
            label="Đã xuất kho lúc"
            value={formatTime(shipment.outbound.releasedAt)}
          />
          <Link
            className="warehouse-card-action"
            to="/warehouse/export"
          >
            Xem tiến độ xuất kho{" "}
            <ChevronRight size={16} />
          </Link>
        </article>

        <article className="warehouse-info-card">
          <header>
            <MapPin size={20} />
            <div>
              <h3>Kho & khách hàng</h3>
              <p>Thông tin vận hành</p>
            </div>
          </header>
          <DetailRow
            label="Kho quốc tế"
            value={shipment.internationalWarehouse.name}
          />
          <DetailRow
            label="Địa chỉ kho"
            value={shipment.internationalWarehouse.address}
          />
          <DetailRow
            label="Khách hàng"
            value={shipment.customer.name}
          />
          <DetailRow
            label="Điện thoại"
            value={shipment.customer.phone}
          />
          <DetailRow
            label="Dự kiến về Việt Nam"
            value={formatTime(shipment.expectedVietnamAt)}
          />
        </article>
      </section>

      <FullOrderData shipment={shipment} />

      <section className="warehouse-panel">
        <header className="warehouse-panel__header">
          <div>
            <h3>Chi tiết kiện hàng</h3>
            <p>
              Khối lượng đã được đối chiếu khi nhập kho
            </p>
          </div>
        </header>
        <div className="warehouse-table-wrap">
          <table className="warehouse-table">
            <thead>
              <tr>
                <th>Mã kiện</th>
                <th>Sản phẩm</th>
                <th>Cấu hình</th>
                <th>Số lượng</th>
                <th>KL khai báo</th>
                <th>KL thực tế</th>
                <th>Chênh lệch</th>
              </tr>
            </thead>
            <tbody>
              {shipment.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.packageCode}</strong>
                  </td>
                  <td>{item.productName}</td>
                  <td>{item.configuration}</td>
                  <td>{item.quantity}</td>
                  <td>
                    {formatNumber(
                      item.declaredWeight,
                      " kg"
                    )}
                  </td>
                  <td>
                    {formatNumber(item.actualWeight, " kg")}
                  </td>
                  <td>
                    <span
                      className={
                        "warehouse-diff " +
                        (item.difference >= 0
                          ? "warehouse-diff--plus"
                          : "warehouse-diff--minus")
                      }
                    >
                      {item.difference > 0 ? "+" : ""}
                      {item.difference} kg
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <FullProductDetails shipment={shipment} />
    </div>
  );
}

export function WarehouseExportPage() {
  const outboundShipments = WAREHOUSE_SHIPMENTS.filter(
    (shipment) => shipment.outbound.wroCode
  );

  return (
    <div className="warehouse-tracking">
      <WarehouseTabs />
      <PageIntro
        eyebrow="WAREHOUSE RELEASE ORDER"
        title="Theo dõi xuất kho quốc tế"
        description="Theo dõi phiếu WRO, lịch lấy hàng, bàn giao đơn vị vận chuyển và trạng thái vận chuyển về Việt Nam."
        icon={Truck}
      />

      <section className="warehouse-summary-grid warehouse-summary-grid--three">
        <SummaryCard
          icon={FileCheck2}
          label="Phiếu xuất kho"
          value={outboundShipments.length}
          note="WRO thuộc tài khoản của bạn"
          tone="blue"
        />
        <SummaryCard
          icon={CalendarClock}
          label="Sắp xuất kho"
          value="2 đơn"
          note="Trong 24 giờ tới"
          tone="amber"
        />
        <SummaryCard
          icon={Plane}
          label="Đang về Việt Nam"
          value="1 đơn"
          note="Dự kiến về 31/07/2026"
          tone="orange"
        />
      </section>

      <div className="warehouse-export-grid">
        {outboundShipments.map((shipment) => (
          <article
            className="warehouse-export-card"
            key={shipment.id}
          >
            <header>
              <div className="warehouse-export-card__icon">
                <Truck size={22} />
              </div>
              <div>
                <span>PHIẾU XUẤT KHO</span>
                <h3>{shipment.outbound.wroCode}</h3>
              </div>
              <StatusPill status={shipment.status} />
            </header>
            <div className="warehouse-export-card__body">
              <DetailRow
                label="Đơn ký gửi"
                value={shipment.consignmentCode}
              />
              <DetailRow
                label="Số kiện / khối lượng"
                value={
                  shipment.packageCount +
                  " kiện · " +
                  (shipment.inbound.actualWeight ??
                    shipment.totalWeight) +
                  " kg"
                }
              />
              <DetailRow
                label="Đơn vị vận chuyển"
                value={shipment.outbound.carrier}
              />
              <DetailRow
                label="Mã vận đơn"
                value={shipment.outbound.trackingCode}
                accent
              />
              <DetailRow
                label="Dự kiến xuất kho"
                value={formatTime(
                  shipment.outbound.expectedReleaseAt
                )}
              />
              <DetailRow
                label="Thời gian xuất thực tế"
                value={formatTime(
                  shipment.outbound.releasedAt
                )}
              />
            </div>
            <div className="warehouse-export-card__progress">
              <span className="is-done">
                <CheckCircle2 size={16} /> Đã duyệt
              </span>
              <i />
              <span
                className={
                  shipment.outbound.status !==
                  "PENDING_CUSTOMS"
                    ? "is-done"
                    : ""
                }
              >
                <PackageCheck size={16} /> Đóng hàng
              </span>
              <i />
              <span
                className={
                  shipment.outbound.status === "RELEASED"
                    ? "is-done"
                    : ""
                }
              >
                <Truck size={16} /> Bàn giao
              </span>
            </div>
            <Link
              to={"/warehouse/inventory/" + shipment.id}
              className="warehouse-primary-link"
            >
              Xem toàn bộ hành trình{" "}
              <ChevronRight size={16} />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

export function CustomsTrackingPage() {
  const customsShipments = WAREHOUSE_SHIPMENTS.filter(
    (shipment) =>
      shipment.customs.status !== "NOT_SUBMITTED"
  );

  const downloadDocument = (document) => {
    AuthNotify.success(
      "Đã chọn chứng từ",
      document.name +
        " đang dùng dữ liệu mẫu; API tải file sẽ được gắn sau."
    );
  };

  return (
    <div className="warehouse-tracking">
      <WarehouseTabs />
      <PageIntro
        eyebrow="CUSTOMS CLEARANCE"
        title="Theo dõi hồ sơ thông quan"
        description="Kiểm tra tờ khai, phân luồng, chứng từ đã nộp và thời điểm hàng được phép xuất khỏi kho quốc tế."
        icon={ShieldCheck}
        action={
          <span className="warehouse-security">
            <ShieldCheck size={15} /> Hồ sơ được bảo mật
          </span>
        }
      />

      <section className="warehouse-notice">
        <CircleAlert size={21} />
        <div>
          <strong>
            Không có yêu cầu bổ sung chứng từ
          </strong>
          <p>
            Khi cơ quan hải quan yêu cầu thêm giấy tờ, hệ
            thống sẽ thông báo tại đây.
          </p>
        </div>
      </section>

      <div className="warehouse-customs-list">
        {customsShipments.map((shipment) => {
          const cleared =
            shipment.customs.status ===
            "CUSTOMS_CLEARED";

          return (
            <article
              className="warehouse-customs-card"
              key={shipment.id}
            >
              <header>
                <div
                  className={
                    "warehouse-customs-card__state " +
                    (cleared ? "is-cleared" : "")
                  }
                >
                  {cleared ? (
                    <ShieldCheck size={25} />
                  ) : (
                    <ShieldEllipsis size={25} />
                  )}
                </div>
                <div>
                  <span>{shipment.consignmentCode}</span>
                  <h3>
                    {cleared
                      ? "Hồ sơ đã thông quan"
                      : "Hồ sơ đang được kiểm tra"}
                  </h3>
                  <p>{shipment.customs.note}</p>
                </div>
                <span
                  className={
                    "warehouse-customs-channel " +
                    (cleared ? "is-green" : "is-yellow")
                  }
                >
                  {shipment.customs.channel}
                </span>
              </header>
              <div className="warehouse-customs-card__meta">
                <div>
                  <span>Mã tờ khai</span>
                  <strong>
                    {shipment.customs.declarationCode}
                  </strong>
                </div>
                <div>
                  <span>Ngày nộp hồ sơ</span>
                  <strong>
                    {formatTime(
                      shipment.customs.submittedAt
                    )}
                  </strong>
                </div>
                <div>
                  <span>Ngày thông quan</span>
                  <strong>
                    {formatTime(shipment.customs.clearedAt)}
                  </strong>
                </div>
                <div>
                  <span>Số chứng từ</span>
                  <strong>
                    {shipment.customs.documents.length} tệp
                  </strong>
                </div>
              </div>
              <div className="warehouse-document-list">
                {shipment.customs.documents.map(
                  (document) => (
                    <button
                      type="button"
                      key={document.id}
                      onClick={() =>
                        downloadDocument(document)
                      }
                    >
                      <span className="warehouse-document-icon">
                        <FileText size={18} />
                      </span>
                      <span>
                        <strong>{document.name}</strong>
                        <small>{document.fileName}</small>
                      </span>
                      <span className="warehouse-document-valid">
                        <Check size={13} /> Hợp lệ
                      </span>
                      <Download size={17} />
                    </button>
                  )
                )}
              </div>
              <Link
                className="warehouse-secondary-link"
                to={
                  "/warehouse/inventory/" + shipment.id
                }
              >
                Xem chi tiết đơn{" "}
                <ChevronRight size={16} />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ReceiptDocument({ receipt }) {
  const { shipment } = receipt;

  return (
    <article className="warehouse-receipt-document">
      <header>
        <div className="warehouse-receipt-brand">
          <span>VCL</span>
          <div>
            <strong>VIETNAM LOGISTICS</strong>
            <small>
              International Warehouse System
            </small>
          </div>
        </div>
        <div className="warehouse-receipt-title">
          <span>WAREHOUSE RECEIPT (WR)</span>
          <h2>BIÊN BẢN NHẬP KHO</h2>
          <strong>{receipt.id}</strong>
        </div>
      </header>

      <div className="warehouse-receipt-status">
        <CheckCircle2 size={18} /> ĐÃ NHẬP KHO /
        RECEIVED
      </div>

      <section className="warehouse-receipt-info-grid">
        <div>
          <span>Mã đơn ký gửi</span>
          <strong>{shipment.consignmentCode}</strong>
        </div>
        <div>
          <span>Ngày lập phiếu</span>
          <strong>{formatTime(receipt.receivedAt)}</strong>
        </div>
        <div>
          <span>Khách hàng</span>
          <strong>
            {shipment.customer.name} (
            {shipment.customer.phone})
          </strong>
        </div>
        <div>
          <span>Nhân viên lập</span>
          <strong>{receipt.staffName}</strong>
        </div>
        <div>
          <span>Kho nhận</span>
          <strong>
            {shipment.internationalWarehouse.name}
          </strong>
        </div>
        <div>
          <span>Vị trí lưu</span>
          <strong>
            {shipment.internationalWarehouse.zone} ·{" "}
            {shipment.internationalWarehouse.binCode}
          </strong>
        </div>
        <div>
          <span>Loại đơn / trạng thái</span>
          <strong>
            {shipment.orderType} ·{" "}
            {shipment.orderStatus || "RECEIVED"}
          </strong>
        </div>
        <div>
          <span>Tuyến vận chuyển / thể tích</span>
          <strong>
            {shipment.route} · {shipment.totalVolume} m³
          </strong>
        </div>
      </section>

      <div className="warehouse-table-wrap">
        <table className="warehouse-table warehouse-receipt-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã kiện</th>
              <th>Hàng hóa</th>
              <th>SL theo phiếu</th>
              <th>SL thực tế</th>
              <th>KL theo phiếu</th>
              <th>KL thực tế</th>
              <th>Chênh lệch</th>
            </tr>
          </thead>
          <tbody>
            {shipment.items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>
                  <strong>{item.packageCode}</strong>
                </td>
                <td>
                  {item.productName}
                  <small>{item.configuration}</small>
                </td>
                <td>{item.quantity}</td>
                <td>{item.actualQuantity || item.quantity}</td>
                <td>{item.declaredWeight} kg</td>
                <td>{item.actualWeight} kg</td>
                <td>
                  {item.difference > 0 ? "+" : ""}
                  {item.difference} kg
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="3">Tổng cộng</td>
              <td>{shipment.totalQuantity}</td>
              <td>{shipment.totalQuantity}</td>
              <td>{shipment.totalWeight} kg</td>
              <td>{receipt.actualWeight} kg</td>
              <td>
                {receipt.actualWeight - shipment.totalWeight >
                0
                  ? "+"
                  : ""}
                {(
                  receipt.actualWeight -
                  shipment.totalWeight
                ).toFixed(2)}{" "}
                kg
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <section className="warehouse-receipt-note">
        <strong>Kết quả kiểm nhận</strong>
        <p>
          {receipt.inspectionResult}. {receipt.note}
        </p>
        {shipment.note ? (
          <p>
            <strong>Ghi chú đơn:</strong>{" "}
            {shipment.note}
          </p>
        ) : null}
      </section>

      <footer>
        <div>
          <span>Nhân viên kho</span>
          <small>(Ký và ghi rõ họ tên)</small>
          <strong>{receipt.staffName}</strong>
        </div>
        <div>
          <span>Quản lý kho</span>
          <small>(Đã phê duyệt)</small>
          <strong>Warehouse Manager</strong>
        </div>
      </footer>

      <div className="warehouse-receipt-official-note">
        <CircleAlert size={16} />
        <span>
          Biên bản chính thức được sinh sau khi nghiệp vụ
          xác nhận nhập kho hoàn tất. Thời gian hiển thị theo
          múi giờ Việt Nam (UTC+7).
        </span>
      </div>
    </article>
  );
}

export function WarehouseReceiptPage() {
  const { receiptId } = useParams();
  const receipt = receiptId
    ? getWarehouseReceipt(receiptId)
    : null;

  if (receiptId && !receipt) {
    return (
      <WarehouseNotFound message="Không tìm thấy phiếu nhập kho này." />
    );
  }

  if (receipt) {
    return (
      <div className="warehouse-tracking warehouse-receipt-page">
        <div className="warehouse-receipt-toolbar">
          <Link
            className="warehouse-back"
            to="/warehouse/receipts"
          >
            <ArrowLeft size={17} /> Danh sách phiếu nhập
            kho
          </Link>
          <div>
            <button
              type="button"
              onClick={() => window.print()}
            >
              <Printer size={17} /> In phiếu
            </button>
            <button
              type="button"
              className="is-primary"
              onClick={() =>
                AuthNotify.success(
                  "Đã chọn tải phiếu",
                  "File PDF sẽ được lấy từ API chứng từ khi tích hợp backend."
                )
              }
            >
              <Download size={17} /> Tải PDF
            </button>
          </div>
        </div>
        <ReceiptDocument receipt={receipt} />
      </div>
    );
  }

  return (
    <div className="warehouse-tracking">
      <WarehouseTabs />
      <PageIntro
        eyebrow="WAREHOUSE RECEIPT"
        title="Phiếu nhập kho của bạn"
        description="Mỗi phiếu ghi nhận chính xác số kiện, khối lượng thực tế, vị trí lưu và kết quả kiểm nhận tại kho quốc tế."
        icon={FileText}
      />
      <section className="warehouse-panel">
        <header className="warehouse-panel__header">
          <div>
            <h3>Danh sách phiếu nhập kho</h3>
            <p>
              {WAREHOUSE_SHIPMENTS.length} phiếu đã được
              phát hành
            </p>
          </div>
        </header>
        <div className="warehouse-receipt-list">
          {WAREHOUSE_SHIPMENTS.map((shipment) => (
            <Link
              key={shipment.id}
              to={
                "/warehouse/receipts/" +
                shipment.inbound.receiptId
              }
            >
              <span className="warehouse-receipt-list__icon">
                <FileCheck2 size={22} />
              </span>
              <span>
                <small>PHIẾU NHẬP KHO</small>
                <strong>
                  {shipment.inbound.receiptId}
                </strong>
                <em>{shipment.consignmentCode}</em>
              </span>
              <span>
                <small>Kho nhận</small>
                <strong>
                  {shipment.internationalWarehouse.name}
                </strong>
                <em>
                  {formatTime(
                    shipment.inbound.receivedAt
                  )}
                </em>
              </span>
              <span>
                <small>Hàng thực nhận</small>
                <strong>
                  {shipment.packageCount} kiện ·{" "}
                  {shipment.inbound.actualWeight ??
                    shipment.totalWeight} kg
                </strong>
                <em>
                  {shipment.inbound.inspectionResult}
                </em>
              </span>
              <span className="warehouse-receipt-list__status">
                <Check size={13} /> RECEIVED
              </span>
              <ChevronRight size={19} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function WarehouseNotFound({
  message = "Không tìm thấy đơn hàng trong kho.",
}) {
  return (
    <div className="warehouse-tracking">
      <div className="warehouse-empty warehouse-empty--page">
        <CircleAlert size={34} />
        <strong>{message}</strong>
        <p>
          Dữ liệu có thể đã được cập nhật hoặc đường dẫn
          không còn hợp lệ.
        </p>
        <Link
          className="warehouse-primary-link"
          to="/warehouse/inventory"
        >
          Quay lại tồn kho
        </Link>
      </div>
    </div>
  );
}
