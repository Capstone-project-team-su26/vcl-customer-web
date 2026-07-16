import React, {
    useEffect,
    useMemo,
    useState,
  } from "react";
  import {
    InfoCircleOutlined,
    LoadingOutlined,
  } from "@ant-design/icons";
  import {
    Popover,
  } from "antd";
  
  import {
    getRestrictedItemListApi,
  } from "../../../../api/RestrictedItem/restrictedItemApi";
  
  import "./FieldLabelTooltip.css";
  
  const normalizeText = (value) =>
    String(value ?? "").trim();
  
  const getRestrictedItemName = (item, index) => {
    if (
      typeof item === "string" ||
      typeof item === "number"
    ) {
      return String(item);
    }
  
    return normalizeText(
      item?.restrictedItemName ??
        item?.itemName ??
        item?.productName ??
        item?.name ??
        item?.label ??
        item?.title ??
        item?.code ??
        `Mặt hàng hạn chế ${index + 1}`
    );
  };
  
  const getRestrictedItemDescription = (item) => {
    if (!item || typeof item !== "object") {
      return "";
    }
  
    return normalizeText(
      item?.description ??
        item?.reason ??
        item?.note ??
        item?.restrictionReason ??
        item?.details ??
        ""
    );
  };
  
  export default function FieldLabelTooltip({
    label,
    required = false,
    placement = "top",
    className = "",
  }) {
    const [open, setOpen] = useState(false);
    const [restrictedItems, setRestrictedItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");
  
    const normalizedLabel = useMemo(
      () => normalizeText(label).toUpperCase(),
      [label]
    );
  
    // Chỉ TÊN SẢN PHẨM mới có icon và popup danh sách hạn chế.
    const showRestrictedItems =
      normalizedLabel === "TÊN SẢN PHẨM";
  
    useEffect(() => {
      if (
        !open ||
        !showRestrictedItems ||
        restrictedItems.length > 0
      ) {
        return undefined;
      }
  
      const controller = new AbortController();
  
      const loadRestrictedItems = async () => {
        try {
          setLoading(true);
          setLoadError("");
  
          const list = await getRestrictedItemListApi({
            signal: controller.signal,
          });
  
          if (!controller.signal.aborted) {
            setRestrictedItems(
              Array.isArray(list) ? list : []
            );
          }
        } catch (error) {
          const isCanceled =
            error?.code === "ERR_CANCELED" ||
            error?.name === "CanceledError" ||
            error?.name === "AbortError";
  
          if (!isCanceled && !controller.signal.aborted) {
            setLoadError(
              error?.response?.data?.message ||
                error?.message ||
                "Không thể tải danh sách hàng hóa hạn chế."
            );
          }
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
      };
  
      loadRestrictedItems();
  
      return () => controller.abort();
    }, [
      open,
      restrictedItems.length,
      showRestrictedItems,
    ]);
  
    const popupContent = (
      <div className="restricted-items-popover">
        <div className="restricted-items-popover__header">
          <InfoCircleOutlined />
  
          <div>
            <strong>HÀNG HÓA HẠN CHẾ</strong>
            <span>
              Kiểm tra trước khi nhập tên sản phẩm
            </span>
          </div>
        </div>
  
        {loading ? (
          <div className="restricted-items-popover__state">
            <LoadingOutlined spin />
            <span>Đang tải danh sách...</span>
          </div>
        ) : loadError ? (
          <div className="restricted-items-popover__error">
            {loadError}
          </div>
        ) : restrictedItems.length > 0 ? (
          <div className="restricted-items-popover__list">
            {restrictedItems.map((item, index) => {
              const name = getRestrictedItemName(
                item,
                index
              );
  
              const description =
                getRestrictedItemDescription(item);
  
              return (
                <div
                  key={
                    item?.restrictedItemId ??
                    item?.id ??
                    item?.code ??
                    `${name}-${index}`
                  }
                  className="restricted-items-popover__item"
                >
                  <span className="restricted-items-popover__index">
                    {index + 1}
                  </span>
  
                  <div className="restricted-items-popover__item-content">
                    <strong>{name}</strong>
  
                    {description && (
                      <p>{description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="restricted-items-popover__empty">
            Chưa có dữ liệu hàng hóa hạn chế.
          </div>
        )}
  
        <div className="restricted-items-popover__footer">
          Không tạo yêu cầu với mặt hàng nằm trong danh sách hạn chế.
        </div>
      </div>
    );
  
    return (
      <div
        className={[
          "field-label-tooltip-row",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <label className="field-label field-label-tooltip-text">
          <span>{label}</span>
  
          {required && (
            <span
              className="field-label-required-star"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </label>
  
        {showRestrictedItems && (
          <Popover
            content={popupContent}
            placement={placement}
            trigger="click"
            open={open}
            onOpenChange={setOpen}
            overlayClassName="restricted-items-popover-overlay"
          >
            <button
              type="button"
              className="field-label-tooltip-button"
              aria-label="Xem danh sách hàng hóa hạn chế"
              aria-expanded={open}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <InfoCircleOutlined />
            </button>
          </Popover>
        )}
      </div>
    );
  }