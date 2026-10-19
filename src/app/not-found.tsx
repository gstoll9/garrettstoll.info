'use client'
import Image from "next/image";
import Link from "next/link";
import StandardLayout from "@/layouts/standardLayout";

export default function NotFound() {
  const main = (
    <div style={{ display: "grid", placeItems: "center", textAlign: "center", padding: "2rem 0" }}>
      <Image
        src="/TyroImages/PuppyEyes.png"
        alt="Tyro the cat lying on his back, looking up apologetically"
        width={320}
        height={222}
        style={{ width: "min(320px, 80%)", height: "auto" }}
        priority
      />
      <p style={{ margin: "1.5rem 0 0.25rem", color: "var(--brand)", fontWeight: 700, letterSpacing: "0.1em", fontSize: "0.8rem" }}>
        404
      </p>
      <h1 style={{ margin: 0 }}>Tyro looked everywhere.</h1>
      <p style={{ maxWidth: "42ch", color: "var(--text-secondary)" }}>
        He couldn&apos;t find this page — but he&apos;s very sorry about it. Maybe try the home page?
      </p>
      <Link
        href="/"
        style={{
          marginTop: "0.75rem",
          padding: "0.65rem 1.2rem",
          borderRadius: 999,
          background: "var(--brand)",
          color: "#fff",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Take me home
      </Link>
    </div>
  );

  return StandardLayout({ title: "Not found", main });
}
