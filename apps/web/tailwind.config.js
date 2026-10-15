/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F6F7F9",
        card: "#FFFFFF",
        surface: "#F9FAFB",
        accent: "#5B5BD6",
        "accent-hover": "#4A4AC4",
        "accent-active": "#3E3EB5",
        "accent-tint": "#ECEDFB",
        "accent-subtle": "#F5F6FE",
        text: "#1A1B23",
        sub: "#6B7280",
        muted: "#9CA3AF",
        border: "#E8EAED",
        "border-subtle": "#F0F2F5",
        danger: "#EF4444",
        amber: "#F59E0B",
        green: "#10B981"
      },
      borderRadius: { card: "15px", btn: "10px", pill: "8px" },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        "card-hover": "0 6px 16px -2px rgba(0, 0, 0, 0.07), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
        elevated: "0 12px 32px -4px rgba(16, 24, 40, 0.08), 0 4px 12px -2px rgba(16, 24, 40, 0.04)"
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] }
    }
  },
  plugins: []
};
