import type { SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

/* ─── Navigation Icons ─── */

export function TodayIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <circle cx="12" cy="14.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AllTasksIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

export function CalendarIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M3 9h18M8 2v4M16 2v4M8 13h2M12 13h2M16 13h2M8 17h2M12 17h2" />
    </svg>
  );
}

export function ReviewIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

export function AnalyticsIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

export function ChatIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

export function SettingsIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* ─── Actions & Controls ─── */

export function PlusIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function SearchIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export function CheckIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function TrashIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export function PencilIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487z" />
    </svg>
  );
}

export function RefreshIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

export function SparklesIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

export function EyeIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

export function KeyIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.5 12.5L20 3M17 6l2.5 2.5M14 9l2 2" />
    </svg>
  );
}

export function ShieldIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function BellIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

export function ClockIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

export function ArrowRightIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export function CloseIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function ExternalLinkIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

export function CheckCircleIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

export function AlertCircleIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

export function SpinnerIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 2.5,
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={`animate-spin ${className}`}
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/* ─── Brand & Provider Logos ─── */

export function BrandLogo({
  className = "w-5 h-5",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      {...props}
    >
      <defs>
        <linearGradient id="brandLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5B5BD6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#brandLogoGrad)" />
      <path
        d="M5.5 14h3.2a3.3 3.3 0 006.6 0h3.2v2.5a2 2 0 01-2 2h-9a2 2 0 01-2-2V14z"
        fill="white"
        fillOpacity="0.25"
      />
      <path
        d="M5 13.5h3.6a3.4 3.4 0 006.8 0H19"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 6v6m-2.75-2.75L12 12l2.75-2.75"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GoogleIcon({
  className = "w-5 h-5",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2 0 10.04 0 12s.46 3.8 1.27 5.42l4.01-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export function GmailIcon({
  className = "w-5 h-5",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      <path
        fill="#4285F4"
        d="M20 18h-2V9.86L12 14.6 6 9.86V18H4a2 2 0 01-2-2V7.4c0-1.78 2-2.83 3.46-1.78L12 10.4l6.54-4.78C20 4.57 22 5.62 22 7.4V16a2 2 0 01-2 2z"
      />
      <path
        fill="#EA4335"
        d="M18 5.62L12 10.4 6 5.62c-.9-.66-2-.8-2.54-.22v2L12 13l8.54-5.6v-2c-.54-.58-1.64-.44-2.54.22z"
      />
      <path
        fill="#34A853"
        d="M20 18a2 2 0 002-2V7.4c0-.44-.13-.85-.35-1.2L18 9.86V18h2z"
      />
      <path
        fill="#FBBC05"
        d="M2.35 6.2C2.13 6.55 2 6.96 2 7.4V16a2 2 0 002 2h2V9.86L2.35 6.2z"
      />
    </svg>
  );
}

export function GeminiSparkleIcon({
  className = "w-5 h-5",
  fill = "url(#geminiSparkleGradient)",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      {...props}
    >
      <defs>
        <linearGradient id="geminiSparkleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4A88F6" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#DB2777" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C12 7.523 7.523 12 2 12C7.523 12 12 16.477 12 22C12 16.477 16.477 12 22 12C16.477 12 12 7.523 12 2Z"
        fill={fill}
      />
    </svg>
  );
}

/* ─── Productivity & View Icons ─── */

export function KanbanIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="9.5" y="4" width="5" height="11" rx="1.5" />
      <rect x="16" y="4" width="5" height="14" rx="1.5" />
    </svg>
  );
}

export function MatrixIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  );
}

export function ListIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

export function PlayIcon({
  className = "w-5 h-5",
  fill = "currentColor",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={className}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}

export function PauseIcon({
  className = "w-5 h-5",
  fill = "currentColor",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={className}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

export function TimerIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <line x1="10" y1="2" x2="14" y2="2" />
      <line x1="12" y1="14" x2="15" y2="11" />
      <circle cx="12" cy="14" r="8" />
    </svg>
  );
}

export function MailReplyIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

export function CopyIcon({
  className = "w-5 h-5",
  stroke = "currentColor",
  strokeWidth = 1.8,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/* ─── Aliases for Developer Convenience ─── */
export { CloseIcon as XIcon, PencilIcon as EditIcon };
