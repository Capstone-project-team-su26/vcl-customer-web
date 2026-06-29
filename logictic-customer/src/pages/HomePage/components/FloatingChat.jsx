import React from "react";
import { BRAND } from "../data/homeData";

export default function FloatingChat() {
  return (
    <div className="floating-chat">
      <button type="button" className="chat-fab" title={`${BRAND.name} Hỗ trợ`}>
        {BRAND.name}
      </button>
    </div>
  );
}
