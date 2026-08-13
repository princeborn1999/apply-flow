"use client";

import { useEffect, useState } from "react";
import { applicationCountries } from "../constants/countries";
import type { ApplicationStatus, JobApplication, JobFitAnalysis, ParsedJob } from "../types/application";
import { waitingDays } from "../utils/applicationKey";

const statusStyle: Record<ApplicationStatus, { bg: string; fg: string }> = {
  Waiting: { bg: "#fff4d9", fg: "#8b6508" },
  "Action Required": { bg: "#fff0e2", fg: "#9a4f16" },
  Interview: { bg: "#e8efff", fg: "#315ba5" },
  Rejected: { bg: "#fdebea", fg: "#a4413d" },
  Offer: { bg: "#e5f5ea", fg: "#267245" },
};

const isDemoMode = import.meta.env.VITE_APPLYFLOW_DEMO === "true";

const applicationDetails = isDemoMode ? [] : [
  { label: "Full name", value: "Aaron Huang" },
  { label: "Email", value: "princeborn1999@gmail.com" },
  { label: "Phone", value: "+886 967195378" },
  { label: "Address", value: "4F, No. 255 Wenhua St., Yangmei Dist., Taoyuan City 326104, Taiwan" },
  { label: "Location", value: "Taipei, Taiwan" },
  { label: "LinkedIn", value: "https://www.linkedin.com/in/aaron-huang-12941a3a8/" },
  { label: "GitHub", value: "https://github.com/princeborn1999" },
  { label: "Portfolio", value: "https://princeborn1999.github.io" },
  { label: "Notice period", value: "1 month notice period" },
];

const salarySuggestions = [
  { label: "Canada", value: "CAD 125,000" },
  { label: "Sweden", value: "SEK 720,000" },
  { label: "Germany", value: "EUR 85,000" },
  { label: "United States", value: "USD 150,000" },
  { label: "Denmark", value: "DKK 720,000" },
].filter((suggestion) => applicationCountries.includes(suggestion.label));

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const style = statusStyle[status];
  return <span className="badge" style={{ "--badge-bg": style.bg, "--badge-fg": style.fg } as React.CSSProperties}>{status}</span>;
}

export function LoadingState() {
  return <div className="loading" role="status"><div className="spinner" />正在載入申請資料…</div>;
}

export function EmptyState({ title = "No applications found", detail = "Adjust your filters or add a new job application." }) {
  return <div className="empty"><div className="empty-mark">⌕</div><strong>{title}</strong><div>{detail}</div></div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="error" role="alert">{message}</div>;
}

export function Modal({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={label}>{children}</section>
  </div>;
}

function QuickCopyPanel() {
  const [copied, setCopied] = useState("");
  const [quickCopyTab, setQuickCopyTab] = useState<"details" | "salary">("details");
  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
  };

  return <section className="application-tips" aria-label="常用申請資料">
    <div className="application-tips-head"><div><span>Quick copy</span><h3>常用申請資料</h3></div><small>按一下即可複製</small></div>
    <div className="application-tips-tabs" role="tablist" aria-label="常用申請資料分類">
      <button type="button" role="tab" aria-selected={quickCopyTab === "details"} onClick={() => setQuickCopyTab("details")}>Personal details</button>
      <button type="button" role="tab" aria-selected={quickCopyTab === "salary"} onClick={() => setQuickCopyTab("salary")}>Salary suggestions</button>
    </div>
    <div className="application-tips-list">
      {(quickCopyTab === "details" ? applicationDetails : salarySuggestions).map((item) => <div className="application-tip-row" key={item.label}>
        <div><span>{item.label}</span><strong>{item.value}</strong></div>
        <button className="copy-button" type="button" onClick={() => void copy(item.label, item.value)}>{copied === item.label ? "Copied" : "Copy"}</button>
      </div>)}
    </div>
    {quickCopyTab === "salary" && <p className="salary-note">Suggested annual gross salary for senior frontend roles. Adjust for role scope and location.</p>}
  </section>;
}

export function QuickCopyDialog({ onClose }: { onClose: () => void }) {
  return <Modal onClose={onClose} label="Quick copy application information">
    <div className="modal-head"><h2>Quick copy</h2><p>Copy frequently used application details without checking a job description.</p></div>
    <div className="modal-body"><QuickCopyPanel /></div>
    <div className="modal-actions"><button className="button primary" onClick={onClose}>Done</button></div>
  </Modal>;
}

export function ApplicationCheckDialog({ parsed, duplicate, analysis, busy, onClose, onConfirm, onView }: {
  parsed: ParsedJob; duplicate: JobApplication | null; analysis: JobFitAnalysis; busy: boolean; onClose: () => void; onConfirm: () => void; onView: (application: JobApplication) => void;
}) {
  return <Modal onClose={onClose} label={duplicate ? "重複申請提醒" : "確認申請"}>
    <div className="modal-head"><h2>{duplicate ? "你已經申請過此職位" : "尚未申請過此職位"}</h2><p>{duplicate ? "我們在現有紀錄中找到相同職缺。" : "請在外部網站完成申請後再新增紀錄。"}</p></div>
    <div className="modal-body"><dl className="detail-list">
      <dt>Company</dt><dd>{parsed.company}</dd><dt>Country</dt><dd>{parsed.country}</dd><dt>Position</dt><dd>{parsed.position}</dd>
      {duplicate && <><dt>申請日期</dt><dd>{duplicate.appliedDate}</dd><dt>目前狀態</dt><dd><StatusBadge status={duplicate.status} /></dd><dt>已等待</dt><dd>{waitingDays(duplicate.appliedDate)} 天</dd></>}
    </dl>
      <section className={`fit-card ${analysis.tone}`} aria-label="職缺適配分析">
        <div className="fit-heading"><div><span>規則式參考評估</span><h3>職缺適配分析</h3></div><strong>{analysis.score.toFixed(1)} / 10</strong></div>
        <div className="fit-verdict"><b>{analysis.verdict}</b><span>技術符合度 {analysis.technicalFit}%</span></div>
        <div className="fit-section"><h4>主要優勢</h4><p>{analysis.strengths.join(" · ")}</p></div>
        <div className="fit-section"><h4>主要差距</h4><p>{analysis.gaps.join(" ")}</p></div>
        <div className="fit-conditions">
          <span>語言要求</span><b>{analysis.language}</b>
          <span>工作權</span><b>{analysis.workAuthorization}</b>
          <span>工作模式</span><b>{analysis.workMode}</b>
        </div>
        <div className="fit-section"><h4>推薦原因</h4><p>{analysis.reason}</p></div>
      </section>
      {!duplicate && !isDemoMode && <QuickCopyPanel />}
    </div>
    <div className="modal-actions"><button className="button" onClick={onClose}>關閉</button>
      {duplicate ? <button className="button primary" onClick={() => onView(duplicate)}>查看既有紀錄</button> : <button className="button primary" disabled={busy} onClick={onConfirm}>{busy ? "正在新增…" : "我已完成申請"}</button>}
    </div>
  </Modal>;
}
