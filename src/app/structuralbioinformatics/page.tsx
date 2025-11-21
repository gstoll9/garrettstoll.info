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
      <li><ul>DNA &rarr; Amino Acids</ul></li>

      <li><ul>Amino Acids</ul></li>

      <li><ul>Peptide Bonds</ul></li>

      <li><ul>Interactions</ul></li>
      <li>
        <ul>Charge-Charge</ul>
        <li>

        </li>
        <BlockMath math="E_{Coul} = 322 \frac{q_i q_j}{\epsilon_r r_{ij}}\ \ \ \text{kcal/mol}" />
        <ul>Charge-Dipole</ul>
        <li>
            
        </li>
        <BlockMath math="U = \frac{q_i \mu_j (\cos \theta)}{\epsilon_r r_{ij}^2}\ \ \ \text{kcal/mol}" />
        <ul>Dipole-Dipole</ul>
        <li>
            
        </li>
        <BlockMath math="U = \frac{\mu_i \mu_j (2 \cos \theta_i \cos \theta_j - \sin \theta_i \sin \theta_j)}{\epsilon_r r_{ij}^3}\ \ \ \text{kcal/mol}" />
        <ul>Induced Dipole</ul>
        <li>
            
        </li>
        <BlockMath math="U = \frac{A_{ij}}{r_{ij}^{12}} - \frac{B_{ij}}{r_{ij}^{6}}\ \ \ \text{kcal/mol}" />
        <ul></ul>
      </li>

      <h2>Secondary Structure</h2>
      <li>
        <ul>Alpha Helix</ul>
        <ul>Beta Sheets</ul>
      </li>

      <h2>Tertiary Structure</h2>
      <li>
        <ul>The 3D structure of a single polypeptide chain</ul>
        <ul>Simple Motif &rarr; Complex Motif &rarr; Domain</ul>
      </li>
      
      <h3>Simple Motif</h3>
      <li>
        <ul><h4>Alpha Helix</h4></ul>
        <li>
            <ul><h5>HLH</h5></ul>
            <li>
                <ul>helix - loop - helix (HLH)</ul>
                <ul>Examples</ul>
                <ul>EF-hand in Ca<sup>2+</sup> binding proteins</ul>
                <li>
                    <ul>Ca<sup>2+</sup> binds to polar side-chain and main-chain atoms in the loop region</ul>
                    <ul>The binding creates small movements, moving the helices, and causing a conformational change</ul>
                </li>
                <ul>bHLH in DNA binding proteins</ul>
                <li>
                    <ul>One of the helices binds into the major DNA groove, allowing recognition of specific sequences</ul>
                    <ul>The interacting residues are basic, hence <b>b</b>HLH</ul>
                </li>
            </li>
        </li>
        <ul><h4>Beta Sheets</h4></ul>
        <li>
            <ul>&beta; hairpin</ul>
            <ul>&beta; meander</ul>
            <ul>Greek key</ul>
            <ul>Jellyroll</ul>
            <ul>&beta; sandwich</ul>
            <ul>&beta; propeller</ul>
            <ul>&beta; helix</ul>
        </li>
        <ul><h4>Mixed motifs</h4></ul>
        <li>
            <ul>&beta;-&alpha;-&beta; motif</ul>
            <li>
                <ul>The most common mixed motif</ul>
                <ul>Allows for two &beta; strands to be parallel</ul>
                <ul>Efficiently packs nonpolar residues inside</ul>
                <ul>The first loop often participates in ligand binding</ul>
            </li>
        </li>
      </li>

      <h3>Complex Motif</h3>
      <li>
        <ul>Combination of simple motifs</ul>
        <ul>Most complex motifs appear in a small set of proteins</ul>
        <ul><b>Superfolds</b> appear in many proteins (the most common 10 appear in 1/3 of all proteins)</ul>
        <li>
            <ul>May appear in proteins that have very little sequence similarity (structure is conserved over sequence)</ul>
            <ul>Very stable with amino acid and secondary structure packing</ul>
            <ul>They create binding and active sites</ul>
        </li>
      </li>

      <h3>Domain</h3>
      <li>
        <ul>Functional unit of a protein</ul>
        <ul>Usually 100-250 amino acids</ul>
        <ul>Most proteins have more than 1 domain, usually 2-5, max 12</ul>
        <ul>Pfam classifies domains by sequence (<a href="https://pfam.sanger.ac.uk/">https://pfam.sanger.ac.uk</a>)</ul>
      </li>

      <h3>Protein classifications</h3>
      <li>
        <ul>Family</ul>
        <li>
            <ul>Greater than 40% sequence identity (<b>homologs</b>)</ul>
            <ul>Very similar structures</ul>
            <ul>Common evolutionary path</ul>
        </li>
        <ul>Superfamily</ul>
        <li>
            <ul>About 20-30% sequence identity</ul>
            <ul>Similar structures</ul>
            <ul>Distant evolutionary relatives</ul>
        </li>
        <ul>Class</ul>
        <li>
            <ul>Same overall organization of secondary structures</ul>
        </li>
      </li>


      <h3>Globular Proteins</h3>
      <li>
        <ul>Compact (the cytoplasm is crowded)</ul>
        <ul>Stable (hydrophobic core)</ul>
        <ul>Water Soluble (hydrophilic surface)</ul>
      </li>

      

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
          <p>U=</p><table>
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
          </table>
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