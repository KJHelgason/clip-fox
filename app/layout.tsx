import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import './globals.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Clipper",
  description: "Video editing application with clip editing, elements overlay, and export functionality",
};

// Google Fonts URL - all fonts used in the text element editor
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Alegreya:wght@400;700&family=Alfa+Slab+One&family=Anton&family=Archivo+Black&family=Arimo:wght@400;700&family=Arvo:wght@400;700&family=Asap:wght@400;700&family=Assistant:wght@400;700&family=Bangers&family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@400;700&family=Be+Vietnam+Pro:wght@400;600;700&family=Bebas+Neue&family=Bitter:wght@400;700&family=Black+Ops+One&family=Bodoni+Moda:wght@400;700&family=Boogaloo&family=Bungee&family=Cabin:wght@400;700&family=Cairo:wght@400;700&family=Caveat:wght@400;700&family=Chakra+Petch:wght@400;700&family=Chewy&family=Cinzel:wght@400;700&family=Comfortaa:wght@400;700&family=Concert+One&family=Cormorant+Garamond:wght@400;700&family=Creepster&family=Crimson+Text:wght@400;700&family=Dancing+Script:wght@400;700&family=DM+Sans:wght@400;500;700&family=DM+Serif+Display&family=Dosis:wght@400;700&family=EB+Garamond:wght@400;700&family=Exo+2:wght@400;700&family=Fira+Sans:wght@400;700&family=Fjalla+One&family=Fredoka+One&family=Fugaz+One&family=Gloria+Hallelujah&family=Great+Vibes&family=Heebo:wght@400;700&family=Inconsolata:wght@400;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&family=Josefin+Sans:wght@400;700&family=Kanit:wght@400;700&family=Karla:wght@400;700&family=Kaushan+Script&family=Lato:wght@400;700&family=Lexend:wght@400;700&family=Libre+Baskerville:wght@400;700&family=Libre+Franklin:wght@400;700&family=Lilita+One&family=Lobster&family=Lobster+Two:wght@400;700&family=Lora:wght@400;700&family=Luckiest+Guy&family=Manrope:wght@400;700&family=Marcellus&family=Merriweather:wght@400;700&family=Montserrat:wght@400;600;700&family=Mukta:wght@400;700&family=Mulish:wght@400;700&family=Noto+Sans:wght@400;700&family=Noto+Serif:wght@400;700&family=Nunito:wght@400;700&family=Nunito+Sans:wght@400;700&family=Old+Standard+TT:wght@400;700&family=Open+Sans:wght@400;600;700&family=Orbitron:wght@400;700&family=Oswald:wght@400;700&family=Outfit:wght@400;700&family=Overpass:wght@400;700&family=Pacifico&family=Patrick+Hand&family=Permanent+Marker&family=Philosopher:wght@400;700&family=Play:wght@400;700&family=Playfair+Display:wght@400;700&family=Plus+Jakarta+Sans:wght@400;700&family=Poppins:wght@400;500;600;700&family=Press+Start+2P&family=Prompt:wght@400;700&family=PT+Sans:wght@400;700&family=PT+Serif:wght@400;700&family=Quicksand:wght@400;700&family=Rajdhani:wght@400;700&family=Raleway:wght@400;700&family=Red+Hat+Display:wght@400;700&family=Righteous&family=Roboto:wght@400;500;700&family=Roboto+Condensed:wght@400;700&family=Roboto+Mono:wght@400;700&family=Roboto+Slab:wght@400;700&family=Rock+Salt&family=Rubik:wght@400;700&family=Russo+One&family=Sacramento&family=Satisfy&family=Secular+One&family=Shadows+Into+Light&family=Signika:wght@400;700&family=Slabo+27px&family=Source+Code+Pro:wght@400;700&family=Source+Sans+Pro:wght@400;700&family=Source+Serif+Pro:wght@400;700&family=Space+Grotesk:wght@400;700&family=Space+Mono:wght@400;700&family=Spectral:wght@400;700&family=Staatliches&family=Teko:wght@400;700&family=Titillium+Web:wght@400;700&family=Ubuntu:wght@400;700&family=Ubuntu+Mono:wght@400;700&family=Urbanist:wght@400;700&family=Varela+Round&family=VT323&family=Work+Sans:wght@400;700&family=Yanone+Kaffeesatz:wght@400;700&family=Zilla+Slab:wght@400;700&display=swap";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={GOOGLE_FONTS_URL} rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
