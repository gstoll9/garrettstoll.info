import Image from "next/image";
import "./resume.css";
import getPage from "./header";

function Resume() {
    const page = (
        <>
        <h1>Garrett Stoll</h1>
        <div className="headerDivider" />
          <div className="sameLine" id="intro">
              <p className="introText">Hello! My name is Garrett and I like to learn and create.  I made this website to display some things I am interested in and stuff I have put together.  I hope you enjoy!</p>
              <div className="picContainer">
                <Image className="introPic" src="/profilePic.jpeg" width={200} height={200} alt="Next.js" />
              </div>
          </div>
          <h2>Education</h2>
          <div className="subheaderDivider" />
            <div className="sameLine">
              <h3>Virginia Tech College of Science</h3>
              <i>Aug 2016 &mdash; Dec 2021</i>
            </div>
              <p>BS in Computational Modeling and Data Analytics</p>
              <p>Minors: Computer Science, Mathematics</p>
          <h2>Professional Experience</h2>
          <div className="subheaderDivider" />
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
          <h2>Research Experience</h2>
          <div className="subheaderDivider" />
            <div className="sameLine">
            <h3>Virginia Tech, Dr. Vito Scarola &mdash; Research Assistant</h3>
            <i>Jan 2021 &mdash; Dec 2021</i>
            </div>
            <ul>
              <li>Using Python, I simulated the Hubbard model, then developed a combinatorial optimization algorithm to dynamically implement the Gutzwiller Projection</li>
              <li>Utilized numpy for complex analysis, mpi4py for high-performance computing, and matplotlib for data visualizations</li>
              <li>Algorithm optimization resulting in an 8-fold speed up</li>
            </ul>
            <div className="sameLine">
            <h3>Virginia Tech, Dr. Bob White &mdash; Research Assistant</h3>
            <i>Aug 2017 &mdash; Dec 2019</i>
            </div>
            <ul>
                <li>Wet lab and Computational Biochemistry research experience</li>
                <li>Studied metalloprotein families, radical SAM enzymes, and novel thiol molecules</li>
                <li>Conducted protein homology modeling, molecular docking simulations, comparative genomics, gas chromatography-mass spectrometry (GCMS), liquid chromatography, and chemical assays</li>
            </ul>
          <h2>Technical Skills</h2>
          <div className="subheaderDivider" />
            <p>Python: flask, pytorch, pyspark, pandas, sklearn, statsmodel, numpy, scipy, mpi4py, beautiful soup, selenium, matplotlib, langchain, transformers</p>
            <p>Databricks, Splunk, R and Tidyverse, C, C++, Go, Java, JavaScript, Next.js, Node.js, React.js, HTML, CSS, MPI, OpenMP, Microsoft &mdash; 365, Power Apps, Power Automate, Power BI, Qiskit, SQL, MySQL, Git, and command-line scripting</p>
          <h2>Certificates</h2>
          <div className="subheaderDivider" />
            <p>Booz Allen Hamilton Technical Badges &mdash; AI Aware, Angular, Docker, CSS, Java, JavaScript, Machine Learning, Python, React, Spring Boot, SQL (2023)</p>
        
        </>
    );
    return getPage(page);
        
}

export default Resume;