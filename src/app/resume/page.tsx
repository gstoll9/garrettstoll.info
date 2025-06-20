"use client"
import Image from "next/image";
import Link from "next/link";
import "./resume.css";
import StandardLayout from "@/layouts/standardLayout";

function Resume() {

  const page = (
      <div className="resume-container">
        <div className="sameLine">

          {/* Projects */}
          <div className="projects">
            <h2 className="projectsTitle">My Projects</h2>
            <div className="headerDivider" />
            <Link className="projectItem" href="/hubbardmodel">
              <p className="projectText">Hubbard Model</p>
            </Link>
            <Link className="projectItem" href="/solarsystem">
              <p className="projectText">Solar System</p>
            </Link>
            <Link className="projectItem" href="/hydrogen">
              <p className="projectText">Hydrogen Atom</p>
            </Link>
            <h2 className="projectsTitle" style={{paddingTop: "10%"}}>Games</h2>
            <div className="headerDivider" />
            <Link className="projectItem" href="/minesweeper">
              <p className="projectText">Minesweeper</p>
            </Link>
            <Link className="projectItem" href="/solitaire">
              <p className="projectText">Solitaire</p>
            </Link>
          </div>

          <div className="resume">
            <div className="sameLine" id="intro">
              <p className="introText">Salutations, and welcome to my website! As of now, this site is just my resume, but soon I will be connecting things I am interested in and projects I have put together. For data science contracting or employment inquiries, please email me at garrettstoll@gmail.com. Have fun, and enjoy this website responsibly!</p>
              <div className="profilePicContainer">
                <Image
                  className="introPic"
                  src="/resumeImages/profilePic.png"
                  alt="Picture of Garrett Stoll"
                  width={256}
                  height={256}
                  sizes="10vw"
                />
              </div>
            </div>

            <h2 className="section-header">Education</h2>
            <div className="subheaderDivider" />

            {/* Virginia Tech */}
            <div className="sameLine">
              <div className="resumePicContainer">
                <Image
                  className="logo"
                  src="/resumeImages/VTLogo.png"
                  alt="Virginia Tech Logo"
                  width={0}
                  height={0}
                  sizes="100%"
                />
              </div>
              <div className="jobText">
                <div className="sameLine">
                  <h3 className="job-header">Virginia Tech College of Science</h3>
                  <i className="date">Aug 2016 &mdash; Dec 2021</i>
                </div>
                <p>BS in Computational Modeling and Data Analytics</p>
                <p>Minors: Computer Science, Mathematics</p>
              </div>
            </div>

            <h2  className="section-header">Professional Experience</h2>
            <div className="subheaderDivider" />

            {/* Data Annotation */}
            <div className="sameLine">
              <div className="resumePicContainer">
                <Image
                  className="logo"
                  src="/resumeImages/DataAnnotationLogo.svg"
                  alt="Data Annotation Logo"
                  width={0}
                  height={0}
                  sizes="100%"
                />
              </div>
              <div className="jobText">
                <div className="sameLine">
                  <h3 className="job-header">Data Annotation &mdash; Programming Analyst/AI Trainer</h3>
                  <i className="date">Jan 2025 &mdash; Present</i>
                </div>
                <ul className="resume-list">
                  <li>Evaluating AI responses for correctness and instruction following for programming, math, physics, and biology prompts</li>
                  <li>Creating reasoning problems in math and biology that AI is unable to answer</li>
                </ul>
              </div>
            </div>

            {/* Booz */}
            <div className="sameLine" style={{ marginTop: "1%" }}>
              <div className="resumePicContainer">
                <Image
                  className="logo"
                  src="/resumeImages/BAHLogo.png"
                  alt="Booz Allen Hamilton Logo"
                  width={0}
                  height={0}
                  sizes="100%"
                />
              </div>
              <div className="jobText">
                <div className="sameLine">
                  <h3 className="job-header">Booz Allen Hamilton &mdash; Data Scientist</h3>
                  <i className="date">Nov 2022 &mdash; Sep 2024</i>
                </div>
                <h4 className="task-header">Web Scraping AI Pipeline</h4>
                <ul className="resume-list">
                  <li>Lead a team of three to automate the process of collecting news articles, identifying target articles, and parsing those articles for information to be stored in a database</li>
                  <li>Utilized Selenium, Pandas, Langchain, Transformers, and Mistral</li>
                </ul>
                <h4 className="task-header">Locally Hosted Fine-Tuned Installable LLM</h4>
                <ul className="resume-list">
                  <li>Co-led the design and development of an installable program that incorporated a locally hosted fine-tuned LLM and a responsive frontend interface</li>
                  <li>The tool rewrites job postings to Defense Cyber Workforce standards</li>
                  <li>Utilized Python, PyTorch, Transformers, JavaScript, React.js, and Qt Creator</li>
                </ul>
                <h4 className="task-header">User Productivity Team</h4>
                <ul className="resume-list">
                  <li>Created a dashboard in Databricks to visualize device inventory and individual user patterns</li>
                  <li>Utilized Python, SQL, Databricks, and Splunk</li>
                </ul>
                <h4 className="task-header">Internal PowerApp</h4>
                <ul className="resume-list">
                  <li>Developed a Microsoft PowerApp to automate onboarding processes and improve cross-contract communications to reduce project timelines</li>
                  <li>Utilized PowerApps, PowerAutomate, PowerBI, Dataverse, Sharepoint, and Microsoft Teams</li>
                </ul>
              </div>
            </div>

            {/* Summit */}
            <div className="sameLine" style={{ marginTop: "1%" }}>
              <div className="resumePicContainer">
                <Image
                  className="logo"
                  src="/resumeImages/SummitConsultingLogo.png"
                  alt="Summit Consulting Logo"
                  width={0}
                  height={0}
                  sizes="100%"
                />
              </div>
              <div className="jobText">
                <div className="sameLine">
                <h3 className="job-header">Summit Consulting, LLC &mdash; Intern</h3>
                <i className="date">Aug 2021 &mdash; Dec 2021</i>
                </div>
                <ul className="resume-list">
                  <li>Lead a team of three to implement an ETL pipeline on Amazon Web Services</li>
                  <li>Worked with the federal database management system, IPEDS</li>
                  <li>Web-scraped 5 websites using beautiful soup and selenium</li>
                  <li>Data Processing using pandas and statistical modeling using sklearn</li>
                </ul>
              </div>
            </div>

            <h2 className="section-header">Research Experience</h2>
            <div className="subheaderDivider" />

            <div className="sameLine">
              <div className="resumePicContainer">
                <Image
                  className="logo"
                  src="/resumeImages/VTLogo.png"
                  alt="Virginia Tech Logo"
                  width={0}
                  height={0}
                  sizes="100%"
                />
              </div>
              <div className="research">
                {/* Dr. Scarola */}
                <div className="sameLine">
                  <div className="jobText">
                    <div className="sameLine">
                    <h3 className="job-header">Virginia Tech, Dr. Vito Scarola &mdash; Research Assistant</h3>
                    <i className="date">Jan 2021 &mdash; Dec 2021</i>
                    </div>
                    <ul className="resume-list">
                      <li>Using Python, I simulated the Hubbard model, then developed a combinatorial optimization algorithm to dynamically implement the Gutzwiller Projection</li>
                      <li>Utilized numpy for complex analysis, mpi4py for high-performance computing, and matplotlib for data visualizations</li>
                      <li>Algorithm optimization resulting in an 8-fold speed up</li>
                    </ul>
                  </div>
                </div>
                {/* Dr. White */}
                <div className="sameLine">  
                  <div className="jobText">
                    <div className="sameLine">
                      <h3 className="job-header">Virginia Tech, Dr. Bob White &mdash; Research Assistant</h3>
                      <i className="date">Aug 2017 &mdash; Dec 2019</i>
                    </div>
                    <ul className="resume-list">
                      <li>Wet lab and Computational Biochemistry research experience</li>
                      <li>Studied metalloprotein families, radical SAM enzymes, and novel thiol molecules</li>
                      <li>Conducted protein homology modeling, molecular docking simulations, comparative genomics, gas chromatography-mass spectrometry (GCMS), liquid chromatography, and chemical assays</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <h2 className="section-header">Technical Skills</h2>
            <div className="subheaderDivider" />

            <div className="sameLine">
              <div className="resumePicContainer">
                <Image
                  className="logo"
                  src="/resumeImages/toolsLogo.png"
                  alt="Python, JavaScript, and SQL Logos"
                  width={0}
                  height={0}
                  sizes="100%"
                />
              </div>
              <div className="jobText"> 
                <ul className="resume-list">
                  <li>Python: flask, pytorch, pyspark, pandas, sklearn, statsmodel, numpy, scipy, mpi4py, beautiful soup, selenium, matplotlib, langchain, transformers</li>
                  <li>SQL, C, C++, Databricks, Go, Git, Java, JavaScript, Next.js, Node.js, React.js, HTML, CSS, MPI, OpenMP, MySQL, Microsoft &mdash; 365, Power Apps, Power Automate, Power BI, Qiskit, R and Tidyverse, Splunk, and command-line scripting</li>
                </ul>
              </div>
            </div>

            <h2 className="section-header">Certificates</h2>
            <div className="subheaderDivider" />
            <div className="sameLine">
              <div className="resumePicContainer">
                <Image
                  className="logo"
                  src="/resumeImages/BAHIBMLogo.png"
                  alt="Booz Allen Hamilton and IBM logos side by side"
                  width={0}
                  height={0}
                  sizes="100%"
                />
              </div>
              <div className="jobText"> 
                <ul className="resume-list">
                  <li>Booz Allen Hamilton Technical Badges &mdash; AI Aware, Angular, Docker, CSS, Java, JavaScript, Machine Learning, Python, React, Spring Boot, SQL (2023)</li>
                  <li>IBM Associate Developer &mdash; Quantum Computation using Qiskit (2022)</li>
                </ul>
              </div>
            </div>

            <h2 className="section-header">Volunteer Work</h2>
            <div className="subheaderDivider" />
            <div className="sameLine">
              <div className="resumePicContainer">
                <Image
                  className="logo"
                  src="/resumeImages/PeteyGreeneLogo.png"
                  alt="Petey Greene Program Logo"
                  width={0}
                  height={0}
                  sizes="100%"
                />
              </div>
              <div className="jobText">
                <div className="sameLine">
                <h3 className="job-header">The Petey Greene Program &mdash; Tutor</h3>
                <i className="date">Jun 2025 &mdash; Present</i>
                </div>
                <ul className="resume-list">
                  <li>Tutoring incarcerated people in reading and math in preparation for their GEDs</li>
                </ul>
              </div>
            </div>

          </div>
        </div>  
      </div>
  );

  return StandardLayout({main: page});
        
}

export default Resume;