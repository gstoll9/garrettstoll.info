"use client"
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import "./resume.css";
import StandardLayout from "@/layouts/standardLayout";

const EMAIL = "garrettstoll@gmail.com";
const GITHUB = "https://github.com/gstoll9";

/* ── Work ──────────────────────────────────────────────────────────────────
   This list is the map of "live" pages. Experimental pages are deliberately
   left out and only reachable by direct URL:
     Class Notes: /numericalmethods, /structuralbioinformatics, /threeBody
     Games:       /solitaire, /freeplay                                     */

type IconName = "lattice" | "helix" | "orbit" | "atom" | "neuron" | "graph" | "globe" | "mine" | "scale";

type WorkItem = {
  href: string;
  title: string;
  blurb: string;
  icon: IconName;
  hue: number;
};

const WORK: { group: string; items: WorkItem[] }[] = [
  {
    group: "Research",
    items: [
      {
        href: "/hubbardmodel",
        title: "Hubbard Model",
        blurb: "Simulating the Hubbard model and optimizing the Gutzwiller projection for cold-atom quantum computing.",
        icon: "lattice",
        hue: 262,
      },
      {
        href: "/methanogens",
        title: "Methanogens",
        blurb: "Homology modeling, motif analysis and phylogenetics of uncharacterized M. jannaschii proteins.",
        icon: "helix",
        hue: 162,
      },
      {
        href: "/organoidintelligence",
        title: "Ethics of Organoid Intelligence",
        blurb: "An ethics paper on lab-grown brain organoids used for computation, and a case for proactive ethics.",
        icon: "scale",
        hue: 120,
      },
    ],
  },
  {
    group: "Projects",
    items: [
      {
        href: "/solarsystem",
        title: "Solar System",
        blurb: "A real-ephemeris 3D solar system with to-scale planetary cutaways and a true-shape asteroid belt.",
        icon: "orbit",
        hue: 32,
      },
      {
        href: "/hydrogen",
        title: "Hydrogen Atom",
        blurb: "Schrödinger-equation electron clouds, wavefunctions and real NIST spectra for elements 1–36.",
        icon: "atom",
        hue: 205,
      },
      {
        href: "/brain",
        title: "Human Brain",
        blurb: "A procedural 3D brain you can slice into cross-sections and explore region by region.",
        icon: "neuron",
        hue: 340,
      },
      {
        href: "/knowledgegraph",
        title: "Knowledge Graph",
        blurb: "Build, filter and export first-order-logic knowledge graphs in an interactive 3D view.",
        icon: "graph",
        hue: 285,
      },
      {
        href: "/worldmap",
        title: "World Map",
        blurb: "An interactive atlas linking every country, subregion and district to its Wikipedia page.",
        icon: "globe",
        hue: 190,
      },
    ],
  },
  {
    group: "Games",
    items: [
      {
        href: "/minesweeper",
        title: "Minesweeper",
        blurb: "The classic, rebuilt — with a probability-based hint system for when you're stuck.",
        icon: "mine",
        hue: 8,
      },
    ],
  },
];

/* ── Resume content ────────────────────────────────────────────────────── */

const CAPABILITIES = [
  { title: "AI, ML & ETL pipelines", text: "From scraping and parsing to fine-tuned, locally hosted LLMs." },
  { title: "Data mining & visualization", text: "Cleaning messy data and turning it into dashboards and interactive visuals." },
  { title: "Cloud & HPC", text: "AWS pipelines, MPI and OpenMP — making slow code fast." },
  { title: "Frontend development", text: "React, Next.js and Microsoft Power Apps." },
];

type Role = {
  logo: string;
  logoAlt: string;
  org: string;
  role: string;
  dates: string;
  bullets?: string[];
  projects?: { name: string; bullets: string[]; stack: string[] }[];
  stack?: string[];
};

const EXPERIENCE: Role[] = [
  {
    logo: "/resumeImages/DataAnnotationLogo.svg",
    logoAlt: "Data Annotation logo",
    org: "Data Annotation",
    role: "Programming Analyst / AI Trainer",
    dates: "Jan 2025 — Aug 2025",
    bullets: [
      "Evaluated AI responses for correctness and instruction following for programming, math, physics, and biology prompts",
      "Created reasoning problems in math and biology that AI is unable to answer",
    ],
  },
  {
    logo: "/resumeImages/BAHlogo.png",
    logoAlt: "Booz Allen Hamilton logo",
    org: "Booz Allen Hamilton",
    role: "Data Scientist",
    dates: "Nov 2022 — Sep 2024",
    projects: [
      {
        name: "Web Scraping AI Pipeline",
        bullets: [
          "Led a team of three to automate collecting news articles, identifying target articles, and parsing them for information stored in a database",
        ],
        stack: ["Selenium", "Pandas", "LangChain", "Transformers", "Mistral"],
      },
      {
        name: "Locally Hosted Fine-Tuned Installable LLM",
        bullets: [
          "Co-led the design and development of an installable program pairing a locally hosted fine-tuned LLM with a responsive frontend",
          "The tool rewrites job postings to Defense Cyber Workforce standards",
        ],
        stack: ["Python", "PyTorch", "Transformers", "JavaScript", "React.js", "Qt Creator"],
      },
      {
        name: "User Productivity Team",
        bullets: ["Created a Databricks dashboard to visualize device inventory and individual user patterns"],
        stack: ["Python", "SQL", "Databricks", "Splunk"],
      },
      {
        name: "Internal PowerApp",
        bullets: [
          "Developed a Microsoft PowerApp to automate onboarding and improve cross-contract communication, reducing project timelines",
        ],
        stack: ["PowerApps", "PowerAutomate", "PowerBI", "Dataverse", "SharePoint", "Teams"],
      },
    ],
  },
  {
    logo: "/resumeImages/SummitConsultingLogo.png",
    logoAlt: "Summit Consulting logo",
    org: "Summit Consulting, LLC",
    role: "Intern",
    dates: "Aug 2021 — Dec 2021",
    bullets: [
      "Led a team of three to implement an ETL pipeline on Amazon Web Services",
      "Worked with the federal database management system, IPEDS",
      "Web-scraped 5 websites using Beautiful Soup and Selenium",
      "Data processing using pandas; statistical modeling using sklearn",
    ],
  },
];

const RESEARCH: Role[] = [
  {
    logo: "/resumeImages/VTlogo.png",
    logoAlt: "Virginia Tech logo",
    org: "Virginia Tech · Dr. Vito Scarola",
    role: "Research Assistant",
    dates: "Jan 2021 — Dec 2021",
    bullets: [
      "Simulated the Hubbard model in Python, then developed a combinatorial optimization algorithm to dynamically implement the Gutzwiller projection",
      "Algorithm optimization resulting in an 8-fold speed up",
    ],
    stack: ["NumPy", "mpi4py", "Matplotlib"],
  },
  {
    logo: "/resumeImages/VTlogo.png",
    logoAlt: "Virginia Tech logo",
    org: "Virginia Tech · Dr. Bob White",
    role: "Research Assistant",
    dates: "Aug 2017 — Dec 2019",
    bullets: [
      "Wet lab and computational biochemistry research experience",
      "Studied metalloprotein families, radical SAM enzymes, and novel thiol molecules",
      "Protein homology modeling, molecular docking simulations, comparative genomics, GC-MS, liquid chromatography, and chemical assays",
    ],
  },
];

const EDUCATION = [
  {
    logo: "/resumeImages/templeLogo.png",
    logoAlt: "Temple University logo",
    school: "Temple University",
    college: "College of Science and Technology",
    degree: "PSM in High-Performance Computing for Scientific Applications",
    dates: "Aug 2025 — Present",
  },
  {
    logo: "/resumeImages/VTlogo.png",
    logoAlt: "Virginia Tech logo",
    school: "Virginia Tech",
    college: "College of Science",
    degree: "BS in Computational Modeling and Data Analytics",
    detail: "Minors: Computer Science, Mathematics",
    dates: "Aug 2016 — Dec 2021",
  },
];

const SKILLS = [
  { group: "Languages", items: ["Python", "C", "C++", "Go", "Java", "JavaScript", "TypeScript", "HTML", "CSS", "SQL", "R / Tidyverse"] },
  {
    group: "Python",
    items: ["PyTorch", "Transformers", "LangChain", "PySpark", "pandas", "NumPy", "SciPy", "scikit-learn", "statsmodels", "mpi4py", "Flask", "Beautiful Soup", "Selenium", "Matplotlib"],
  },
  { group: "JavaScript", items: ["Node.js", "React.js", "Next.js", "d3.js", "three.js"] },
  { group: "Data", items: ["Databricks", "MySQL", "Splunk"] },
  { group: "Tools", items: ["Bash", "Git", "MPI", "OpenMP", "Qiskit", "Microsoft 365", "Power Apps", "Power Automate", "Power BI"] },
];

const BAH_BADGES = ["Docker", "Angular", "React", "CSS", "JavaScript", "Java", "Spring Boot", "SQL", "AI Aware", "Machine Learning", "Python"];


/* ── Small pieces ──────────────────────────────────────────────────────── */

function WorkIcon({ name }: { name: IconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "lattice":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M5 5h14M5 12h14M5 19h14M5 5v14M12 5v14M19 5v14" opacity=".35" />
          {[5, 12, 19].flatMap((x) => [5, 12, 19].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill="currentColor" stroke="none" />))}
        </svg>
      );
    case "helix":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M7 3c0 4.5 10 4.5 10 9s-10 4.5-10 9" />
          <path d="M17 3c0 4.5-10 4.5-10 9s10 4.5 10 9" />
          <path d="M9 6.5h6M9 17.5h6M10.5 12h3" opacity=".5" />
        </svg>
      );
    case "orbit":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" />
          <ellipse cx="12" cy="12" rx="10" ry="5.5" transform="rotate(-20 12 12)" />
          <circle cx="20.6" cy="9" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "atom":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
          <ellipse cx="12" cy="12" rx="10" ry="4" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
        </svg>
      );
    case "neuron":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="11" r="3" />
          <path d="M12 14v7M12 21l-2.5 1M12 21l2.5 1M9.4 9.5 5 6M5 6 3 6.5M5 6l-.3-2.2M14.6 9.5 19 5.5M19 5.5l2 .4M19 5.5l-.2-2M9 11.5l-5.5 2M15 11.5l5.5 2.5" />
        </svg>
      );
    case "graph":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M6 6l12 3M6 6l3 12M18 9l-9 9M18 9l1 9M9 18h10" opacity=".55" />
          <circle cx="6" cy="6" r="2.2" fill="currentColor" stroke="none" />
          <circle cx="18" cy="9" r="2.2" fill="currentColor" stroke="none" />
          <circle cx="9" cy="18" r="2.2" fill="currentColor" stroke="none" />
          <circle cx="19" cy="18" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "scale":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 3v18M8 21h8M4 7h16M12 5l0 2" />
          <path d="M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z" />
        </svg>
      );
    case "globe":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="9.5" />
          <ellipse cx="12" cy="12" rx="4.2" ry="9.5" />
          <path d="M2.8 9h18.4M2.8 15h18.4" />
        </svg>
      );
    case "mine":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="5.5" fill="currentColor" stroke="none" />
          <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M5.3 18.7l2.8-2.8M15.9 8.1l2.8-2.8" />
          <circle cx="10" cy="10" r="1.3" fill="#fff" stroke="none" />
        </svg>
      );
  }
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 10h10M11 5.5 15.5 10 11 14.5" />
    </svg>
  );
}

function Chips({ items, tone = "default" }: { items: string[]; tone?: "default" | "brand" }) {
  return (
    <ul className={`chips chips--${tone}`}>
      {items.map((s) => <li key={s} className="chip">{s}</li>)}
    </ul>
  );
}

function Logo({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="logo-tile">
      <Image src={src} alt={alt} width={96} height={96} unoptimized={src.endsWith(".svg")} />
    </div>
  );
}

function RoleCard({ r }: { r: Role }) {
  return (
    <article className="role reveal">
      <Logo src={r.logo} alt={r.logoAlt} />
      <div className="role-body">
        <header className="role-head">
          <div>
            <h3 className="role-title">{r.role}</h3>
            <p className="role-org">{r.org}</p>
          </div>
          <span className="role-dates">{r.dates}</span>
        </header>
        {r.bullets && (
          <ul className="role-bullets">
            {r.bullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
        )}
        {r.stack && <Chips items={r.stack} />}
        {r.projects && (
          <div className="role-projects">
            {r.projects.map((p) => (
              <div key={p.name} className="role-project">
                <h4>{p.name}</h4>
                <ul className="role-bullets">
                  {p.bullets.map((b) => <li key={b}>{b}</li>)}
                </ul>
                <Chips items={p.stack} />
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="section-head reveal">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children && <p className="section-lead">{children}</p>}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

function Resume() {
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Fade sections in as they scroll into view (content stays visible without JS)
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || !("IntersectionObserver" in window)) return;
    root.classList.add("can-animate");
    const els = root.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const year = new Date().getFullYear();

  const page = (
    <div className="home" ref={rootRef}>
      {/* Hero */}
      <section className="hero" id="top">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="hero-status"><span className="status-dot" aria-hidden="true" /> PSM in High-Performance Computing · Temple University</p>
            <h1 className="hero-title">
              Hi, I&apos;m Garrett.<br />
              <span className="hero-title-accent">I build with data, physics &amp; code.</span>
            </h1>
            <p className="hero-lead">
              Data scientist working across machine learning, high-performance computing and scientific
              simulation — from LLM pipelines at Booz Allen Hamilton to quantum and biochemistry research.
              This site is where I build interactive explorations of the things I find fascinating.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href={`mailto:${EMAIL}`}>Get in touch</a>
              <a className="btn btn-ghost" href="#work">Explore my work <ArrowIcon /></a>
              <a className="btn btn-link" href={GITHUB} target="_blank" rel="noreferrer">GitHub</a>
            </div>
            <ul className="hero-traits">
              <li>Natural leader</li>
              <li>Fast learner</li>
              <li>Creative problem solver</li>
            </ul>
          </div>

          <div className="hero-visual">
            <div className="portrait">
              <Image
                src="/resumeImages/profilePic.png"
                alt="Portrait of Garrett Stoll"
                width={420}
                height={420}
                priority
                className="portrait-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="section section--tight">
        <div className="wrap">
          <div className="caps">
            {CAPABILITIES.map((c, i) => (
              <div key={c.title} className="cap reveal" style={{ transitionDelay: `${i * 60}ms` }}>
                <span className="cap-num">0{i + 1}</span>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </div>
            ))}
          </div>
          <p className="caps-note reveal">
            Research background in <strong>blockchain</strong>, <strong>computational biochemistry</strong> and <strong>quantum physics</strong>.
          </p>
        </div>
      </section>

      {/* Work */}
      <section className="section" id="work">
        <div className="wrap">
          <SectionHead eyebrow="Selected work" title="Research, projects & games">
            Interactive pages built from real data and real math — click in and poke around.
          </SectionHead>
          {WORK.map((g) => (
            <div key={g.group} className="work-group">
              <h3 className="work-group-title reveal">{g.group}</h3>
              <div className="work-grid">
                {g.items.map((w, i) => (
                  <Link
                    key={w.href}
                    href={w.href}
                    className="work-card reveal"
                    style={{ "--hue": w.hue, transitionDelay: `${i * 50}ms` } as React.CSSProperties}
                  >
                    <span className="work-icon"><WorkIcon name={w.icon} /></span>
                    <span className="work-title">{w.title}</span>
                    <span className="work-blurb">{w.blurb}</span>
                    <span className="work-cta">Open <ArrowIcon /></span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Experience */}
      <section className="section section--alt" id="experience">
        <div className="wrap">
          <SectionHead eyebrow="Experience" title="Where I've worked" />
          <div className="roles">
            {EXPERIENCE.map((r) => <RoleCard key={r.org} r={r} />)}
          </div>

          <SectionHead eyebrow="Research" title="In the lab" />
          <div className="roles">
            {RESEARCH.map((r) => <RoleCard key={r.org} r={r} />)}
          </div>
        </div>
      </section>

      {/* Education */}
      <section className="section">
        <div className="wrap">
          <SectionHead eyebrow="Education" title="Where I've studied" />
          <div className="edu-grid">
            {EDUCATION.map((e) => (
              <article key={e.school} className="edu reveal">
                <Logo src={e.logo} alt={e.logoAlt} />
                <div>
                  <span className="role-dates">{e.dates}</span>
                  <h3 className="edu-school">{e.school}</h3>
                  <p className="edu-college">{e.college}</p>
                  <p className="edu-degree">{e.degree}</p>
                  {e.detail && <p className="edu-detail">{e.detail}</p>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Skills */}
      <section className="section section--alt" id="skills">
        <div className="wrap">
          <SectionHead eyebrow="Toolkit" title="Technical skills" />
          <div className="skills">
            {SKILLS.map((s) => (
              <div key={s.group} className="skill-row reveal">
                <h3>{s.group}</h3>
                <Chips items={s.items} />
              </div>
            ))}
          </div>

          <div className="extras">
            <article className="extra reveal">
              <Logo src="/resumeImages/BAHIBMLogo.png" alt="Booz Allen Hamilton and IBM logos" />
              <div>
                <p className="eyebrow">Certificates</p>
                <h3>IBM Associate Developer</h3>
                <p className="extra-sub">Quantum computation using Qiskit</p>
                <h3 className="extra-gap">Booz Allen Hamilton Technical Badges</h3>
                <Chips items={BAH_BADGES} tone="brand" />
              </div>
            </article>
            <article className="extra reveal">
              <Logo src="/resumeImages/PeteyGreeneLogo.png" alt="Petey Greene Program logo" />
              <div>
                <p className="eyebrow">Volunteer</p>
                <h3>The Petey Greene Program — Tutor</h3>
                <span className="role-dates">Jun 2025 — Present</span>
                <p className="extra-sub">Tutoring incarcerated people in reading and math in preparation for their GEDs.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="contact" id="contact">
        <div className="wrap">
          <div className="contact-card reveal">
            <Image
              src="/TyroImages/AnOfferYouCantRefuse.png"
              alt="Tyro the cat lounging like a mob boss"
              width={323}
              height={284}
              className="contact-tyro"
            />
            <div className="contact-copy">
              <p className="eyebrow eyebrow--light">Let&apos;s talk</p>
              <h2>Tyro has an offer you can&apos;t refuse.</h2>
              <p>
                I&apos;m open to data science, machine learning and scientific-computing roles and consulting.
                Reach out — he insists.
              </p>
              <div className="hero-actions">
                <a className="btn btn-light" href={`mailto:${EMAIL}`}>{EMAIL}</a>
                <a className="btn btn-outline-light" href={GITHUB} target="_blank" rel="noreferrer">GitHub</a>
              </div>
            </div>
          </div>
          <footer className="site-footer">
            <span>© {year} Garrett Stoll</span>
            <a href="#top">Back to top ↑</a>
          </footer>
        </div>
      </section>
    </div>
  );

  return StandardLayout({ main: page, variant: "plain" });
}

export default Resume;
