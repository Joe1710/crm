"use client";

import { useState } from "react";

export function PasswordField({
  name,
  label,
  minLength,
  autoFocus
}: {
  name: string;
  label: string;
  minLength?: number;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="span2">
      <span>{label}</span>
      <div style={{ position: "relative" }}>
        <input
          name={name}
          type={visible ? "text" : "password"}
          minLength={minLength}
          required
          autoFocus={autoFocus}
          style={{ width: "100%", paddingRight: 60 }}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          style={{
            position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
            border: 0, background: "none", color: "#5e6675", fontSize: 9, fontWeight: 700,
            cursor: "pointer", padding: "6px 8px"
          }}
        >
          {visible ? "Verbergen" : "Anzeigen"}
        </button>
      </div>
    </label>
  );
}
