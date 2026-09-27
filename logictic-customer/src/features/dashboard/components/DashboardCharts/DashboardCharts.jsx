/**
 * BIỂU ĐỒ THỐNG KÊ CỦA KHÁCH — Chart.js.
 *
 * Chỉ hai biểu đồ, mỗi cái trả lời một câu khách thật sự hỏi:
 *   ① "Mấy tháng nay tôi tiêu bao nhiêu?"  → cột theo tháng
 *   ② "Tiền của tôi đi đâu?"               → thanh chồng cước / dịch vụ / thuế
 *
 * KHÔNG vẽ lại "Hàng đang chạy" thành biểu đồ. Sáu con số đó đã là một dải thẻ số ngay
 * bên trên; vẽ thêm một biểu đồ cho cùng bộ số chỉ là nói hai lần cùng một chuyện.
 *
 * Số liệu do BACKEND trả (`stats` trong /api/customers/me/dashboard). Component này không
 * cộng trừ gì — cùng nguyên tắc với bảng kê chi phí: một nguồn tính tiền duy nhất.
 *
 * MÀU: lấy từ bảng màu đã kiểm bằng máy (validate_palette). Ba màu dùng cho biểu đồ ②
 * đạt toàn bộ ngưỡng ở cả nền sáng lẫn nền tối, trừ một cảnh báo: màu xanh ngọc có độ
 * tương phản 2,74:1 trên nền sáng (< 3:1). Cách bù theo đúng quy định là **nhãn hiện rõ**
 * — nên mỗi phần của thanh chồng đều có nhãn chữ bên dưới, không bắt người đọc dò màu.
 *
 * Ứng dụng khách hiện CHỈ có chế độ sáng (không chỗ nào khai prefers-color-scheme), nên ở
 * đây cố tình không khai màu cho nền tối: khai vào thì máy đang để chế độ tối sẽ vẽ biểu
 * đồ tối lọt thỏm giữa một trang sáng. Khi nào ứng dụng có chế độ tối thì thêm một lượt.
 */
import { useMemo } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

import { formatVnd } from "@shared/utils/formatNumber";
import "./DashboardCharts.css";

/* Chỉ nạp đúng phần đang dùng — không nạp cả gói cho nhẹ bundle. Không có Legend của
   Chart.js: chú giải tự vẽ bằng HTML để nó cũng là chữ đọc được, không phải ảnh canvas. */
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

/* Bảng màu đã qua validate_palette — đừng đổi tay, đổi thì chạy lại trình kiểm. */
const SURFACE = "#ffffff";
const INK_MUTED = "#64748b";
const GRID = "#e8edf4";

const SERIES = Object.freeze({
  freight: { color: "#2a78d6", label: "Cước vận chuyển" },
  service: { color: "#eb6834", label: "Phí dịch vụ và phụ phí" },
  tax: { color: "#1baf7a", label: "Thuế" },
});

const SPEND_COLOR = "#2a78d6";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** "2026-09" → "T9/26". Nhãn trục phải ngắn, tháng đầy đủ nằm ở tooltip. */
const shortMonth = (value) => {
  const [year, month] = String(value ?? "").split("-");
  if (!year || !month) return String(value ?? "");

  return `T${Number(month)}/${year.slice(2)}`;
};

const fullMonth = (value) => {
  const [year, month] = String(value ?? "").split("-");
  if (!year || !month) return String(value ?? "");

  return `Tháng ${Number(month)}/${year}`;
};

/* Trục tiền: rút gọn để không tràn (1.200.000 → 1,2tr). */
const shortMoney = (value) => {
  const number = toNumber(value);

  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(1).replace(".", ",")} tỷ`;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1).replace(".", ",")} tr`;
  if (number >= 1_000) return `${Math.round(number / 1_000)} k`;

  return String(number);
};

/* Tooltip dùng chung: nền tối, chữ sáng, không viền — đọc được trên mọi màu cột. */
const TOOLTIP_STYLE = {
  backgroundColor: "#0f172a",
  titleColor: "#ffffff",
  bodyColor: "#e2e8f0",
  padding: 10,
  cornerRadius: 8,
  displayColors: false,
  titleFont: { weight: "700", size: 12 },
  bodyFont: { size: 12 },
};

export default function DashboardCharts({ stats }) {
  const monthly = useMemo(
    () => (Array.isArray(stats?.monthlySpend) ? stats.monthlySpend : []),
    [stats],
  );

  const costParts = useMemo(() => {
    const freight = toNumber(stats?.totalFreight);
    const service = toNumber(stats?.totalServiceFee);
    const tax = toNumber(stats?.totalTax);

    return { freight, service, tax, total: freight + service + tax };
  }, [stats]);

  const spendTotal = monthly.reduce((sum, row) => sum + toNumber(row?.paid), 0);

  /* Chưa có gì để vẽ thì nói thẳng, đừng dựng khung biểu đồ rỗng. */
  if (spendTotal <= 0 && costParts.total <= 0) {
    return (
      <section className="dash-charts">
        <div className="dash-charts__empty">
          Chưa có số liệu để thống kê. Sau đơn đầu tiên bạn sẽ thấy chi tiêu theo tháng và
          cơ cấu chi phí ở đây.
        </div>
      </section>
    );
  }

  /* ── ① Chi tiêu theo tháng ─────────────────────────────────────────────── */

  const peak = monthly.reduce(
    (max, row) => Math.max(max, toNumber(row?.paid)),
    0,
  );

  const spendData = {
    labels: monthly.map((row) => shortMonth(row?.month)),
    datasets: [
      {
        data: monthly.map((row) => toNumber(row?.paid)),
        backgroundColor: SPEND_COLOR,
        hoverBackgroundColor: SPEND_COLOR,
        /* Cột mảnh, bo 4px ở đầu số liệu, vuông ở chân — chân cột là đường gốc. */
        maxBarThickness: 24,
        borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: false,
      },
    ],
  };

  const spendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    /* Một chuỗi số liệu thì không cần chú giải: tiêu đề đã nói đang vẽ cái gì. */
    plugins: {
      tooltip: {
        ...TOOLTIP_STYLE,
        callbacks: {
          title: (items) => fullMonth(monthly[items[0].dataIndex]?.month),
          label: (item) => {
            const row = monthly[item.dataIndex];
            const count = toNumber(row?.paymentCount);

            return count > 0
              ? `${formatVnd(row?.paid)} · ${count} lần thu`
              : "Không có khoản nào";
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: GRID },
        ticks: { color: INK_MUTED, font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: GRID, drawTicks: false },
        border: { display: false },
        ticks: {
          color: INK_MUTED,
          font: { size: 11 },
          maxTicksLimit: 4,
          callback: (value) => shortMoney(value),
        },
      },
    },
  };

  /* ── ② Cơ cấu chi phí ─────────────────────────────────────────────────── */

  const costOrder = [
    { key: "freight", value: costParts.freight },
    { key: "service", value: costParts.service },
    { key: "tax", value: costParts.tax },
  ];

  /*
   * Chỉ HAI ĐẦU NGOÀI CÙNG của cả thanh được bo góc; mối nối bên trong để vuông.
   *
   * Bo cả bốn góc cho từng đoạn thì ba mảng màu trông như ba viên rời nhau, không còn
   * đọc ra "một thanh chia làm ba phần" — mà đó mới là điều cần thấy ở biểu đồ tỉ trọng.
   * Đoạn có giá trị 0 không vẽ ra, nên đầu/cuối tính theo đoạn CÓ SỐ, không theo vị trí
   * trong mảng.
   */
  const drawnKeys = costOrder
    .filter((part) => part.value > 0)
    .map((part) => part.key);

  const radiusFor = (key) => {
    const isFirst = drawnKeys[0] === key;
    const isLast = drawnKeys[drawnKeys.length - 1] === key;

    return {
      topLeft: isFirst ? 4 : 0,
      bottomLeft: isFirst ? 4 : 0,
      topRight: isLast ? 4 : 0,
      bottomRight: isLast ? 4 : 0,
    };
  };

  const costData = {
    labels: [""],
    datasets: costOrder.map((part) => ({
      label: SERIES[part.key].label,
      data: [part.value],
      backgroundColor: SERIES[part.key].color,
      hoverBackgroundColor: SERIES[part.key].color,
      /*
       * Khoảng hở 2px MÀU NỀN giữa các phần — đây là cách tách mảng màu, không phải
       * viền. Viền vẽ bằng màu nền thì mắt đọc ra khoảng hở, còn dữ liệu không dày thêm.
       */
      borderColor: SURFACE,
      borderWidth: 2,
      borderSkipped: false,
      borderRadius: radiusFor(part.key),
      maxBarThickness: 28,
    })),
  };

  const costOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        ...TOOLTIP_STYLE,
        callbacks: {
          title: (items) => items[0].dataset.label,
          label: (item) => {
            const share = costParts.total > 0 ? (item.raw / costParts.total) * 100 : 0;
            return `${formatVnd(item.raw)} · ${share.toFixed(1).replace(".", ",")}%`;
          },
        },
      },
    },
    scales: {
      /*
       * Chốt trục bằng đúng TỔNG: đây là biểu đồ tỉ trọng, thanh phải lấp kín bề ngang
       * thì mắt mới đọc được "phần này chiếm bao nhiêu của tổng". Để Chart.js tự chọn
       * mức tối đa thì thanh dừng giữa chừng và tỉ lệ nhìn thành sai.
       */
      x: {
        stacked: true,
        display: false,
        min: 0,
        max: costParts.total,
        grid: { display: false },
      },
      y: { stacked: true, display: false, grid: { display: false } },
    },
  };

  return (
    <section className="dash-charts">
      <header className="dash-charts__head">
        <h3>Thống kê của bạn</h3>
        <p>Nhìn lại chi tiêu và cơ cấu chi phí — không phải việc cần xử lý.</p>
      </header>

      <div className="dash-charts__grid">
        <article className="dash-chart">
          <div className="dash-chart__head">
            <h4>Chi tiêu 6 tháng gần nhất</h4>
            <p>
              Tính theo ngày bạn trả tiền, không phải ngày đặt đơn. Tổng{" "}
              <b>{formatVnd(spendTotal)}</b>.
            </p>
          </div>

          <div className="dash-chart__canvas">
            <Bar data={spendData} options={spendOptions} />
          </div>

          {/*
            Nhãn trực tiếp DUY NHẤT một cái: tháng cao nhất. Gắn số lên mọi cột thì
            không ai đọc, và trục cùng tooltip đã gánh phần còn lại.
          */}
          {peak > 0 && (
            <p className="dash-chart__note">
              Tháng cao nhất:{" "}
              <b>
                {fullMonth(
                  monthly.find((row) => toNumber(row?.paid) === peak)?.month,
                )}
              </b>{" "}
              — {formatVnd(peak)}
            </p>
          )}
        </article>

        <article className="dash-chart">
          <div className="dash-chart__head">
            <h4>Tiền của bạn đi đâu</h4>
            <p>
              Cộng dồn trên {toNumber(stats?.quotedOrderCount).toLocaleString("vi-VN")} đơn
              đã có báo giá. Tổng <b>{formatVnd(costParts.total)}</b>.
            </p>
          </div>

          <div className="dash-chart__canvas dash-chart__canvas--short">
            <Bar data={costData} options={costOptions} />
          </div>

          {/*
            Chú giải LUÔN có khi từ hai chuỗi trở lên, và ở đây kiêm luôn nhãn trực tiếp
            (có số tiền + phần trăm) — đó cũng là cách bù cho màu xanh ngọc có tương phản
            dưới 3:1 trên nền sáng: người đọc không phải dò màu để biết phần nào là gì.
          */}
          <ul className="dash-chart__legend">
            {costOrder.map((part) => {
              const share =
                costParts.total > 0 ? (part.value / costParts.total) * 100 : 0;

              return (
                <li key={part.key}>
                  <span
                    className="dash-chart__swatch"
                    style={{ background: SERIES[part.key].color }}
                  />
                  <span className="dash-chart__legend-name">
                    {SERIES[part.key].label}
                  </span>
                  <b className="dash-chart__legend-value">{formatVnd(part.value)}</b>
                  <span className="dash-chart__legend-share">
                    {share.toFixed(1).replace(".", ",")}%
                  </span>
                </li>
              );
            })}
          </ul>
        </article>
      </div>
    </section>
  );
}
