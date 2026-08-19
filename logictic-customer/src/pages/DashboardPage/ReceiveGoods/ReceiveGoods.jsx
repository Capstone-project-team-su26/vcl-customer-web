import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Image,
  Input,
  Modal,
  notification,
  Pagination,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Steps,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from "antd";
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  BarcodeOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  ClockCircleFilled,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CompassOutlined,
  CopyOutlined,
  DollarOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  LoadingOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SendOutlined,
  ShoppingOutlined,
  SmileOutlined,
  SyncOutlined,
  TableOutlined,
  ThunderboltOutlined,
  TruckFilled,
  TruckOutlined,
  UnorderedListOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";

import {
  getConsignmentsApi,
  getConsignmentDetailApi,
} from "../../../api/OrderApi/consignmentApi";
import {
  getPurchaseRequestsApi,
  getPurchaseRequestDetailApi,
} from "../../../api/PurchaseAPI/purchaseRequestApi";
import {
  getDeliveryRequestsApi,
  getDeliveryRequestByIdApi,
} from "../../../api/OrderApi/deliveryRequestApi";
import {
  confirmOrderReceivedApi,
  getOrderDeliveryTrackingApi,
  getOrderParcelReturnsApi,
} from "../../../api/OrderApi/deliveryTrackingApi";
import { formatVietnamDateTime } from "../../../utils/timeUtc";
import "./ReceiveGoods.css";

const { Search } = Input;
const { Option } = Select;

// Phân loại đơn: Ký gửi (CONSIGNMENT) hay Mua hộ (PURCHASE)
export const detectOrderCategory = (orderCode) => {
  const code = String(orderCode || "").toUpperCase();
  if (
    code.startsWith("PUR-") ||
    code.startsWith("MH-") ||
    code.includes("PURCHASE") ||
    code.includes("BUY")
  ) {
    return "PURCHASE";
  }
  return "CONSIGNMENT";
};

// Cấu hình nhãn trạng thái giao nhận
const STATUS_CONFIG_MAP = {
  DELIVERY_PENDING: { label: "Chờ duyệt xuất giao", color: "gold", step: 0 },
  DELIVERY_APPROVED: { label: "Đã duyệt chờ giao", color: "blue", step: 1 },
  DELIVERY_DISPATCHED: { label: "Đang giao tới bạn", color: "cyan", step: 2 },
  DELIVERED: { label: "Đã nhận hàng", color: "green", step: 3 },
  COMPLETED: { label: "Đã hoàn tất", color: "green", step: 3 },
  DELIVERY_REJECTED: { label: "Từ chối giao", color: "red", step: -1 },

  // Trạng thái kho & vận chuyển
  AWAITING_PICKUP: { label: "Chờ hãng lấy hàng", color: "cyan", step: 2 },
  OUT_FOR_DELIVERY: { label: "Đang phát hàng", color: "cyan", step: 2 },
  RECEIVED_AT_DESTINATION: { label: "Đã về kho VN", color: "blue", step: 1 },
  ARRIVED_VN: { label: "Đã về kho VN", color: "blue", step: 1 },
  ARRIVED_DESTINATION: { label: "Đã về kho VN", color: "blue", step: 1 },
  IN_TRANSIT: { label: "Đang chuyển về VN", color: "geekblue", step: 0 },
  CUSTOMS_CLEARED: { label: "Đã thông quan", color: "purple", step: 1 },
  STORED: { label: "Đang lưu kho VN", color: "purple", step: 1 },
};

export default function ReceiveGoods() {
  const navigate = useNavigate();

  // Tab chính: CONSIGNMENT (Ký gửi) | PURCHASE (Mua hộ) | DELIVERY_REQUESTS (Phiếu giao hàng)
  const [activeServiceTab, setActiveServiceTab] = useState("CONSIGNMENT");

  // Dữ liệu từ API
  const [itemsList, setItemsList] = useState([]);
  const [countsSummary, setCountsSummary] = useState({
    consignments: 0,
    purchase: 0,
    deliveryRequests: 0,
    dispatched: 0,
    approved: 0,
    delivered: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Bộ lọc, Tìm kiếm & Phân trang
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [totalCount, setTotalCount] = useState(0);

  // Tra cứu nhanh
  const [directSearchId, setDirectSearchId] = useState("");
  const [directSearching, setDirectSearching] = useState(false);

  // Drawer Chi tiết của đơn hàng
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [detailDrawerLoading, setDetailDrawerLoading] = useState(false);
  const [orderDetailData, setOrderDetailData] = useState(null);
  const [orderTrackingData, setOrderTrackingData] = useState(null);
  const [orderReturnsData, setOrderReturnsData] = useState([]);
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);

  // Tải dữ liệu chính xác từ API theo Tab và Phân trang (100% API, không hardcode)
  const loadTabApiData = useCallback(
    async (tab, page, size, filter, search, isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      try {
        let rawItems = [];
        let total = 0;

        if (tab === "CONSIGNMENT") {
          // Gọi API Ký gửi: /api/orders/consignments
          const params = {
            pageNumber: page,
            pageSize: size,
          };
          if (search) params.keyword = search;
          if (filter !== "ALL") params.status = filter;

          const res = await getConsignmentsApi(params);
          const data = res?.data || res;
          rawItems = Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data)
            ? data
            : [];
          total =
            Number(data?.totalCount ?? data?.totalItems ?? rawItems.length) || 0;

          // Chuẩn hóa dữ liệu Ký gửi
          const formatted = rawItems.map((item) => ({
            ...item,
            uniqueId: item.orderId || item.consignmentOrderId || item.id,
            orderId: item.orderId || item.consignmentOrderId || item.id,
            orderCode: item.orderCode || item.consignmentOrderCode || item.code,
            category: "CONSIGNMENT",
            categoryLabel: "Ký gửi",
            title: item.orderCode || item.consignmentOrderCode || "Đơn ký gửi",
            trackingNumbers: item.trackingNumbers || item.trackingCode || "",
            status: item.status || "WAREHOUSE_RECEIVED",
            statusText: item.statusText || item.status,
            receiverName:
              item.receiverName ||
              item.shippingAddress?.receiverName ||
              "Khách hàng",
            receiverPhone:
              item.receiverPhone || item.shippingAddress?.phoneNumber || "",
            fullAddress:
              item.fullAddress ||
              item.shippingAddress?.fullAddress ||
              item.deliveryAddress ||
              "Địa chỉ nhận hàng",
            parcels: item.items || item.parcels || [],
            createdAt: item.createdAt,
          }));

          setItemsList(formatted);
          setTotalCount(total);
          setCountsSummary((prev) => ({
            ...prev,
            consignments: total || formatted.length,
          }));
        } else if (tab === "PURCHASE") {
          // Gọi API Mua hộ: /api/purchase-requests
          const params = {
            pageNumber: page,
            pageSize: size,
          };
          if (search) params.keyword = search;
          if (filter !== "ALL") params.status = filter;

          const res = await getPurchaseRequestsApi(params);
          const data = res?.data || res;
          rawItems = Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data)
            ? data
            : [];
          total =
            Number(data?.totalCount ?? data?.totalItems ?? rawItems.length) || 0;

          // Chuẩn hóa dữ liệu Mua hộ
          const formatted = rawItems.map((item) => ({
            ...item,
            uniqueId:
              item.requestId ||
              item.purchaseRequestId ||
              item.id ||
              item.orderId,
            purchaseRequestId:
              item.purchaseRequestId || item.requestId || item.id,
            orderId: item.orderId || item.purchaseRequestId || item.requestId,
            orderCode:
              item.requestCode ||
              item.purchaseOrderCode ||
              item.orderCode ||
              item.code,
            category: "PURCHASE",
            categoryLabel: "Mua hộ",
            title: item.requestCode || item.purchaseOrderCode || "Đơn mua hộ",
            status: item.status || "PROCESSING",
            statusText: item.statusText || item.status,
            receiverName:
              item.receiverName ||
              item.deliveryAddress?.receiverName ||
              "Khách hàng",
            receiverPhone:
              item.receiverPhone || item.deliveryAddress?.phoneNumber || "",
            fullAddress:
              item.fullAddress ||
              item.deliveryAddress?.fullAddress ||
              item.deliveryAddress ||
              "Địa chỉ nhận hàng",
            items: item.items || item.products || [],
            totalAmount:
              item.finalAmount || item.totalAmount || item.depositAmount,
            createdAt: item.createdAt,
          }));

          setItemsList(formatted);
          setTotalCount(total);
          setCountsSummary((prev) => ({
            ...prev,
            purchase: total || formatted.length,
          }));
        } else {
          // Gọi API Phiếu giao hàng: /api/delivery-requests
          const params = {
            page: page,
            pageSize: size,
          };
          if (search) params.search = search;
          if (filter !== "ALL") params.status = filter;

          const res = await getDeliveryRequestsApi(params);
          const data = res?.data || res;
          rawItems = Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data)
            ? data
            : [];
          total =
            Number(data?.totalCount ?? data?.totalItems ?? rawItems.length) || 0;

          const formatted = rawItems.map((item) => ({
            ...item,
            uniqueId: item.deliveryRequestId,
            orderId: item.orderId,
            category: detectOrderCategory(item.orderCode),
            categoryLabel:
              detectOrderCategory(item.orderCode) === "PURCHASE"
                ? "Mua hộ"
                : "Ký gửi",
            title: item.deliveryCode,
            status: item.status || "DELIVERY_PENDING",
            statusText: item.statusText || item.status,
            createdAt: item.createdAt,
          }));

          setItemsList(formatted);
          setTotalCount(total);
          setCountsSummary((prev) => ({
            ...prev,
            deliveryRequests: total || formatted.length,
          }));
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu từ API:", error);
        notification.error({
          message: "Lỗi tải dữ liệu",
          description:
            error?.message || "Không thể tải danh sách đơn hàng từ máy chủ.",
        });
        setItemsList([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Tải thống kê tổng quan (các đếm tab và tiến trình)
  const fetchOverviewCounts = useCallback(async () => {
    try {
      const [consignmentRes, purchaseRes, deliveryRes] =
        await Promise.allSettled([
          getConsignmentsApi({ pageNumber: 1, pageSize: 50 }),
          getPurchaseRequestsApi({ pageNumber: 1, pageSize: 50 }),
          getDeliveryRequestsApi({ page: 1, pageSize: 50 }),
        ]);

      let cTotal = 0;
      let pTotal = 0;
      let dTotal = 0;
      let dispatched = 0;
      let approved = 0;
      let delivered = 0;

      if (consignmentRes.status === "fulfilled") {
        const cData = consignmentRes.value?.data || consignmentRes.value;
        const cItems = Array.isArray(cData?.items) ? cData.items : [];
        cTotal = cData?.totalCount ?? cItems.length;
        cItems.forEach((it) => {
          const s = String(it.status || "").toUpperCase();
          if (
            s.includes("DISPATCH") ||
            s.includes("TRANSIT") ||
            s.includes("PICKUP")
          )
            dispatched++;
          else if (
            s.includes("APPROVE") ||
            s.includes("RECEIVED") ||
            s.includes("DESTINATION")
          )
            approved++;
          else if (s.includes("DELIVERED") || s.includes("COMPLETED"))
            delivered++;
        });
      }

      if (purchaseRes.status === "fulfilled") {
        const pData = purchaseRes.value?.data || purchaseRes.value;
        const pItems = Array.isArray(pData?.items) ? pData.items : [];
        pTotal = pData?.totalCount ?? pItems.length;
      }

      if (deliveryRes.status === "fulfilled") {
        const dData = deliveryRes.value?.data || deliveryRes.value;
        const dItems = Array.isArray(dData?.items) ? dData.items : [];
        dTotal = dData?.totalCount ?? dItems.length;
      }

      setCountsSummary({
        consignments: cTotal,
        purchase: pTotal,
        deliveryRequests: dTotal,
        dispatched,
        approved,
        delivered,
      });
    } catch (e) {
      console.warn("Không thể tải thống kê tổng:", e);
    }
  }, []);

  // Gọi API mỗi khi Tab, Phân trang hoặc Bộ lọc thay đổi
  useEffect(() => {
    loadTabApiData(
      activeServiceTab,
      pageNumber,
      pageSize,
      statusFilter,
      searchText
    );
  }, [
    activeServiceTab,
    pageNumber,
    pageSize,
    statusFilter,
    searchText,
    loadTabApiData,
  ]);

  useEffect(() => {
    fetchOverviewCounts();
  }, [fetchOverviewCounts]);

  // Xử lý chuyển tab
  const handleTabChange = (newTab) => {
    setActiveServiceTab(newTab);
    setPageNumber(1);
  };

  // Xử lý đổi trang
  const handlePaginationChange = (newPage, newPageSize) => {
    setPageNumber(newPage);
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setPageNumber(1);
    }
    // Cuộn nhẹ lên đầu danh sách
    window.scrollTo({ top: 380, behavior: "smooth" });
  };

  // Sao chép nhanh
  const handleCopy = (text, label = "Mã") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    notification.success({
      message: `Đã sao chép ${label}`,
      description: text,
      duration: 2,
    });
  };

  // Mở Drawer Xem Chi tiết tiến trình đơn hàng
  const handleOpenDetailedView = async (item) => {
    const isPurchase =
      item.category === "PURCHASE" ||
      detectOrderCategory(item.orderCode || item.requestCode) === "PURCHASE";

    const orderId =
      item.orderId || item.consignmentOrderId || item.uniqueId || item.id;
    const purchaseRequestId =
      item.purchaseRequestId || item.requestId || item.uniqueId || item.id;

    setDetailDrawerVisible(true);
    setDetailDrawerLoading(true);
    setOrderDetailData(null);
    setOrderTrackingData(null);
    setOrderReturnsData([]);

    try {
      if (isPurchase) {
        // Chi tiết Mua hộ từ API
        const [purchaseDetailRes, trackingRes, returnsRes] =
          await Promise.allSettled([
            getPurchaseRequestDetailApi(purchaseRequestId),
            orderId ? getOrderDeliveryTrackingApi(orderId) : Promise.reject(),
            orderId ? getOrderParcelReturnsApi(orderId) : Promise.reject(),
          ]);

        const pDetail =
          purchaseDetailRes.status === "fulfilled"
            ? purchaseDetailRes.value?.data || purchaseDetailRes.value
            : item;

        const tracking =
          trackingRes.status === "fulfilled" ? trackingRes.value : null;

        const returns =
          returnsRes.status === "fulfilled" && Array.isArray(returnsRes.value)
            ? returnsRes.value
            : [];

        setOrderDetailData({
          ...pDetail,
          category: "PURCHASE",
          orderId: orderId || pDetail?.orderId,
          purchaseRequestId,
        });
        setOrderTrackingData(tracking);
        setOrderReturnsData(returns);
      } else {
        // Chi tiết Ký gửi từ API
        const [consignmentDetailRes, trackingRes, returnsRes] =
          await Promise.allSettled([
            getConsignmentDetailApi(orderId),
            getOrderDeliveryTrackingApi(orderId),
            getOrderParcelReturnsApi(orderId),
          ]);

        const cDetail =
          consignmentDetailRes.status === "fulfilled"
            ? consignmentDetailRes.value?.data || consignmentDetailRes.value
            : item;

        const tracking =
          trackingRes.status === "fulfilled" ? trackingRes.value : null;

        const returns =
          returnsRes.status === "fulfilled" && Array.isArray(returnsRes.value)
            ? returnsRes.value
            : [];

        setOrderDetailData({
          ...cDetail,
          category: "CONSIGNMENT",
          orderId,
        });
        setOrderTrackingData(tracking);
        setOrderReturnsData(returns);
      }
    } catch (error) {
      console.error("Lỗi khi tải chi tiết đơn hàng:", error);
      notification.error({
        message: "Lỗi tải chi tiết đơn hàng",
        description:
          error?.message || "Không thể lấy thông tin chi tiết đơn này.",
      });
    } finally {
      setDetailDrawerLoading(false);
    }
  };

  // Tra cứu trực tiếp theo Mã đơn hoặc Mã vận đơn
  const handleDirectLookup = async (lookupId) => {
    const id = String(lookupId || directSearchId || "").trim();
    if (!id) {
      notification.warning({
        message: "Vui lòng nhập mã đơn hàng để tra cứu.",
      });
      return;
    }

    setDirectSearching(true);
    try {
      try {
        const purRes = await getPurchaseRequestDetailApi(id);
        if (purRes) {
          const pData = purRes?.data || purRes;
          handleOpenDetailedView({
            ...pData,
            category: "PURCHASE",
            purchaseRequestId: id,
            orderId: pData?.orderId,
          });
          return;
        }
      } catch {
        // Bỏ qua nếu không phải đơn mua hộ
      }

      try {
        const conRes = await getConsignmentDetailApi(id);
        if (conRes) {
          const cData = conRes?.data || conRes;
          handleOpenDetailedView({
            ...cData,
            category: "CONSIGNMENT",
            orderId: id,
          });
          return;
        }
      } catch {
        // Bỏ qua nếu không phải đơn ký gửi
      }

      const trackRes = await getOrderDeliveryTrackingApi(id);
      if (trackRes) {
        handleOpenDetailedView({
          orderId: id,
          orderCode: trackRes?.orderCode || id,
          category: detectOrderCategory(trackRes?.orderCode),
        });
        return;
      }

      notification.info({
        message: "Không tìm thấy kết quả",
        description: `Không tìm thấy đơn hàng tương ứng với mã: ${id}`,
      });
    } catch (error) {
      console.error("Lỗi tra cứu:", error);
      notification.error({
        message: "Tra cứu thất bại",
        description: error?.message || "Không tìm thấy thông tin đơn hàng.",
      });
    } finally {
      setDirectSearching(false);
    }
  };

  // Khách bấm xác nhận đã nhận hàng
  const handleConfirmReceived = async (orderId) => {
    if (!orderId) return;
    setConfirmingOrderId(orderId);
    try {
      await confirmOrderReceivedApi(orderId);
      notification.success({
        message: "Xác nhận nhận hàng thành công!",
        description:
          "Đơn hàng đã được đánh dấu hoàn tất. Cảm ơn bạn đã tin tưởng dịch vụ!",
      });
      loadTabApiData(
        activeServiceTab,
        pageNumber,
        pageSize,
        statusFilter,
        searchText,
        true
      );
      if (detailDrawerVisible && orderDetailData?.orderId === orderId) {
        handleOpenDetailedView(orderDetailData);
      }
    } catch (error) {
      console.error("Lỗi khi xác nhận nhận hàng:", error);
      notification.error({
        message: "Xác nhận nhận hàng thất bại",
        description: error?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setConfirmingOrderId(null);
    }
  };

  // Cột dạng Bảng (Table View)
  const tableColumns = [
    {
      title: "Mã đơn / Phiếu",
      key: "code",
      render: (_, record) => (
        <div>
          <div
            className="table-code-link"
            onClick={() =>
              handleCopy(
                record.orderCode || record.deliveryCode || record.requestCode,
                "Mã"
              )
            }
          >
            <strong>
              {record.orderCode || record.deliveryCode || record.requestCode}
            </strong>{" "}
            <CopyOutlined />
          </div>
          <span style={{ fontSize: 11, color: "#8c8c8c" }}>
            {formatVietnamDateTime(record.createdAt, {
              format: "HH:mm DD/MM/YYYY",
            })}
          </span>
        </div>
      ),
    },
    {
      title: "Dịch vụ",
      key: "category",
      render: (_, record) => {
        const isPur = record.category === "PURCHASE";
        return (
          <Tag color={isPur ? "orange" : "blue"} style={{ fontWeight: 700 }}>
            {isPur ? "🛍️ Mua hộ" : "📦 Ký gửi"}
          </Tag>
        );
      },
    },
    {
      title: "Người nhận & Địa chỉ",
      key: "receiver",
      render: (_, record) => (
        <div style={{ maxWidth: 260 }}>
          <div style={{ fontWeight: 600, color: "#1e293b" }}>
            {record.receiverName}{" "}
            {record.receiverPhone && (
              <span style={{ color: "#145bd7", fontSize: 12 }}>
                ({record.receiverPhone})
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {record.fullAddress}
          </div>
        </div>
      ),
    },
    {
      title: "Mã vận đơn giao hàng",
      key: "carrier",
      render: (_, record) => {
        const carrierCode =
          record.carrierTrackingCode || record.trackingNumbers;
        return carrierCode ? (
          <Tag
            color="cyan"
            style={{ cursor: "pointer", fontWeight: 700 }}
            onClick={() => handleCopy(carrierCode, "Mã vận đơn")}
          >
            🚚 {carrierCode} <CopyOutlined />
          </Tag>
        ) : (
          <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 12 }}>
            Chờ lấy hàng
          </span>
        );
      },
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_, record) => {
        const s = String(record.status || "").toUpperCase();
        const cfg = STATUS_CONFIG_MAP[s] || {
          label: record.statusText || record.status,
          color: "default",
        };
        return (
          <Tag color={cfg.color} style={{ fontWeight: 600 }}>
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: "Hành động",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            type="primary"
            ghost
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetailedView(record)}
          >
            Xem tiến trình
          </Button>

          {String(record.status || "").includes("DISPATCH") && (
            <Popconfirm
              title="Xác nhận bạn đã nhận đủ kiện hàng?"
              onConfirm={() =>
                handleConfirmReceived(record.orderId || record.uniqueId)
              }
              okText="Đã nhận đủ"
              cancelText="Chưa"
            >
              <Button
                size="small"
                type="primary"
                style={{ background: "#16a34a", borderColor: "#16a34a" }}
              >
                Đã nhận
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="receive-goods-container">
      {/* 1. Header Banner */}
      <div className="receive-goods-hero">
        <div className="receive-goods-hero__content">
          <div className="hero-badge">
            <DownloadOutlined /> QUẢN LÝ GIAO NHẬN HÀNG HÓA
          </div>
          <h1 className="hero-title">Nhận hàng: Ký gửi &amp; Mua hộ</h1>
          <p className="hero-subtitle">
            Theo dõi chi tiết hành trình kiện hàng của đơn{" "}
            <strong>Ký gửi</strong> và <strong>Mua hộ</strong> từ lúc xuất kho
            Trung Quốc ➡️ Về kho Việt Nam ➡️ Bàn giao đơn vị giao hàng nội địa
            ➡️ Giao tận tay bạn.
          </p>
        </div>

        <div className="receive-goods-hero__actions">
          <Button
            type="primary"
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={() => {
              loadTabApiData(
                activeServiceTab,
                pageNumber,
                pageSize,
                statusFilter,
                searchText,
                true
              );
              fetchOverviewCounts();
            }}
            className="hero-btn-refresh"
          >
            Làm mới danh sách
          </Button>
        </div>
      </div>

      {/* 2. Tra cứu nhanh đơn hàng */}
      <Card className="direct-lookup-card">
        <div className="direct-lookup-wrapper">
          <div className="lookup-icon">
            <FileSearchOutlined />
          </div>
          <div className="lookup-input-area">
            <div className="lookup-title">
              Tra cứu nhanh theo Mã đơn hàng hoặc Mã vận đơn:
            </div>
            <Search
              placeholder="Nhập mã đơn hàng (VCL-... / PUR-...) để xem tiến trình giao nhận ngay..."
              enterButton="Tra cứu đơn"
              size="large"
              value={directSearchId}
              onChange={(e) => setDirectSearchId(e.target.value)}
              onSearch={handleDirectLookup}
              loading={directSearching}
            />
          </div>
        </div>
      </Card>

      {/* 3. Primary Tabs Bar: KÝ GỬI vs MUA HỘ vs PHIẾU GIAO */}
      <div className="service-tabs-wrapper">
        <div className="service-tabs">
          <button
            type="button"
            className={`service-tab ${
              activeServiceTab === "CONSIGNMENT" ? "service-tab--active" : ""
            }`}
            onClick={() => handleTabChange("CONSIGNMENT")}
          >
            <InboxOutlined />
            <span>Đơn Ký gửi</span>
            <span className="tab-count-badge tab-count-badge--blue">
              {countsSummary.consignments}
            </span>
          </button>

          <button
            type="button"
            className={`service-tab ${
              activeServiceTab === "PURCHASE" ? "service-tab--active" : ""
            }`}
            onClick={() => handleTabChange("PURCHASE")}
          >
            <ShoppingOutlined />
            <span>Đơn Mua hộ</span>
            <span className="tab-count-badge tab-count-badge--orange">
              {countsSummary.purchase}
            </span>
          </button>

          <button
            type="button"
            className={`service-tab ${
              activeServiceTab === "DELIVERY_REQUESTS"
                ? "service-tab--active"
                : ""
            }`}
            onClick={() => handleTabChange("DELIVERY_REQUESTS")}
          >
            <TruckOutlined />
            <span>Phiếu giao hàng</span>
            <span className="tab-count-badge tab-count-badge--green">
              {countsSummary.deliveryRequests}
            </span>
          </button>
        </div>
      </div>

      {/* 4. KPI Status Summary Cards */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={8} lg={8}>
          <Card
            className={`stat-card stat-card--dispatched ${
              statusFilter === "DELIVERY_DISPATCHED" ? "stat-card--active" : ""
            }`}
            onClick={() => {
              setStatusFilter(
                statusFilter === "DELIVERY_DISPATCHED"
                  ? "ALL"
                  : "DELIVERY_DISPATCHED"
              );
              setPageNumber(1);
            }}
            hoverable
          >
            <div className="stat-card__icon stat-icon--dispatched">
              <TruckOutlined />
            </div>
            <div className="stat-card__data">
              <div className="stat-card__label">Đang giao tới bạn</div>
              <div className="stat-card__value">
                {countsSummary.dispatched}
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={8} lg={8}>
          <Card
            className={`stat-card stat-card--approved ${
              statusFilter === "DELIVERY_APPROVED" ? "stat-card--active" : ""
            }`}
            onClick={() => {
              setStatusFilter(
                statusFilter === "DELIVERY_APPROVED"
                  ? "ALL"
                  : "DELIVERY_APPROVED"
              );
              setPageNumber(1);
            }}
            hoverable
          >
            <div className="stat-card__icon stat-icon--approved">
              <SyncOutlined />
            </div>
            <div className="stat-card__data">
              <div className="stat-card__label">Đã về kho VN / Sẵn sàng</div>
              <div className="stat-card__value">{countsSummary.approved}</div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={8} lg={8}>
          <Card
            className={`stat-card stat-card--delivered ${
              statusFilter === "DELIVERED" ? "stat-card--active" : ""
            }`}
            onClick={() => {
              setStatusFilter(
                statusFilter === "DELIVERED" ? "ALL" : "DELIVERED"
              );
              setPageNumber(1);
            }}
            hoverable
          >
            <div className="stat-card__icon stat-icon--delivered">
              <CheckCircleOutlined />
            </div>
            <div className="stat-card__data">
              <div className="stat-card__label">Đã nhận hàng thành công</div>
              <div className="stat-card__value">
                {countsSummary.delivered}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 5. Toolbar: Search, Filter & View Mode */}
      <div className="toolbar-card">
        <div className="toolbar-left">
          <Search
            placeholder="Tìm theo mã đơn, mã vận đơn chuyển phát, tên người nhận, SĐT..."
            allowClear
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPageNumber(1);
            }}
            className="toolbar-search"
            prefix={<SearchOutlined />}
          />
        </div>

        <div className="toolbar-right">
          <div className="filter-group">
            <span className="filter-label">Tiến trình:</span>
            <Select
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPageNumber(1);
              }}
              className="toolbar-select"
              style={{ width: 190 }}
            >
              <Option value="ALL">Tất cả tiến trình</Option>
              <Option value="DELIVERY_DISPATCHED">🚚 Đang giao hàng</Option>
              <Option value="DELIVERY_APPROVED">📦 Đã về kho VN</Option>
              <Option value="DELIVERED">✅ Đã nhận hàng</Option>
            </Select>
          </div>

          <div className="view-mode-toggle">
            <Radio.Group
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="cards" title="Xem theo lộ trình">
                <AppstoreOutlined /> Thẻ lộ trình
              </Radio.Button>
              <Radio.Button value="table" title="Xem dạng bảng">
                <TableOutlined /> Dạng bảng
              </Radio.Button>
            </Radio.Group>
          </div>
        </div>
      </div>

      {/* 6. Danh sách đơn hàng từ API */}
      <div className="delivery-list-section">
        {loading ? (
          <div className="loading-container">
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />}
              tip="Đang tải dữ liệu giao nhận hàng từ máy chủ..."
            >
              <div style={{ minHeight: 280 }} />
            </Spin>
          </div>
        ) : itemsList.length === 0 ? (
          <Card className="empty-card">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      color: "#1e293b",
                    }}
                  >
                    {searchText
                      ? "Không tìm thấy kết quả khớp với từ khóa tìm kiếm."
                      : activeServiceTab === "CONSIGNMENT"
                      ? "Chưa có đơn ký gửi nào trong tiến trình này."
                      : activeServiceTab === "PURCHASE"
                      ? "Chưa có đơn mua hộ nào trong tiến trình này."
                      : "Chưa có phiếu giao hàng nào."}
                  </div>
                  <div
                    style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}
                  >
                    Khi hàng hóa được chuyển về Việt Nam và giao đi, bạn sẽ thấy
                    tiến trình cập nhật tại đây.
                  </div>
                </div>
              }
            >
              {searchText && (
                <Button
                  onClick={() => {
                    setSearchText("");
                    setPageNumber(1);
                  }}
                  style={{ marginTop: 8 }}
                >
                  Xóa tìm kiếm
                </Button>
              )}
            </Empty>
          </Card>
        ) : viewMode === "table" ? (
          /* View Bảng có phân trang */
          <Card className="table-wrapper-card">
            <Table
              dataSource={itemsList.map((item) => ({
                ...item,
                key: item.uniqueId,
              }))}
              columns={tableColumns}
              pagination={{
                current: pageNumber,
                pageSize: pageSize,
                total: totalCount,
                onChange: handlePaginationChange,
                showSizeChanger: true,
                pageSizeOptions: ["6", "10", "20", "50"],
                showTotal: (total) => `Tổng cộng ${total} đơn hàng`,
              }}
            />
          </Card>
        ) : (
          /* View Thẻ Lộ Trình */
          <>
            <div className="delivery-cards-grid">
              {itemsList.map((item) => {
                const isPurchase = item.category === "PURCHASE";
                const s = String(item.status || "").toUpperCase();

                // Tính toán bước tiến trình (0 -> 3)
                let currentStep = 1;
                if (s.includes("INIT") || s.includes("PENDING"))
                  currentStep = 0;
                else if (
                  s.includes("APPROVE") ||
                  s.includes("RECEIVED") ||
                  s.includes("STORAGE")
                )
                  currentStep = 1;
                else if (
                  s.includes("DISPATCH") ||
                  s.includes("TRANSIT") ||
                  s.includes("PICKUP")
                )
                  currentStep = 2;
                else if (s.includes("DELIVERED") || s.includes("COMPLETED"))
                  currentStep = 3;

                const statusCfg = STATUS_CONFIG_MAP[s] || {
                  label: item.statusText || item.status || "Đang xử lý",
                  color: "blue",
                };

                return (
                  <Card
                    key={item.uniqueId}
                    className={`delivery-card ${
                      isPurchase
                        ? "delivery-card--purchase"
                        : "delivery-card--consignment"
                    }`}
                    hoverable
                  >
                    {/* Header */}
                    <div className="delivery-card__header">
                      <div className="code-group">
                        <Tag
                          color={isPurchase ? "#ea580c" : "#1d4ed8"}
                          className="service-type-tag"
                        >
                          {isPurchase ? "🛍️ ĐƠN MUA HỘ" : "📦 ĐƠN KÝ GỬI"}
                        </Tag>

                        <span
                          className="dlv-code"
                          onClick={() =>
                            handleCopy(
                              item.orderCode ||
                                item.deliveryCode ||
                                item.requestCode,
                              "Mã đơn"
                            )
                          }
                          title="Click để sao chép"
                        >
                          {item.orderCode ||
                            item.deliveryCode ||
                            item.requestCode}{" "}
                          <CopyOutlined className="copy-icon" />
                        </span>
                      </div>

                      <div className="status-group">
                        <Tag
                          color={statusCfg.color}
                          className="custom-status-tag"
                        >
                          {statusCfg.label}
                        </Tag>
                      </div>
                    </div>

                    {/* Mã vận đơn & Thời gian */}
                    <div className="order-ref-row">
                      {item.trackingNumbers && (
                        <>
                          <span className="order-ref-label">
                            Mã vận đơn TQ:
                          </span>
                          <span
                            className="carrier-code"
                            onClick={() =>
                              handleCopy(item.trackingNumbers, "Mã TQ")
                            }
                          >
                            🇨🇳 {item.trackingNumbers} <CopyOutlined />
                          </span>
                          <span className="dot-divider">•</span>
                        </>
                      )}

                      <span className="created-time">
                        Tạo lúc:{" "}
                        {formatVietnamDateTime(item.createdAt, {
                          fallback: "--",
                        })}
                      </span>
                    </div>

                    {/* Pipeline Stepper */}
                    <div className="delivery-pipeline-box">
                      <div className="pipeline-title">
                        <CompassOutlined /> Tiến trình giao nhận:
                      </div>

                      <Steps
                        size="small"
                        current={currentStep}
                        items={[
                          {
                            title: "1. Khai báo / Nhập kho TQ",
                            description: isPurchase
                              ? "Đã mua & chuyển kho"
                              : "Kho TQ nhận kiện",
                          },
                          {
                            title: "2. Đã về kho Việt Nam",
                            description: "Kiểm đếm & sẵn sàng",
                          },
                          {
                            title: "3. Đang giao hàng",
                            description:
                              item.carrierTrackingCode || item.dispatchedAt
                                ? "Hãng phát hàng"
                                : currentStep >= 2
                                ? "Đang trên đường giao"
                                : "Chờ xuất giao",
                          },
                          {
                            title: "4. Đã nhận hàng",
                            description:
                              currentStep === 3
                                ? "Giao thành công"
                                : "Chờ khách xác nhận",
                          },
                        ]}
                      />
                    </div>

                    {/* Body: Người nhận & Hãng giao */}
                    <div className="delivery-card__body">
                      {/* Cột 1: Thông tin người nhận & Sản phẩm */}
                      <div className="info-section">
                        <div className="info-title">
                          <UserOutlined /> Thông tin nhận hàng
                        </div>
                        <div className="receiver-name">
                          <strong>{item.receiverName || "Khách hàng"}</strong>
                          {item.receiverPhone && (
                            <span className="receiver-phone">
                              <PhoneOutlined /> {item.receiverPhone}
                            </span>
                          )}
                        </div>
                        <div className="receiver-address">
                          <EnvironmentOutlined />{" "}
                          {item.fullAddress || "Địa chỉ nhận hàng mặc định"}
                        </div>

                        {/* Preview sản phẩm Mua hộ */}
                        {isPurchase &&
                          Array.isArray(item.items) &&
                          item.items.length > 0 && (
                            <div className="purchase-products-preview">
                              <div
                                className="info-title"
                                style={{ marginTop: 8 }}
                              >
                                <ShoppingOutlined /> Sản phẩm mua hộ (
                                {item.items.length} món):
                              </div>
                              <div className="products-mini-list">
                                {item.items.slice(0, 3).map((prod, pIdx) => (
                                  <div key={pIdx} className="product-mini-item">
                                    {prod.imageUrl ? (
                                      <Avatar
                                        shape="square"
                                        size={36}
                                        src={prod.imageUrl}
                                      />
                                    ) : (
                                      <Avatar
                                        shape="square"
                                        size={36}
                                        icon={<ShoppingOutlined />}
                                      />
                                    )}
                                    <div className="product-mini-info">
                                      <div className="p-title">
                                        {prod.productName || "Sản phẩm mua hộ"}
                                      </div>
                                      <div className="p-meta">
                                        SL: x{prod.quantity || 1}
                                        {prod.productLink && (
                                          <a
                                            href={prod.productLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-link"
                                          >
                                            <LinkOutlined /> Xem sản phẩm gốc
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Cột 2: Đơn vị giao hàng nội địa */}
                      <div className="carrier-section">
                        <div className="info-title">
                          <TruckOutlined /> Vận chuyển nội địa (Last-mile)
                        </div>
                        <div className="carrier-box">
                          <div className="carrier-row">
                            <span className="label">Mã vận đơn hãng:</span>
                            {item.carrierTrackingCode ? (
                              <span
                                className="carrier-code"
                                onClick={() =>
                                  handleCopy(
                                    item.carrierTrackingCode,
                                    "Mã vận đơn hãng"
                                  )
                                }
                                title="Click sao chép"
                              >
                                🚚 <strong>{item.carrierTrackingCode}</strong>{" "}
                                <CopyOutlined className="copy-icon" />
                              </span>
                            ) : (
                              <span className="carrier-pending">
                                Chờ bàn giao hãng giao hàng
                              </span>
                            )}
                          </div>

                          {item.dispatchedAt && (
                            <div className="carrier-row">
                              <span className="label">
                                Thời gian xuất giao:
                              </span>
                              <span className="val">
                                {formatVietnamDateTime(item.dispatchedAt, {
                                  fallback: "--",
                                })}
                              </span>
                            </div>
                          )}

                          <div className="carrier-row">
                            <span className="label">Hình thức giao:</span>
                            <span
                              className="val"
                              style={{ fontWeight: 600, color: "#145bd7" }}
                            >
                              Giao tận nhà
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Parcels list */}
                    {Array.isArray(item.parcels) && item.parcels.length > 0 && (
                      <div className="parcels-preview">
                        <div className="parcels-header">
                          <span>
                            <InboxOutlined /> Danh sách kiện hàng (
                            {item.parcels.length} kiện):
                          </span>
                        </div>
                        <div className="parcels-chips">
                          {item.parcels.map((parcel, idx) => (
                            <div
                              key={parcel.parcelId || idx}
                              className="parcel-chip"
                            >
                              <span className="p-code">
                                {parcel.packageCode || parcel.code}
                              </span>
                              {parcel.customerIntentText && (
                                <span className="p-intent">
                                  • {parcel.customerIntentText}
                                </span>
                              )}
                              {parcel.binCode && (
                                <Tag color="purple" className="p-bin">
                                  Kệ: {parcel.binCode}
                                </Tag>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="delivery-card__footer">
                      <Space wrap>
                        <Button
                          type="primary"
                          ghost
                          icon={<EyeOutlined />}
                          onClick={() => handleOpenDetailedView(item)}
                        >
                          Xem tiến trình
                        </Button>

                        <Button
                          type="link"
                          onClick={() => handleOpenDetailedView(item)}
                          className="btn-warehouse-link"
                        >
                          Chi tiết đơn hàng &rarr;
                        </Button>
                      </Space>

                      <div className="footer-right">
                        {(currentStep === 2 || s.includes("DISPATCH")) && (
                          <Popconfirm
                            title="Xác nhận bạn đã nhận đủ kiện hàng?"
                            description="Kiểm tra kỹ tình trạng kiện hàng trước khi xác nhận hoàn tất."
                            onConfirm={() =>
                              handleConfirmReceived(
                                item.orderId || item.uniqueId
                              )
                            }
                            okText="Đã nhận đủ hàng"
                            cancelText="Chưa"
                          >
                            <Button
                              type="primary"
                              icon={<SmileOutlined />}
                              loading={
                                confirmingOrderId ===
                                (item.orderId || item.uniqueId)
                              }
                              className="btn-confirm-received"
                            >
                              Đã nhận được hàng
                            </Button>
                          </Popconfirm>
                        )}

                        {(currentStep === 3 ||
                          s.includes("DELIVERED") ||
                          s.includes("COMPLETED")) && (
                          <Tag color="success" className="tag-completed">
                            <CheckCircleFilled /> Đã hoàn tất nhận hàng
                          </Tag>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Phân trang dưới lưới Thẻ */}
            <div className="receive-goods-pagination">
              <Pagination
                current={pageNumber}
                pageSize={pageSize}
                total={totalCount}
                onChange={handlePaginationChange}
                showSizeChanger
                pageSizeOptions={["6", "12", "24", "48"]}
                showTotal={(total) => `Tổng cộng ${total} đơn hàng`}
              />
            </div>
          </>
        )}
      </div>

      {/* 7. Drawer: Xem Chi tiết Toàn diện */}
      <Drawer
        title={
          <div className="modal-title-header">
            <TruckOutlined style={{ color: "#145bd7" }} />
            <span>
              {orderDetailData?.category === "PURCHASE"
                ? "Chi tiết Đơn Mua hộ & Tiến trình Giao nhận"
                : "Chi tiết Đơn Ký gửi & Tiến trình Giao nhận"}
            </span>
          </div>
        }
        placement="right"
        width={760}
        onClose={() => setDetailDrawerVisible(false)}
        open={detailDrawerVisible}
        destroyOnClose
      >
        {detailDrawerLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />}
              tip="Đang tải thông tin chi tiết đơn hàng..."
            />
          </div>
        ) : orderDetailData ? (
          <div className="drawer-detail-body">
            {/* 1. Header Card */}
            <div className="tracking-overview-card">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div className="track-prop">
                    <span className="lbl">Mã đơn hàng:</span>
                    <span className="val val-bold">
                      {orderDetailData.orderCode ||
                        orderDetailData.requestCode ||
                        orderDetailData.orderId}
                    </span>
                  </div>

                  <div className="track-prop">
                    <span className="lbl">Dịch vụ:</span>
                    <Tag
                      color={
                        orderDetailData.category === "PURCHASE"
                          ? "orange"
                          : "blue"
                      }
                      style={{ fontWeight: 700 }}
                    >
                      {orderDetailData.category === "PURCHASE"
                        ? "🛍️ Mua hộ"
                        : "📦 Ký gửi"}
                    </Tag>
                  </div>

                  <div className="track-prop">
                    <span className="lbl">Trạng thái:</span>
                    <Tag color="blue" style={{ fontWeight: 700 }}>
                      {orderDetailData.statusText ||
                        orderDetailData.status ||
                        "Đang xử lý"}
                    </Tag>
                  </div>
                </Col>

                <Col span={12}>
                  {orderTrackingData && (
                    <div className="track-prop">
                      <span className="lbl">Phí lưu kho:</span>
                      <span className="val val-highlight">
                        {Number(
                          orderTrackingData.storageFeeAmount || 0
                        ).toLocaleString("vi-VN")}{" "}
                        đ
                      </span>
                    </div>
                  )}

                  {orderDetailData.receiverName && (
                    <div className="track-prop">
                      <span className="lbl">Người nhận:</span>
                      <span className="val">
                        {orderDetailData.receiverName}{" "}
                        {orderDetailData.receiverPhone &&
                          `(${orderDetailData.receiverPhone})`}
                      </span>
                    </div>
                  )}

                  <div className="track-prop">
                    <span className="lbl">Địa chỉ:</span>
                    <span className="val" style={{ fontSize: 12 }}>
                      {orderDetailData.fullAddress ||
                        orderDetailData.shippingAddress?.fullAddress ||
                        orderDetailData.deliveryAddress?.fullAddress}
                    </span>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Cảnh báo hàng hoàn nếu có */}
            {orderReturnsData.length > 0 && (
              <Alert
                type="warning"
                showIcon
                icon={<ExclamationCircleOutlined />}
                message={`Có ${orderReturnsData.length} kiện giao thất bại đang quay về kho`}
                description="Vui lòng liên hệ bộ phận hỗ trợ khách hàng để xử lý giao lại."
                style={{ marginBottom: 16 }}
              />
            )}

            {/* 2. Phiếu giao hàng liên quan */}
            {orderTrackingData?.deliveries &&
              orderTrackingData.deliveries.length > 0 && (
                <div className="modal-section" style={{ marginBottom: 20 }}>
                  <h4 className="section-heading">
                    <ThunderboltOutlined /> Các phiếu giao hàng liên quan:
                  </h4>
                  {orderTrackingData.deliveries.map((dlv) => (
                    <Card
                      key={dlv.deliveryRequestId}
                      size="small"
                      className="sub-dlv-card"
                    >
                      <div className="sub-dlv-row">
                        <div>
                          <strong>{dlv.deliveryCode}</strong>
                          <Tag
                            color="cyan"
                            style={{ marginLeft: 8, fontWeight: 600 }}
                          >
                            {dlv.statusText || dlv.status}
                          </Tag>
                        </div>
                        <div>
                          {dlv.carrierTrackingCode ? (
                            <span>
                              Mã hãng:{" "}
                              <strong>{dlv.carrierTrackingCode}</strong>
                            </span>
                          ) : (
                            <span style={{ color: "#8c8c8c" }}>
                              Chưa có mã vận đơn
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        style={{ marginTop: 6, fontSize: 13, color: "#595959" }}
                      >
                        Người nhận: <strong>{dlv.receiverName}</strong> • Địa
                        chỉ: {dlv.fullAddress}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

            {/* 3. Danh sách sản phẩm mua hộ (nếu là Mua hộ) */}
            {orderDetailData.category === "PURCHASE" &&
              Array.isArray(orderDetailData.items) &&
              orderDetailData.items.length > 0 && (
                <div className="modal-section" style={{ marginBottom: 20 }}>
                  <h4 className="section-heading">
                    <ShoppingOutlined /> Danh sách sản phẩm mua hộ:
                  </h4>
                  <Table
                    dataSource={orderDetailData.items.map((prod, idx) => ({
                      ...prod,
                      key: idx,
                    }))}
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: "Sản phẩm",
                        key: "product",
                        render: (_, record) => (
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            {record.imageUrl ? (
                              <Image
                                width={44}
                                height={44}
                                src={record.imageUrl}
                              />
                            ) : (
                              <Avatar
                                shape="square"
                                size={44}
                                icon={<ShoppingOutlined />}
                              />
                            )}
                            <div>
                              <div style={{ fontWeight: 600 }}>
                                {record.productName}
                              </div>
                              {record.productLink && (
                                <a
                                  href={record.productLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ fontSize: 12, color: "#ea580c" }}
                                >
                                  <LinkOutlined /> Xem sản phẩm gốc
                                </a>
                              )}
                            </div>
                          </div>
                        ),
                      },
                      {
                        title: "Số lượng",
                        dataIndex: "quantity",
                        key: "quantity",
                        width: 80,
                        render: (qty) => `x${qty || 1}`,
                      },
                      {
                        title: "Đơn giá",
                        key: "price",
                        render: (_, record) =>
                          record.price || record.unitPrice
                            ? `${Number(
                                record.price || record.unitPrice
                              ).toLocaleString("vi-VN")} đ`
                            : "--",
                      },
                    ]}
                  />
                </div>
              )}

            {/* 4. Danh sách kiện hàng (Ký gửi / Warehouse tracking) */}
            {((orderTrackingData?.parcels &&
              orderTrackingData.parcels.length > 0) ||
              (orderDetailData.parcels &&
                orderDetailData.parcels.length > 0)) && (
              <div className="modal-section" style={{ marginBottom: 20 }}>
                <h4 className="section-heading">
                  <InboxOutlined /> Danh sách kiện hàng:
                </h4>
                <Table
                  dataSource={(
                    orderTrackingData?.parcels || orderDetailData.parcels
                  ).map((p, idx) => ({
                    ...p,
                    key: p.packageCode || p.parcelId || idx,
                  }))}
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: "Mã kiện",
                      dataIndex: "packageCode",
                      key: "packageCode",
                      render: (code) => <strong>{code}</strong>,
                    },
                    {
                      title: "Trạng thái",
                      dataIndex: "statusText",
                      key: "statusText",
                      render: (text, record) => (
                        <Tag color="purple">
                          {text || record.packageStatus || "Đã vào kho"}
                        </Tag>
                      ),
                    },
                    {
                      title: "Nguyện vọng",
                      dataIndex: "handlingText",
                      key: "handlingText",
                      render: (text) => text || "Giao thẳng",
                    },
                    {
                      title: "Thời gian lưu kho",
                      dataIndex: "storedAt",
                      key: "storedAt",
                      render: (time) =>
                        formatVietnamDateTime(time, { fallback: "--" }),
                    },
                  ]}
                />
              </div>
            )}

            {/* Nút xác nhận nhận hàng trong Drawer */}
            <div style={{ marginTop: 24, textAlign: "right" }}>
              <Space>
                <Button onClick={() => setDetailDrawerVisible(false)}>
                  Đóng
                </Button>

                {orderDetailData.orderId && (
                  <Popconfirm
                    title="Xác nhận bạn đã nhận đủ kiện hàng?"
                    onConfirm={() =>
                      handleConfirmReceived(orderDetailData.orderId)
                    }
                    okText="Đã nhận đủ"
                    cancelText="Hủy"
                  >
                    <Button
                      type="primary"
                      icon={<SmileOutlined />}
                      style={{
                        background: "#16a34a",
                        borderColor: "#16a34a",
                        fontWeight: 600,
                      }}
                    >
                      Xác nhận đã nhận hàng
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
