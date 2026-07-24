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
  { label: "React", patterns: [/\breact(?:\.js)?\b/i], candidateLevel: 0.65, weight: 10, gapText: "React 實務深度可能低於職缺期待，但可由 Angular／TypeScript 經驗轉換。" },
  { label: "REST API", patterns: [/\brest(?:ful)?\s*(?:api)?\b/i, /\bapi integration\b/i], candidateLevel: 1, weight: 8 },
  { label: "OAuth / Authentication", patterns: [/\boauth\b/i, /\bauthentication\b/i, /\bauthorization\b/i], candidateLevel: 1, weight: 7 },
  { label: "Node.js", patterns: [/\bnode(?:\.js|js)\b/i, /\bexpress(?:\.js|js)?\b/i], candidateLevel: 0.8, weight: 7 },
  { label: "NestJS", patterns: [/\bnest(?:\.js|js)\b/i], candidateLevel: 0.45, weight: 6, gapText: "NestJS 經驗較少，但可由 Node.js／TypeScript 經驗延伸。" },
  { label: "Java", patterns: [/\bjava\b/i], candidateLevel: 0.75, weight: 6 },
  { label: "C#", patterns: [/\bc#\b/i, /\b\.net\b/i], candidateLevel: 0.15, weight: 8, gapText: "C#／.NET 經驗較少。" },
  { label: "Python", patterns: [/\bpython\b/i], candidateLevel: 0.15, weight: 9, gapText: "Python 不是目前的主要技術棧。" },
  { label: "FastAPI", patterns: [/\bfastapi\b/i], candidateLevel: 0.05, weight: 8, gapText: "缺少 FastAPI 實務經驗。" },
  { label: "AWS", patterns: [/\baws\b/i, /\bamazon web services\b/i], candidateLevel: 0.3, weight: 7, gapText: "AWS 雲端實務經驗較少。" },
  { label: "Azure / GCP", patterns: [/\bazure\b/i, /\bgcp\b/i, /\bgoogle cloud\b/i, /\bcloud platforms?\b/i], candidateLevel: 0.4, weight: 6, gapText: "Cloud（AWS／Azure／GCP）實務仍可補強。" },
  { label: "Terraform", patterns: [/\bterraform\b/i, /\binfrastructure as code\b/i, /\biac\b/i], candidateLevel: 0.1, weight: 6, gapText: "缺少 Terraform／Infrastructure as Code 經驗。" },
  { label: "Streaming", patterns: [/\bstreaming\b/i, /\bkafka\b/i, /\bkinesis\b/i, /\bevent[- ]driven\b/i], candidateLevel: 0.2, weight: 7, gapText: "Streaming／事件驅動系統經驗較少。" },
  { label: "Git", patterns: [/\bgit\b/i, /\bgithub\b/i], candidateLevel: 1, weight: 5 },
  { label: "CI/CD", patterns: [/\bci\/cd\b/i, /\bcontinuous integration\b/i, /\bgithub actions\b/i], candidateLevel: 0.65, weight: 6, gapText: "有 CI/CD 接觸經驗，但仍可補強實際建置與維護證據。" },
  { label: "Microservices", patterns: [/\bmicroservices?\b/i], candidateLevel: 0.8, weight: 6 },
  { label: "Frontend Architecture", patterns: [/\bfrontend architecture\b/i, /\barchitectural decisions?\b/i, /\bdesign patterns?\b/i], candidateLevel: 1, weight: 8 },
  { label: "Reusable Components", patterns: [/\breusable components?\b/i, /\bcomponent librar(?:y|ies)\b/i, /\bdesign system\b/i], candidateLevel: 1, weight: 8 },
  { label: "Storybook", patterns: [/\bstorybook\b/i], candidateLevel: 0.25, weight: 5, gapText: "Storybook 經驗較少，可在 Side Project 補強。" },
  { label: "Accessibility", patterns: [/\bwcag\b/i, /\baccessibility\b/i, /\bsemantic html\b/i, /\bkeyboard navigation\b/i, /\baria\b/i], candidateLevel: 0.55, weight: 6, gapText: "完整 WCAG／Accessibility 實務仍可補強。" },
  { label: "Testing", patterns: [/\bjest\b/i, /\bunit tests?\b/i, /\bcomponent testing\b/i, /\btesting library\b/i], candidateLevel: 0.75, weight: 6 },
  { label: "AI-assisted Development", patterns: [/\bgenai\b/i, /\bai[- ](?:first|assisted)\b/i, /\bagentic ai\b/i, /\bcopilot\b/i, /\bclaude code\b/i, /\bcodex\b/i, /\bdevin\b/i, /\bai tools?\b/i], candidateLevel: 1, weight: 6 },
  { label: "Mentoring / Lead", patterns: [/\bmentor(?:ing)?\b/i, /\blead(?:ing|ership)?\b/i, /\bsupport other (?:frontend )?developers\b/i], candidateLevel: 1, weight: 7 },
  { label: "Enterprise Applications", patterns: [/\benterprise\b/i, /\blarge-scale\b/i, /\bcomplex applications?\b/i], candidateLevel: 1, weight: 7 },
  { label: "Security Products", patterns: [/\bcybersecurity\b/i, /\bzero trust\b/i, /\bsecurity product\b/i], candidateLevel: 0.7, weight: 5 },
];

const containsAny = (text: string, patterns: RegExp[]) => patterns.some((pattern) => pattern.test(text));

const isFlexibleRequirement = (text: string, rule: SkillRule) => {
  const matchingLines = text.split(/\r?\n/).filter((line) => containsAny(line, rule.patterns));
  if (matchingLines.some((line) => /\b(nice to have|preferred|bonus|plus|exposure|interest in|willing|ready to|open to|familiarity)\b/i.test(line))) return true;
  return rule.label === "C#" && /\bready to build capability in backend engineering\b/i.test(text);
};

export function analyzeJobFit(jobDescription: string, parsed: ParsedJob): JobFitAnalysis {
  const text = `${parsed.position}\n${parsed.country}\n${jobDescription}`;
  const relevant = skills.filter((rule) => containsAny(text, rule.patterns));
  const totalWeight = relevant.reduce((sum, rule) => sum + rule.weight, 0);
  const earnedWeight = relevant.reduce((sum, rule) => sum + rule.weight * rule.candidateLevel, 0);
  let technicalFit = totalWeight ? Math.round((earnedWeight / totalWeight) * 100) : 68;

  const isFullStack = /\bfull[- ]stack\b/i.test(text);
  const isBackendLeaning = /\bbackend\b|\bserver[- ]side\b|\bfastapi\b|\bterraform\b|\bstreaming\b/i.test(text);
  const backendGaps = relevant.filter((rule) =>
    ["Python", "FastAPI", "AWS", "Terraform", "Streaming", "C#"].includes(rule.label) &&
    rule.candidateLevel < 0.5 &&
    !isFlexibleRequirement(text, rule)
  );

  const strengths = relevant
    .filter((rule) => rule.candidateLevel >= 0.7)
    .sort((a, b) => b.weight * b.candidateLevel - a.weight * a.candidateLevel)
    .slice(0, 5)
    .map((rule) => rule.label);

  const gaps = relevant
    .filter((rule) => rule.candidateLevel < 0.7)
    .sort((a, b) => b.weight * (1 - b.candidateLevel) - a.weight * (1 - a.candidateLevel))
    .slice(0, 5)
    .map((rule) => isFlexibleRequirement(text, rule)
      ? `${rule.label} 經驗較少，但 JD 將它列為加分或可培養項目。`
      : rule.gapText ?? `${rule.label} 經驗仍需補強。`);

  const englishRequired = /\b(proficient|fluent|professional|excellent|strong|working proficiency|communicat\w*)\s+(?:written\s+and\s+spoken\s+)?(?:in\s+)?english\b|\benglish\s+(?:required|language|proficiency|skills?|fluency)\b/i.test(text);
  const localLanguage =
    text.match(/\b(german|danish|swedish|finnish|dutch|french|norwegian)\s+(?:required|language|fluency|proficiency|speaker)\b/i)?.[1] ??
    (/\b(?:dansk)\b.{0,100}\b(?:engelsk)\b|\b(?:engelsk)\b.{0,100}\b(?:dansk)\b/is.test(text) ? "Danish" : undefined) ??
    (/\b(?:svenska)\b.{0,100}\b(?:engelska)\b|\b(?:engelska)\b.{0,100}\b(?:svenska)\b/is.test(text) ? "Swedish" : undefined) ??
    (/\b(?:norsk)\b.{0,100}\b(?:engelsk)\b|\b(?:engelsk)\b.{0,100}\b(?:norsk)\b/is.test(text) ? "Norwegian" : undefined);
  const language = localLanguage
    ? `需要 ${localLanguage[0].toUpperCase()}${localLanguage.slice(1)}`
    : englishRequired ? "英文即可" : "未知";

  const noSponsorship = /\b(no|without)\s+(?:visa\s+)?sponsorship\b|\bmust\s+(?:already\s+)?have\s+(?:the\s+)?right to work\b|\bexisting work (?:permit|authorization)\b/i.test(text);
  const euOnly = /\b(?:eu|eea)\s+(?:residents?|candidates?|work authorization|only)\b|\b(?:based|located)\s+(?:anywhere\s+)?in the eu\b/i.test(text);
  const relocationUnsupported = /\brelocation (?:support|assistance) (?:is not|isn't|not) (?:available|offered|provided)\b|\bno relocation\b/i.test(text);
  const workAuthorization = noSponsorship
    ? "需已有當地工作權，不提供 Sponsorship"
    : euOnly ? "限 EU／EEA，需確認工作權"
      : relocationUnsupported ? "不提供搬遷補助；Visa 未知" : "未知";

  const remote = /\bfully remote\b|\b100%\s+remote\b|\bremote[- ]first\b/i.test(text);
  const hybrid = /\bhybrid\b/i.test(text);
  const onsite = /\bon[- ]?site\b|\bin[- ]office\b/i.test(text);
  const officeDays = text.match(/\b([1-5])\s+days?\s+(?:per|a)\s+week\b/i)?.[1];
  const workMode = remote ? (euOnly ? "Remote · EU／EEA" : "Remote")
    : hybrid ? `Hybrid${officeDays ? ` · 每週約 ${officeDays} 天進辦公室` : ""}`
      : onsite ? "On-site" : "未知";

  let score = technicalFit * 0.075 + 1.8;
  if (englishRequired && !localLanguage) score += 0.25;
  if (/\bmentor(?:ing)?\b|\bleadership\b/i.test(text)) score += 0.2;
  if (/\bai[- ](?:first|assisted)\b|\bgenai\b|\bagentic ai\b/i.test(text)) score += 0.15;
  if (remote) score += 0.25;
  if (/\benterprise\b|\bcybersecurity\b|\bspace tech\b|\baerospace\b/i.test(text)) score += 0.1;
  if (hybrid || onsite) score -= 0.45;
  if (relocationUnsupported) score -= 0.4;
  if (euOnly) score -= 0.45;
  if (localLanguage) score -= 1.4;
  if (noSponsorship) score -= 1.8;
  if ((isFullStack || isBackendLeaning) && backendGaps.length >= 2) score -= 0.45;
  if ((isFullStack || isBackendLeaning) && backendGaps.length >= 4) score -= 0.35;

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
  if ((isFullStack || isBackendLeaning) && backendGaps.length >= 4) score = Math.min(score, 8.4);
  score = Math.max(3.5, Math.min(9.7, Math.round(score * 10) / 10));
  technicalFit = Math.max(35, Math.min(96, technicalFit));

  const verdict = score >= 8.8 ? "非常推薦" : score >= 7.4 ? "推薦投遞" : score >= 6 ? "可以考慮" : "不優先";
  const tone = score >= 8.8 ? "strong" : score >= 7.4 ? "good" : score >= 6 ? "caution" : "weak";
  const strongest = strengths.slice(0, 3).join("、") || "前端與企業應用經驗";

  let constraint = "目前沒有從 JD 發現明顯的硬性阻礙。";
  if (noSponsorship) constraint = "但職缺要求已有工作權且不提供 Sponsorship，是主要限制。";
  else if (localLanguage) constraint = `但職缺要求 ${localLanguage}，語言可能是硬性門檻。`;
  else if (euOnly) constraint = "但職缺限 EU／EEA，需先確認所在地與工作權。";
  else if ((isFullStack || isBackendLeaning) && backendGaps.length >= 2) {
    constraint = `但職位偏 Full Stack／Backend，${backendGaps.slice(0, 3).map((rule) => rule.label).join("、")} 是主要差距。`;
  } else if (gaps.length) {
    constraint = "仍有部分技能差距，建議確認它們是否屬於日常核心工作。";
  }

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
    reason: `你的 ${strongest} 與職缺方向相符。${constraint}`,
  };
}
