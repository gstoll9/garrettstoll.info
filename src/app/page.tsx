import Image from "next/image";

export default function Home() {
  return (
    <div className="container0">
      <header>
        Header
      </header>
      <main>
        <h1>Garrett Stoll</h1>
        <Image src="/next.svg" width={200} height={200} alt="Next.js" />
        <h2>Summary of Qualifications</h2>
        <h2>Education</h2>
          <h3>Virginia Tech College of Science</h3>
          <i>Aug 2016 &mdash; Dec 2021</i>
            <p>BS in Computational Modeling and Data Analytics</p>
            <p>Minors: Computer Science, Mathematics</p>
        <h2>Professional Experience</h2>
          <h3>Booz Allen Hamilton</h3>
          <i>Nov 2022 &mdash; Sep 2024</i>
            <h4>Data Scientist</h4>
              <h5>Web Scraping AI Pipeline</h5>
                <ul>
                  <li>Lead a team of three to automate the process of collecting news articles, identifying target articles, and parsing those articles for information to be stored in a database</li>
                  <li>Utilized ParseHub for web scraping; Pandas, Langchain, Transformers, and Mistral for the AI pipeline</li>
                </ul>
              <h5>Locally Hosted Fine-Tuned Installable LLM</h5>
                <ul>
                  <li>Co-led the design and development of an installable program that incorporated a locally hosted fine-tuned LLM and a responsive frontend interface</li>
                  <li>The tool is used to realign job postings to Defense Cyber Workforce standards</li>
                  <li>Utilized Python, PyTorch, Transformers, JavaScript, React.js, and Qt Creator</li>
                </ul>
              <h5>User Productivity Team</h5>
                <ul>
                  <li>Created a dashboard in Databricks to visualize device inventory and usage for individual users</li>
                  <li>Utilized Python, SQL, Databricks, and Splunk to gain insights on device inventory and usage</li>
                </ul>
              <h5>Internal PowerApp</h5>
                <ul>
                  <li>Developed a Microsoft PowerApp to automate onboarding processes and improve cross-contract communications to reduce project timelines</li>
                  <li>Utilized PowerApps, PowerAutomate, PowerBI, Dataverse, Sharepoint, and Microsoft Teams</li>
                </ul>
          <h3>Summit Consulting, LLC</h3>
          <i>Aug 2021 &mdash; Dec 2021</i>
            <ul>
              <li>Lead a team of three to implement an ETL pipeline on Amazon Web Services</li>
              <li>Worked with the federal database management system, IPEDS</li>
              <li>Web-scraped 5 websites using beautiful soup and selenium</li>
              <li>Data Processing using pandas and statistical modeling using sklearn</li>
            </ul>
        <h2>Research Experience</h2>
          <h3>Virginia Tech, Dr. Vito Scarola</h3>
          <i>Jan 2021 &mdash; Dec 2021</i>
            <h3>Research Assistant</h3>
              <ul>
                <li>Using Python, I simulated the Hubbard model, then developed a combinatorial optimization algorithm to dynamically implement the Gutzwiller Projection</li>
                <li>Utilized numpy for complex analysis, mpi4py for high-performance computing, and matplotlib for data visualizations</li>
                <li>Algorithm optimization resulting in an 8-fold speed up</li>
              </ul>
          <h3>Virginia Tech, Dr. Bob White</h3>
          <i>Aug 2017 &mdash; Dec 2019</i>
            <h3>Research Assistant</h3>
            <ul>
                <li>Wet lab and Computational Biochemistry research experience</li>
                <li>Studied metalloprotein families, radical SAM enzymes, and novel thiol molecules</li>
                <li>Conducted protein homology modeling, molecular docking simulations, comparative genomics, gas chromatography-mass spectrometry (GCMS), liquid chromatography, and chemical assays</li>
            </ul>
        <h2>Technical Skills</h2>
          <p>Python: flask, pytorch, pyspark, pandas, sklearn, statsmodel, numpy, scipy, mpi4py, beautiful soup, selenium, matplotlib, langchain, transformers</p>
          <p>Databricks, Splunk, R and Tidyverse, C, C++, Go, Java, JavaScript, Next.js, Node.js, React.js, HTML, CSS, MPI, OpenMP, Microsoft &mdash; 365, Power Apps, Power Automate, Power BI, Qiskit, SQL, MySQL, Git, and command-line scripting</p>
        <h2>Certificates</h2>
          <p>Booz Allen Hamilton Technical Badges &mdash; AI Aware, Angular, Docker, CSS, Java, JavaScript, Machine Learning, Python, React, Spring Boot, SQL (2023)</p>
      </main>
    </div>
  );
}
