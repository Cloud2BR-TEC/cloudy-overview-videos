import { useEffect, useState } from 'react'

// Mouth paths – face centred on (60, 64), viewBox 0 0 120 95
const TALK_FRAMES = [
  { d: 'M51 66 Q60 70 69 66', fill: 'none' },
  { d: 'M52 65 Q60 70 68 65 Q60 68 52 65Z', fill: '#e8695a' },
  { d: 'M51 64 Q60 73 69 64 Q60 70 51 64Z', fill: '#d64f3d' },
  { d: 'M50 63 Q60 75 70 63 Q60 71 50 63Z', fill: '#c43830' },
  { d: 'M52 64 Q60 73 68 64 Q60 70 52 64Z', fill: '#d64f3d' },
  { d: 'M52 65 Q60 70 68 65 Q60 68 52 65Z', fill: '#e8695a' },
]

export default function CloudyAvatar({
  speaking = false,
  size = 78,
}: {
  speaking?: boolean
  size?: number
}) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!speaking) { setFrame(0); return }
    const interval = window.setInterval(() => setFrame((f) => (f + 1) % TALK_FRAMES.length), 85)
    return () => window.clearInterval(interval)
  }, [speaking])

  const mouth = TALK_FRAMES[frame]
  const showTeeth = frame >= 2
  const uid = size.toString()

  return (
    <svg
      viewBox="0 0 120 95"
      width={size}
      height={Math.round(size * 95 / 120)}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', overflow: 'hidden' }}
      aria-label="Cloudy"
    >
      <defs>
        {/* Drop shadow for whole cloud */}
        <filter id={`shadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation={speaking ? '4' : '2.5'} result="blur" />
          <feFlood floodColor={speaking ? '#f5a975' : '#8aaaba'} floodOpacity="0.5" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="shadow" />
          <feOffset dx="0" dy={speaking ? '3' : '4'} result="offsetShadow" />
          <feMerge><feMergeNode in="offsetShadow" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>

        {/* 3-D sphere gradient – main top puff (brightest) */}
        <radialGradient id={`puff-a-${uid}`} cx="36%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#f6f7f8" />
          <stop offset="100%" stopColor="#c8d2d8" />
        </radialGradient>
        {/* Bottom fill */}
        <linearGradient id={`bottom-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ecedef" />
          <stop offset="100%" stopColor="#c4ccd2" />
        </linearGradient>

        {showTeeth && (
          <clipPath id={`mc-${uid}`}>
            <path d={mouth.d} />
          </clipPath>
        )}
      </defs>

      {/* ── Continuous cloud body ── */}
      <g filter={`url(#shadow-${uid})`}>
        <path
          d="M18 88 C8 84 7 69 15 61 C20 56 26 54 32 56 C34 44 44 35 55 35 C67 35 77 43 79 54 C85 50 94 51 100 57 C112 69 106 88 93 91 C72 95 42 95 20 91 Z"
          fill={`url(#puff-a-${uid})`}
          stroke="rgba(150,165,175,0.2)"
          strokeWidth="2"
        />
        <path d="M17 78 C34 87 84 88 103 77 C100 90 93 93 60 93 C29 93 20 90 17 78 Z" fill={`url(#bottom-${uid})`} opacity="0.58" />

        {/* Specular highlights */}
        <ellipse cx="51" cy="38" rx="7" ry="4.5" fill="rgba(255,255,255,0.75)" transform="rotate(-18 51 38)" />
        <ellipse cx="30" cy="65" rx="6" ry="3.5" fill="rgba(255,255,255,0.48)" transform="rotate(-18 30 65)" />
        <ellipse cx="87" cy="60" rx="5" ry="3" fill="rgba(255,255,255,0.42)" transform="rotate(-18 87 60)" />
      </g>

      {/* ── Graduation cap ── */}
      <g transform="translate(60,19) rotate(-4)">
        {/* Dome base */}
        <ellipse cx="0" cy="7" rx="18" ry="9" fill="#18182c" />
        {/* Mortarboard flat top */}
        <rect x="-25" y="-2" width="50" height="10" rx="3.5" fill="#1e1e30" />
        {/* Highlight strip on top */}
        <rect x="-24" y="-1" width="48" height="2.5" rx="2" fill="rgba(255,255,255,0.13)" />
        {/* Centre button */}
        <circle cx="0" cy="-2" r="3" fill="#13132a" />
        {/* Tassel cord */}
        <line x1="0" y1="-2" x2="25" y2="6" stroke="#f5a975" strokeWidth="2" strokeLinecap="round" />
        {/* Tassel pompon */}
        <circle cx="26" cy="7" r="3.5" fill="#f5a975" />
        {/* Tassel fringe */}
        <line x1="24" y1="10" x2="22" y2="17" stroke="#f5a975" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="26" y1="11" x2="26" y2="18" stroke="#f5a975" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="28" y1="10" x2="30" y2="17" stroke="#f5a975" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* ── Glasses ── */}
      {/* Left lens */}
      <circle cx="49" cy="54" r="11" fill="rgba(195,225,248,0.42)" stroke="#1e1e36" strokeWidth="2.8" />
      {/* Right lens */}
      <circle cx="71" cy="54" r="11" fill="rgba(195,225,248,0.42)" stroke="#1e1e36" strokeWidth="2.8" />
      {/* Nose bridge */}
      <path d="M60 54 Q60 51 60 54" stroke="#1e1e36" strokeWidth="0" />
      <path d="M59.2 53.5 Q60 52 60.8 53.5" fill="none" stroke="#1e1e36" strokeWidth="2.4" />
      {/* Temple arms */}
      <line x1="38" y1="52" x2="41" y2="54" stroke="#1e1e36" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="82" y1="52" x2="79" y2="54" stroke="#1e1e36" strokeWidth="2.2" strokeLinecap="round" />
      {/* Lens glare / specular */}
      <ellipse cx="46" cy="51" rx="3.5" ry="2.2" fill="rgba(255,255,255,0.72)" transform="rotate(-22 46 51)" />
      <ellipse cx="68" cy="51" rx="3.5" ry="2.2" fill="rgba(255,255,255,0.72)" transform="rotate(-22 68 51)" />

      {/* ── Eyes (large black pupils like the reference) ── */}
      <circle cx="49" cy="54" r="4.5" fill="#0d0d18" />
      <circle cx="71" cy="54" r="4.5" fill="#0d0d18" />
      <circle cx="50.5" cy="52.5" r="1.7" fill="white" />
      <circle cx="72.5" cy="52.5" r="1.7" fill="white" />

      {/* ── Cheeks ── */}
      <ellipse cx="40" cy="63" rx="7" ry="4.5" fill="rgba(255,170,170,0.35)" />
      <ellipse cx="80" cy="63" rx="7" ry="4.5" fill="rgba(255,170,170,0.35)" />

      {/* ── Mouth ── */}
      {showTeeth && <path d={mouth.d} fill="#7a1a10" />}
      {showTeeth && (
        <rect x="54" y="65" width="12" height="5" rx="1.5" fill="white" clipPath={`url(#mc-${uid})`} />
      )}
      <path d={mouth.d} fill={mouth.fill} stroke="#a82e20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
