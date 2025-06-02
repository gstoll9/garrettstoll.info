import Header from "./header";

interface StandardLayoutProps {
  title?: string;
  main: React.ReactNode;
}

function StandardLayout({ title, main }: StandardLayoutProps) {
  return (
    <div className="container0">
      <Header title={title} />
      <main>
        {main}
      </main>
    </div>
  );
}

export default StandardLayout;