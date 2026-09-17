export const SIGNATURE_TEXT = `Mit freundlichen Grüßen

aus dem Leipziger Neuseenland – mehr als ein See

Jürgen Kullmann
Geschäftsführer

JK KI-MasterClass UG (haftungsbeschränkt)
Koburger Straße 198
04416 Markkleeberg

mobil +49 (0) 162 345 67 93

HRB 43013 · Amtsgericht Leipzig
USt-IdNr. DE311286747

jk@ki-masterclass.com · www.ki-masterclass.com`;

export const SIGNATURE_HTML = `<p style="margin:0 0 1em;">Mit freundlichen Grüßen</p>
<p style="margin:0 0 1em;font-style:italic;color:#6c7486;">aus dem Leipziger Neuseenland – mehr als ein See</p>
<p style="margin:0 0 4px;"><strong>Jürgen Kullmann</strong><br>Geschäftsführer</p>
<p style="margin:0 0 4px;">JK KI-MasterClass UG (haftungsbeschränkt)<br>Koburger Straße 198<br>04416 Markkleeberg</p>
<p style="margin:0 0 4px;">mobil +49 (0) 162 345 67 93</p>
<p style="margin:0 0 4px;">HRB 43013 · Amtsgericht Leipzig<br>USt-IdNr. DE311286747</p>
<p style="margin:0;"><a href="mailto:jk@ki-masterclass.com" style="color:inherit;">jk@ki-masterclass.com</a> · <a href="https://www.ki-masterclass.com" style="color:inherit;">www.ki-masterclass.com</a></p>`;

// Fester Einladungsteil (Aufzählung, Dauer, Kostenfrei-Hinweis, Link, Schlusssatz) -- die KI schreibt nur noch die
// persönliche Eröffnung davor; das hier wird beim Erzeugen des Entwurfs unverändert angehängt, damit es nie driftet.
export const EVENT_PITCH_TEXT = `Deshalb möchte ich Sie herzlich zu unserem KI Speed-Dating für den Mittelstand am 11. November 2026 in Nürnberg einladen. In nur 3 Stunden erleben Sie:

✅ Konkrete KI-Anwendungsfälle aus Ihrer Branche und dem Mittelstand
✅ Direkten Austausch mit KI-Experten – ohne lange Vorträge
✅ Einen eigenen, lauffähigen KI-Assistenten, den Sie sofort im Unternehmen einsetzen können

Die Teilnahme ist kostenfrei. Das komplette Programm und alle Highlights finden Sie hier:
https://www.speed-date-ki-mittelstand.ki-masterclass.com

Ich bin überzeugt: Diese 3 Stunden werden Ihnen neue Perspektiven eröffnen und Ihnen zeigen, wie Sie KI gewinnbringend in Ihrem Unternehmen nutzen können – praxisnah, ohne Umwege, sofort umsetzbar.

Ich würde mich freuen, Sie am 11.11. in Nürnberg begrüßen zu dürfen!`;

// DSGVO-Pflichtinformation nach Art. 12, 13 DSGVO für den Erstkontakt -- wörtlich, nicht durch die KI umformulierbar.
export const DSGVO_NOTICE_TEXT = `Pflichtinformationen gemäß Artikel 13 DSGVO

Im Falle des Erstkontakts sind wir gemäß Art. 12, 13 DSGVO verpflichtet, Ihnen folgende datenschutzrechtliche Pflichtinformationen zur Verfügung zu stellen: Wenn Sie uns per E-Mail kontaktieren, verarbeiten wir Ihre personenbezogenen Daten nur, soweit an der Verarbeitung ein berechtigtes Interesse besteht (Art. 6 Abs. 1 lit. f DSGVO), Sie in die Datenverarbeitung eingewilligt haben (Art. 6 Abs. 1 lit. a DSGVO), die Verarbeitung für die Anbahnung, Begründung, inhaltliche Ausgestaltung oder Änderung eines Rechtsverhältnisses zwischen Ihnen und uns erforderlich sind (Art. 6 Abs. 1 lit. b DSGVO) oder eine sonstige Rechtsnorm die Verarbeitung gestattet. Ihre personenbezogenen Daten verbleiben bei uns, bis Sie uns zur Löschung auffordern, Ihre Einwilligung zur Speicherung widerrufen oder der Zweck für die Datenspeicherung entfällt (z. B. nach abgeschlossener Bearbeitung Ihres Anliegens). Zwingende gesetzliche Bestimmungen – insbesondere steuer- und handelsrechtliche Aufbewahrungsfristen – bleiben unberührt. Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Ihnen steht außerdem ein Recht auf Widerspruch, auf Datenübertragbarkeit und ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu. Ferner können Sie die Berichtigung, die Löschung und unter bestimmten Umständen die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten verlangen. Details entnehmen Sie unserer Datenschutzerklärung.`;

// TODO: Link zur Datenschutzerklärung einsetzen, sobald bestätigt.
export const DSGVO_NOTICE_HTML = `<p style="margin:0 0 6px;font-weight:600;">Pflichtinformationen gemäß Artikel 13 DSGVO</p>
<p style="margin:0;">Im Falle des Erstkontakts sind wir gemäß Art. 12, 13 DSGVO verpflichtet, Ihnen folgende datenschutzrechtliche Pflichtinformationen zur Verfügung zu stellen: Wenn Sie uns per E-Mail kontaktieren, verarbeiten wir Ihre personenbezogenen Daten nur, soweit an der Verarbeitung ein berechtigtes Interesse besteht (Art. 6 Abs. 1 lit. f DSGVO), Sie in die Datenverarbeitung eingewilligt haben (Art. 6 Abs. 1 lit. a DSGVO), die Verarbeitung für die Anbahnung, Begründung, inhaltliche Ausgestaltung oder Änderung eines Rechtsverhältnisses zwischen Ihnen und uns erforderlich sind (Art. 6 Abs. 1 lit. b DSGVO) oder eine sonstige Rechtsnorm die Verarbeitung gestattet. Ihre personenbezogenen Daten verbleiben bei uns, bis Sie uns zur Löschung auffordern, Ihre Einwilligung zur Speicherung widerrufen oder der Zweck für die Datenspeicherung entfällt (z. B. nach abgeschlossener Bearbeitung Ihres Anliegens). Zwingende gesetzliche Bestimmungen – insbesondere steuer- und handelsrechtliche Aufbewahrungsfristen – bleiben unberührt. Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Ihnen steht außerdem ein Recht auf Widerspruch, auf Datenübertragbarkeit und ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu. Ferner können Sie die Berichtigung, die Löschung und unter bestimmten Umständen die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten verlangen. Details entnehmen Sie unserer Datenschutzerklärung.</p>`;
