import Image from "next/image";
import Header from "./header";
import Nav from "./nav";
import Resume from "./resume";

export default function Home() {
  return (
    <div className="container0">
      <Header/>
      <div className="notHeader">
        <Nav/>
        <main>
          <Resume />
        </main>
      </div>
      
    </div>
  );
}
