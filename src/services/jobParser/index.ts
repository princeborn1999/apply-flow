import type { ParsedJob } from "../../types/application";

export interface JobParser {
  parse(jobDescription: string): Promise<ParsedJob>;
}

const labeledValue = (text: string, labels: string[]): string => {
  const pattern = new RegExp(
    `(?:^|\\n)\\s*(?:${labels.join("|")})\\s*[:：]\\s*([^\\n]+)`,
    "i",
  );
  return text.match(pattern)?.[1]?.trim() ?? "";
};

const cleanLine = (value: string) =>
  value.replace(/^[•·*▪–—-]\s*/, "").replace(/\s+/g, " ").trim();

const cleanCompany = (value: string) =>
  cleanLine(value)
    .replace(/^(?:at|about|join|welcome to)\s+/i, "")
    .replace(/[™®©]/g, "")
    .replace(/[,:;.]\s*$/, "")
    .trim();

const invalidCompanyNames = new Set([
  "we", "our", "the company", "company", "team", "role", "about us",
  "engineering", "product", "remote", "job description",
  "vi", "vores", "virksomheden", "teamet", "stillingen", "om os",
]);

const plausibleCompany = (value: string) => {
  const cleaned = cleanCompany(value);
  if (!cleaned || cleaned.length > 60 || cleaned.split(/\s+/).length > 5) return "";
  if (invalidCompanyNames.has(cleaned.toLowerCase())) return "";
  if (/^(?:senior|junior|staff|lead|principal|frontend|backend|full[- ]stack|software)\b/i.test(cleaned)) return "";
  return cleaned;
};

const extractCompany = (text: string, lines: string[]): string => {
  const labeled = plausibleCompany(labeledValue(text, ["company", "公司", "employer", "organization"]));
  if (labeled) return labeled;

  // Pasted ChatGPT/LinkedIn content often wraps the company in a Markdown link.
  const linkedInMarkdown = text.match(
    /\[([^\]\n]{1,60})\]\(https?:\/\/(?:[\w-]+\.)?linkedin\.com\/company\/[^)\s]+\/?(?:life\/?)?[^)]*\)/i,
  );
  const linkedCompany = plausibleCompany(linkedInMarkdown?.[1]?.replace(/\*+/g, "") ?? "");
  if (linkedCompany) return linkedCompany;

  const linkedInSlug = text.match(/linkedin\.com\/company\/([a-z0-9-]+)/i)?.[1];
  if (linkedInSlug) {
    const slugCompany = plausibleCompany(
      linkedInSlug.split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : "").join(" "),
    );
    if (slugCompany) return slugCompany;
  }

  // Common English and Danish headings: "About Invert", "At Invert", "Om Opacity", "Hos Opacity".
  for (const line of lines.slice(0, 40)) {
    const heading = line.match(/^(?:about|at|join|welcome to|om|hos)\s+([A-ZÆØÅ][A-Za-zÆØÅæøå0-9&.'-]*(?:\s+[A-ZÆØÅ][A-Za-zÆØÅæøå0-9&.'-]*){0,3})(?:\s*[|–—-]|[:,.]|$)/i);
    const candidate = plausibleCompany(heading?.[1] ?? "");
    if (candidate) return candidate;
  }

  for (const line of lines.slice(0, 50)) {
    const danishContext = line.match(
      /(?:^|\s)(?:hos\s+|en\s+del\s+af\s+)([A-ZÆØÅ][A-Za-zÆØÅæøå0-9&.'-]*(?:\s+[A-ZÆØÅ][A-Za-zÆØÅæøå0-9&.'-]*){0,3})(?:[:,.]|\s+(?:søger|arbejder|bygger|udvikler)\b)/i,
    );
    const candidate = plausibleCompany(danishContext?.[1] ?? "");
    if (candidate) return candidate;
  }

  // Company introductions may appear after the job title rather than on the first line.
  for (const line of lines.slice(0, 50)) {
    const introduction = line.match(
      /^(?:At\s+)?([A-ZÆØÅ][A-Za-zÆØÅæøå0-9&.'-]*(?:\s+[A-ZÆØÅ][A-Za-zÆØÅæøå0-9&.'-]*){0,3})\s+(?:operates|is|builds|provides|offers|develops|creates|helps|has|was|works|enables|makes|empowers|transforms|believes|søger|arbejder|bygger|udvikler|hjælper)\b/i,
    );
    const candidate = plausibleCompany(introduction?.[1] ?? "");
    if (candidate) return candidate;
  }

  // "Invert's platform/product/team..." is another frequent introduction style.
  for (const line of lines.slice(0, 50)) {
    const possessive = line.match(
      /^([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,3})['’]s\s+(?:platform|product|mission|team|technology|software|solution)\b/i,
    );
    const candidate = plausibleCompany(possessive?.[1] ?? "");
    if (candidate) return candidate;
  }

  const legalEntityLine = lines.find((line) =>
    /\b(?:inc\.?|ltd\.?|limited|gmbh|corp\.?|corporation|co\.)\b/i.test(line) &&
    line.length <= 80,
  );
  return plausibleCompany(legalEntityLine?.replace(/\s*[|–—-]\s*.*$/, "") ?? "");
};

const extractCountry = (text: string, lines: string[]): string => {
  const labeled = labeledValue(text, ["country", "location", "所在地", "國家"]);
  if (labeled) return labeled;

  const euRemoteLine = lines.find(
    (line) => /\b(?:fully\s+)?remote\b/i.test(line) && /\b(?:EU|EEA)\b/i.test(line),
  );
  if (euRemoteLine) return "European Union (Remote)";

  const locationLine = lines.find((line) =>
    /\b(remote|berlin|taiwan|germany|denmark|sweden|france|spain|poland|ireland|united states|united kingdom|netherlands|singapore|japan)\b/i.test(line),
  );
  if (!locationLine) return "";

  if (/\bberlin\b/i.test(locationLine)) return "Germany";
  return locationLine.match(
    /\b(Taiwan|Germany|Denmark|Sweden|France|Spain|Poland|Ireland|United States|United Kingdom|Netherlands|Singapore|Japan|Remote)\b/i,
  )?.[1] ?? "";
};

const extractPosition = (text: string, lines: string[]): string => {
  const labeled = labeledValue(text, ["position", "job title", "role", "職位", "職缺"]);
  if (labeled) return labeled;

  const hiringSentence = text.match(
    /\b(?:we(?:['’]re| are)\s+hiring|hiring)\s+(?:an?\s+)?([^.\n]+?)(?:\s+to\s+join\b|[.\n]|$)/i,
  );
  if (hiringSentence?.[1]) return cleanLine(hiringSentence[1]);

  const titleLine = lines.find((line) =>
    /\b(engineer|designer|manager|developer|analyst|specialist|director|lead)\b/i.test(line) &&
    line.length <= 100,
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
