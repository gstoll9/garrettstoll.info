"use client"
import Header from "./header";
import "./styles/StandardLayout.css";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

interface StandardLayoutProps {
  title?: string;
  main: React.ReactNode;
  headerMode?: 'full' | 'tyro-only' | 'none';
  /** 'card' wraps content in a centered surface; 'plain' leaves the page to lay itself out. */
  variant?: 'card' | 'plain';
  /** Top-left image in the 'full' header; defaults to Tyro. */
  brandImage?: string;
}

function StandardLayout({ title, main, headerMode = 'full', variant = 'card', brandImage }: StandardLayoutProps) {
  const [introDancing, setIntroDancing] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIntroDancing(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`container0 container0--${headerMode}`}>
      {headerMode === 'full' && <Header title={title} brandImage={brandImage} />}
      {headerMode === 'tyro-only' && (
        <div className="tyro-home-link">
          <Link href="/" aria-label="Back to home" title="Back to home">
            <Image
              src="/TyroImages/TyroAvatar.png"
              alt=""
              width={96}
              height={96}
              className={`tyro-home-image${introDancing ? ' tyro-intro-dance' : ''}`}
            />
          </Link>
        </div>
      )}
      <main className={`standardlayout-main standardlayout-main--${variant}`}>
        {main}
      </main>
    </div>
  );
}

export default StandardLayout;
