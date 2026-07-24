import type { ParsedJob } from "../../types/application";

export interface JobParser {
  parse(jobDescription: string): Promise<ParsedJob>;
}

const labeledValue = (text: string, labels: string[]): string => {
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:${labels.join("|")})\\s*[:：-]\\s*([^\\n]+)`, "i");
  return text.match(pattern)?.[1]?.trim() ?? "";
};

const titleCase = (value: string) =>
  value.replace(/\w\S*/g, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());

export const ruleBasedJobParser: JobParser = {
  async parse(jobDescription) {
    const lines = jobDescription.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const company =
      labeledValue(jobDescription, ["company", "公司", "about us", "employer"]) ||
      lines.find((line) => /\b(inc|ltd|gmbh|company|corp|co\.)\b/i.test(line))?.replace(/\s*[|–—-].*$/, "") ||
      "";
    const country =
      labeledValue(jobDescription, ["country", "location", "國家", "地點"]) ||
      lines.find((line) => /\b(remote|taiwan|finland|germany|united states|united kingdom|australia|netherlands|singapore|japan)\b/i.test(line))?.replace(/^.*?[|:：]\s*/, "") ||
      "";
    const position =
      labeledValue(jobDescription, ["position", "job title", "role", "職位", "職稱"]) ||
      lines.find((line) => /\b(engineer|designer|manager|developer|analyst|specialist|director|lead)\b/i.test(line)) ||
      lines[0] ||
      "";

    return {
      company: company ? titleCase(company) : "",
      country: country ? titleCase(country) : "",
      position: position ? titleCase(position.replace(/\s*[|–—]\s*.*$/, "")) : "",
    };
  },
};
