import Header from "./header";

interface StandardLayoutProps {
  main: React.ReactNode;
}

function StandardLayout(main: React.ReactNode): JSX.Element {
  return (
    <div className="container0">
      <Header/>
      <main>
        {main}
      </main>
    </div>
  );
}

export default StandardLayout;