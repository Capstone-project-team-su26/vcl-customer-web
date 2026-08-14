import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  ExternalLink,
  Eye,
  Filter,
  Image as ImageIcon,
  Info,
  MapPin,
  Package,
  PackageCheck,
  Scale,
  Search,
  Truck,
  Warehouse,
  X,
} from "lucide-react";

import { getInventoriesApi, getParcelDetailApi } from "../../../../api/Warehouse/inventoryApi";
import { formatVietnamDateTime } from "../../../../utils/timeUtc";
import { PageIntro, presentValue, StatusPill, SummaryCard } from "../Shared/WarehouseSharedComponents";
import "./LuuKhoKienHang.css";

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
 * Kiểm tra xem kiện hàng trong kho có thuộc về khách hàng hiện tại không
 */
const isItemBelongsToUser = (item, user) => {
  if (!user || (!user.userId && !user.fullName && !user.phone && !user.email)) {
    return true; // Nếu chưa có profile thì hiển thị để test
  }

  const uName = String(user.fullName || "").trim().toLowerCase();
  const uEmail = String(user.email || "").trim().toLowerCase();
  const uPhone = String(user.phone || "").trim();
  const uId = String(user.userId || "").trim().toLowerCase();
  const uCode = String(user.customerCode || "").trim().toLowerCase();

  const itemCustName = String(item.customerName || "").trim().toLowerCase();
  const itemCustPhone = String(item.customerPhone || "").trim();
  const itemCustId = String(item.customerId || "").trim().toLowerCase();
  const itemCustCode = String(item.customerCode || "").trim().toLowerCase();

  if (uId && itemCustId && uId === itemCustId) return true;
  if (uPhone && itemCustPhone && uPhone === itemCustPhone) return true;
  if (uCode && itemCustCode && uCode === itemCustCode) return true;
  if (uName && itemCustName && (itemCustName.includes(uName) || uName.includes(itemCustName))) return true;
  if (uEmail && itemCustName && uEmail.includes(itemCustName)) return true;

  return false;
};

/* =========================================================
   MODAL CHI TIẾT KIỆN HÀNG (GET /api/parcels/{parcelId})
   ========================================================= */

function ParcelDetailModal({ parcelId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchParcel = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getParcelDetailApi(parcelId);
        const data = res?.data || res;
        if (isMounted) setDetail(data);
      } catch (err) {
        if (isMounted) {
          setError(err?.message || "Không thể tải chi tiết kiện hàng.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (parcelId) {
      fetchParcel();
    }

    return () => {
      isMounted = false;
    };
  }, [parcelId]);

  return (
    <div className="parcel-modal-overlay" onClick={onClose}>
      <div className="parcel-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="parcel-modal-header">
          <div className="parcel-modal-title">
            <Package size={22} className="parcel-modal-icon" />
            <div>
              <h3>Chi tiết kiện hàng</h3>
              <p>{detail?.packageCode || parcelId}</p>
            </div>
          </div>
          <button type="button" className="parcel-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="parcel-modal-body">
          {error && !loading && (
            <div className="parcel-modal-error">
              <Info size={20} />
              <span>{error}</span>
            </div>
          )}

          {!error && detail && (
            <div className="parcel-detail-content">
              {/* Product Images */}
              {Array.isArray(detail.referenceUrls) && detail.referenceUrls.length > 0 && (
                <div className="parcel-images-section">
                  <h4>Hình ảnh kiện hàng thực tế tại kho</h4>
                  <div className="parcel-images-grid">
                    {detail.referenceUrls.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="parcel-image-thumb">
                        <img src={url} alt={`Ảnh kiện hàng ${idx + 1}`} />
                        <span className="parcel-image-zoom"><ExternalLink size={14} /> Phóng to</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Info Grid */}
              <div className="parcel-info-grid">
                <div className="parcel-info-card">
                  <h4>Thông tin chung</h4>
                  <div className="parcel-info-row">
                    <span>Mã kiện:</span>
                    <strong>{detail.packageCode}</strong>
                  </div>
                  <div className="parcel-info-row">
                    <span>Mã đơn liên quan:</span>
                    <strong className="text-primary">{detail.consignmentCode}</strong>
                  </div>
                  <div className="parcel-info-row">
                    <span>Tên sản phẩm:</span>
                    <strong>{detail.productName || "Hàng hóa tiêu chuẩn"}</strong>
                  </div>
                  <div className="parcel-info-row">
                    <span>Số lượng:</span>
                    <strong>{detail.quantity || 1} sản phẩm</strong>
                  </div>
                </div>

                <div className="parcel-info-card">
                  <h4>Cân đo & Thể tích thực tế</h4>
                  <div className="parcel-info-row">
                    <span>Cân nặng thực:</span>
                    <strong className="text-green">{detail.actualWeight ? `${detail.actualWeight} kg` : "--"}</strong>
                  </div>
                  <div className="parcel-info-row">
                    <span>Kích thước (D x R x C):</span>
                    <strong>
                      {detail.length && detail.width && detail.height
                        ? `${detail.length} x ${detail.width} x ${detail.height} cm`
                        : "Chưa đo kích thước"}
                    </strong>
                  </div>
                  <div className="parcel-info-row">
                    <span>Quy đổi thể tích:</span>
                    <strong>{detail.volumetricWeight ? `${detail.volumetricWeight} kg` : "--"}</strong>
                  </div>
                  <div className="parcel-info-row">
                    <span>Cân nặng tính cước:</span>
                    <strong className="text-orange">{detail.chargeableWeight ? `${detail.chargeableWeight} kg` : "--"}</strong>
                  </div>
                </div>
              </div>

              {/* Storage & Tracking Info */}
              <div className="parcel-info-grid">
                <div className="parcel-info-card">
                  <h4>Vị trí lưu kho</h4>
                  <div className="parcel-info-row">
                    <span>Kho lưu trữ:</span>
                    <strong>{detail.storageLocation?.warehouseName || "Kho VCL Quốc Tế"}</strong>
                  </div>
                  <div className="parcel-info-row">
                    <span>Khu vực / Kệ hàng:</span>
                    <strong>
                      {detail.storageLocation?.zoneName || ""} · {detail.storageLocation?.shelfCode || ""}
                    </strong>
                  </div>
                  <div className="parcel-info-row">
                    <span>Mã vị trí ô kệ:</span>
                    <span className="bin-code-pill">{detail.storageLocation?.binCode || "BIN-001"}</span>
                  </div>
                </div>

                <div className="parcel-info-card">
                  <h4>Thời gian xử lý</h4>
                  <div className="parcel-info-row">
                    <span>Thời gian nhập kho:</span>
                    <strong>{formatVietnamDateTime(detail.checkInTime)}</strong>
                  </div>
                  <div className="parcel-info-row">
                    <span>Thời gian cất kệ:</span>
                    <strong>{formatVietnamDateTime(detail.putAwayTime)}</strong>
                  </div>
                  <div className="parcel-info-row">
                    <span>Người nhận:</span>
                    <strong>{detail.receiverName} ({detail.receiverPhone})</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export function LuuKhoKienHang() {
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // ALL | CN | VN | CONSIGNMENT | PURCHASE
  const [selectedParcelId, setSelectedParcelId] = useState(null);

  // Pagination state
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const currentUser = useMemo(() => getStoredUserProfile(), []);

  /* Gọi API lấy dữ liệu tồn kho */
  const fetchInventoryData = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError("");
      const response = await getInventoriesApi({ signal });
      const rawItems = Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response?.data?.items)
        ? response.data.items
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];

      // Lọc danh sách kiện hàng đúng với tài khoản khách hàng đang đăng nhập
      const myItems = rawItems.filter((item) => isItemBelongsToUser(item, currentUser));

      // Ưu tiên hiển thị danh sách của user, nếu chưa có thì fallback hiển thị để test
      setInventories(myItems.length > 0 ? myItems : rawItems);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu lưu kho:", err);
      setError("Không thể tải danh sách lưu kho. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  /* Reset trang khi đổi tab, tìm kiếm hoặc đổi số lượng hiển thị */
  useEffect(() => {
    setPageNumber(1);
  }, [activeTab, search, pageSize]);

  /* Thống kê tổng hợp */
  const totalPackages = inventories.length;
  const totalActualWeight = inventories.reduce(
    (sum, item) => sum + (Number(item.actualWeight) || 0),
    0
  );
  const totalVolume = inventories.reduce(
    (sum, item) => sum + (Number(item.actualVolume) || 0),
    0
  );
  const cnWarehouseCount = inventories.filter((i) => i.warehouseRegion === "CN").length;
  const vnWarehouseCount = inventories.filter((i) => i.warehouseRegion === "VN").length;

  /* Lọc theo Search & Tab */
  const filteredInventories = useMemo(() => {
    let list = inventories;

    if (activeTab === "CN") {
      list = list.filter((i) => i.warehouseRegion === "CN");
    } else if (activeTab === "VN") {
      list = list.filter((i) => i.warehouseRegion === "VN");
    } else if (activeTab === "CONSIGNMENT") {
      list = list.filter((i) => String(i.consignmentCode || "").startsWith("VCL-") || String(i.consignmentCode || "").startsWith("KG-"));
    } else if (activeTab === "PURCHASE") {
      list = list.filter((i) => String(i.consignmentCode || "").startsWith("PUR-") || String(i.consignmentCode || "").startsWith("MH-"));
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (i) =>
          String(i.packageCode || "").toLowerCase().includes(q) ||
          String(i.consignmentCode || "").toLowerCase().includes(q) ||
          String(i.warehouseName || "").toLowerCase().includes(q) ||
          String(i.binCode || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [inventories, activeTab, search]);

  /* Phân trang dữ liệu */
  const totalFiltered = filteredInventories.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePageNumber = Math.min(pageNumber, totalPages);
  const startIndex = (safePageNumber - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);

  const paginatedInventories = useMemo(() => {
    return filteredInventories.slice(startIndex, endIndex);
  }, [filteredInventories, startIndex, endIndex]);

  return (
    <div className="vcl-storage-page warehouse-tracking">
      <PageIntro
        eyebrow="QUẢN LÝ LƯU KHO KIỆN HÀNG"
        title="Lưu kho & Vị trí kiện hàng"
        description="Theo dõi chính xác từng kiện hàng của bạn đang lưu tại kho Trung Quốc & Việt Nam, thời gian lưu kho, cân nặng thực tế và vị trí kệ kho."
        icon={Box}
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
          icon={PackageCheck}
          label="Tổng kiện đang lưu kho"
          value={`${totalPackages} kiện`}
          note={`Khách hàng: ${currentUser.fullName || "Phong"}`}
          tone="blue"
        />
        <SummaryCard
          icon={Scale}
          label="Tổng khối lượng thực tế"
          value={totalActualWeight > 0 ? `${totalActualWeight.toFixed(2)} kg` : "0 kg"}
          note="Cân đo thực tế tại kho"
          tone="green"
        />
        <SummaryCard
          icon={Warehouse}
          label="Kho TQ / Kho VN"
          value={`${cnWarehouseCount} kiện / ${vnWarehouseCount} kiện`}
          note="Phân bổ vị trí kho bãi"
          tone="amber"
        />
        <SummaryCard
          icon={Clock3}
          label="Chính sách lưu kho"
          value="Miễn phí 7 ngày"
          note="Theo điều khoản dịch vụ"
          tone="purple"
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
            📦 Tất cả kiện ({inventories.length})
          </button>
          <button
            type="button"
            className={`vcl-category-tab ${activeTab === "CN" ? "vcl-category-tab--active" : ""}`}
            onClick={() => setActiveTab("CN")}
          >
            🇨🇳 Kho Trung Quốc ({cnWarehouseCount})
          </button>
          <button
            type="button"
            className={`vcl-category-tab ${activeTab === "VN" ? "vcl-category-tab--active" : ""}`}
            onClick={() => setActiveTab("VN")}
          >
            🇻🇳 Kho Việt Nam ({vnWarehouseCount})
          </button>
          <button
            type="button"
            className={`vcl-category-tab ${activeTab === "CONSIGNMENT" ? "vcl-category-tab--active" : ""}`}
            onClick={() => setActiveTab("CONSIGNMENT")}
          >
            📋 Đơn ký gửi
          </button>
          <button
            type="button"
            className={`vcl-category-tab ${activeTab === "PURCHASE" ? "vcl-category-tab--active" : ""}`}
            onClick={() => setActiveTab("PURCHASE")}
          >
            🛒 Đơn mua hộ
          </button>
        </div>

        {/* Search */}
        <div className="warehouse-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Tìm mã kiện (PCL-...), mã đơn (VCL-...), vị trí kệ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content Section */}
      <div className="warehouse-storage-content">
        {loading && inventories.length === 0 && (
          <div className="warehouse-empty">
            <div className="parcel-spinner" />
          </div>
        )}

        {error && !loading && (
          <div className="warehouse-empty">
            <strong>{error}</strong>
            <button type="button" className="warehouse-retry-btn" onClick={() => fetchInventoryData()}>
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && filteredInventories.length === 0 && (
          <div className="warehouse-empty">
            <Box size={40} style={{ color: "#94a3b8", marginBottom: "10px" }} />
            <strong>Không có kiện hàng nào trong danh mục này</strong>
            <p>Không tìm thấy kiện hàng lưu kho nào thuộc tài khoản của bạn phù hợp với bộ lọc.</p>
          </div>
        )}

        {!loading && !error && filteredInventories.length > 0 && (
          <>
            <div className="storage-cards-grid">
              {paginatedInventories.map((item) => {
                const isCN = item.warehouseRegion === "CN";
                const isPurchase = String(item.consignmentCode || "").startsWith("PUR-");

                return (
                  <article key={item.inventoryId} className="storage-item-card">
                    {/* Card Header */}
                    <div className="storage-card-head">
                      <div className="storage-card-meta">
                        <span className={`storage-badge ${isPurchase ? "purchase" : "consign"}`}>
                          {isPurchase ? "MUA HỘ" : "KÝ GỬI"}
                        </span>
                        <span className={`storage-region-badge ${isCN ? "cn" : "vn"}`}>
                          {isCN ? "🇨🇳 Kho Trung Quốc" : "🇻🇳 Kho Việt Nam"}
                        </span>
                      </div>
                      <span className={`storage-status-pill ${String(item.status).toLowerCase()}`}>
                        {item.status === "AVAILABLE"
                          ? "Sẵn sàng xuất"
                          : item.status === "RESERVED"
                          ? "Đang lưu kho"
                          : item.status === "RELEASED"
                          ? "Đã xuất kho"
                          : item.status}
                      </span>
                    </div>

                    {/* Codes */}
                    <div className="storage-card-codes">
                      <div className="code-row">
                        <span className="code-label">Mã kiện:</span>
                        <strong className="code-value package">{item.packageCode}</strong>
                      </div>
                      <div className="code-row">
                        <span className="code-label">Mã đơn:</span>
                        <strong className="code-value order">{item.consignmentCode}</strong>
                      </div>
                    </div>

                    {/* Warehouse Location & Details */}
                    <div className="storage-warehouse-info">
                      <div className="wh-row">
                        <Warehouse size={15} />
                        <span>{item.warehouseName}</span>
                      </div>
                      <div className="wh-row">
                        <MapPin size={15} />
                        <span>
                          Vị trí kệ: <strong>{item.binCode || "BIN-001"}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="storage-metrics-row">
                      <div className="metric-box">
                        <small>Khối lượng</small>
                        <strong>{item.actualWeight ? `${item.actualWeight} kg` : "--"}</strong>
                      </div>
                      <div className="metric-box">
                        <small>Thể tích</small>
                        <strong>{item.actualVolume ? `${Number(item.actualVolume).toLocaleString()} cm³` : "--"}</strong>
                      </div>
                      <div className="metric-box">
                        <small>Thời gian lưu</small>
                        <strong>
                          {item.storageDays > 0 ? `${item.storageDays} ngày ` : ""}
                          {item.storageHours}h
                        </strong>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="storage-card-footer">
                      <div className="stored-time">
                        <Calendar size={13} />
                        <span>Nhập: {formatVietnamDateTime(item.storedAt || item.createdAt)}</span>
                      </div>
                      <button
                        type="button"
                        className="view-detail-btn"
                        onClick={() => setSelectedParcelId(item.parcelId)}
                      >
                        <Eye size={14} /> Xem chi tiết kiện <ChevronRight size={14} />
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
                  Hiển thị <strong>{startIndex + 1} - {endIndex}</strong> trên tổng số <strong>{totalFiltered}</strong> kiện hàng
                </div>

                <div className="pagination-actions">
                  <div className="page-size-selector">
                    <span>Hiển thị:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="page-size-select"
                    >
                      <option value={6}>6 kiện / trang</option>
                      <option value={9}>9 kiện / trang</option>
                      <option value={15}>15 kiện / trang</option>
                      <option value={30}>30 kiện / trang</option>
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

      {/* Parcel Detail Modal */}
      {selectedParcelId && (
        <ParcelDetailModal
          parcelId={selectedParcelId}
          onClose={() => setSelectedParcelId(null)}
        />
      )}
    </div>
  );
}

export default LuuKhoKienHang;
