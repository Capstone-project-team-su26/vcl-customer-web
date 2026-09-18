import "./SectionCard.css";

/**
 * Khung thẻ dùng chung cho các khối trong chi tiết đơn / hành trình đơn
 * (giữ hàng, giấy phép, chọn hướng kiện, tất toán, giao hàng, sự cố...).
 *
 * Cùng khuôn với ReceivingNoteCard / DeliveryTrackingCard để các khối xếp chồng trong một
 * trang nhìn như một bộ, không mỗi feature một kiểu viền/bo góc. Không chứa nghiệp vụ.
 *
 * @param {{ icon?: import("react").ReactNode, title: string, subtitle?: import("react").ReactNode,
 *           extra?: import("react").ReactNode, tone?: "default"|"warning"|"success"|"danger",
 *           id?: string, children?: import("react").ReactNode }} props
 */
export default function SectionCard({
  icon,
  title,
  subtitle,
  extra,
  tone = "default",
  id,
  children,
}) {
  return (
    <section id={id} className={`section-card section-card--${tone}`}>
      <header className="section-card__head">
        {icon ? <div className="section-card__icon">{icon}</div> : null}

        <div className="section-card__title">
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        {extra ? <div className="section-card__extra">{extra}</div> : null}
      </header>

      {children ? <div className="section-card__body">{children}</div> : null}
    </section>
  );
}
