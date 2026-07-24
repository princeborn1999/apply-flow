import type { ParsedJob } from "../../types/application";

export interface JobParser {
  parse(jobDescription: string): Promise<ParsedJob>;
}

const labeledValue = (text: string, labels: string[]): string => {
  const pattern = new RegExp(
    `(?:^|\\n)\\s*(?:${labels.join("|")})\\s*[:：-]\\s*([^\\n]+)`,
    "i",
  );
  return text.match(pattern)?.[1]?.trim() ?? "";
};

const cleanLine = (value: string) =>
  value.replace(/^[•∙·-]\s*/, "").replace(/\s+/g, " ").trim();

const extractCompany = (text: string, lines: string[]): string => {
  const labeled = labeledValue(text, ["company", "公司", "employer"]);
  if (labeled) return labeled;

  const openingSentence = cleanLine(lines[0] ?? "");
  const naturalIntroduction = openingSentence.match(
    /^([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,3})\s+(?:operates|is|builds|provides|offers|develops|creates|helps|has|was|works)\b/,
  );
  if (naturalIntroduction?.[1]) return naturalIntroduction[1];

  const companyLine = lines.find((line) =>
    /\b(?:inc\.?|ltd\.?|limited|gmbh|company|corp\.?|corporation|co\.)\b/i.test(line),
  );
  return companyLine?.replace(/\s*[|–—-]\s*.*$/, "").trim() ?? "";
};

const extractCountry = (text: string, lines: string[]): string => {
  const labeled = labeledValue(text, ["country", "location", "國家", "地點"]);
  if (labeled) return labeled;

  const euRemoteLine = lines.find(
    (line) => /\b(?:fully\s+)?remote\b/i.test(line) && /\bEU\b/i.test(line),
  );
  if (euRemoteLine) return "European Union (Remote)";

  const locationLine = lines.find((line) =>
    /\b(remote|taiwan|finland|germany|denmark|united states|united kingdom|australia|netherlands|singapore|japan)\b/i.test(
      line,
    ),
  );
  if (!locationLine) return "";

  const knownLocation = locationLine.match(
    /\b(Taiwan|Finland|Germany|Denmark|United States|United Kingdom|Australia|Netherlands|Singapore|Japan|Remote)\b/i,
  )?.[1];
  return knownLocation ?? "";
};

const extractPosition = (text: string, lines: string[]): string => {
  const labeled = labeledValue(text, ["position", "job title", "role", "職位", "職稱"]);
  if (labeled) return labeled;

  const hiringSentence = text.match(
    /\b(?:we(?:['’]re| are)\s+hiring|hiring)\s+(?:an?\s+)?([^.\n]+?)(?:\s+to\s+join\b|[.\n]|$)/i,
  );
  if (hiringSentence?.[1]) return cleanLine(hiringSentence[1]);

  const titleLine = lines.find((line) =>
    /\b(engineer|designer|manager|developer|analyst|specialist|director|lead)\b/i.test(line),
  );
  return titleLine ? cleanLine(titleLine.replace(/\s*[|–—]\s*.*$/, "")) : "";
};

export const ruleBasedJobParser: JobParser = {
  async parse(jobDescription) {
    const lines = jobDescription
      .split(/\r?\n/)
      .map(cleanLine)
      .filter(Boolean);

    return {
      company: extractCompany(jobDescription, lines),
      country: extractCountry(jobDescription, lines),
      position: extractPosition(jobDescription, lines),
    };
  },
};
