"use client"
import { useEffect, useState } from 'react';
import Image from "next/image";
import Link from "next/link";
import "./styles/resume.css";
import StandardLayout from "./standardLayout";
import { getImageAspectRatio } from "./util";

function Resume() {

  const page = (
      <>
        <div className="sameLine">

          {/* Projects */}
          <div className="projects">
            <h2 className="projectsTitle">My Projects</h2>
            <div className="headerDivider" />
            <Link className="projectItem" href="/hubbardmodel">
              <p className="projectText">Hubbard Model</p>
            </Link>
            <Link className="projectItem" href="/minesweeper">
              <p className="projectText">Minesweeper</p>
            </Link>
            <Link className="projectItem" href="/solarsystem">
              <p className="projectText">Solar System</p>
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

            <h2>Education</h2>
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
                  <h3>Virginia Tech College of Science</h3>
                  <i>Aug 2016 &mdash; Dec 2021</i>
                </div>
                <p>BS in Computational Modeling and Data Analytics</p>
                <p>Minors: Computer Science, Mathematics</p>
              </div>
            </div>

            <h2>Professional Experience</h2>
            <div className="subheaderDivider" />

            {/* Booz */}
            <div className="sameLine">
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
                  <h3>Booz Allen Hamilton &mdash; Data Scientist</h3>
                  <i>Nov 2022 &mdash; Sep 2024</i>
                </div>
                <h4>Web Scraping AI Pipeline</h4>
                <ul>
                  <li>Lead a team of three to automate the process of collecting news articles, identifying target articles, and parsing those articles for information to be stored in a database</li>
                  <li>Utilized Selenium, Pandas, Langchain, Transformers, and Mistral</li>
                </ul>
                <h4>Locally Hosted Fine-Tuned Installable LLM</h4>
                <ul>
                  <li>Co-led the design and development of an installable program that incorporated a locally hosted fine-tuned LLM and a responsive frontend interface</li>
                  <li>The tool rewrites job postings to Defense Cyber Workforce standards</li>
                  <li>Utilized Python, PyTorch, Transformers, JavaScript, React.js, and Qt Creator</li>
                </ul>
                <h4>User Productivity Team</h4>
                <ul>
                  <li>Created a dashboard in Databricks to visualize device inventory and individual user patterns</li>
                  <li>Utilized Python, SQL, Databricks, and Splunk</li>
                </ul>
                <h4>Internal PowerApp</h4>
                <ul>
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
                <h3>Summit Consulting, LLC &mdash; Intern</h3>
                <i>Aug 2021 &mdash; Dec 2021</i>
                </div>
                <ul>
                  <li>Lead a team of three to implement an ETL pipeline on Amazon Web Services</li>
                  <li>Worked with the federal database management system, IPEDS</li>
                  <li>Web-scraped 5 websites using beautiful soup and selenium</li>
                  <li>Data Processing using pandas and statistical modeling using sklearn</li>
                </ul>
              </div>
            </div>

            <h2>Research Experience</h2>
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
                    <h3>Virginia Tech, Dr. Vito Scarola &mdash; Research Assistant</h3>
                    <i>Jan 2021 &mdash; Dec 2021</i>
                    </div>
                    <ul>
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
                      <h3>Virginia Tech, Dr. Bob White &mdash; Research Assistant</h3>
                      <i>Aug 2017 &mdash; Dec 2019</i>
                    </div>
                    <ul>
                      <li>Wet lab and Computational Biochemistry research experience</li>
                      <li>Studied metalloprotein families, radical SAM enzymes, and novel thiol molecules</li>
                      <li>Conducted protein homology modeling, molecular docking simulations, comparative genomics, gas chromatography-mass spectrometry (GCMS), liquid chromatography, and chemical assays</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <h2>Technical Skills</h2>
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
                <ul>
                  <li>Python: flask, pytorch, pyspark, pandas, sklearn, statsmodel, numpy, scipy, mpi4py, beautiful soup, selenium, matplotlib, langchain, transformers</li>
                  <li>SQL, C, C++, Databricks, Go, Git, Java, JavaScript, Next.js, Node.js, React.js, HTML, CSS, MPI, OpenMP, MySQL, Microsoft &mdash; 365, Power Apps, Power Automate, Power BI, Qiskit, R and Tidyverse, Splunk, and command-line scripting</li>
                </ul>
              </div>
            </div>

            <h2>Certificates</h2>
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
                <ul>
                  <li>Booz Allen Hamilton Technical Badges &mdash; AI Aware, Angular, Docker, CSS, Java, JavaScript, Machine Learning, Python, React, Spring Boot, SQL (2023)</li>
                  <li>IBM Associate Developer &mdash Quantum Computation using Qiskit (2022)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>  
      </>
  );

  return StandardLayout(page);
        
}

export default Resume;