export const GERMAN_CITIES = [
  "Berlin", "Hamburg", "München", "Köln", "Frankfurt am Main", "Stuttgart", "Düsseldorf", "Leipzig",
  "Dortmund", "Essen", "Bremen", "Dresden", "Hannover", "Nürnberg", "Duisburg", "Bochum", "Wuppertal",
  "Bielefeld", "Bonn", "Münster", "Karlsruhe", "Mannheim", "Augsburg", "Wiesbaden", "Mönchengladbach",
  "Braunschweig", "Chemnitz", "Kiel", "Aachen", "Halle (Saale)", "Magdeburg", "Freiburg im Breisgau",
  "Krefeld", "Lübeck", "Mainz", "Erfurt", "Rostock", "Kassel", "Saarbrücken", "Potsdam", "Oldenburg",
  "Heidelberg", "Darmstadt", "Regensburg", "Würzburg", "Fürth", "Ulm", "Erlangen", "Trier", "Jena",
  "Bamberg", "Bayreuth", "Ingolstadt", "Wolfsburg", "Göttingen", "Reutlingen"
] as const;

export type GermanCity = (typeof GERMAN_CITIES)[number];

export const DEFAULT_ORIGIN_CITY: GermanCity = "Nürnberg";

export function isValidOriginCity(value: string): value is GermanCity {
  return (GERMAN_CITIES as readonly string[]).includes(value);
}
