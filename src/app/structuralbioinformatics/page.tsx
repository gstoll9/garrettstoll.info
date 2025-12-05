'use client';

import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

import StandardLayout from "@/layouts/standardLayout";

export default function StructuralBioinformaticsPage() {
  const main = (
    <div>
      <h1>Structural Bioinformatics</h1>
      <p>This page is notes I have taken from An Introduction to Computational Physics by Tao Pang.</p>

      <h2>Primary Structure</h2>
      <ul><li>DNA &rarr; Amino Acids</li></ul>

      <ul><li>Amino Acids</li></ul>

      <ul><li>Peptide Bonds</li></ul>

      <ul><li>Interactions</li></ul>
      <ul>
        <li>Charge-Charge</li>
        <BlockMath math="E_{Coul} = 322 \frac{q_i q_j}{\epsilon_r r_{ij}}\ \ \ \text{kcal/mol}" />
        
        <li>Charge-Dipole</li>
        <BlockMath math="U = \frac{q_i \mu_j (\cos \theta)}{\epsilon_r r_{ij}^2}\ \ \ \text{kcal/mol}" />
        
        <li>Dipole-Dipole</li>
        <BlockMath math="U = \frac{\mu_i \mu_j (2 \cos \theta_i \cos \theta_j - \sin \theta_i \sin \theta_j)}{\epsilon_r r_{ij}^3}\ \ \ \text{kcal/mol}" />
        
        <li>Induced Dipole</li>
        <BlockMath math="U = \frac{A_{ij}}{r_{ij}^{12}} - \frac{B_{ij}}{r_{ij}^{6}}\ \ \ \text{kcal/mol}" />
      </ul>

      <h2>Secondary Structure</h2>
      <ul>
        <li>Alpha Helix</li>
        <li>Beta Sheets</li>
      </ul>

      <h2>Tertiary Structure</h2>
      <ul>
        <li>The 3D structure of a single polypeptide chain</li>
        <li>Simple Motif &rarr; Complex Motif &rarr; Domain</li>
      </ul>
      
      <h3>Simple Motif</h3>
      <ul>
        <li><h4>Alpha Helix</h4></li>
        <ul>
            <li><h5>HLH</h5></li>
            <ul>
                <li>helix - loop - helix (HLH)</li>
                <li>Examples:</li>
                <ul>
                  <li>EF-hand in Ca<sup>2+</sup> binding proteins</li>
                  <ul>
                      <li>Ca<sup>2+</sup> binds to polar side-chain and main-chain atoms in the loop region</li>
                      <li>The binding creates small movements, moving the helices, and causing a conformational change</li>
                  </ul>
                  <li>bHLH in DNA binding proteins</li>
                  <ul>
                      <li>One of the helices binds into the major DNA groove, allowing recognition of specific sequences</li>
                      <li>The interacting residues are basic, hence <b>b</b>HLH</li>
                  </ul>
                </ul>
            </ul>
        </ul>
        <li><h4>Beta Sheets</h4></li>
        <ul>
            <li>&beta; hairpin</li>
            <li>&beta; meander</li>
            <li>Greek key</li>
            <li>Jellyroll</li>
            <li>&beta; sandwich</li>
            <li>&beta; propeller</li>
            <li>&beta; helix</li>
        </ul>
        <li><h4>Mixed motifs</h4></li>
        <ul>
            <li>&beta;-&alpha;-&beta; motif</li>
            <ul>
                <li>The most common mixed motif</li>
                <li>Allows for two &beta; strands to be parallel</li>
                <li>Efficiently packs nonpolar residues inside</li>
                <li>The first loop often participates in ligand binding</li>
            </ul>
        </ul>
      </ul>

      <h3>Complex Motif</h3>
      <ul>
        <li>Combination of simple motifs</li>
        <li>Most complex motifs appear in a small set of proteins</li>
        <li><b>Superfolds</b> appear in many proteins (the most common 10 appear in 1/3 of all proteins)</li>
        <ul>
            <li>May appear in proteins that have very little sequence similarity (structure is conserved over sequence)</li>
            <li>Very stable with amino acid and secondary structure packing</li>
            <li>They create binding and active sites</li>
        </ul>
      </ul>

      <h3>Domain</h3>
      <ul>
        <li>Functional unit of a protein</li>
        <li>Usually 100-250 amino acids</li>
        <li>Most proteins have more than 1 domain, usually 2-5, max 12</li>
        <li>Pfam classifies domains by sequence (<a href="https://pfam.sanger.ac.uk/">https://pfam.sanger.ac.uk</a>)</li>
      </ul>

      <h3>Protein classifications</h3>
      <ul>
        <li>Family</li>
        <ul>
            <li>Greater than 40% sequence identity (<b>homologs</b>)</li>
            <li>Very similar structures</li>
            <li>Common evolutionary path</li>
        </ul>
        <li>Superfamily</li>
        <ul>
            <li>About 20-30% sequence identity</li>
            <li>Similar structures</li>
            <li>Distant evolutionary relatives</li>
        </ul>
        <li>Class</li>
        <ul>
            <li>Same overall organization of secondary structures</li>
        </ul>
      </ul>

      <h3>Globular Proteins</h3>
      <ul>
        <li>Compact (the cytoplasm is crowded)</li>
        <li>Stable (hydrophobic core)</li>
        <li>Water Soluble (hydrophilic surface)</li>
      </ul>

      <h2>Quaternary Structure</h2>

      <h2>Computational Modeling</h2>
      <ul>
        <li>Physics-based (ab initio)</li>
        <ul>
          <li>Assumptions:</li>
          <ol>
            <li>Protein folding involves a decrease in free energy</li>
            <li>The native structure has the lowest free energy (global minimum)</li>
          </ol>
          <BlockMath math="\Delta G = \Delta H - T\Delta S_{sys}"></BlockMath>
          <BlockMath math="\Delta H = \Delta E - \Delta (PV)"></BlockMath>
          <BlockMath math="\Delta E = \Delta U - \Delta K"></BlockMath>
          <BlockMath math="\Delta E = \Delta U - \Delta K"></BlockMath>
          <p>In biological systems: <InlineMath math="\Delta K = \frac{3}{2} k_B T" /> and we don't worry about <InlineMath math="\Delta (PV)" /></p>
          <BlockMath math="\Delta G = \Delta U + \frac{3}{2} k_B T - T\Delta S_{sys}"></BlockMath>
          <li>Force-field based calculations calculate U using <b>molecular mechanics</b></li>
          <p>U=</p>
          <table><tbody>
            <tr>
              <td>covalent bond length</td>
              <td><BlockMath math="U_{bond} = \frac{1}{2} k_{bond} (r - r_{0})^2"/></td>
            </tr>
            <tr>
              <td>covalent bond angle</td>
              <td><BlockMath math="U_{angle} = \frac{1}{2} k_{angle} (\theta - \theta_{0})^2"/></td>
            </tr>
            <tr>
              <td>covalent bond dihedral angle</td>
              <td><BlockMath math="U_{torsion} = \frac{1}{2} k_{torsion} (1 + \cos(n\phi - \gamma))"/></td>
            </tr>
            <tr>
              <td>improper dihedral angle</td>
              <td><BlockMath math="U_{improper} = \frac{1}{2} k_{improper} (1 + \cos(n\phi - \gamma))"/></td>
            </tr>
            <tr>
              <td>vdW interactions</td>
              <td><BlockMath math=">U_{vdW} = \sum_{i<j} \frac{A_{ij}}{r_{ij}^{12}} - \frac{B_{ij}}{r_{ij}^{6}}"/></td>
            </tr>
            <tr>
              <td>electrostatic interactions</td>
              <td><BlockMath math="U_{elec} = \sum_{i<j} \frac{q_{i}q_{j}}{r_{ij}}"/></td>
            </tr>
          </tbody></table>
        </ul>
        <li>Template-based</li>
        <ul>
          <li>Homology Modeling</li>
        </ul>
      </ul>
    </div>
  );

  return StandardLayout({ title: "Structural Bioinformatics", main });
}