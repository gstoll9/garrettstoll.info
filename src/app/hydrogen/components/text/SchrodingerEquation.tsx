'use client'
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { useState } from 'react';
import ShowMoreButton from '../showMoreButton';
import "./hydrogenText.css";

export default function SchrodingerEquation() {
    const [n, setN] = useState(2);
    const [l, setL] = useState(1);
    const [m, setM] = useState(0);

    const [showMore, setShowMore] = useState(false);

    const stateInput = (
         <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
            <label>
                n:&nbsp;
                <input
                    type="number"
                    min={1}
                    value={n}
                    onChange={e => setN(Number(e.target.value))}
                    style={{ width: 50 }}
                />
            </label>
            <label>
                l:&nbsp;
                <input
                    type="number"
                    min={0}
                    max={n - 1}
                    value={l}
                    onChange={e => setL(Number(e.target.value))}
                    style={{ width: 50 }}
                />
            </label>
            <label>
                m:&nbsp;
                <input
                    type="number"
                    min={0}
                    value={m}
                    onChange={e => setM(Number(e.target.value))}
                    style={{ width: 50 }}
                />
            </label>
        </div>
    )

    return (<>
        <div className="sameLine">

        </div>
        <h1>Schrodinger's Equation</h1>
        <div className="divider" />
        <h2>Time-Independent</h2>
        <BlockMath math="
            \frac{\hbar^2}{2m}
            \nabla^2\Psi
            + U\Psi
            = E\Psi"
        />
        {/* showMore Separation of Variable */}
        {/* <ShowMoreButton 
            expanded={showMore}
            onClick={() => setShowMore(!showMore)}
        />
        {showMore && (
            <div className="showMore">
                <p>In radial coordinates...</p>
                <BlockMath math="
                    \nabla^2 = 
                    \frac{1}{r^2}\frac{\partial}{\partial r}
                    \bigg( 
                        r^2\frac{\partial}{\partial r}
                    \bigg) +
                    \frac{1}{r^2sin\theta}\frac{\partial}{\partial \theta}
                    \bigg( 
                        sin\theta\frac{\partial}{\partial \theta}
                    \bigg) +
                    \frac{1}{r^2 sin^2\theta}\frac{\partial^2}{\partial \phi^2}
                "/>
                <p>Plug in <InlineMath math="\nabla^2" />...</p>
                <BlockMath math="
                    \frac{\hbar^2}{2m}
                    \bigg[\bigg( 
                        r^2\frac{\partial}{\partial r}
                    \bigg) +
                    \frac{1}{r^2sin\theta}\frac{\partial}{\partial \theta}
                    \bigg( 
                        sin\theta\frac{\partial}{\partial \theta}
                    \bigg)\bigg]
                    \Psi
                    + U\Psi
                    = E\Psi"
                />
                <p>Assuming <InlineMath math="\Psi(r,\theta,\phi)=R(r)Y(\theta,\phi)" />...</p>
                <BlockMath math="
                    \frac{\hbar^2}{2m}
                    \bigg[
                        \frac{Y}{r^2}\frac{\partial}{\partial r}
                        \bigg( 
                            r^2\frac{\partial R}{\partial r}
                        \bigg) +
                        \frac{R}{r^2sin\theta}\frac{\partial}{\partial\theta}
                        \bigg( 
                            sin\theta\frac{\partial Y}{\partial\theta}
                        \bigg) +
                        \frac{R}{r^2 sin^2\theta}\frac{\partial^2Y}{\partial \phi^2}
                    \bigg]
                    + URY
                    = ERY
                "/>
                <p>Divide by <InlineMath math="YR" />, multiply by <InlineMath math="\frac{-2mr^2}{\hbar^2}" />, and separate terms...</p>
                <BlockMath math="
                    \frac{1}{R}\frac{d}{dr}
                    \bigg[
                        r^2\frac{dR}{dr} - \frac{2mr^2}{\hbar^2}\bigg(U(r)-E\bigg)
                    \bigg] =
                    \frac{1}{Y}
                    \bigg[
                        \frac{1}{sin\theta}\frac{\partial}{\partial\theta}
                        \bigg( 
                            sin\theta\frac{\partial Y}{\partial\theta}
                        \bigg) +
                        \frac{1}{sin^2\theta}\frac{\partial^2 Y}{\partial \phi^2}
                    \bigg]
                "/>
            </div>
        )}
        <h2>Separation of Variable</h2>
        <BlockMath math="
            \Psi_{n,l,m}(r, \theta, \phi) = R_{n,l}(r) Y_{l,m}(\theta, \phi)
        "/> */}
        <h2>Time-Dependent</h2>
        <BlockMath math="
            \Psi(\mathbf{r}, t) = 
            \sum c_n \psi_n(\mathbf{r}) 
            e^{-iE_nt/\hbar}
        "/>
        <BlockMath math="
            \mathbf{\Psi} = 
            \begin{bmatrix}
                \psi_1 \\
                \psi_2 \\
                \vdots \\
                \psi_n
            \end{bmatrix}
            \qquad
            H = 
            \begin{bmatrix}
                E_1 & E_{12} & \cdots & E_{1n} \\
                E_{21} & E_2 & \cdots & E_{2n} \\
                \vdots & \vdots & \ddots & \vdots \\
                E_{n1} & E_{n2} & \cdots & E_n
            \end{bmatrix}
            \qquad
            H\left|a\right\rangle = E\left|a\right\rangle
        "/>
        <BlockMath math="
            \left|\Psi(t)\right\rangle = e^{-iHt/\hbar}\left|\Psi(0)\right\rangle
        "/>
        
        <h1>The Hydrogen Atom</h1>
        <div className="divider" />
        {stateInput}
        
        <h2>General Wavefunction</h2>
        <BlockMath math="
            \Psi_{n,\ell,m}(r, \theta, \phi) = 
            \sqrt{\bigg(\frac{2}{na}\bigg)^3 \frac{(n-\ell-1)!}{2n(n+\ell)!}}
            e^{-r/na}
            \bigg(\frac{2r}{na}\bigg)^\ell
            \bigg[L_{n-\ell-1}^{2\ell+1}\bigg(\frac{2r}{na}\bigg)\bigg]
            Y_{\ell,m}(\theta,\phi)
        "/>
        where the associated Laguerre polynomial is defind by Laguerre polynomial...
        <BlockMath math="
            L_{q}^{p}(x) \equiv (-1)^p \bigg(\frac{d}{dx}\bigg)^p L_{p+q}(x)
        \qquad\text{and}\qquad
            L_{q}(x) \equiv \frac{e^x}{q!} \bigg(\frac{d}{dx}\bigg)^q (e^{-x} x^q)
        "/>
    </>);
}
    