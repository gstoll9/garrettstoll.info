'use client';
import StandardLayout from "@/layouts/standardLayout";
import "./hubbardmodel.css";
import { useState } from "react";
import { BlockMath, InlineMath } from 'react-katex';
import Image from "next/image";
import 'katex/dist/katex.min.css';


function HubbardModelPage() {

    const [plotId, setPId] = useState("minimizeU");
    const options = {
        minimizeU: "Minimize U",
        maximizeSingle: "Maximize Singly Occupied States",
        maximizeHeisenberg: "Maximize the Heisenberg State",
    };

    const page = (
        <div style={{ margin: "0% 3%" }}>
            <h1>Hubbard Model</h1>
            <div className="divider" />
            <div style={{ display: "flex" }}>
                <div style={{ order: 0, flex: 1 }}>
                    <p>&nbsp;&nbsp;&nbsp;&nbsp;This page is a summary of the undergraduate research I did with <a href="https://scarola.phys.vt.edu/">Dr. Vito Scarola</a> (2021). Our goal was to create code that simulated the three-site Hubbard Model and find solutions that minimize U(t) while keeping the system in a singly occupied state (or the Heisenberg state). I was able to accomplish this for the n and n,n-site Hubbard Model.</p>
                    <p>&nbsp;&nbsp;&nbsp;&nbsp;The Hubbard Model is useful in quantum computing when very cold particles are trapped in a laser lattice. To perform computational operations on these particles, we need them to be in singly occupied states. This research aims to do that while minimizing the energy input.</p>
                    <p>From Wikipedia, <a href="https://en.wikipedia.org/wiki/Hubbard_model">Hubbard Model</a>:</p>
                    <blockquote cite="https://en.wikipedia.org/wiki/Hubbard_model">
                        The Hubbard model is a useful approximation for particles in a periodic potential at sufficiently low temperatures... and long-range interactions between the particles can be ignored.
                    </blockquote>
                    <br />
                    <p><b>You can find my code on Github <a href="https://github.com/gstoll9/Hubbard-Model">here.</a></b></p>
                    <p>(See ExampleScript.ipynb for more solutions)</p>
                </div>
                <div style={{ order: 1, flex: 1, display: "flex", flexDirection: "row", alignItems: "center", margin: "0% 10%" }}>
                    <div style={{ order: 0, flex: 1, textAlign: "center", alignItems: "center"}}>
                        <Image
                            style={{ order: 0, flex: 4, margin: "1% 3%", objectFit: "cover" }}
                            src={`/hubbardmodelImages/scarola.png`}
                            alt="Dr. Vito Scarola "
                            width={256}
                            height={256}
                            sizes="100%"
                        />
                        <p style={{ order: 1, flex: 1}}><a href="https://scarola.phys.vt.edu/">Dr. Vito Scarola</a></p>
                    </div>
                    <div style={{ order: 0, flex: 1, textAlign: "center", alignItems: "center"}}>
                        <Image
                            style={{ order: 1, flex: 4, margin: "1% 3%", objectFit: "scale-down" }}
                            src={`/resumeImages/profilePic.png`}
                            alt="Garrett Stoll"
                            width={256}
                            height={256}
                            sizes="100%"
                        />
                        <p style={{ order: 1, flex: 1}}>Garrett Stoll</p>
                    </div>
                </div>
            </div>
            
            <br />
            <p>The Hubbard Model Hamiltonian</p>
            <BlockMath math="
                H=
                -t
                \sum_{<i,j>,\sigma} \bigg(
                    c_{i,\sigma}^\dagger c_{j,\sigma}
                \bigg)
                + U 
                \sum_{i} n_{i,\uparrow} n_{i,\downarrow}
                + \mu
                \sum_{i,\sigma} \bigg(
                    n_{i,\uparrow} + n_{i,\downarrow}
                \bigg)
            " />
            <p>Where</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", paddingLeft: "2rem" }}>
                <div>
                    <p><InlineMath math="t" /> - hopping parameter (tunneling amplitude)</p>
                    <p><InlineMath math="c_{i,\sigma}^\dagger" /> - creation operator at site i with spin <InlineMath math="\sigma" /></p>
                    <p><InlineMath math="c_{j,\sigma}" /> - annihilation operator at site j with spin <InlineMath math="\sigma" /></p>
                </div>
                <div>
                    <p><InlineMath math="U" /> - on-site interaction energy</p>
                    <p><InlineMath math="n_{i,\uparrow} n_{i,\downarrow}" /> - number operator for doubly occupied sites</p>
                    <p><InlineMath math="\mu" /> - chemical potential</p>
                </div>
            </div>
            <p>In matrix form</p>
            <BlockMath math="
                H = \begin{bmatrix}
                    U_{0} - \mu & -t(c_{0,\sigma}^\dagger c_{1,\sigma}) & \cdots & -t(c_{0,\sigma}^\dagger c_{n,\sigma}) \\
                    -t(c_{1,\sigma}^\dagger c_{0,\sigma}) & U_{1} - \mu & \ddots & \vdots \\
                    \vdots & \ddots & \ddots & -t(c_{n-1,\sigma}^\dagger c_{n,\sigma}) \\
                    -t(c_{n,\sigma}^\dagger c_{0,\sigma}) & \cdots & -t(c_{n,\sigma}^\dagger c_{n-1,\sigma}) & U_{n} - \mu \\
                \end{bmatrix}
            " />
            <p><InlineMath math="U_i=0" /> if <InlineMath math="\psi_i" /> is a singly occupied state.</p>
            <p>We set <InlineMath math="\mu=0" />, <InlineMath math="t=1" />, and the spins constant.</p>
            <p>The nine possible states are</p>
            <BlockMath math="
                \begin{matrix}
                    |\uparrow \quad \downarrow \quad \uparrow| & |\uparrow\downarrow \quad \ \quad \uparrow| & |\ \quad \uparrow\downarrow \quad \uparrow | \\
                    |\uparrow \quad \uparrow \quad \downarrow| & |\uparrow\downarrow \quad \uparrow \quad \ | & |\uparrow \quad \ \quad \uparrow\downarrow| \\
                    |\downarrow \quad \uparrow \quad \uparrow| & |\uparrow \quad \uparrow\downarrow \quad \ | & |\ \quad \uparrow \quad \uparrow\downarrow| \\
                \end{matrix}" 
            />
            {/* <p>For the three-site Hubbard Model,</p>
            <BlockMath math="
                \Psi = 
                \begin{bmatrix}
                    \psi_1 \\
                    \psi_2 \\
                    \psi_3 \\
                    \psi_4 \\
                    \psi_5 \\
                    \psi_6 \\
                    \psi_7 \\
                    \psi_8 \\
                    \psi_9
                \end{bmatrix}
                \begin{matrix}
                    \uparrow \quad \downarrow \quad \uparrow \\
                    \uparrow \quad \uparrow \quad \downarrow \\
                    \downarrow \quad \uparrow \quad \uparrow \\
                    \uparrow\downarrow \quad \ \quad \uparrow \\
                    \uparrow \quad \downarrow \quad \uparrow \\
                    \uparrow \quad \downarrow \quad \uparrow \\
                    \uparrow \quad \downarrow \quad \uparrow \\
                    \uparrow \quad \downarrow \quad \uparrow \\
                    \uparrow \quad \downarrow \quad \uparrow \\
                \end{matrix}
            " /> */}
            <h1>Solutions</h1>
            <div className="divider" />
            {Object.entries(options).map(([key, label]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center" }}>
                        <input
                            style={{ marginRight: "0.3rem" }}
                            type="radio"
                            name="solution-options"
                            value={label}
                            checked={plotId === key}
                            onChange={() => setPId(key)}
                        />
                        {label}
                    </label>
                </div>
            ))}
            <Image
                style={{ height: "auto", width: "70%", margin: "1% 3%" }}
                src={`/hubbardmodelImages/${plotId}.png`}
                alt="the chosen solution"
                width={0}
                height={0}
                sizes="100%"
            />
{/* 
            <h1>Next Steps</h1>
            <div className="divider" />
            <p>I would like to implement a Fourier transform and general additive model to find equations for these solutions. It would also be fruitful to zoom in on the pulses in U(t) using the same code with a smaller time step.</p> */}

            {/* <div className="parameter-container"
                style={{ display: "flex", flexDirection: "row", gap: "1rem" }}>
                {[0, 1, 2].map((i) => (
                    <div 
                      key={i}
                      style={{ 
                        marginBottom: "1rem", 
                        border: "1px solid #ccc", 
                        padding: "1rem", 
                        borderRadius: "8px",
                        display: "flex", 
                        flexDirection: "row", 
                        alignItems: "flex-start",
                        gap: "2rem"
                      }}>
                        <div style={{ flex: 1}}>
                            <input
                                type="number"
                                step="0.01"
                                defaultValue={
                                    (() => {
                                        switch (i) {
                                            case 0:
                                                return 0.99;
                                            case 1:
                                                return 1.23;
                                            case 2:
                                                return 2.34;
                                            default:
                                                return 0;
                                        }
                                    })()
                                }
                                style={{ marginBottom: "0.5rem", marginRight: "1rem" }}
                            />
                            {[1, 2, 3].map((opt) => (
                                <div key={opt} style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                                    <label style={{ display: "flex", alignItems: "center" }}>
                                        <input
                                            type="radio"
                                            name={`option-group-${i}`}
                                            value={opt}
                                            style={{ marginRight: "0.3rem" }}
                                        />
                                        option {opt}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div> */}
        </div>
    );

    return StandardLayout({title: "Hubbard Model", main: page});
}

export default HubbardModelPage