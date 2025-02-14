import "./Header.css";
import Nav from "./nav";

function getPage(main: React.ReactNode) {
  return (
    <div className="container0">
      <header>
        <button>NAV</button>
        Header
      </header>
      <main>
        <Nav />
        {main}
      </main>
    </div>
  );
}

export default getPage;