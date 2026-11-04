const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24', 'aria-hidden': true };

export const IconSearch = () => (
  <svg {...base} width="20" height="20"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IconDownload = () => (
  <svg {...base}><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" /></svg>
);
export const IconPrint = () => (
  <svg {...base}><path d="M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v6H7z" /></svg>
);
export const IconSheet = () => (
  <svg {...base}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 9h16M4 15h16M10 3v18" /></svg>
);
export const IconEdit = () => (
  <svg {...base}><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" /></svg>
);
export const IconBox = () => (
  <svg {...base}><path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10" /></svg>
);
export const IconCheck = () => (
  <svg {...base} width="16" height="16" strokeWidth={3}><path d="m5 12 5 5 9-10" /></svg>
);
export const IconFilter = () => (
  <svg {...base}><path d="M4 5h16l-6 7v6l-4 2v-8L4 5z" /></svg>
);
export const IconFile = () => (
  <svg {...base}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" /><path d="M14 3v6h6" /></svg>
);
export const LogoMark = () => (
  <span className="logo-mark">
    <svg viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="11" fill="none" stroke="white" strokeWidth="2.4" />
      <path d="M5 16h22M16 5c-5 6-5 16 0 22M16 5c5 6 5 16 0 22" stroke="white" strokeWidth="2" fill="none" />
    </svg>
  </span>
);
