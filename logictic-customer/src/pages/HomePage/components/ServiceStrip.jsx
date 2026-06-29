import React, { useState } from "react";
import { SERVICE_TABS } from "../data/homeData";

export default function ServiceStrip() {
  const [activeStrip, setActiveStrip] = useState(0);

  return (
    <div className="service-strip">
      <div className="service-strip-inner">
        {SERVICE_TABS.map((item, idx) => (
          <div
            key={item.num}
            className={`service-strip-item ${activeStrip === idx ? "active" : ""}`}
            onClick={() => setActiveStrip(idx)}
          >
            <span className="num">{item.num}</span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
