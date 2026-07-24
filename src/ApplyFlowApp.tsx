"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApplicationCheckDialog, EmptyState, ErrorState, LoadingState, Modal, StatusBadge } from "./components/UI";
import { applicationApi } from "./services/applicationApi";
import { ruleBasedJobParser } from "./services/jobParser";
import type { ApplicationStatus, JobApplication, ParsedJob } from "./types/application";
import { createApplicationKey, waitingDays } from "./utils/applicationKey";

type Page = "dashboard" | "applications" | "add" | "detail";
const statuses: ApplicationStatus[] = ["Waiting", "Interview", "Rejected", "Offer"];
const colors: Record<ApplicationStatus, string> = { Waiting: "#e1ae36", Interview: "#6385cc", Rejected: "#c9645e", Offer: "#4b9a68" };

export default function ApplyFlowApp() {
  const [page, setPage] = useState<Page>("dashboard");
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<JobApplication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setApplications(await applicationApi.getApplications()); }
    catch { setError("目前無法取得申請資料，請稍後再試。"); }
    finally { setLoading(false); }
  }, []);

  // Initial data hydration is intentionally triggered after the client mounts.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const go = (next: Page, application?: JobApplication) => {
    if (application) setSelected(application);
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const updateStatus = async (application: JobApplication, status: ApplicationStatus) => {
    try {
      const updated = await applicationApi.updateStatus(application, status);
      setApplications((items) => items.map((item) => createApplicationKey(item.company,item.country,item.position) === createApplicationKey(application.company,application.country,application.position) ? updated : item));
      setSelected(updated); setToast("申請狀態已更新");
    } catch { setError("狀態更新失敗，請稍後再試。"); }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await applicationApi.deleteApplication(deleteTarget);
      setApplications((items) => items.filter((item) => createApplicationKey(item.company,item.country,item.position) !== createApplicationKey(deleteTarget.company,deleteTarget.country,deleteTarget.position)));
      setDeleteTarget(null); setToast("申請紀錄已刪除");
      if (page === "detail") go("applications");
    } catch { setError("刪除失敗，請稍後再試。"); }
  };
  const addCreated = (application: JobApplication) => {
    setApplications((items) => [application, ...items]); setToast("申請紀錄已新增");
  };

  const titles: Record<Page,string> = { dashboard: "Dashboard", applications: "Applications", add: "Add Application", detail: "Application Detail" };
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">A</span>ApplyFlow</div>
      <nav className="nav" aria-label="主要導覽">
        <button className={page === "dashboard" ? "active" : ""} onClick={() => go("dashboard")}><span className="nav-icon">⌂</span>Dashboard</button>
        <button className={page === "applications" || page === "detail" ? "active" : ""} onClick={() => go("applications")}><span className="nav-icon">▤</span>Applications</button>
        <button className={page === "add" ? "active" : ""} onClick={() => go("add")}><span className="nav-icon">＋</span>Add Application</button>
      </nav>
      <div className="sidebar-note"><strong>Personal workspace</strong>Application data is synced with Google Sheets.</div>
    </aside>
    <main className="main">
      <header className="header"><h1>{titles[page]}</h1><div className="profile"><span>{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</span><span className="avatar">ME</span></div></header>
      <div className="content">
        {error && <div style={{ marginBottom: 16 }}><ErrorState message={error} /></div>}
        {loading ? <LoadingState /> : <>
          {page === "dashboard" && <Dashboard applications={applications} onAdd={() => go("add")} onView={(app) => go("detail",app)} />}
          {page === "applications" && <Applications applications={applications} onAdd={() => go("add")} onView={(app) => go("detail",app)} onDelete={setDeleteTarget} onStatus={updateStatus} />}
          {page === "add" && <AddApplication onCreated={addCreated} onView={(app) => go("detail",app)} />}
          {page === "detail" && selected && <ApplicationDetail application={selected} onBack={() => go("applications")} onDelete={setDeleteTarget} onStatus={updateStatus} />}
        </>}
      </div>
    </main>
    {deleteTarget && <Modal onClose={() => setDeleteTarget(null)} label="刪除申請紀錄">
      <div className="modal-head"><h2>刪除此申請紀錄？</h2><p>此動作會同步刪除 Google Sheet 中的資料，無法復原。</p></div>
      <div className="modal-body"><strong>{deleteTarget.position}</strong><div style={{ color: "var(--muted)", marginTop: 5 }}>{deleteTarget.company} · {deleteTarget.country}</div></div>
      <div className="modal-actions"><button className="button" onClick={() => setDeleteTarget(null)}>取消</button><button className="button danger" onClick={() => void remove()}>確認刪除</button></div>
    </Modal>}
    {toast && <div className="toast" role="status">✓ {toast}</div>}
  </div>;
}

function Dashboard({ applications, onAdd, onView }: { applications: JobApplication[]; onAdd: () => void; onView: (a: JobApplication) => void }) {
  const counts = Object.fromEntries(statuses.map((s) => [s, applications.filter((a) => a.status === s).length])) as Record<ApplicationStatus,number>;
  const months = Array.from({ length: 6 }, (_, offset) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - offset));
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
      value: applications.filter((application) => application.appliedDate.startsWith(monthKey)).length,
    };
  });
  return <>
    <div className="title-row"><div><h1 className="page-title">申請總覽</h1><p className="page-subtitle">查看申請數量、狀態分布與最近紀錄。</p></div><button className="button primary" onClick={onAdd}>＋ Add application</button></div>
    <section className="stats" aria-label="申請統計">
      <Stat label="Total Applied" value={applications.length} accent="#4c91c7" note="All applications" />
      {statuses.map((s) => <Stat key={s} label={s} value={counts[s]} accent={colors[s]} note={s === "Waiting" ? "Needs follow-up" : "Current pipeline"} />)}
    </section>
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-header"><h2>Application activity</h2><span style={{ color: "var(--muted)", fontSize: 11 }}>Last 6 months</span></div><div className="panel-body"><div className="chart">{months.map((m) => <div className="bar-wrap" key={m.label}><div className="bar" style={{ height: `${Math.max(10, m.value * 20)}px` }}><b>{m.value}</b></div>{m.label}</div>)}</div></div></section>
      <section className="panel"><div className="panel-header"><h2>Pipeline health</h2><span style={{ color: "var(--muted)", fontSize: 11 }}>{applications.length} total</span></div><div className="panel-body status-list">{statuses.map((s) => <div className="status-line" key={s}><span>{s}</span><div className="progress"><span style={{ width: `${applications.length ? counts[s]/applications.length*100 : 0}%`, "--fill": colors[s] } as React.CSSProperties}/></div><b>{counts[s]}</b></div>)}</div></section>
    </div>
    <section className="panel" style={{ marginTop: 16 }}><div className="panel-header"><h2>Recent applications</h2><button className="button" onClick={() => window.scrollTo({ top: 0 })}>View all</button></div><div className="panel-body recent-list">{applications.slice(0,4).map((a) => <button key={createApplicationKey(a.company,a.country,a.position)} className="recent-item" onClick={() => onView(a)} style={{ borderLeft: 0, borderRight: 0, borderTop: 0, background: "white", textAlign: "left" }}><span className="company-logo">{a.company.slice(0,1)}</span><span><strong>{a.position}</strong><small>{a.company} · {a.country}</small></span><StatusBadge status={a.status}/></button>)}</div></section>
  </>;
}

function Stat({ label, value, accent, note }: { label:string; value:number; accent:string; note:string }) {
  return <article className="stat" style={{ "--accent": accent } as React.CSSProperties}><div className="stat-top"><span>{label}</span><span className="stat-dot"/></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></article>;
}

function Applications({ applications, onAdd, onView, onDelete, onStatus }: { applications:JobApplication[]; onAdd:()=>void; onView:(a:JobApplication)=>void; onDelete:(a:JobApplication)=>void; onStatus:(a:JobApplication,s:ApplicationStatus)=>void }) {
  const [search,setSearch]=useState(""); const [country,setCountry]=useState(""); const [status,setStatus]=useState(""); const [sort,setSort]=useState("new");
  const countries=[...new Set(applications.map((a)=>a.country))].sort();
  const filtered=useMemo(()=>applications.filter((a)=>(!search||`${a.company} ${a.position}`.toLowerCase().includes(search.toLowerCase()))&&(!country||a.country===country)&&(!status||a.status===status)).sort((a,b)=>sort==="new"?b.appliedDate.localeCompare(a.appliedDate):a.appliedDate.localeCompare(b.appliedDate)),[applications,search,country,status,sort]);
  return <>
    <div className="title-row"><div><h1 className="page-title">Applications</h1><p className="page-subtitle">{applications.length} {applications.length === 1 ? "application" : "applications"}. Filter by company, country, or status.</p></div><button className="button primary" onClick={onAdd}>＋ Add application</button></div>
    <div className="toolbar"><div className="field"><label htmlFor="search">Search</label><input id="search" className="input" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search company or position…"/></div>
      <div className="field"><label htmlFor="country">Country</label><select id="country" className="select" value={country} onChange={(e)=>setCountry(e.target.value)}><option value="">All countries</option>{countries.map((c)=><option key={c}>{c}</option>)}</select></div>
      <div className="field"><label htmlFor="status">Status</label><select id="status" className="select" value={status} onChange={(e)=>setStatus(e.target.value)}><option value="">All statuses</option>{statuses.map((s)=><option key={s}>{s}</option>)}</select></div>
      <div className="field"><label htmlFor="sort">Sort by date</label><select id="sort" className="select" value={sort} onChange={(e)=>setSort(e.target.value)}><option value="new">Newest first</option><option value="old">Oldest first</option></select></div>
    </div>
    <section className="panel">{filtered.length===0?<EmptyState/>:<div className="table-wrap"><table><thead><tr><th>Company</th><th>Position</th><th>Applied date</th><th>Status</th><th>Waiting days</th><th>Actions</th></tr></thead><tbody>{filtered.map((a)=><tr key={createApplicationKey(a.company,a.country,a.position)}><td><strong>{a.company}</strong><small>{a.country}</small></td><td>{a.position}</td><td>{a.appliedDate}</td><td><select className="select" aria-label={`Update ${a.company} status`} value={a.status} onChange={(e)=>void onStatus(a,e.target.value as ApplicationStatus)} style={{ padding: 7, width: 120 }}>{statuses.map((s)=><option key={s}>{s}</option>)}</select></td><td>{waitingDays(a.appliedDate)} days</td><td><div className="actions"><button className="icon-button" aria-label="View details" onClick={()=>onView(a)}>↗</button><button className="icon-button" aria-label="Delete application" onClick={()=>onDelete(a)}>×</button></div></td></tr>)}</tbody></table></div>}</section>
  </>;
}

function AddApplication({ onCreated, onView }: { onCreated:(a:JobApplication)=>void; onView:(a:JobApplication)=>void }) {
  const [jd,setJd]=useState(""); const [parsed,setParsed]=useState<ParsedJob|null>(null); const [duplicate,setDuplicate]=useState<JobApplication|null>(null); const [dialog,setDialog]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const check=async()=>{ if(jd.trim().length<20){setError("請貼上較完整的職缺說明後再檢查。");return;} setBusy(true);setError(""); try{const result=await ruleBasedJobParser.parse(jd);setParsed(result);if(result.company&&result.country&&result.position){setDuplicate(await applicationApi.checkDuplicate(result));setDialog(true);}}catch{setError("解析職缺內容時發生錯誤，請稍後再試。");}finally{setBusy(false);}};
  const confirm=async()=>{if(!parsed)return;setBusy(true);try{const created=await applicationApi.createApplication(parsed);onCreated(created);setJd("");setParsed(null);setDialog(false);}catch{setError("新增申請紀錄失敗，請稍後再試。");}finally{setBusy(false);}};
  const incomplete=parsed&&(!parsed.company||!parsed.country||!parsed.position);
  const recheck=async()=>{if(!parsed)return;setBusy(true);try{setDuplicate(await applicationApi.checkDuplicate(parsed));setDialog(true);}finally{setBusy(false);}};
  return <>
    <div><h1 className="page-title">Add Application</h1><p className="page-subtitle">Paste the complete job description from LinkedIn or a company website. The app will extract the details and check for duplicates.</p></div>
    <section className="add-card"><div className="add-intro"><div><h2>Paste Job Description</h2><p>Checking will not add a new application.</p></div><StatusBadge status="Waiting"/></div><div className="editor">
      <label htmlFor="jd" style={{ position:"absolute",left:"-10000px" }}>Paste Job Description</label><textarea id="jd" className="textarea" value={jd} onChange={(e)=>{setJd(e.target.value);setParsed(null);setError("");}} placeholder={"Paste the full job description here…\n\nExample:\nCompany: Hostaway\nLocation: Finland\nPosition: Senior Frontend Engineer"}/>
      {error&&<div style={{marginTop:14}}><ErrorState message={error}/></div>}
      {parsed&&<div className="parsed-fields"><div className="field"><label htmlFor="parsed-company">Company</label><input id="parsed-company" className="input" value={parsed.company} onChange={(e)=>setParsed({...parsed,company:e.target.value})}/></div><div className="field"><label htmlFor="parsed-country">Country</label><input id="parsed-country" className="input" value={parsed.country} onChange={(e)=>setParsed({...parsed,country:e.target.value})}/></div><div className="field"><label htmlFor="parsed-position">Position</label><input id="parsed-position" className="input" value={parsed.position} onChange={(e)=>setParsed({...parsed,position:e.target.value})}/></div></div>}
      {incomplete&&<div className="notice">部分資訊無法準確擷取，請確認上方欄位後再次檢查。</div>}
      <div className="editor-footer"><small>{jd.length.toLocaleString()} characters · 規則式解析器，可在未來替換成 AI Parser</small>{parsed?<button className="button primary" disabled={busy||!parsed.company||!parsed.country||!parsed.position} onClick={()=>void recheck()}>{busy?"正在檢查…":"Check again"}</button>:<button className="button primary" disabled={busy||!jd.trim()} onClick={()=>void check()}>{busy?"正在解析…":"Check Application →"}</button>}</div>
    </div></section>
    {dialog&&parsed&&<ApplicationCheckDialog parsed={parsed} duplicate={duplicate} busy={busy} onClose={()=>setDialog(false)} onConfirm={()=>void confirm()} onView={(a)=>{setDialog(false);onView(a);}}/>}
  </>;
}

function ApplicationDetail({ application, onBack, onDelete, onStatus }: { application:JobApplication; onBack:()=>void; onDelete:(a:JobApplication)=>void; onStatus:(a:JobApplication,s:ApplicationStatus)=>void }) {
  return <><div className="title-row"><div><button className="button" onClick={onBack}>← Back to applications</button><h1 className="page-title" style={{marginTop:24}}>申請詳細資料</h1></div><button className="button danger" onClick={()=>onDelete(application)}>刪除紀錄</button></div>
    <section className="detail-card"><div className="detail-hero"><div className="company-logo">{application.company.slice(0,1)}</div><div><h2>{application.position}</h2><p>{application.company} · {application.country}</p></div></div>
      <div className="detail-grid"><div><span>Company</span><strong>{application.company}</strong></div><div><span>Country</span><strong>{application.country}</strong></div><div><span>Applied date</span><strong>{application.appliedDate}</strong></div><div><span>Waiting days</span><strong>{waitingDays(application.appliedDate)} days</strong></div><div><span>Current status</span><StatusBadge status={application.status}/></div><div className="field"><label htmlFor="detail-status">更新狀態</label><select id="detail-status" className="select" value={application.status} onChange={(e)=>void onStatus(application,e.target.value as ApplicationStatus)}>{statuses.map((s)=><option key={s}>{s}</option>)}</select></div></div>
    </section></>;
}
