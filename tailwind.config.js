/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // src 폴더 내부의 모든 JSX/JS 파일을 감시
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}