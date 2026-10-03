"use client";

import { useEffect } from "react";

/** Passt Schriftgrößen an den Briefbogen an: Überschrift darf nicht breiter als der Platz neben dem Absenderblock werden,
 *  der Brieftext muss zwischen Textbeginn und Fußzeile passen. */
export default function FitLetters() {
  useEffect(() => {
    document.querySelectorAll<HTMLElement>(".letter-headline").forEach(head => {
      let size = 17;
      head.style.fontSize = `${size}pt`;
      const tooWide = () => [...head.children].some(line => (line as HTMLElement).scrollWidth > head.clientWidth + 1);
      while (tooWide() && size > 11) { size -= 0.25; head.style.fontSize = `${size}pt`; }
    });
    document.querySelectorAll<HTMLElement>(".letter-body").forEach(body => {
      let size = 11;
      body.style.fontSize = `${size}pt`;
      while (body.scrollHeight > body.clientHeight + 1 && size > 8.5) { size -= 0.25; body.style.fontSize = `${size}pt`; }
      if (body.scrollHeight > body.clientHeight + 1) body.dataset.overflow = "1";
    });
  }, []);
  return null;
}
