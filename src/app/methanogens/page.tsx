'use client';
import { useState } from "react";
import Image from "next/image";
import StandardLayout from "@/layouts/standardLayout";
import "./methanogens.css";

type ProteinKey = "mj0100" | "mj1681" | "mj0542";

const proteinTabs: { key: ProteinKey; label: string }[] = [
  { key: "mj0100", label: "MJ0100" },
  { key: "mj1681", label: "MJ1681" },
  { key: "mj0542", label: "MJ0542" },
];

// Table 1: conservation percentages of CYS in MJ0542 homologs.
// Blank cells mean the position wasn't conserved / had a gap in that domain.
const cysPositions = [
  117, 163, 166, 299, 307, 366, 411, 639, 665, 821, 823, 836, 840, 856, 953,
  1007, 1009, 1030, 1060, 1123, 1128, 1133,
];

const cysTable: Record<string, (number | null)[]> = {
  Archaea: [56, null, 96, null, null, null, 100, null, 63, null, 92, 84, null, null, null, 80, null, null, null, 96, null, 100],
  Bacteria: [76, 76, 84, 76, null, null, 100, 80, 96, 80, 96, null, 84, 96, null, null, 92, 92, 100, null, null, 100],
  Eukaryota: [56, 88, 96, 80, 84, 84, null, null, null, null, null, null, null, 96, 84, null, 96, 88, 88, null, 72, 92],
};

function cellClass(v: number | null) {
  if (v === null) return "cys-cell cys-empty";
  if (v >= 75) return "cys-cell cys-high";
  if (v >= 50) return "cys-cell cys-mid";
  return "cys-cell cys-low";
}

function Figure({
  src,
  alt,
  caption,
  wide,
}: {
  src: string;
  alt: string;
  caption: string;
  wide?: boolean;
}) {
  return (
    <figure className={`meth-figure${wide ? " meth-figure-wide" : ""}`}>
      <Image
        src={src}
        alt={alt}
        width={0}
        height={0}
        sizes="100%"
        style={{ width: "100%", height: "auto" }}
      />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export default function MethanogensPage() {
  const [protein, setProtein] = useState<ProteinKey>("mj0100");
  const [showAfterMin, setShowAfterMin] = useState(true);
  const [treeRevised, setTreeRevised] = useState(true);

  const main = (
    <div className="meth-page">
      <h1>Methanogens</h1>
      <p className="meth-subtitle">
        Predicting the Function of Possible Radical S-adenosyl-L-methionine
        Enzymes in <i>Methanocaldococcus jannaschii</i> using Bioinformatic
        and Computational Methods
      </p>
      <p className="meth-byline">
        Garrett Stoll &middot; Virginia Tech, College of Science &middot; May 2, 2018
        <br />
        Undergraduate research with Dr. Bob White
      </p>
      <div className="divider" />

      <section className="meth-section">
        <h2>Abstract</h2>
        <p>
          It is believed that radical S-adenosyl-L-methionine (SAM) enzymes
          (a special class of iron-sulfur binding clustered proteins) played
          a crucial role in the first metabolic pathways to evolve on this
          Earth. Very little is known about this class of proteins, but we
          hypothesize they play a crucial role in methanogenic sulfur
          metabolism, a biochemical pathway currently unknown to science.
          Some of these reactions are likely carried out by members of the{" "}
          <i>duf39</i> gene family, which includes MJ0100 and MJ1681. These
          genes as well as MJ0542 and their homologs were computationally
          analyzed to better predict their functions. The investigation
          included sequence alignment, structure modeling, energy
          minimization, and energy scoring, with the goal of finding
          conserved cysteines. These conserved cysteines give us insight
          into the mechanisms of these proteins. We hope to shed light on
          this metabolic pathway through these computational methods.
        </p>
      </section>

      <section className="meth-section">
        <h2>Introduction</h2>
        <p>
          Radical SAM enzymes were first discovered in 2001 and are defined
          as a protein superfamily with over 600 members&mdash;since then,
          this superfamily has grown tremendously. These enzymes&rsquo;
          mechanisms involve an iron-sulfur cluster bound to precisely three
          cysteines (any more and the protein is likely a ferredoxin, a
          family of iron-sulfur cluster proteins with four cysteine
          motifs). Radical SAM enzymes carry out many different functions,
          including methylations, sulfur insertions, and protein radical
          formation, yet many functions of this unusual superfamily remain
          unknown.
        </p>
        <p>
          The first motif discovered was CX<sub>3</sub>CX<sub>2</sub>C, found
          in over 90% of the originally researched proteins. The remainder
          had variances of that motif, which has since expanded to include
          CX<sub>2</sub>CX<sub>4</sub>C, CX<sub>5</sub>CX<sub>2</sub>C, CX
          <sub>14</sub>CX<sub>2</sub>C, CX<sub>2</sub>CX<sub>2</sub>FC, CX
          <sub>2</sub>CX<sub>2</sub>YC, and CX<sub>2</sub>CX<sub>27</sub>C.
          The three-cysteine motif works by binding an iron-sulfur cluster
          at its center, allowing for the transfer of an electron.
        </p>
        <p>
          <i>Methanocaldococcus jannaschii</i> was discovered by a submarine
          at a hydrothermal vent and was the first methanogen to have its
          genome sequenced, in 1996. <i>M. jannaschii</i> has genes
          connected to all three domains of life. We know that, to produce
          energy, <i>M. jannaschii</i> reduces CO<sub>2</sub> into CH
          <sub>4</sub> (methanogenesis). But we assume that, for survival,{" "}
          <i>M. jannaschii</i> also oxidizes sulfur in order to reduce
          toxicity and produce essential compounds such as 4Fe-4S binding
          clusters and Coenzyme M. Unfortunately, these pathways are
          currently unknown; we hypothesize the <i>duf39</i> gene family is
          involved, and we have experimentally proven MJ0542 is able to
          metabolize hydrogen sulfide &mdash; but the question is, how?
        </p>

        <h3><i>duf39</i> Gene Family: MJ0100 and MJ1681</h3>
        <p>
          The <i>duf39</i> gene family encompasses over 1200 proteins,
          including MJ0100 and MJ1681. Like <i>M. jannaschii</i>, this gene
          family is usually expressed as two distinct proteins in
          methanogens. It is known through sequence analysis that one
          contains two ferredoxin motifs and the other possesses a CBS
          domain, but the functions of these proteins remain hidden. We
          hypothesize they may be involved in the steps between hydrogen
          sulfide&rsquo;s first metabolism and the production of a sulfone
          group.
        </p>

        <h3>Sulfur Metabolism: MJ0542</h3>
        <p>
          Because hydrogen sulfide readily diffuses across a cell membrane
          and can be toxic, we figured there must be some pathway utilizing
          this massive amount of sulfur. Methanogens have somehow been
          metabolizing this sulfur into organic compounds, iron-sulfur
          binding clusters, and maybe even elemental sulfur. Experiments
          have shown the enzymes responsible for this metabolism are MJ0542
          (PEP synthase), MJ1453, and their <i>Methanocaldococcus fervens</i>{" "}
          homologs. We hope to use sequence alignment and structure modeling
          to better predict the unknown functions of MJ0542.
        </p>
      </section>

      <section className="meth-section">
        <h2>Methods</h2>
        <p className="meth-methods-intro">
          These methods pertain to MJ0100, MJ1681, and MJ0542, referred to
          below as &ldquo;the proteins.&rdquo;
        </p>
        <div className="meth-methods-grid">
          <div className="meth-method-card">
            <h4>BLAST / UniProt</h4>
            <p>
              BlastP searched the Archaea, Bacteria, and Eukaryota databases
              separately (E-threshold 10, BLOSUM-62, no filtering, gaps
              allowed). The top 25 results per domain were aligned, and
              every cysteine was tallied by hand to score conservation.
            </p>
          </div>
          <div className="meth-method-card">
            <h4>I-TASSER &amp; SWISS-MODEL</h4>
            <p>
              I-TASSER threaded each sequence against the PDB and clustered
              candidate folds (SPICKER) to return five models per protein,
              along with the top ten structurally similar PDB files and top
              five probable ligands. Each model was validated with
              SWISS-MODEL (ANOLEA, QMEAN/QMEAN6, DFire, PROCHECK, DSSP,
              Promotif), energy-minimized in Maestro, and validated again.
            </p>
          </div>
          <div className="meth-method-card">
            <h4>PyMOL</h4>
            <p>
              Cysteine locations and inter-sulfur distances were measured on
              the minimized models to look for plausible 4Fe-4S binding
              sites. All protein renders on this page came from PyMOL.
            </p>
          </div>
          <div className="meth-method-card">
            <h4>SIFTER</h4>
            <p>
              Statistical Inference of Function Through Evolutionary
              Relationships predicts function from phylogenetic placement
              among homologs of known function, returning a confidence
              score from 0 to 1.
            </p>
          </div>
          <div className="meth-method-card">
            <h4>phyloT / UniProt</h4>
            <p>
              phyloT built a taxonomy-based phylogenetic tree of every{" "}
              <i>duf39</i> gene in methanogens (27 UniProt IDs couldn&rsquo;t
              be mapped to an NCBI ID). A second tree of MJ0542 homologs was
              built later in UniProt from the top 25 BLAST hits per domain.
            </p>
          </div>
        </div>
      </section>

      <section className="meth-section">
        <h2>Results</h2>
        <div className="meth-tabs" role="tablist">
          {proteinTabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={protein === t.key}
              className={`meth-tab${protein === t.key ? " meth-tab-active" : ""}`}
              onClick={() => setProtein(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {protein === "mj0100" && (
          <div className="meth-tab-panel">
            <h3>Sequence-based homolog search and alignment</h3>
            <p>
              No possible function could be predicted from the BLAST results
              for MJ0100. Sequence alignment showed no cysteine conservation
              with the eukaryote results. Two cysteines were fully conserved
              between the archaea and bacteria results (C54 and C133), and
              two more were partially conserved among the archaea (C159 and
              C287).
            </p>

            <h3>Structure modeling and model validation</h3>
            <p>
              Energy minimization and model validation determined model 1
              was most favorable. Toggle between the SWISS-MODEL validation
              plots below to see the effect of Maestro energy minimization
              on local quality scores.
            </p>
            <div className="meth-toggle-row">
              <button
                className={`meth-toggle-btn${!showAfterMin ? " meth-toggle-active" : ""}`}
                onClick={() => setShowAfterMin(false)}
              >
                Before minimization
              </button>
              <button
                className={`meth-toggle-btn${showAfterMin ? " meth-toggle-active" : ""}`}
                onClick={() => setShowAfterMin(true)}
              >
                After minimization
              </button>
            </div>
            <Figure
              wide
              src={
                showAfterMin
                  ? "/methanogensImages/fig2_mj0100_validation_after.png"
                  : "/methanogensImages/fig1_mj0100_validation_before.png"
              }
              alt="SWISS-MODEL validation plot for MJ0100"
              caption={
                showAfterMin
                  ? "Figure 2: Model validation after minimization"
                  : "Figure 1: Model validation before minimization"
              }
            />
            <Figure
              src="/methanogensImages/fig3_mj0100_model.png"
              alt="MJ0100 I-TASSER model 1, rainbow N-to-C ribbon"
              caption="Figure 3: MJ0100, model 1"
            />
            <p>
              The top five of I-TASSER&rsquo;s top ten homologous PDB
              structures suggest MJ0100 may be an AMP-binding protein &mdash;
              the top four are specifically AMP-activated kinases, and the
              top three predicted ligands are adenosines with varying
              numbers of phosphates. No cysteines are close enough to bind
              an iron-sulfur cluster.
            </p>

            <h3>Function prediction</h3>
            <p>
              SIFTER returned 39 possible functions with a confidence score
              of just 0.01, but also predicted cystathionine beta-synthase
              (CBS) activity with a confidence score of{" "}
              <b>0.94</b>. CBS domains catalyze the production of
              L-cystathionine from L-serine and L-homocysteine, a crucial
              step in cysteine metabolism, and are known to be regulated by
              SAM. MJ0100&rsquo;s CBS domain is likely used to regulate the
              other domain&rsquo;s activity rather than catalyze a reaction
              itself.
            </p>
          </div>
        )}

        {protein === "mj1681" && (
          <div className="meth-tab-panel">
            <h3>Sequence-based homolog search and alignment</h3>
            <p>
              Among the archaea and bacteria, BLAST showed very high
              homology with annotated methanogenesis marker 16
              metalloproteins and proteins with ferredoxin activity &mdash;
              supported by two ferredoxin motifs in MJ1681&rsquo;s sequence,
              at positions 296&ndash;308 (CX<sub>2</sub>CX<sub>2</sub>CX
              <sub>5</sub>C) and 326&ndash;335 (CX<sub>2</sub>CX<sub>2</sub>CX
              <sub>2</sub>C). None of the eukaryote results shared an
              E-value below 7.4e-3 or greater than 30% identity with MJ1681.
            </p>
            <p>
              C36 was conserved (ignoring seven mutations and nine gaps);
              C72 and C166 were conserved among all archaea; C296, C299, and
              C302 were conserved among all non-gapped sequences except one
              bacterium; C326, C329, C332, and C335 were conserved among all
              non-gapped sequences; and C554 was conserved among all
              archaea.
            </p>

            <h3>Structure modeling and model validation</h3>
            <Figure
              src="/methanogensImages/fig4_mj1681_model.png"
              alt="MJ1681 I-TASSER model 1, rainbow N-to-C ribbon"
              caption="Figure 4: MJ1681, model 1 &mdash; both ferredoxin sites sit near the C-terminal (red/orange)."
            />
            <p>
              When measuring distances (in &Aring;) strictly within the
              defined motifs, the sulfur-to-sulfur spacing was too large to
              bind a 4Fe-4S cluster: 13.0, 10.5, 10.4, 11.1, and 11.7 &Aring;
              (Figure 6). But when measuring by spatial proximity instead of
              motif position, the distances begin to look like a real
              4Fe-4S site (Figure 5): 5.6, 5.0, 7.6, 13.0 &Aring; at the left
              site and 11.7, 6.2, 4.1, 11.7 &Aring; at the right site.
            </p>
            <div className="meth-figure-pair">
              <Figure
                src="/methanogensImages/fig5_mj1681_proximity.png"
                alt="Distances between cysteine sulfurs measured by spatial proximity"
                caption="Figure 5: Distances measured by proximity"
              />
              <Figure
                src="/methanogensImages/fig6_mj1681_motif.png"
                alt="Distances between cysteine sulfurs measured within the motif"
                caption="Figure 6: Distances within the second motif"
              />
            </div>

            <h3>Function prediction</h3>
            <p>No function was predicted for MJ1681 by SIFTER.</p>
          </div>
        )}

        {protein === "mj0542" && (
          <div className="meth-tab-panel">
            <h3>Sequence-based homolog search and alignment</h3>
            <p>
              All three BLAST results were saturated with annotated
              phosphoenolpyruvate (PEP) synthases. Sequence alignment found
              many conserved cysteines shared by some or all three domains
              of life, summarized below (the intein sits between positions
              411 and 822; only eight archaea had one). Hover a cell for the
              exact percentage &mdash; darker green marks positions
              conserved in more than 75% of that domain&rsquo;s sequences.
            </p>

            <div className="cys-table-wrap">
              <table className="cys-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    {cysPositions.map((p) => (
                      <th key={p}>{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(cysTable).map(([domain, values]) => (
                    <tr key={domain}>
                      <th className="cys-row-label">{domain}</th>
                      {values.map((v, i) => (
                        <td
                          key={i}
                          className={cellClass(v)}
                          title={`Position ${cysPositions[i]}: ${
                            v === null ? "not conserved / gapped" : v + "% conserved"
                          }`}
                        >
                          {v ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="cys-legend">
              <span className="cys-legend-swatch cys-high" /> &gt;75% conserved
              &nbsp;&nbsp;
              <span className="cys-legend-swatch cys-mid" /> 50&ndash;75%
              conserved &nbsp;&nbsp;
              <span className="cys-legend-swatch cys-low" /> &lt;50% conserved
              &nbsp;&nbsp;
              <span className="cys-legend-swatch cys-empty" /> not conserved / gapped
            </p>

            <h3>Structure modeling and model validation</h3>
            <p>
              I-TASSER&rsquo;s five models were structurally very different
              from each other due to alterations in the folding of the
              intein. After minimization, validation, and alignment to PEP
              synthase crystal structures, model 1 was most favorable. All
              models showed favorable energetics at the N-terminal even
              before minimization.
            </p>
            <Figure
              wide
              src="/methanogensImages/fig7_mj0542_nterm_validation.png"
              alt="SWISS-MODEL N-terminal validation plot for MJ0542"
              caption="Figure 7: MJ0542 N-terminal model validity before minimization"
            />
            <Figure
              src="/methanogensImages/fig8_mj0542_model.png"
              alt="MJ0542 I-TASSER model 1, active domains at the termini, intein in yellow/green"
              caption="Figure 8: MJ0542, model 1 &mdash; active domains at the termini (blue/red); the intein is yellow/green. I-TASSER correctly predicted PEP and Mg2+ as the most probable ligands."
            />
            <p>
              When MJ0542&rsquo;s intein was modeled on its own, it folded
              into a structure with coverage scores of 0.959, 0.850, and
              0.769 compared to archaeal intein-encoded endonucleases, and
              two of the top three probable ligands returned by I-TASSER
              were nucleic acids.
            </p>
            <Figure
              src="/methanogensImages/fig9_mj0542_intein_model.png"
              alt="MJ0542 intein modeled by itself"
              caption="Figure 9: MJ0542 intein, model 1"
            />

            <h3>Function prediction</h3>
            <p>
              SIFTER returned four possible functions for MJ0542:
              &ldquo;protein binding&rdquo; (0.9), &ldquo;phosphoenolpyruvate-protein
              phosphotransferase activity&rdquo; (0.89), &ldquo;pyruvate, water
              dikinase activity&rdquo; (0.83), and &ldquo;magnesium ion
              binding&rdquo; (0.8). MJ0542 is annotated as a probable PEP
              synthase, inferred from homology, on UniProt &mdash; with an
              annotation score of 4/5, it is likely MJ0542 has PEP synthase
              activity.
            </p>
          </div>
        )}
      </section>

      <section className="meth-section">
        <h2>Phylogenetic Trees</h2>
        <Figure
          src="/methanogensImages/fig10_duf39_tree.png"
          alt="Circular phylogenetic tree of duf39 genes across methanogens"
          caption="Figure 10: duf39 phylogenetic tree of methanogens. Most methanogens carry at least two members of the duf39 family."
        />

        <h3>MJ0542 homologs</h3>
        <p>
          This tree was refined to exclude repeated species and to include{" "}
          <i>E. coli</i>&rsquo;s closest homolog to MJ0542 &mdash; toggle
          between the original and revised version below.
        </p>
        <div className="meth-toggle-row">
          <button
            className={`meth-toggle-btn${!treeRevised ? " meth-toggle-active" : ""}`}
            onClick={() => setTreeRevised(false)}
          >
            Original
          </button>
          <button
            className={`meth-toggle-btn${treeRevised ? " meth-toggle-active" : ""}`}
            onClick={() => setTreeRevised(true)}
          >
            Revised (w/ E. coli)
          </button>
        </div>
        <Figure
          wide
          src={
            treeRevised
              ? "/methanogensImages/fig12_mj0542_tree_revised.png"
              : "/methanogensImages/fig11_mj0542_tree.png"
          }
          alt="Phylogenetic tree of MJ0542 homologs across Archaea, Bacteria, and Eukaryota"
          caption={
            treeRevised
              ? "Figure 12: MJ0542 homologs (revised)"
              : "Figure 11: MJ0542 homologs"
          }
        />
      </section>

      <section className="meth-section">
        <h2>Discussion and Future Work</h2>
        <h3>MJ0100</h3>
        <p>
          Based on the PDB analogs given by I-TASSER, it&rsquo;s possible
          MJ0100 is involved in adding a sulfone group to some organic
          molecule &mdash; plausible if MJ0100 actually binds an adenosine
          5-monosulfate instead of an adenosine 5-monophosphate like its
          RCSB analogs. Based on experimental evidence, it&rsquo;s more
          likely the CBS domain regulates MJ0100 instead of doing any
          reactions itself.
        </p>
        <h3>MJ1681</h3>
        <p>
          Much more research is needed. The iron-sulfur binding sites seem
          to be in an exposed position, which would weaken any binding
          affinity. The two motifs also seem to play off each other,
          possibly pointing to a new extended motif yet to be described. The
          model could also simply be inaccurate, despite favorable
          energetics.
        </p>
        <h3>MJ0542</h3>
        <p>
          Based on the SIFTER results, it&rsquo;s possible MJ0542 is a
          dimer, which would make it harder to determine its hidden
          function(s). Sequence alignment highlighted the most essential
          cysteines, but visualizing their positions in PyMOL
          didn&rsquo;t produce a breakthrough. The next step is molecular
          docking.
        </p>
        <h3>Phylogenetic Trees</h3>
        <p>
          The duf39 tree shows how these two genes are shared among
          methanogens; adding sequence lengths to it could show that when
          an organism has two duf39 genes, it&rsquo;s most likely to have
          one sequence below 450 amino acids paired with one above 450.
          MJ0542&rsquo;s tree made the clades easier to follow, but UniProt
          seemed to mis-organize some bacteria and eukaryotes &mdash; the
          next step is rebuilding it in phyloT with more diverse organisms.
        </p>
        <p>
          More research is needed to determine these proteins&rsquo;
          functions with confidence. Molecular docking and identifying key
          binding-site residues will be essential next steps.
        </p>
      </section>

      <section className="meth-section">
        <h2>References</h2>
        <ol className="meth-references">
          <li>
            Sofia, H. J., Chen, G., Hetzler, B. G., Reyes-Spindola, J. F.,
            and Miller, N. E. (2001) Radical SAM, a novel protein
            superfamily linking unresolved steps in familiar biosynthetic
            pathways with radical mechanisms, <i>Nucleic Acids Res.</i> 29,
            1097&ndash;1106.
          </li>
          <li>
            Jones, W., Leigh, J., Mayer, F., Woese, C., and Wolfe, R. (1983)
            Methanococcus jannaschii sp. nov., an extremely thermophilic
            methanogen from a submarine hydrothermal vent,{" "}
            <i>Arch. Microbiol.</i> 136, 254&ndash;261.
          </li>
          <li>
            Reeve, J. N., N&ouml;lling, J., Morgan, R. M., and Smith, D. R.
            (1997) Methanogenesis: genes, genomes, and who&rsquo;s on
            first?, <i>J. Bacteriol.</i> 179, 5975.
          </li>
          <li>
            White, D. M. R. H. (2017) Sulfide metabolism in{" "}
            <i>Methanocaldococcus jannaschii</i>: Promiscuity of a
            phosphoenolpyruvate synthase? (Tech, V., Ed.).
          </li>
          <li>(2018) UniProt, UniProt Consortium.</li>
          <li>
            Mathai, J. C., Missner, A., K&uuml;gler, P., Saparov, S. M.,
            Zeidel, M. L., Lee, J. K., and Pohl, P. (2009) No facilitator
            required for membrane transport of hydrogen sulfide,{" "}
            <i>PNAS</i>.
          </li>
          <li>
            Roy, A., Yang, J., and Zhang, Y. (2012) COFACTOR: an accurate
            comparative algorithm for structure-based protein function
            annotation, <i>Nucleic Acids Res.</i> 40, W471&ndash;W477.
          </li>
          <li>
            Yang, J., and Zhang, Y. (2015) I-TASSER server: new development
            for protein structure and function predictions,{" "}
            <i>Nucleic Acids Res.</i> 43, W174&ndash;W181.
          </li>
          <li>
            Zhang, Y. (2009) I-TASSER: Fully automated protein structure
            prediction in CASP8,{" "}
            <i>Proteins: Structure, Function, and Bioinformatics</i> 77,
            100&ndash;113.
          </li>
          <li>
            Benkert, P., Tosatto, S. C., and Schwede, T. (2009) QMEANclust:
            estimation of protein model quality by combining a composite
            scoring function with structural density information,{" "}
            <i>BMC Structural Biology</i> 9, 35.
          </li>
          <li>
            Schr&ouml;dinger, L. (2010) PyMOL The PyMOL Molecular Graphics
            System, Version.
          </li>
          <li>(2018) SIFTER, UC Berkeley.</li>
          <li>(2018) phyloT, Ivica Letunic.</li>
        </ol>
      </section>
    </div>
  );

  return StandardLayout({ title: "Methanogens", main });
}
