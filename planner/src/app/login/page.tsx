import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "./LoginForm";
import { LOGIN_IMAGE, PHOTO_PHRASE, SIDE_PHRASE, TAGLINE } from "./config";

export const metadata: Metadata = { title: "Sign in · The Wedding Room" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]">
      {/* The photograph: a short strip on phones (gone on the smallest), a tall column on desktop. */}
      <div aria-hidden className="relative hidden h-44 overflow-hidden min-[380px]:block lg:h-auto lg:min-h-screen">
        <Image src={LOGIN_IMAGE} alt="" fill priority sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover object-[50%_60%]" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />
        <p className="absolute bottom-4 left-5 right-5 font-script text-2xl leading-tight text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.4)] lg:bottom-9 lg:left-8 lg:text-[2.1rem] [text-wrap:balance]">{PHOTO_PHRASE}</p>
      </div>

      <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-8 lg:px-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/botanical-accent.webp" width={350} height={420} alt="" aria-hidden className="pointer-events-none absolute -left-4 top-6 hidden h-32 w-auto -rotate-12 -scale-x-100 opacity-40 lg:block" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/botanical-accent.webp" width={350} height={420} alt="" aria-hidden className="pointer-events-none absolute -bottom-6 -right-4 hidden h-64 w-auto rotate-[8deg] opacity-40 lg:block" />

        <div className="relative flex w-full flex-col items-center">
          <div className="mb-7 text-center">
            <p className="text-[11px] uppercase tracking-[0.32em] text-ink">The</p>
            <p className="font-serif text-[2.1rem] font-light uppercase leading-[1.05] tracking-[0.06em] text-ink sm:text-[2.5rem]">Wedding Room</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.26em] text-sage-deep">{TAGLINE}</p>
          </div>

          <LoginForm />

          <p aria-hidden className="mt-8 text-center font-script text-2xl leading-[1.15] text-sage-deep xl:absolute xl:right-2 xl:top-2 xl:mt-0 xl:-rotate-3 xl:text-right xl:text-3xl">
            {SIDE_PHRASE.map((l) => (
              <span key={l} className="block">{l}</span>
            ))}
          </p>
        </div>
      </section>
    </main>
  );
}
