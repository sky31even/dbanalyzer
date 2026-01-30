/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        doubanBlue: "#2AA3F4",
        doubanGreen: "#2FA44F",
        doubanPeach: "#F6C28B",
        doubanBg: "#EEF7F2"
      },
      fontFamily: {
        sans: [
          '"Noto Sans SC"',
          '"Source Han Sans SC"',
          '"Source Han Sans"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'system-ui',
          'sans-serif'
        ],
        qiuHong: [
          '"YanShiQiuHongKai"',
          '"演示秋鸿楷"',
          '"KaiTi"',
          '"STKaiti"',
          '"楷体"',
          'serif'
        ]
      }
    },
  },
  plugins: [],
}
