"use client";

import { useEffect } from "react";
import type { ApplicationStatus, JobApplication, JobFitAnalysis, ParsedJob } from "../types/application";
import { waitingDays } from "../utils/applicationKey";

const statusStyle: Record<ApplicationStatus, { bg: string; fg: string }> = {
  Waiting: { bg: "#fff4d9", fg: "#8b6508" },
  "Action Required": { bg: "#fff0e2", fg: "#9a4f16" },
  Interview: { bg: "#e8efff", fg: "#315ba5" },
  Rejected: { bg: "#fdebea", fg: "#a4413d" },
  Offer: { bg: "#e5f5ea", fg: "#267245" },
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const style = statusStyle[status];
  return <span className="badge" style={{ "--badge-bg": style.bg, "--badge-fg": style.fg } as React.CSSProperties}>{status}</span>;
}

export function LoadingState() {
  return <div className="loading" role="status"><div className="spinner" />正在載入申請資料…</div>;
}

export function EmptyState({ title = "找不到申請紀錄", detail = "調整篩選條件，或新增一筆求職申請。" }) {
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
    </div>
    <div className="modal-actions"><button className="button" onClick={onClose}>關閉</button>
      {duplicate ? <button className="button primary" onClick={() => onView(duplicate)}>查看既有紀錄</button> : <button className="button primary" disabled={busy} onClick={onConfirm}>{busy ? "正在新增…" : "我已完成申請"}</button>}
    </div>
  </Modal>;
}
