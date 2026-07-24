import type { JobFitAnalysis, ParsedJob } from "../types/application";

type SkillRule = {
  label: string;
  patterns: RegExp[];
  candidateLevel: number;
  weight: number;
  gapText?: string;
};

const skills: SkillRule[] = [
  { label: "TypeScript", patterns: [/\btypescript\b/i], candidateLevel: 1, weight: 10 },
  { label: "JavaScript", patterns: [/\bjavascript\b/i], candidateLevel: 1, weight: 8 },
  { label: "Angular / NgRx", patterns: [/\bangular\b/i, /\bngrx\b/i], candidateLevel: 1, weight: 10 },
  { label: "React", patterns: [/\breact(?:\.js)?\b/i], candidateLevel: 0.65, weight: 10, gapText: "React 是核心要求，目前可用 Angular 經驗轉換，但仍需要補強實作證據。" },
  { label: "REST API", patterns: [/\brest(?:ful)?\s+api\b/i, /\bapi integration\b/i], candidateLevel: 1, weight: 8 },
  { label: "OAuth / Authentication", patterns: [/\boauth\b/i, /\bauthentication\b/i, /\bauthorization\b/i], candidateLevel: 1, weight: 7 },
  { label: "Node.js", patterns: [/\bnode(?:\.js|js)\b/i, /\bexpress(?:\.js|js)?\b/i], candidateLevel: 0.8, weight: 7 },
  { label: "Java", patterns: [/\bjava\b/i], candidateLevel: 0.75, weight: 6 },
  { label: "C#", patterns: [/\bc#\b/i, /\b\.net\b/i], candidateLevel: 0.15, weight: 8, gapText: "C# / .NET 經驗較少；若 JD 將它列為必要條件，會是主要差距。" },
  { label: "Git", patterns: [/\bgit\b/i, /\bgithub\b/i], candidateLevel: 1, weight: 5 },
  { label: "CI/CD", patterns: [/\bci\/cd\b/i, /\bcontinuous integration\b/i, /\bgithub actions\b/i], candidateLevel: 0.85, weight: 6 },
  { label: "Microservices", patterns: [/\bmicroservices?\b/i], candidateLevel: 0.8, weight: 6 },
  { label: "Frontend Architecture", patterns: [/\bfrontend architecture\b/i, /\barchitectural decisions?\b/i, /\bdesign patterns?\b/i], candidateLevel: 1, weight: 8 },
  { label: "Reusable Components", patterns: [/\breusable components?\b/i, /\bcomponent librar(?:y|ies)\b/i, /\bdesign system\b/i], candidateLevel: 1, weight: 8 },
  { label: "Storybook", patterns: [/\bstorybook\b/i], candidateLevel: 0.25, weight: 5, gapText: "履歷中的 Storybook 證據較少，但通常可透過 Side Project 快速補強。" },
  { label: "Accessibility", patterns: [/\bwcag\b/i, /\baccessibility\b/i, /\bsemantic html\b/i, /\bkeyboard navigation\b/i, /\baria\b/i], candidateLevel: 0.55, weight: 6, gapText: "完整 WCAG / Accessibility 專案證據較少，需要準備具體案例。" },
  { label: "Testing", patterns: [/\bjest\b/i, /\bunit tests?\b/i, /\bcomponent testing\b/i, /\btesting library\b/i], candidateLevel: 0.75, weight: 6 },
  { label: "AI-assisted Development", patterns: [/\bgenai\b/i, /\bai-assisted\b/i, /\bagentic ai\b/i, /\bcopilot\b/i, /\bai tools?\b/i], candidateLevel: 1, weight: 7 },
  { label: "Mentoring / Lead", patterns: [/\bmentor(?:ing)?\b/i, /\blead(?:ing|ership)?\b/i, /\bsupport other (?:frontend )?developers\b/i], candidateLevel: 1, weight: 7 },
  { label: "Enterprise Applications", patterns: [/\benterprise\b/i, /\blarge-scale\b/i, /\bcomplex applications?\b/i], candidateLevel: 1, weight: 7 },
  { label: "Security Products", patterns: [/\bcybersecurity\b/i, /\bzero trust\b/i, /\bsecurity product\b/i], candidateLevel: 0.7, weight: 5 },
];

const containsAny = (text: string, patterns: RegExp[]) => patterns.some((pattern) => pattern.test(text));
const isFlexibleRequirement = (text: string, rule: SkillRule) => {
  const matchingLine = text
    .split(/\r?\n/)
    .find((line) => containsAny(line, rule.patterns));
  if (matchingLine && /\b(nice to have|preferred|bonus|plus|exposure|interest in|willing|ready to|open to)\b/i.test(matchingLine)) return true;
  if (rule.label === "C#" && /\bready to build capability in backend engineering\b/i.test(text)) return true;
  return false;
};

export function analyzeJobFit(jobDescription: string, parsed: ParsedJob): JobFitAnalysis {
  const text = `${parsed.position}\n${parsed.country}\n${jobDescription}`;
  const relevant = skills.filter((rule) => containsAny(text, rule.patterns));
  const totalWeight = relevant.reduce((sum, rule) => sum + rule.weight, 0);
  const earnedWeight = relevant.reduce((sum, rule) => sum + rule.weight * rule.candidateLevel, 0);
  let technicalFit = totalWeight ? Math.round((earnedWeight / totalWeight) * 100) : 68;

  const strengths = relevant
    .filter((rule) => rule.candidateLevel >= 0.7)
    .sort((a, b) => b.weight * b.candidateLevel - a.weight * a.candidateLevel)
    .slice(0, 5)
    .map((rule) => rule.label);
  const gaps = relevant
    .filter((rule) => rule.candidateLevel < 0.7)
    .sort((a, b) => b.weight * (1 - b.candidateLevel) - a.weight * (1 - a.candidateLevel))
    .slice(0, 3)
    .map((rule) => isFlexibleRequirement(text, rule)
      ? `${rule.label} 經驗較少，但 JD 將它列為可培養、接觸經驗或加分條件。`
      : rule.gapText ?? `${rule.label} 的直接經驗證據較少。`);

  const englishRequired = /\b(proficient|fluent|professional|working proficiency)\s+(?:in\s+)?english\b|\benglish\s+(?:required|language|proficiency)\b/i.test(text);
  const localLanguage = text.match(/\b(german|danish|swedish|finnish|dutch|french)\s+(?:required|language|fluency|proficiency|speaker)\b/i)?.[1];
  const language = localLanguage
    ? `需要 ${localLanguage[0].toUpperCase()}${localLanguage.slice(1)}`
    : englishRequired ? "英文即可" : "未知";

  const noSponsorship = /\b(no|without)\s+(?:visa\s+)?sponsorship\b|\bmust\s+(?:already\s+)?have\s+(?:the\s+)?right to work\b|\bexisting work (?:permit|authorization)\b/i.test(text);
  const euOnly = /\b(?:eu|eea)\s+(?:residents?|candidates?|work authorization|only)\b|\b(?:based|located)\s+(?:anywhere\s+)?in the eu\b/i.test(text);
  const relocationUnsupported = /\brelocation (?:support|assistance) (?:is not|isn't|not) (?:available|offered|provided)\b|\bno relocation\b/i.test(text);
  const workAuthorization = noSponsorship
    ? "需既有工作權／不提供 Sponsorship"
    : euOnly ? "限 EU／EEA，需確認工作權"
      : relocationUnsupported ? "不提供搬遷補助；Visa 未知" : "未知";

  const remote = /\bfully remote\b|\b100%\s+remote\b/i.test(text);
  const hybrid = /\bhybrid\b/i.test(text);
  const onsite = /\bon[- ]?site\b|\bin[- ]office\b/i.test(text);
  const officeDays = text.match(/\b([1-5])\s+days?\s+(?:per|a)\s+week\b/i)?.[1];
  const workMode = remote ? (euOnly ? "Remote · EU/EEA" : "Remote")
    : hybrid ? `Hybrid${officeDays ? ` · 每週約 ${officeDays} 天進辦公室` : ""}`
      : onsite ? "On-site" : "未知";

  let score = technicalFit * 0.085 + 1.5;
  if (englishRequired && !localLanguage) score += 0.35;
  if (/\bmentor(?:ing)?\b|\bleadership\b/i.test(text)) score += 0.25;
  if (/\bai-assisted\b|\bgenai\b|\bagentic ai\b|\bcopilot\b/i.test(text)) score += 0.25;
  if (/\benterprise\b|\bcybersecurity\b|\bspace tech\b|\baerospace\b/i.test(text)) score += 0.15;
  if (hybrid || onsite) score -= 0.45;
  if (relocationUnsupported) score -= 0.4;
  if (euOnly) score -= 0.45;
  if (localLanguage) score -= 1.4;
  if (noSponsorship) score -= 1.8;

  const years = [...text.matchAll(/\b(\d+)(?:\s*[-–]\s*(\d+))?\+?\s+years?\b/gi)]
    .map((match) => Number(match[2] || match[1]))
    .filter(Number.isFinite);
  const maxYears = years.length ? Math.max(...years) : 0;
  if (maxYears >= 7) score -= 0.8;
  else if (maxYears >= 6) score -= 0.4;
  else if (maxYears >= 3 && maxYears <= 5) score += 0.2;

  if (noSponsorship) score = Math.min(score, 5.8);
  if (localLanguage) score = Math.min(score, 6.2);
  if (technicalFit < 55) score = Math.min(score, 6.4);
  score = Math.max(3.5, Math.min(9.7, Math.round(score * 10) / 10));
  technicalFit = Math.max(35, Math.min(96, technicalFit));

  const verdict = score >= 8.8 ? "非常推薦" : score >= 7.4 ? "值得投遞" : score >= 6 ? "可以考慮" : "不優先";
  const tone = score >= 8.8 ? "strong" : score >= 7.4 ? "good" : score >= 6 ? "caution" : "weak";
  const strongest = strengths.slice(0, 3).join("、") || "前端與企業應用經驗";
  const constraint = noSponsorship ? "最大風險是工作權與 Sponsorship 限制。"
    : localLanguage ? `主要風險是 ${localLanguage} 語言要求。`
      : euOnly ? "技術方向符合，但 EU 工作權需要先確認。"
        : gaps.length ? "整體方向符合，但仍需針對主要技術差距準備實作證據。"
          : "目前沒有從 JD 發現明顯的硬性阻礙。";

  return {
    score,
    technicalFit,
    verdict,
    tone,
    strengths: strengths.length ? strengths : ["Frontend Development", "Enterprise Applications"],
    gaps: gaps.length ? gaps : ["沒有明顯技術缺口；仍需在面試中確認實際責任範圍。"],
    language,
    workAuthorization,
    workMode,
    reason: `你的 ${strongest} 與職缺核心方向相符。${constraint}`,
  };
}
