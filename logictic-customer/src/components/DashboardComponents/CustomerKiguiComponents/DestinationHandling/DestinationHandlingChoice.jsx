import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Tooltip } from "antd";
import {
  InfoCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";

import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";

import { getStorageFeeEstimateApi } from "../../../../api/OrderApi/consignmentApi";

import "./DestinationHandlingChoice.css";

export const DIRECT_DELIVERY =
  "DIRECT_DELIVERY";
export const STORE_AT_VN = "STORE_AT_VN";

const OPTIONS = [
  {
    value: DIRECT_DELIVERY,
    icon: LocalShippingOutlinedIcon,
    title: "Giao ngay khi về Việt Nam",
    description:
      "Kho kiểm đếm xong là đẩy sang giao luôn tới địa chỉ người nhận. Không phát sinh phí lưu kho.",
    hint: "Phù hợp khi bạn cần hàng gấp và đã sẵn sàng nhận.",
  },
  {
    value: STORE_AT_VN,
    icon: Inventory2OutlinedIcon,
    title: "Gửi lại kho Việt Nam",
    description:
      "Hàng được xếp kệ tại kho VN, bạn hẹn ngày đến lấy hoặc yêu cầu giao sau.",
    hint: "Phù hợp khi bạn chưa sắp xếp được người nhận.",
  },
];

const formatMoney = (
  amount,
  currency = "VND"
) => {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return "-";
  }

  const formatted =
    value.toLocaleString("vi-VN");

  return currency === "VND"
    ? `${formatted}đ`
    : `${formatted} ${currency}`;
};

/**
 * Khách chọn hàng về Việt Nam thì giao ngay hay gửi lại kho.
 *
 * Chọn gửi lại kho thì mở bảng phí để khách thấy trước con số, tránh cảnh tới lúc lấy hàng
 * mới biết mình nợ tiền lưu kho. Bảng phí lấy thẳng từ BE nên khớp với hoá đơn sau này.
 *
 * Đây là NGUYỆN VỌNG chứ không phải chốt cứng: lúc hàng về khách vẫn gọi đổi ý được.
 *
 * @param {object} props
 * @param {"DIRECT_DELIVERY" | "STORE_AT_VN" | ""} props.value
 * @param {(next: string) => void} props.onChange
 * @param {boolean} [props.disabled]
 */
export default function DestinationHandlingChoice({
  value = "",
  onChange,
  disabled = false,
}) {
  const [estimate, setEstimate] =
    useState(null);
  const [isLoading, setIsLoading] =
    useState(false);
  const [loadError, setLoadError] =
    useState("");

  const isStoring = value === STORE_AT_VN;

  // Chỉ gọi API khi khách thật sự quan tâm tới phí — không tải sẵn cho mọi đơn.
  useEffect(() => {
    if (!isStoring || estimate) {
      return undefined;
    }

    const controller =
      new AbortController();

    const loadEstimate = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const response =
          await getStorageFeeEstimateApi({
            signal: controller.signal,
          });

        setEstimate(
          response?.data ?? response ?? null
        );
      } catch (error) {
        if (
          error?.name !== "CanceledError" &&
          error?.code !== "ERR_CANCELED"
        ) {
          setLoadError(
            "Chưa tải được bảng phí lưu kho. Bạn vẫn chọn được, nhân viên sẽ báo phí sau."
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadEstimate();

    return () => controller.abort();
  }, [isStoring, estimate]);

  const samples = useMemo(
    () =>
      Array.isArray(estimate?.samples)
        ? estimate.samples
        : [],
    [estimate]
  );

  const handleSelect = (next) => {
    if (disabled) {
      return;
    }

    // Bấm lại lựa chọn đang chọn thì bỏ chọn, quay về "chưa quyết định".
    onChange?.(next === value ? "" : next);
  };

  return (
    <div className="destination-handling">
      <div className="destination-handling__header">
        <span className="destination-handling__eyebrow">
          KHI HÀNG VỀ VIỆT NAM
        </span>

        <Tooltip
          placement="top"
          title="Bạn chọn trước để kho chuẩn bị. Nếu đổi ý, gọi cho nhân viên kinh doanh trước khi hàng về là được."
        >
          <InfoCircleOutlined className="destination-handling__info-icon" />
        </Tooltip>
      </div>

      <p className="destination-handling__description">
        Chọn cách xử lý khi lô hàng cập kho
        Việt Nam. Bỏ trống cũng được — mặc
        định chúng tôi sẽ giao ngay.
      </p>

      <div className="destination-handling__options">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const checked =
            value === option.value;

          return (
            <div
              key={option.value}
              role="radio"
              tabIndex={disabled ? -1 : 0}
              aria-checked={checked}
              aria-disabled={disabled}
              className={[
                "destination-handling__option",
                checked &&
                  "destination-handling__option--selected",
                disabled &&
                  "destination-handling__option--disabled",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() =>
                handleSelect(option.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();
                  handleSelect(option.value);
                }
              }}
            >
              <span
                className="destination-handling__option-icon"
                aria-hidden="true"
              >
                <Icon />
              </span>

              <span className="destination-handling__option-body">
                <strong className="destination-handling__option-title">
                  {option.title}
                </strong>

                <span className="destination-handling__option-desc">
                  {option.description}
                </span>

                <span className="destination-handling__option-hint">
                  {option.hint}
                </span>
              </span>

              <span
                className="destination-handling__radio"
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>

      {isStoring && (
        <div className="destination-handling__fee">
          <div className="destination-handling__fee-header">
            <strong>
              Phí lưu kho ước tính
            </strong>

            {isLoading && (
              <span className="destination-handling__fee-loading">
                <LoadingOutlined />
                Đang tải bảng phí…
              </span>
            )}
          </div>

          {loadError && (
            <p className="destination-handling__fee-error">
              {loadError}
            </p>
          )}

          {estimate && (
            <>
              <div className="destination-handling__fee-formula">
                <span className="destination-handling__fee-step">
                  <span className="destination-handling__fee-step-label">
                    Miễn phí
                  </span>
                  <b>
                    {estimate.freeDays} ngày
                  </b>
                </span>

                <span className="destination-handling__fee-plus">
                  +
                </span>

                <span className="destination-handling__fee-step">
                  <span className="destination-handling__fee-step-label">
                    Ân hạn
                  </span>
                  <b>
                    {estimate.graceDays} ngày
                  </b>
                </span>

                <span className="destination-handling__fee-plus">
                  →
                </span>

                <span className="destination-handling__fee-step destination-handling__fee-step--total">
                  <span className="destination-handling__fee-step-label">
                    Bắt đầu tính phí từ ngày
                  </span>
                  <b>
                    {(estimate.totalFreeDays ??
                      0) + 1}
                  </b>
                </span>

                <span className="destination-handling__fee-plus">
                  ·
                </span>

                <span className="destination-handling__fee-step destination-handling__fee-step--price">
                  <span className="destination-handling__fee-step-label">
                    Đơn giá
                  </span>
                  <b>
                    {formatMoney(
                      estimate.unitPrice,
                      estimate.currency
                    )}
                    /kiện/ngày
                  </b>
                </span>
              </div>

              {samples.length > 0 && (
                <div className="destination-handling__fee-table">
                  <div className="destination-handling__fee-row destination-handling__fee-row--head">
                    <span>Gửi kho</span>
                    <span>Ngày tính phí</span>
                    <span>Phí mỗi kiện</span>
                  </div>

                  {samples.map((sample) => (
                    <div
                      key={sample.days}
                      className="destination-handling__fee-row"
                    >
                      <span>
                        {sample.days} ngày
                      </span>
                      <span>
                        {
                          sample.chargeableDays
                        }{" "}
                        ngày
                      </span>
                      <b>
                        {formatMoney(
                          sample.amountPerParcel,
                          estimate.currency
                        )}
                      </b>
                    </div>
                  ))}
                </div>
              )}

              <p className="destination-handling__fee-note">
                {estimate.note}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
