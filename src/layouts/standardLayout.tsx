import Header from "./header";
import "./styles/StandardLayout.css";

interface StandardLayoutProps {
  title?: string;
  main: React.ReactNode;
}

function StandardLayout({ title, main }: StandardLayoutProps) {
  return (
    <>
      <Header title={title} />
      <main className="standardlayout-main">
        {main}
      </main>
    </>
  );
}

export default StandardLayout;