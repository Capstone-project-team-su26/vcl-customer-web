import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  InfoCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
  WarningOutlined,
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

const isCanceledRequest = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

const getRestrictedItemName = (
  item,
  index
) => {
  if (
    typeof item === "string" ||
    typeof item === "number"
  ) {
    return normalizeText(item);
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

const getRestrictedItemDescription = (
  item
) => {
  if (
    !item ||
    typeof item !== "object"
  ) {
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

const getRestrictedItemKey = (
  item,
  index,
  name
) => {
  if (
    item &&
    typeof item === "object"
  ) {
    return (
      item.restrictedItemId ??
      item.id ??
      item.code ??
      `${name}-${index}`
    );
  }

  return `${name}-${index}`;
};

export default function FieldLabelTooltip({
  
  label,
  required = false,
  placement = "bottomLeft",
  className = "",
}) {
  const [open, setOpen] =
    useState(false);
    const controllerRef = useRef(null);
    const requestRunningRef = useRef(false);
  const [restrictedItems, setRestrictedItems] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [loadError, setLoadError] =
    useState("");

  const [hasLoaded, setHasLoaded] =
    useState(false);

  const normalizedLabel = useMemo(() => {
    if (typeof label !== "string") {
      return "";
    }

    return normalizeText(label).toUpperCase();
  }, [label]);

 
  const showRestrictedItems =
    normalizedLabel === "TÊN SẢN PHẨM";

    const loadRestrictedItems = useCallback(async () => {
      if (requestRunningRef.current) {
        return;
      }
    
      controllerRef.current?.abort();
    
      const controller = new AbortController();
    
      controllerRef.current = controller;
      requestRunningRef.current = true;
    
      try {
        setLoading(true);
        setLoadError("");
    
        const list = await getRestrictedItemListApi({
          signal: controller.signal,
        });
    
        if (controller.signal.aborted) {
          return;
        }
    
        setRestrictedItems(
          Array.isArray(list)
            ? list.filter(Boolean)
            : []
        );
    
        setHasLoaded(true);
      } catch (error) {
        const isCanceled =
          error?.code === "ERR_CANCELED" ||
          error?.name === "CanceledError" ||
          error?.name === "AbortError";
    
        if (
          isCanceled ||
          controller.signal.aborted
        ) {
          return;
        }
    
        const responseData =
          error?.response?.data;
    
        setLoadError(
          typeof responseData === "string"
            ? responseData
            : responseData?.message ||
                responseData?.title ||
                error?.message ||
                "Không thể tải danh sách hàng hóa hạn chế."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
    
        requestRunningRef.current = false;
      }
    }, []);

    useEffect(() => {
      if (
        !open ||
        !showRestrictedItems ||
        hasLoaded
      ) {
        return;
      }
    
      loadRestrictedItems();
    }, [
      open,
      showRestrictedItems,
      hasLoaded,
      loadRestrictedItems,
    ]);

    const handleRetry = () => {
      controllerRef.current?.abort();
    
      requestRunningRef.current = false;
    
      setRestrictedItems([]);
      setLoadError("");
      setHasLoaded(false);
    
      loadRestrictedItems();
    };

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);
  const popupContent = (
    <div className="restricted-items-popover">
      <div className="restricted-items-popover__header">
        <div className="restricted-items-popover__header-icon">
          <WarningOutlined />
        </div>

        <div className="restricted-items-popover__header-content">
          <strong>
            HÀNG HÓA HẠN CHẾ
          </strong>

          <span>
            Kiểm tra trước khi nhập tên sản phẩm
          </span>
        </div>

        {!loading &&
          !loadError &&
          hasLoaded && (
            <span className="restricted-items-popover__count">
              {restrictedItems.length}
            </span>
          )}
      </div>

      <div className="restricted-items-popover__body">
        {loading ? (
          <div className="restricted-items-popover__state">
            <LoadingOutlined spin />

            <span>
              Đang tải danh sách...
            </span>
          </div>
        ) : loadError ? (
          <div className="restricted-items-popover__error">
            <InfoCircleOutlined />

            <p>{loadError}</p>

            <button
              type="button"
              className="restricted-items-popover__retry"
              onClick={handleRetry}
            >
              <ReloadOutlined />
              Tải lại
            </button>
          </div>
        ) : restrictedItems.length > 0 ? (
          <div className="restricted-items-popover__list">
            {restrictedItems.map(
              (item, index) => {
                const name =
                  getRestrictedItemName(
                    item,
                    index
                  );

                const description =
                  getRestrictedItemDescription(
                    item
                  );

                return (
                  <div
                    key={getRestrictedItemKey(
                      item,
                      index,
                      name
                    )}
                    className="restricted-items-popover__item"
                  >
                    <span className="restricted-items-popover__index">
                      {index + 1}
                    </span>

                    <div className="restricted-items-popover__item-content">
                      <strong>
                        {name}
                      </strong>

                      {description && (
                        <p>
                          {description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        ) : (
          <div className="restricted-items-popover__empty">
            <InfoCircleOutlined />

            <span>
              Chưa có dữ liệu hàng hóa hạn chế.
            </span>
          </div>
        )}
      </div>

      <div className="restricted-items-popover__footer">
        <WarningOutlined />

        <span>
          Không tạo yêu cầu với mặt hàng nằm trong danh sách hạn chế.
        </span>
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
          zIndex={10050}
        >
          <button
            type="button"
            className="field-label-tooltip-button"
            aria-label="Xem danh sách hàng hóa hạn chế"
            aria-expanded={open}
          >
            <InfoCircleOutlined />
          </button>
        </Popover>
      )}
    </div>
  );
}
