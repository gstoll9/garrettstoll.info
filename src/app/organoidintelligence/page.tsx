'use client';
import StandardLayout from "@/layouts/standardLayout";
import "./organoidintelligence.css";

const PDF_PATH = "/Stoll_EthicsPaper.pdf";

const references = [
  <>FinalSpark. &ldquo;Biological Neuroplatform Up and Running.&rdquo; <i>FinalSpark</i>, 10 Feb. 2023, <a href="https://finalspark.com/biological-neuroplatform-up-and-running-2/" target="_blank" rel="noreferrer">https://finalspark.com/biological-neuroplatform-up-and-running-2/</a>.</>,
  <>Hartung, Thomas et al. &ldquo;Brain organoids and organoid intelligence from ethical, legal, and social points of view.&rdquo; <i>Frontiers in artificial intelligence</i> vol. 6 1307613. 5 Jan. 2024, doi:<a href="https://doi.org/10.3389/frai.2023.1307613" target="_blank" rel="noreferrer">10.3389/frai.2023.1307613</a></>,
  <>Hartung, Thomas, et al. &ldquo;The Baltimore Declaration toward the Exploration of Organoid Intelligence.&rdquo; <i>Frontiers in Science</i>, vol. 1, 2023, Frontiers Media, <a href="https://doi.org/10.3389/fsci.2023.1068159" target="_blank" rel="noreferrer">https://doi.org/10.3389/fsci.2023.1068159</a>.</>,
  <>Jgamadze, D., et al. &ldquo;Structural and Functional Integration of Human Forebrain-Organoid-Derived Grafts in Mature Rat Cortex.&rdquo; <i>Cell Stem Cell</i>, vol. 30, no. 3, 2023, pp. 137-152.e137, <a href="https://doi.org/10.1016/j.stem.2023.01.004" target="_blank" rel="noreferrer">https://doi.org/10.1016/j.stem.2023.01.004</a>.</>,
  <>Lancaster, Madeline A et al. &ldquo;Cerebral organoids model human brain development and microcephaly.&rdquo; <i>Nature</i> vol. 501,7467 (2013): 373-9. doi:<a href="https://doi.org/10.1038/nature12517" target="_blank" rel="noreferrer">10.1038/nature12517</a></>,
  <>Smirnova, Lena, et al. &ldquo;Organoid Intelligence (OI): The New Frontier in Biocomputing and Intelligence-in-a-Dish.&rdquo; <i>Frontiers in Science</i>, vol. 1, 2023, Frontiers Media, <a href="https://doi.org/10.3389/fsci.2023.1017235" target="_blank" rel="noreferrer">https://doi.org/10.3389/fsci.2023.1017235</a>.</>,
  <>Takahashi, Kazutoshi et al. &ldquo;Induction of pluripotent stem cells from adult human fibroblasts by defined factors.&rdquo; <i>Cell</i> vol. 131,5 (2007): 861-72. doi:<a href="https://doi.org/10.1016/j.cell.2007.11.019" target="_blank" rel="noreferrer">10.1016/j.cell.2007.11.019</a></>,
];

export default function OrganoidIntelligence() {
  const main = (
    <article className="oi-page">
      <h1>Ethics of Organoid Intelligence</h1>
      <p className="oi-byline">
        Garrett Stoll &middot; Ethics in Bioinformatics (Seema Freer) &middot; 13 November 2025
      </p>
      <div className="oi-actions">
        <a className="oi-btn oi-btn-primary" href={PDF_PATH} target="_blank" rel="noreferrer">Open PDF</a>
        <a className="oi-btn" href={PDF_PATH} download>Download</a>
      </div>
      <div className="oi-divider" />

      <section className="oi-section">
        <h2>Ethical Dilemma</h2>
        <p>
          Organoid intelligence is the emerging field of research that uses human brain organoids for
          computation. Research on these human brain organoids has been ongoing since the first ones were
          created in 2013 (Lancaster et al., 2013). This research has the potential to model diseases or
          toxins within human neurons, derive individualized patient treatments, and allow lab grown neurons
          to be used in the treatment of traumatic brain injuries or other neurological conditions. More
          recently, researchers have started using these organoids for computational tasks, opening up a
          whole new world of possibilities in biocomputing, brain-computer interfaces, and robotics (Hartung
          et al., 2024). This opens a can of ethical questions that are still unanswered. The ethical
          dilemmas span the topics of consciousness, human-animal chimaeras, human-robot integration,
          research oversight, informed consent standards for cell donors, cell donor data privacy, and
          commercialization with equitable access.
        </p>
      </section>

      <section className="oi-section">
        <h2>Background</h2>
        <p>
          Research on brain-machine interfaces started about 50 years ago (Smirnova et al., 2023), but the
          first human brain organoid was developed in 2013 by Madeline Lancaster and Juergen Knoblich
          (Lancaster et al., 2013). This was made possible by the development of human induced pluripotent
          stem cells in 2007 (Takahashi et al., 2007) and further work by Lancaster and Knoblich. Since then
          these brain organoids have grown from monolayers into organized clumps of cells with differential
          brain regions and various cell types. With these advances, researchers have been able to
          incorporate these organoids into computational interfaces, animals, and robots (Smirnova et al.,
          2023).
        </p>
        <p>
          The tools, materials, and techniques developed over the last decade have provided a growth in the
          size and complexity of these human brain organoids. Multiple brain regions, glial cells,
          myelination, and the inclusion of biosensors (primitive eyes) have made these organoids useful in
          a computational role. Microelectrode arrays embedded in these organoids allow us to control and
          monitor the neuronal activity (Smirnova et al., 2023). A Swiss startup founded in 2023, called
          FinalSpark, utilizes these methods and offers cloud compute resources that run on human brain
          organoids. They have thousands of them at their disposal and you can watch some of them live
          at <a href="https://finalspark.com/live/" target="_blank" rel="noreferrer">finalspark.com/live/</a> (FinalSpark,
          2023). One of the major issues facing brain organoids is feeding them. As of 2023, they are fed
          through a substrate bath that only permeates 300&nbsp;&micro;m, limiting the size of these organoids
          to a that radius. To fix this, researchers have been working on microfluidic perfusion systems
          (Smirnova et al., 2023), although a vascular system would be better. Currently, the easiest way to
          provide a vascular system to these organoids is to implant them into a living creature with a
          working vascular system (rats). It has been shown that these human organoids integrate with the
          rats&rsquo; brains, repairing partial sight in one study (Jgamadze et al., 2023). Robots have also
          had the chance to try out some new human brain matter. &ldquo;Muotri&rsquo;s team connected a brain
          organoid to a spider-shaped robot, allowing the organoid&rsquo;s electrical activity to control the
          robot&rsquo;s movements&rdquo; (Hartung et al., 2024). These types of integrations start to get
          ethically complicated as the organoids grow in size and complexity and once they&rsquo;re included
          in non-human primates.
        </p>
      </section>

      <section className="oi-section">
        <h2>Current Policies and Proposed Changes</h2>
        <p>
          There are many nuances to the ethical concerns surrounding these human brain organoids. What is
          their moral status? At what point do they become conscious or sentient? How can a cell donor
          consent to future research they are unaware of? How is a cell donors&rsquo; biological data being
          protected? How do we define these human-robot / human-animal hybrids and what are their moral
          statuses? Some researchers propose taking an embedded ethics approach while others dismiss these
          concerns entirely (specifically consciousness) (Hartung et al., 2024).
        </p>
        <p>
          Though some laws exist, there are currently no overarching standards or guidelines regarding these
          questions. Governance around these brain organoids varies by country, but overall it is very
          sparse. &ldquo;In the United States, NIH guidelines restrict federal funding of human-animal chimeric
          research, but few formal policies otherwise exist. The UK similarly lacks specific regulation,
          instead relying on general governance frameworks for medical research and human tissues&rdquo;
          (Hartung et al., 2023). Germany has a much stricter history of ethics, putting &ldquo;constraints on
          research deemed contrary to human dignity&rdquo;, but it is still unclear how it relates to these
          organoids (Hartung et al., 2023). There is an immediate need for international consensus and
          guidelines regarding these organoids, ideally coming from the World Health Organization&rsquo;s
          Ethics Review Committee and the United Nations Intergovernmental Bioethics Committee.
        </p>
        <p>
          The Baltimore declaration was the outcome of the First Organoid Intelligence Workshop in February
          2022. This workshop was a gathering of researchers across many fields including neuroscience, AI,
          engineering, and ethics. They coined the term &ldquo;organoid intelligence&rdquo;, promoted further
          research in the field, and proposed taking an embedded ethics approach (Hartung et al., 2023).
          Embedded ethics is the idea of incorporating an ethics team with the research team to analyze
          ethical issues as they arise. The downside to an embedded ethics approach is that it lacks public
          input.
        </p>
        <p>
          Overall, I believe this is a safe approach, but I don&rsquo;t think it goes far enough. Instead of an
          embedded ethics approach, I propose the world takes a proactive ethics approach using fictional
          literature as a basis for what&rsquo;s to come. Books, movies, television, and video games like
          Black Mirror, Planet of the Apes, Halo, or The Matrix already portray the future possibilities of
          this research. Using these stories as potential outcomes of our future will steer the conversation
          towards what kind of future we want and what problems we should anticipate.
        </p>
        <p>
          Putting this into the ethical framework, continuing this research would benefit the common good,
          but we need to make sure it is done in a utilitarian way. Personalized medicine will initially be
          subject to high prices, leaving out lower income individuals, but as long as the research continues
          and doesn&rsquo;t go behind closed doors, it will eventually benefit everyone. Laws may need to be
          enacted to guide this toward a just utilitarian outcome. Laws will definitely need to be enacted to
          protect the rights and privacy of cell donors. How someone can consent to future research they
          can&rsquo;t even imagine yet is still an open question, but one that needs to be answered. The
          question of consciousness is the elephant in the room for this field, but with more research, I
          believe we can proceed in a virtuous way. Taking this approach would not currently affect
          stakeholders as this proposal leaves the current system in place but anticipates ethical concerns
          ten years down the road. This would motivate stakeholders by providing more guidance than what is
          currently given.
        </p>
        <p>
          In addition to using a proactive ethics approach through fictional literature, I would also propose
          the NIH ends its ban on funding human-animal chimeras. That reality is already here and shows
          promise in helping cure neurological diseases and developing personalized medicine. This ban on
          federal funding just puts us behind the rest of the world as we currently see with stem cell
          research.
        </p>
      </section>

      <section className="oi-section">
        <h2>Conclusion</h2>
        <p>
          The field of organoid intelligence is still in its infancy, but it will change the world as we know
          it. Human-robots and human-animal hybrids will no longer be the stuff of science fiction; our
          compute power will continue to grow exponentially; and diseases thought once untreatable will find
          cures. An embedded ethics approach is the standard for these growing interdisciplinary fields, but
          with the potential impact organoid intelligence offers, I fear it&rsquo;s not enough. We have
          already seen the potential this technology possesses and there is no reason to wait until it is
          here to start discussing the ethics and developing standards. I implore the World Health
          Organization and United Nations to take a proactive ethics approach in the next two years. Our
          future has many possibilities and with ethical guidance, we have the potential to create a world
          that is utilitarian, virtuous, and just and protects everyone&rsquo;s rights for the common good.
        </p>
      </section>

      <section className="oi-section oi-references">
        <h2>References</h2>
        <ol>
          {references.map((r, i) => <li key={i}>{r}</li>)}
        </ol>
      </section>
    </article>
  );

  return StandardLayout({ title: "Organoid Intelligence", main });
}
