import Resume from "./resume/page";
import Link from "next/link";

export default function Home() {
  return (
    <div>
      <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#222", color: "white" }}>
        <strong>Experiments: </strong>
        <Link href="/solarsystem" style={{ margin: "0 10px", color: "#4da6ff" }}>Solar System</Link> |
        <Link href="/hydrogen" style={{ margin: "0 10px", color: "#4da6ff" }}>Hydrogen Atom</Link> |
        <Link href="/brain" style={{ margin: "0 10px", color: "#4da6ff" }}>Brain Model</Link>
      </div>
      <Resume />
    </div>
  );
}
