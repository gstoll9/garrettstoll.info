"use client"
import "./styles/header.css";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

type HeaderProps = {
  title?: string;
}

const NAV_LINKS = [
  { href: "/#work", label: "Work" },
  { href: "/#experience", label: "Experience" },
  { href: "/#skills", label: "Skills" },
];

function Header({ title }: HeaderProps) {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="site-header-inner">
        <Link href="/" className="site-brand" aria-label="Garrett Stoll — home">
          <span className="site-brand-avatar">
            <Image
              src="/TyroImages/TyroAvatar.png"
              alt=""
              width={96}
              height={96}
              className="site-brand-tyro"
            />
          </span>
          <span className="site-brand-name">Garrett Stoll</span>
        </Link>
        {title && (
          <>
            <span className="site-crumb-sep" aria-hidden="true">/</span>
            <span className="site-crumb">{title}</span>
          </>
        )}
        <nav className="site-nav" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="site-nav-link">{l.label}</Link>
          ))}
          <a href="mailto:garrettstoll@gmail.com" className="site-nav-cta">Contact</a>
        </nav>
      </div>
    </header>
  );
}

export default Header;
