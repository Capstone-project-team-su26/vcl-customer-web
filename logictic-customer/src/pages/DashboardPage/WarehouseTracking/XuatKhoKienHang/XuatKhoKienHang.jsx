import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Boxes,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Info,
  Layers,
  MapPin,
  Package,
  Plane,
  Scale,
  Search,
  ShieldCheck,
  Truck,
  User,
  Warehouse,
  X,
} from "lucide-react";

import {
  getWarehouseReleaseRequestDetailApi,
  getWarehouseReleaseRequestsApi,
} from "../../../../api/Warehouse/warehouseReleaseApi";
import { formatVietnamDateTime } from "../../../../utils/timeUtc";
import { PageIntro, SummaryCard } from "../Shared/WarehouseSharedComponents";
import "./XuatKhoKienHang.css";

/* =========================================================
   HELPERS & PROFILE MATCHING
   ========================================================= */

const getStoredUserProfile = () => {
  try {
    const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (userStr) {
      const u = JSON.parse(userStr);
      return {
        userId: u.userId || u.id || u.customerId || "",
        fullName: u.fullName || u.name || u.userName || "",
        email: u.email || sessionStorage.getItem("email") || localStorage.getItem("email") || "",
        phone: u.phone || sessionStorage.getItem("phone") || localStorage.getItem("phone") || "",
        customerCode: u.customerCode || "",
      };
    }
  } catch (e) {
    console.error("Lỗi đọc user profile:", e);
  }

  return {
    userId: sessionStorage.getItem("id") || sessionStorage.getItem("customerId") || "",
    fullName: sessionStorage.getItem("fullName") || sessionStorage.getItem("name") || "",
    email: sessionStorage.getItem("email") || "",
    phone: sessionStorage.getItem("phone") || "",
    customerCode: "",
  };
};

/**
 * Kiểm tra xem phiếu xuất kho WRO có thuộc về khách hàng hiện tại không
 */
const isWroBelongsToUser = (wro, user) => {
  if (!user || (!user.userId && !user.fullName && !user.phone && !user.email)) {
    return true;
  }

  const uName = String(user.fullName || "").trim().toLowerCase();
  const uEmail = String(user.email || "").trim().toLowerCase();
  const uPhone = String(user.phone || "").trim();
  const uId = String(user.userId || "").trim().toLowerCase();
  const uCode = String(user.customerCode || "").trim().toLowerCase();

  const wroCustName = String(wro.customerName || "").trim().toLowerCase();
  const wroCustPhone = String(wro.customerPhone || wro.receiverPhone || "").trim();
  const wroCustId = String(wro.customerId || "").trim().toLowerCase();
  const wroCustCode = String(wro.customerCode || "").trim().toLowerCase();

  if (uId && wroCustId && uId === wroCustId) return true;
  if (uPhone && wroCustPhone && (uPhone === wroCustPhone || wroCustPhone.includes(uPhone))) return true;
  if (uCode && wroCustCode && uCode === wroCustCode) return true;
  if (uName && wroCustName && (wroCustName.includes(uName) || uName.includes(wroCustName))) return true;
  if (uEmail && wroCustName && uEmail.includes(wroCustName)) return true;

  return false;
};

/* =========================================================
   STATUS MAPPING HELPER
   ========================================================= */

const WRO_STATUS_MAP = {
  RELEASE_APPROVED: { label: "Đã duyệt xuất", tone: "blue", desc: "Phiếu xuất kho đã được phê duyệt" },
  HANDED_OVER: { label: "Đã bàn giao xe", tone: "amber", desc: "Đã bàn giao hàng cho đơn vị vận chuyển" },
  IN_TRANSIT: { label: "Đang vận chuyển", tone: "cyan", desc: "Hàng đang trên đường vận chuyển về VN" },
  ARRIVED_IN_VN: { label: "Đã đến Việt Nam", tone: "emerald", desc: "Hàng đã nhập kho trung chuyển Việt Nam" },
  RELEASE_REJECTED: { label: "Từ chối xuất", tone: "red", desc: "Phiếu xuất bị từ chối hoặc có sự cố" },
  PENDING: { label: "Chờ xử lý", tone: "indigo", desc: "Đang chờ kho xử lý xuất kiện" },
};

/* =========================================================
   MODAL CHI TIẾT PHIẾU XUẤT KHO (WRO DETAIL)
   ========================================================= */

function WroDetailModal({ wroItem, onClose }) {
  const [detail, setDetail] = useState(wroItem || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      if (!wroItem?.wroId) return;
      try {
        setLoading(true);
        setError("");
        const res = await getWarehouseReleaseRequestDetailApi(wroItem.wroId);
        const data = res?.data?.data || res?.data || res;
        if (isMounted && data && typeof data === "object") {
          setDetail(data);
        }
      } catch (err) {
        console.error("Lỗi lấy chi tiết WRO:", err);
        // Không block giao diện, vẫn hiển thị thông tin wroItem đã có
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [wroItem]);

  const currentData = detail || wroItem || {};
  const isBatch = (currentData.exportType || wroItem?.exportType) === "BATCH";
  const statusConfig = WRO_STATUS_MAP[currentData.status || wroItem?.status] || {
    label: currentData.status || "Đang xử lý",
    tone: "neutral",
    desc: "",
  };

  return (
    <div className="wro-modal-overlay" onClick={onClose}>
      <div className="wro-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="wro-modal-header">
          <div className="wro-modal-title">
            <Truck size={24} className="wro-modal-icon" />
            <div>
              <div className="wro-modal-tags">
                <span className={`wro-type-pill ${isBatch ? "batch" : "single"}`}>
                  {isBatch ? "📦 Xuất gom lô" : "📦 Xuất đơn lẻ"}
                </span>
                <span className={`wro-status-badge ${statusConfig.tone}`}>
                  {statusConfig.label}
                </span>
              </div>
              <h3>{currentData.wroCode || wroItem?.wroCode}</h3>
              <p>Mã vạch: <strong>{currentData.exportBarcode || wroItem?.exportBarcode || "--"}</strong></p>
            </div>
          </div>
          <button type="button" className="wro-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="wro-modal-body">
          <div className="wro-detail-sections">
            {/* Cảnh báo khi bị từ chối xuất kho */}
            {currentData.status === "RELEASE_REJECTED" && (
              <div className="wro-rejected-alert">
                <AlertCircle size={20} />
                <div>
                  <strong>Phiếu xuất kho bị từ chối:</strong>
                  <p>{currentData.note || currentData.exportReason || "Vui lòng liên hệ bộ phận hỗ trợ để kiểm tra nguyên nhân."}</p>
                </div>
              </div>
            )}

            {/* Ghi chú & Lý do xuất kho thông thường */}
            {currentData.status !== "RELEASE_REJECTED" && (currentData.exportReason || currentData.note) && (
              <div className="wro-note-card">
                <Info size={18} />
                <div>
                  <strong>Mục đích xuất kho / Ghi chú:</strong>
                  <p>{currentData.exportReason || currentData.note}</p>
                </div>
              </div>
            )}

            {/* Vận chuyển & Lộ trình */}
            <div className="wro-info-grid">
              <div className="wro-info-card">
                <h4>Thông tin vận chuyển & Nhà xe</h4>
                <div className="wro-info-row">
                  <span>Đơn vị vận chuyển:</span>
                  <strong>{currentData.carrierName || "Chưa phân xe"}</strong>
                </div>
                <div className="wro-info-row">
                  <span>Tuyến vận chuyển:</span>
                  <strong className="text-primary">{currentData.shippingRoute || "Quảng Châu – Việt Nam"}</strong>
                </div>
                <div className="wro-info-row">
                  <span>Tài xế & SĐT:</span>
                  <strong>
                    {currentData.driverName || "--"} {currentData.driverPhone ? `(${currentData.driverPhone})` : ""}
                  </strong>
                </div>
                <div className="wro-info-row">
                  <span>Biển số xe:</span>
                  <span className="wro-code-pill">{currentData.vehicleNumber || "--"}</span>
                </div>
                <div className="wro-info-row">
                  <span>Mã vận đơn:</span>
                  <strong className="text-orange">{currentData.trackingNumber || currentData.wroCode}</strong>
                </div>
                <div className="wro-info-row">
                  <span>Vị trí kệ xuất:</span>
                  <span className="bin-code-pill">{currentData.shelfCode || "Kệ 1"}</span>
                </div>
                {currentData.handoverAt && (
                  <div className="wro-info-row">
                    <span>Thời gian bàn giao xe:</span>
                    <strong>{formatVietnamDateTime(currentData.handoverAt)}</strong>
                  </div>
                )}
                {currentData.handoverNotes && (
                  <div className="wro-info-row">
                    <span>Ghi chú bàn giao:</span>
                    <strong>{currentData.handoverNotes}</strong>
                  </div>
                )}
                {currentData.packingNotes && (
                  <div className="wro-info-row">
                    <span>Ghi chú đóng gói:</span>
                    <strong>{currentData.packingNotes}</strong>
                  </div>
                )}
              </div>

              {/* Điểm xuất & Điểm nhận */}
              <div className="wro-info-card">
                <h4>Kho xuất & Điểm giao nhận</h4>
                <div className="wro-info-row">
                  <span>Kho xuất phát:</span>
                  <strong>{currentData.warehouseName || "Kho Quảng Châu (Trung Quốc)"}</strong>
                </div>
                {currentData.warehouseAddress && (
                  <div className="wro-info-row">
                    <span>Địa chỉ kho:</span>
                    <strong style={{ fontSize: "11.5px" }}>{currentData.warehouseAddress}</strong>
                  </div>
                )}
                {currentData.warehouseContactPhone && (
                  <div className="wro-info-row">
                    <span>Hotline kho:</span>
                    <strong>{currentData.warehouseContactPhone}</strong>
                  </div>
                )}
                <div className="wro-info-row">
                  <span>Người nhận:</span>
                  <strong>{currentData.receiverName || currentData.consigneeName || "--"}</strong>
                </div>
                <div className="wro-info-row">
                  <span>SĐT nhận hàng:</span>
                  <strong>{currentData.receiverPhone || currentData.consigneePhone || "--"}</strong>
                </div>
                <div className="wro-info-row">
                  <span>Địa chỉ nhận:</span>
                  <strong>{currentData.deliveryAddress || currentData.receiverAddress || "--"}</strong>
                </div>
                <div className="wro-info-row">
                  <span>Thời gian tạo phiếu:</span>
                  <strong>{formatVietnamDateTime(currentData.createdAt)}</strong>
                </div>
                {currentData.createdByName && (
                  <div className="wro-info-row">
                    <span>Nhân viên tạo:</span>
                    <strong>{currentData.createdByName} {currentData.createdByUserRole ? `(${currentData.createdByUserRole})` : ""}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Ảnh chụp đóng gói thực tế */}
            {Array.isArray(currentData.packagingPhotos) && currentData.packagingPhotos.length > 0 && (
              <div className="wro-packaging-section">
                <h4>Hình ảnh đóng gói kiện hàng tại kho</h4>
                <div className="wro-packaging-grid">
                  {currentData.packagingPhotos.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="wro-photo-thumb">
                      <img src={url} alt={`Ảnh đóng gói ${idx + 1}`} />
                      <span className="wro-photo-zoom"><ExternalLink size={13} /> Phóng to</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Thông quan hải quan */}
            <div className="wro-customs-card">
              <div className="wro-customs-header">
                <ShieldCheck size={20} className={currentData.isCustomsCleared ? "text-green" : "text-amber"} />
                <div>
                  <h4>Hồ sơ thông quan hải quan</h4>
                  <span className={`wro-customs-tag ${currentData.isCustomsCleared ? "cleared" : "pending"}`}>
                    {currentData.customsStatusText || (currentData.isCustomsCleared ? "Đã thông quan" : "Chờ thông quan")}
                  </span>
                </div>
              </div>

              {Array.isArray(currentData.customsDocumentUrls) && currentData.customsDocumentUrls.length > 0 && (
                <div className="wro-docs-list">
                  <span>Chứng từ đính kèm:</span>
                  {currentData.customsDocumentUrls.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="wro-doc-link">
                      <FileText size={15} /> Xem hồ sơ hải quan #{idx + 1} <ExternalLink size={13} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Danh sách kiện hàng trong phiếu xuất */}
            <div className="wro-items-section">
              <div className="wro-items-header">
                <h4>Danh sách kiện hàng trong lô ({currentData.totalQuantity || currentData.items?.length || 0} kiện)</h4>
              </div>

              {Array.isArray(currentData.items) && currentData.items.length > 0 ? (
                <div className="wro-items-table-wrapper">
                  <table className="wro-items-table">
                    <thead>
                      <tr>
                        <th>Mã kiện</th>
                        <th>Mã đơn</th>
                        <th>Tên sản phẩm</th>
                        <th>Loại</th>
                        <th>SL</th>
                        <th>Cân nặng</th>
                        <th>Kích thước (cm)</th>
                        <th>Vị trí kho</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentData.items.map((it, idx) => (
                        <tr key={it.itemId || idx}>
                          <td>
                            <strong className="text-primary">{it.packageCode || "--"}</strong>
                          </td>
                          <td>
                            <span className="wro-order-code">{it.orderCode || currentData.orderCode || "--"}</span>
                          </td>
                          <td>{it.productName || "Hàng hóa tiêu chuẩn"}</td>
                          <td>
                            <span className="storage-badge consign">
                              {it.consignmentType === "Standard" ? "Tiêu chuẩn" : (it.consignmentType || "Tiêu chuẩn")}
                            </span>
                          </td>
                          <td>
                            <strong>{it.quantity || 1}</strong>
                          </td>
                          <td>
                            <span className="text-green font-semibold">
                              {it.actualWeight ? `${it.actualWeight} kg` : "--"}
                            </span>
                          </td>
                          <td>
                            {it.length && it.width && it.height
                              ? `${it.length} x ${it.width} x ${it.height}`
                              : "--"}
                          </td>
                          <td>
                            <span className="bin-code-pill">
                              {[it.zoneName, it.shelfCode, it.binCode].filter(Boolean).join(" · ") || "BIN-001"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="wro-no-items">
                  <p>Không có danh sách kiện hàng con đính kèm trong phiếu này.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export function XuatKhoKienHang() {
  const [wroList, setWroList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // ALL | BATCH | SINGLE | IN_TRANSIT | ARRIVED_IN_VN
  const [selectedWro, setSelectedWro] = useState(null);

  // Pagination
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const currentUser = useMemo(() => getStoredUserProfile(), []);

  /* Fetch WRO API Data */
  const fetchWroData = useCallback(async () => {
    let isMounted = true;
    try {
      setLoading(true);
      setError("");
      const response = await getWarehouseReleaseRequestsApi();
      const rawItems = Array.isArray(response?.data?.items)
        ? response.data.items
        : Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];

      // Lọc danh sách WRO đúng với tài khoản khách hàng đang đăng nhập
      const myWroList = rawItems.filter((item) => isWroBelongsToUser(item, currentUser));

      if (isMounted) {
        // Ưu tiên hiển thị danh sách của khách hàng, nếu không có khớp thì fallback hiển thị tất cả
        setWroList(myWroList.length > 0 ? myWroList : rawItems);
      }
    } catch (err) {
      console.error("Lỗi lấy dữ liệu xuất kho WRO:", err);
      if (isMounted) {
        setError("Không thể tải danh sách xuất kho. Vui lòng thử lại sau.");
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    fetchWroData();
  }, [fetchWroData]);

  /* Reset pagination when tab/search/pageSize changes */
  useEffect(() => {
    setPageNumber(1);
  }, [activeTab, search, pageSize]);

  /* Thống kê tổng quan */
  const totalWro = wroList.length;
  const batchCount = wroList.filter((w) => w.exportType === "BATCH").length;
  const singleCount = wroList.filter((w) => w.exportType === "SINGLE").length;
  const inTransitCount = wroList.filter(
    (w) => w.status === "IN_TRANSIT" || w.status === "HANDED_OVER" || w.status === "RELEASE_APPROVED"
  ).length;
  const arrivedVnCount = wroList.filter((w) => w.status === "ARRIVED_IN_VN").length;

  /* Filter Logic */
  const filteredWroList = useMemo(() => {
    let list = wroList;

    if (activeTab === "BATCH") {
      list = list.filter((w) => w.exportType === "BATCH");
    } else if (activeTab === "SINGLE") {
      list = list.filter((w) => w.exportType === "SINGLE");
    } else if (activeTab === "IN_TRANSIT") {
      list = list.filter(
        (w) => w.status === "IN_TRANSIT" || w.status === "HANDED_OVER" || w.status === "RELEASE_APPROVED"
      );
    } else if (activeTab === "ARRIVED_IN_VN") {
      list = list.filter((w) => w.status === "ARRIVED_IN_VN");
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (w) =>
          String(w.wroCode || "").toLowerCase().includes(q) ||
          String(w.exportBarcode || "").toLowerCase().includes(q) ||
          String(w.carrierName || "").toLowerCase().includes(q) ||
          String(w.shippingRoute || "").toLowerCase().includes(q) ||
          String(w.trackingNumber || "").toLowerCase().includes(q) ||
          String(w.vehicleNumber || "").toLowerCase().includes(q) ||
          String(w.orderCode || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [wroList, activeTab, search]);

  /* Phân trang */
  const totalFiltered = filteredWroList.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePageNumber = Math.min(pageNumber, totalPages);
  const startIndex = (safePageNumber - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);

  const paginatedWroList = useMemo(() => {
    return filteredWroList.slice(startIndex, endIndex);
  }, [filteredWroList, startIndex, endIndex]);

  return (
    <div className="vcl-export-page warehouse-tracking">
      <PageIntro
        eyebrow="QUẢN LÝ XUẤT KHO & VẬN CHUYỂN"
        title="Xuất kho & Vận chuyển"
        description="Theo dõi danh sách các phiếu xuất kho gom lô và xuất đơn lẻ, lộ trình vận chuyển từ kho quốc tế về Việt Nam."
        icon={Truck}
        action={
          <div className="warehouse-live">
            <span className="warehouse-live__dot" />
            <span>Tài khoản: {currentUser.fullName || "Khách hàng"}</span>
          </div>
        }
      />

      {/* Summary Cards */}
      <section className="warehouse-summary-grid">
        <SummaryCard
          icon={FileCheck2}
          label="Tổng phiếu xuất kho"
          value={`${totalWro} phiếu`}
          note={`Khách hàng: ${currentUser.fullName || "Phong"}`}
          tone="blue"
        />
        <SummaryCard
          icon={Boxes}
          label="Xuất gom lô"
          value={`${batchCount} lô hàng`}
          note="Gộp nhiều kiện theo chuyến"
          tone="purple"
        />
        <SummaryCard
          icon={Package}
          label="Xuất đơn lẻ"
          value={`${singleCount} phiếu đơn`}
          note="Xuất trực tiếp từng đơn"
          tone="green"
        />
        <SummaryCard
          icon={Truck}
          label="Đang chuyển / Về VN"
          value={`${inTransitCount} / ${arrivedVnCount}`}
          note="Tiến trình vận chuyển thực tế"
          tone="amber"
        />
      </section>

      {/* Filter Tabs & Search */}
      <div className="warehouse-storage-filter-bar">
        <div className="vcl-category-tabs">
          <button
            type="button"
            className={`vcl-category-tab ${activeTab === "ALL" ? "vcl-category-tab--active" : ""}`}
            onClick={() => setActiveTab("ALL")}
          >
            📋 Tất cả ({wroList.length})
          </button>
          <button
            type="button"
            className={`vcl-category-tab ${activeTab === "BATCH" ? "vcl-category-tab--active" : ""}`}
            onClick={() => setActiveTab("BATCH")}
          >
            📦 Xuất gom lô ({batchCount})
          </button>
          <button
            type="button"
            className={`vcl-category-tab ${activeTab === "SINGLE" ? "vcl-category-tab--active" : ""}`}
            onClick={() => setActiveTab("SINGLE")}
          >
            📦 Xuất đơn lẻ ({singleCount})
          </button>
          <button
            type="button"
            className={`vcl-category-tab ${activeTab === "IN_TRANSIT" ? "vcl-category-tab--active" : ""}`}
            onClick={() => setActiveTab("IN_TRANSIT")}
          >
            🚚 Đang vận chuyển ({inTransitCount})
          </button>
          <button
            type="button"
            className={`vcl-category-tab ${activeTab === "ARRIVED_IN_VN" ? "vcl-category-tab--active" : ""}`}
            onClick={() => setActiveTab("ARRIVED_IN_VN")}
          >
            🇻🇳 Đã đến Việt Nam ({arrivedVnCount})
          </button>
        </div>

        {/* Search */}
        <div className="warehouse-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Tìm mã phiếu xuất, mã vạch, nhà xe, biển số, mã đơn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content Section */}
      <div className="warehouse-storage-content">
        {loading && wroList.length === 0 && (
          <div className="warehouse-empty">
            <div className="wro-spinner" />
          </div>
        )}

        {error && !loading && (
          <div className="warehouse-empty">
            <strong>{error}</strong>
            <button type="button" className="warehouse-retry-btn" onClick={() => fetchWroData()}>
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && filteredWroList.length === 0 && (
          <div className="warehouse-empty">
            <Truck size={40} style={{ color: "#94a3b8", marginBottom: "10px" }} />
            <strong>Không có phiếu xuất kho nào phù hợp</strong>
            <p>Không tìm thấy phiếu xuất kho nào thuộc tài khoản của bạn trong mục này.</p>
          </div>
        )}

        {!loading && !error && filteredWroList.length > 0 && (
          <>
            <div className="wro-cards-grid">
              {paginatedWroList.map((wro) => {
                const isBatch = wro.exportType === "BATCH";
                const statusConfig = WRO_STATUS_MAP[wro.status] || {
                  label: wro.status,
                  tone: "neutral",
                };

                return (
                  <article key={wro.wroId} className="wro-item-card">
                    {/* Card Head */}
                    <div className="wro-card-head">
                      <div className="wro-card-tags">
                        <span className={`wro-type-pill ${isBatch ? "batch" : "single"}`}>
                          {isBatch ? "📦 Xuất gom lô" : "📦 Xuất đơn lẻ"}
                        </span>
                        <span className={`wro-status-badge ${statusConfig.tone}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <span className="wro-date">
                        {formatVietnamDateTime(wro.createdAt).split(" ")[0]}
                      </span>
                    </div>

                    {/* Codes */}
                    <div className="wro-card-codes">
                      <div className="code-row">
                        <span className="code-label">Mã phiếu xuất:</span>
                        <strong className="code-value wro">{wro.wroCode}</strong>
                      </div>
                      <div className="code-row">
                        <span className="code-label">Mã vạch:</span>
                        <strong className="code-value barcode">{wro.exportBarcode || "--"}</strong>
                      </div>
                      {wro.orderCode && (
                        <div className="code-row">
                          <span className="code-label">Mã đơn hàng:</span>
                          <strong className="code-value order">{wro.orderCode}</strong>
                        </div>
                      )}
                    </div>

                    {/* Shipping & Warehouse Route */}
                    <div className="wro-route-info">
                      <div className="route-row">
                        <Warehouse size={15} />
                        <span>Kho xuất: <strong>{wro.warehouseName || "Kho Quảng Châu (TQ)"}</strong></span>
                      </div>
                      <div className="route-row">
                        <Truck size={15} />
                        <span>Nhà xe: <strong>{wro.carrierName || "Đang phân xe"}</strong></span>
                      </div>
                      {wro.shippingRoute && (
                        <div className="route-row">
                          <MapPin size={15} />
                          <span>{wro.shippingRoute}</span>
                        </div>
                      )}
                    </div>

                    {/* Vehicle & Items Summary */}
                    <div className="wro-metrics-row">
                      <div className="metric-box">
                        <small>Số kiện</small>
                        <strong>{wro.totalQuantity || wro.items?.length || 0} kiện</strong>
                      </div>
                      <div className="metric-box">
                        <small>Biển số xe</small>
                        <strong>{wro.vehicleNumber || "--"}</strong>
                      </div>
                      <div className="metric-box">
                        <small>Thông quan</small>
                        <strong className={wro.isCustomsCleared ? "text-green" : "text-amber"}>
                          {wro.customsStatusText || (wro.isCustomsCleared ? "Đã thông quan" : "Chờ kiểm")}
                        </strong>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="wro-card-footer">
                      <div className="receiver-preview">
                        <User size={13} />
                        <span>Giao: {wro.receiverName || wro.consigneeName || "Người nhận"}</span>
                      </div>
                      <button
                        type="button"
                        className="view-detail-btn"
                        onClick={() => setSelectedWro(wro)}
                      >
                        <Eye size={14} /> Xem chi tiết <ChevronRight size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalFiltered > 0 && (
              <div className="warehouse-pagination-bar">
                <div className="pagination-summary">
                  Hiển thị <strong>{startIndex + 1} - {endIndex}</strong> trên tổng số <strong>{totalFiltered}</strong> phiếu xuất kho
                </div>

                <div className="pagination-actions">
                  <div className="page-size-selector">
                    <span>Hiển thị:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="page-size-select"
                    >
                      <option value={6}>6 phiếu / trang</option>
                      <option value={9}>9 phiếu / trang</option>
                      <option value={15}>15 phiếu / trang</option>
                      <option value={30}>30 phiếu / trang</option>
                    </select>
                  </div>

                  <div className="pagination-buttons">
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={safePageNumber <= 1}
                      onClick={() => setPageNumber(1)}
                      title="Trang đầu"
                    >
                      <ChevronsLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={safePageNumber <= 1}
                      onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                      title="Trang trước"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {/* Dynamic Page numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePageNumber) <= 1)
                      .map((p, idx, arr) => {
                        const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && <span className="pagination-ellipsis">...</span>}
                            <button
                              type="button"
                              className={`pagination-page-num ${p === safePageNumber ? "active" : ""}`}
                              onClick={() => setPageNumber(p)}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}

                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={safePageNumber >= totalPages}
                      onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                      title="Trang sau"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={safePageNumber >= totalPages}
                      onClick={() => setPageNumber(totalPages)}
                      title="Trang cuối"
                    >
                      <ChevronsRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Wro Detail Modal */}
      {selectedWro && (
        <WroDetailModal
          wroItem={selectedWro}
          onClose={() => setSelectedWro(null)}
        />
      )}
    </div>
  );
}

export default XuatKhoKienHang;
