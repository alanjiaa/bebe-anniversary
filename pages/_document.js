// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* 1) Pull in Tailwind from the CDN */}
        <script src="https://cdn.tailwindcss.com"></script>

        {/* 2) Immediately configure your custom theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                theme: {
                  extend: {
                    colors: {
                      'rose-pink': '#F9C2D9',
                      'soft-lavender': '#E8D4F1',
                      'cream': '#FFF8F0'
                    },
                    fontFamily: {
                      script: ['"Dancing Script"', 'cursive'],
                      sans: ['Inter','sans-serif']
                    }
                  }
                }
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
