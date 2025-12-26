import type { AppProps } from 'next/app'
import { Geist, Geist_Mono } from "next/font/google"
import '../styles/globals.css'

const geist = Geist({ subsets: ["latin"] })
const geistMono = Geist_Mono({ subsets: ["latin"] })

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <style jsx global>{`
        :root {
          --font-geist: ${geist.style.fontFamily};
          --font-geist-mono: ${geistMono.style.fontFamily};
        }
      `}</style>
      <main className={`font-sans antialiased ${geist.className}`}>
        <Component {...pageProps} />
      </main>
    </>
  )
}
