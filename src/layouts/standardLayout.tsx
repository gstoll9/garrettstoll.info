import Header from "./header";
import "./styles/StandardLayout.css";
import Image from "next/image";
import Link from "next/link";

interface StandardLayoutProps {
  title?: string;
  main: React.ReactNode;
  headerMode?: 'full' | 'tyro-only' | 'none';
}

function StandardLayout({ title, main, headerMode = 'full' }: StandardLayoutProps) {
  return (
    <div className="container0">
      {headerMode === 'full' && <Header title={title} />}
      {headerMode === 'tyro-only' && (
        <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 1000 }}>
          <Link href="/">
            <Image
              src="/TyroImages/PuppyEyes.png"
              alt="Home"
              width={60}
              height={60}
              style={{
                transition: "transform 0.2s",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
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