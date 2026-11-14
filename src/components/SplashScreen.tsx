type Props = { theme?: "dark" | "light"; displayName?: string };

export default function SplashScreen({ theme = "dark", displayName = "" }: Props) {
  const name = displayName.trim();
  return (
    <main className="studyspace-splash" data-theme={theme} role="status" aria-live="polite" aria-busy="true" aria-label="Study Space is loading">
      <div className="studyspace-splash-glow studyspace-splash-glow-one" />
      <div className="studyspace-splash-glow studyspace-splash-glow-two" />
      <div className="studyspace-splash-content">
        <div className="studyspace-splash-logo-stage">
          <svg className="studyspace-splash-logo" viewBox="0 0 512 512" role="img" aria-label="Study Space graduation cap logo">
            <defs>
              <linearGradient id="studyspace-brand-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#927df5" />
                <stop offset="100%" stopColor="#5d45c8" />
              </linearGradient>
            
            <linearGradient id="studyspace-cap-water-gradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#41bfa7" />
              <stop offset="55%" stopColor="#69d5d0" />
              <stop offset="100%" stopColor="#a9c9ff" />
            </linearGradient>
            <clipPath id="studyspace-cap-water-clip">
              <path d="M112 215 256 143 400 215 256 288Z" />
              <path d="M164 244 L164 322 C164 339 205 364 256 364 C307 364 348 339 348 322 L348 244 L256 288Z" />
            </clipPath>
</defs>
            <rect className="studyspace-logo-colour" x="8" y="8" width="496" height="496" rx="112" fill="url(#studyspace-brand-gradient)" />
            <g className="studyspace-logo-sketch" fill="none" stroke="currentColor" strokeWidth="23" strokeLinecap="round" strokeLinejoin="round">
              <rect className="studyspace-logo-frame" x="8" y="8" width="496" height="496" rx="112" />
              <path className="studyspace-logo-cap-sketch" d="M112 215 256 143 400 215 256 288 112 215Z" />
              <path className="studyspace-logo-cap-sketch" d="M164 246v76c0 17 41 42 92 42s92-25 92-42v-76" />
              <path className="studyspace-logo-cap-sketch" d="M400 215v112" />
            </g>
            
            <g className="studyspace-cap-water-fill" clipPath="url(#studyspace-cap-water-clip)">
              <rect x="100" y="140" width="312" height="224" fill="url(#studyspace-cap-water-gradient)" opacity=".94" />
              <path className="studyspace-cap-water-wave" d="M102 180 C135 169 161 190 195 180 S254 169 286 180 S354 190 410 177 L410 207 C374 217 348 198 316 208 S252 218 218 207 S152 199 102 211Z" fill="#e5fff7" opacity=".5" />
              <g className="studyspace-cap-water-bubbles" fill="#fff" opacity=".72">
                <circle cx="220" cy="286" r="5" />
                <circle cx="285" cy="320" r="3.5" />
                <circle cx="330" cy="264" r="4" />
              </g>
            </g>
<g className="studyspace-logo-finish" fill="none" stroke="#fff" strokeWidth="23" strokeLinecap="round" strokeLinejoin="round">
              <path d="M112 215 256 143 400 215 256 288 112 215Z" />
              <path d="M164 246v76c0 17 41 42 92 42s92-25 92-42v-76" />
              <path d="M400 215v112" />
            </g>
            <g className="studyspace-splash-pencil" aria-hidden="true">
              <path d="M0 0 12-12 34 10 22 22Z" fill="#f5d58a" stroke="#6e5a37" strokeWidth="2" />
              <path d="m0 0-5 17 17-5" fill="#f1d8ad" stroke="#6e5a37" strokeWidth="2" />
              <path d="m-5 17 7-2-5-5Z" fill="#4b4651" />
              <path d="m12-12 5-5 22 22-5 5Z" fill="#c4c9d3" stroke="#6e5a37" strokeWidth="2" />
            </g>
          </svg>
          <span className="studyspace-splash-halo" />
        </div>
        <div className="studyspace-splash-wordmark">Study Space<span>.</span></div>
        <div className="studyspace-splash-divider" />
        <p className="studyspace-splash-welcome">{name ? `Welcome, ${name}` : "Your learning companion"}</p>
        <p className="studyspace-splash-tagline">A focused space for learning, teaching and progress.</p>
        <div className="studyspace-splash-progress" aria-hidden="true"><span /></div>
        <span className="studyspace-splash-status">PREPARING YOUR LEARNING SPACE</span>
        <span className="studyspace-splash-footnote">ESWATINI · LEARN · GROW · ACHIEVE</span>
      </div>
    </main>
  );
}
