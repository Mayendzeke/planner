import { GraduationCap } from "lucide-react";

export default function SplashScreen({ theme = "dark" }: { theme?: "dark" | "light" }) {
  return <main className="splash-screen" data-theme={theme} role="status" aria-live="polite" aria-busy="true" aria-label="Studyspace is loading">
    <div className="splash-glow splash-glow-a" />
    <div className="splash-glow splash-glow-b" />
    <div className="splash-content">
      <div className="splash-logo-wrap">
        <svg className="splash-liquid-logo" viewBox="0 0 120 100" role="img" aria-label="Studyspace graduation cap logo">
          <defs>
            <clipPath id="cap-fill-clip">
              <path d="M8 34 60 10l52 24-52 25L8 34Zm16 10v24c20 14 52 14 72 0V44L60 66 24 44Zm88-10v30" />
            </clipPath>
            <linearGradient id="studyspace-liquid" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#9cebd8" />
              <stop offset="55%" stopColor="#70b9ff" />
              <stop offset="100%" stopColor="#a993ff" />
            </linearGradient>
          </defs>
          <g clipPath="url(#cap-fill-clip)">
            <rect className="splash-liquid" x="0" y="100" width="120" height="100" fill="url(#studyspace-liquid)" />
            <path className="splash-wave" d="M0 56 Q15 48 30 56 T60 56 T90 56 T120 56 V100 H0Z" fill="rgba(255,255,255,.25)" />
          </g>
          <path d="M8 34 60 10l52 24-52 25L8 34Zm16 10v24c20 14 52 14 72 0V44L60 66 24 44Zm88-10v30" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M108 35v27" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="108" cy="66" r="4" fill="#9cebd8" className="splash-tassel" />
        </svg>
        <span className="splash-orbit splash-orbit-one" />
        <span className="splash-orbit splash-orbit-two" />
      </div>
      <div className="splash-wordmark">studyspace<span>.</span></div>
      <div className="splash-loading-track"><span /></div>
    </div>
  </main>;
}
