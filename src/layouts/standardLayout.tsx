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
}

function StandardLayout({ title, main, headerMode = 'full' }: StandardLayoutProps) {
  const [introDancing, setIntroDancing] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIntroDancing(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container0">
      {headerMode === 'full' && <Header title={title} />}
      {headerMode === 'tyro-only' && (
        <div className="tyro-home-link">
          <Link href="/">
            <Image
              src="/TyroImages/PuppyEyes.png"
              alt="Home"
              width={60}
              height={60}
              className={`tyro-home-image${introDancing ? ' tyro-intro-dance' : ''}`}
              unoptimized
            />
          </Link>
        </div>
      )}
      <main className="standardlayout-main">
        {main}
      </main>
    </div>
  );
}

export default StandardLayout;