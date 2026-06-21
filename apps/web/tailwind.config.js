/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F6F7F9",
        card: "#FFFFFF",
        accent: "#5B5BD6",
        "accent-tint": "#ECEDFB",
        text: "#1A1B23",
        sub: "#6B7280",
        muted: "#9CA3AF",
        border: "#E8EAED",
        danger: "#EF4444",
        amber: "#F59E0B",
        green: "#10B981"
      },
      borderRadius: { card: "15px", btn: "10px", pill: "8px" },
      boxShadow: { card: "0 3px 10px rgba(16,18,31,.06)" },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] }
    }
  },
  plugins: []
};
