'use client'
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { useState } from 'react';
import ShowMoreButton from './showMoreButton';

export default function SchrodingEquation() {
    const [n, setN] = useState(1);
    const [l, setL] = useState(0);
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
        <h1>Hydrogen Atom: Electron Probability Cloud</h1>
        <p>Mathematical formulation of hydrogen atom states using Schrodinger's equation...</p>
        <h2>Time-Independent Schrodinger's Equation</h2>
        <BlockMath math="
            \frac{\hbar^2}{2m}
            \nabla^2\Psi
            + U\Psi
            = E\Psi"
        />
        <h2>Time-Dependent Schrodinger's Equation</h2>
        <BlockMath math="
            \Psi(\mathbf{r}, t) = 
            \sum c_n \psi_n(\mathbf{r}) 
            e^{-iE_nt/\hbar}
        "/>
        <h2>Separation of Variable</h2>
        <BlockMath math="
            \Psi_{n,l,m}(r, \theta, \phi) = R_{n,l}(r) Y_{l,m}(\theta, \phi)
        "/>
        {/* showMore Separation of Variable */}
        <ShowMoreButton 
            expanded={showMore}
            onClick={() => setShowMore(!showMore)}
        />
        {showMore && (
            <div className="showMore">
                <h4>To Radial Coordinates</h4>
                <BlockMath math="
                    \frac{\hbar^2}{2m}
                    \bigg(
                        \frac{\partial^2\Psi}{\partial x^2} + \frac{\partial^2\Psi}{\partial y^2} + \frac{\partial^2\Psi}{\partial z^2}
                    \bigg)
                    + U\Psi
                    = E\Psi"
                />
                <BlockMath math="
                    \frac{\hbar^2}{2m}
                    \big[
                        \frac{1}{r^2}\frac{\partial}{\partial r}
                        \bigg( 
                            r^2\frac{\partial\Psi}{\partial r}
                        \bigg) +
                        \frac{1}{r^2sin\theta}\frac{\partial}{\partial\theta}
                        \bigg( 
                            sin\theta\frac{\partial\Psi}{\partial\theta}
                        \bigg) +
                        \frac{R(r)}{r^2 sin^2\theta}\frac{\partial^2\Psi}{\partial \phi^2}
                    \big]
                    + U\Psi
                    = E\Psi
                "/>
            </div>
        )}
        {stateInput}
        <h2>Radial part</h2>
        <BlockMath math="
            R_{n,\ell}(\rho) = \rho^\ell \sum_{j=0}^{n-\ell-1} c_j \rho^k e^{-\rho/2}
        "/>
        where...
        <BlockMath math="
            \rho = \frac{2Z}{na_0}r
        \qquad\text{and}\qquad
            c_{j+1} = \frac{j+\ell+1-n}{(j+1)(j+2\ell+2)} c_j
        "/>
        <h2>Angular part</h2>
        <BlockMath math="
            Y_\ell^m(\theta, \phi) = 
            \sqrt{\frac{(2\ell+1)(\ell-m)!}{4\pi(\ell+m)!}}
            e^{im\phi}
            P_{\ell}^{m}(\cos\theta)
        "/>
        where the associated Legendre defned by Legendre polynomial and Rodrigues formula...
        <BlockMath math="
            P_{\ell}^{m}(x) \equiv (-1)^m (1-x^2)^{m/2} \bigg(\frac{d}{dx}\bigg)^{m} P_{\ell}(x)
        \qquad\text{and}\qquad
            P_{\ell}(x) \equiv \frac{1}{2^\ell \ell!} \bigg(\frac{d}{dx}\bigg)^{\ell} (x^2-1)^\ell
        "/>
        <h2>Hydrogen Wavefunction</h2>
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
    