"use client";

export default function PrintButton() {
  return <button className="print-btn" onClick={() => window.print()}>Drucken / Als PDF speichern</button>;
}
