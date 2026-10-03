// Anschreiben für den Briefversand (liegt zusammen mit dem gedruckten Plakat im Umschlag, daher kürzer als die E-Mail).
// **Text** wird fett gedruckt. Nach einem Doppelpunkt steht die Fortsetzung bewusst in der nächsten Zeile.
import { EVENT, greetingLine } from "./outreach-html";

export const LETTER_HEADLINE = ["Ihre größte Herausforderung im Unternehmen?", "Lösen wir im KI-Speed-Date."] as const;

const [EVENT_DATE, EVENT_TIME] = EVENT.dateLine.split(" · ");

export function postalLetterBlocks(salutation: string): string[] {
  return [
    greetingLine(salutation),
    "welche Aufgabe oder welches Problem kostet Ihren Betrieb derzeit am meisten Zeit oder Geld?",
    "Genau dafür gibt es das Speed-Dating KI-Mittelstand:\nSie bringen Ihr Thema mit, und wir zeigen live, wie daraus ein klarer nächster Schritt wird – verständlich, praktisch und ohne Vorkenntnisse.\nAlle Details finden Sie auf dem beiliegenden Plakat.",
    `**${EVENT_DATE}**\n**${EVENT_TIME.replace("–", " – ")}**\n${EVENT.placeText.replace("(Tagungsbereich)\n", "(Tagungsbereich)\n")}\nTeilnahme kostenfrei · maximal 50 Personen`
  ];
}

export const LETTER_QR_TEXT = ["**Jetzt anmelden:**", "QR-Code mit der Handykamera scannen"] as const;
export const LETTER_CLOSING = "Ich freue mich darauf, Sie kennenzulernen.";
export const LETTER_ENCLOSURE = "Anlage: Plakat „Speed-Dating KI-Mittelstand“";
