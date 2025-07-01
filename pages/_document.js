// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Import Poppins font from Google Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        
        {/* 1) Pull in Tailwind from the CDN */}
        <script src="https://cdn.tailwindcss.com"></script>
        {/* 2) Restore custom Tailwind theme colors */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                theme: {
                  extend: {
                    colors: {
                      'rose-pink': '#F9C2D9',
                      'soft-lavender': '#E8D4F1',
                      'cream': '#FFF8F0',
                    },
                    fontFamily: {
                      sans: ['Poppins', 'Arial', 'Helvetica', 'sans-serif'],
                    },
                  },
                },
              }
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
