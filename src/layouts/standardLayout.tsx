import Header from "./header";
import "./styles/StandardLayout.css";

interface StandardLayoutProps {
  title?: string;
  main: React.ReactNode;
}

function StandardLayout({ title, main }: StandardLayoutProps) {
  return (
    <div className="container0">
      <Header title={title} />
      <main className="standardlayout-main">
        {main}
      </main>
    </div>
  );
}

export default StandardLayout;