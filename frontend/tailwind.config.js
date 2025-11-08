module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(40px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        slideUp: "slideUp 0.8s ease-out",
        fadeIn: "fadeIn 1.2s ease-in",
        pulse: "pulse 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
