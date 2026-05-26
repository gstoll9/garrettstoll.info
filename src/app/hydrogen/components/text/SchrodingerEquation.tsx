'use client'
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { useEffect, useState } from 'react';
import Algebrite from 'algebrite';
import "./hydrogenText.css";

interface SchrodingerEquationProps {
    n?: number;
    l?: number;
    m?: number;
    onStateChange?: (state: { n: number; l: number; m: number }) => void;
}

export default function SchrodingerEquation({
    n: controlledN,
    l: controlledL,
    m: controlledM,
    onStateChange,
}: SchrodingerEquationProps) {
    const factorial = (x: number): number => {
        if (x <= 1) return 1;
        let out = 1;
        for (let i = 2; i <= x; i++) out *= i;
        return out;
    };

    const formatCoeff = (value: number): string => {
        if (!Number.isFinite(value)) return '0';
        const abs = Math.abs(value);
        if (abs === 0) return '0';
        if (Math.abs(value - Math.round(value)) < 1e-10) return `${Math.round(value)}`;
        if (abs >= 1e4 || abs < 1e-4) {
            const [mantissaRaw, exponentRaw] = value.toExponential(4).split('e');
            const exponent = Number(exponentRaw);
            return `${mantissaRaw}\\times 10^{${exponent}}`;
        }
        return value.toFixed(6).replace(/\.?0+$/, '');
    };

    const laguerreExpandedLatex = (nVal: number, lVal: number): string => {
        const pVal = nVal - lVal - 1;
        const qVal = 2 * lVal + 1;
        const terms: string[] = [];
        for (let k = 0; k <= pVal; k++) {
            const coeff = Math.pow(-1, k) * factorial(pVal + qVal)
                / (factorial(pVal - k) * factorial(qVal + k) * factorial(k));
            const coeffStr = formatCoeff(coeff);
            terms.push(`${coeffStr}\\left(\\frac{2r}{${nVal}a_0}\\right)^{${k}}`);
        }
        return terms.join(' + ').replace(/\+ -/g, '- ');
    };

    const associatedLegendreExpandedLatex = (lVal: number, mVal: number): string => {
        const absM = Math.abs(mVal);
        const maxJ = Math.floor((lVal - absM) / 2);
        const terms: string[] = [];
        for (let j = 0; j <= maxJ; j++) {
            const numerator = Math.pow(-1, j) * factorial(2 * lVal - 2 * j);
            const denominator = Math.pow(2, lVal) * factorial(j) * factorial(lVal - j) * factorial(lVal - absM - 2 * j);
            const coeff = numerator / denominator;
            const power = lVal - absM - 2 * j;
            const coeffStr = formatCoeff(coeff);
            terms.push(`${coeffStr}(\\cos\\theta)^{${power}}`);
        }
        return terms.join(' + ').replace(/\+ -/g, '- ');
    };

    const simplifyExprRaw = (expr: string): string => {
        try {
            return String(Algebrite.run(`simplify(${expr})`)).trim();
        } catch {
            return expr;
        }
    };

    const exprToLatex = (expr: string): string => {
        try {
            return String(Algebrite.run(`printlatex(${expr})`)).trim();
        } catch {
            return expr;
        }
    };

    const laguerrePolynomialExpr = (nVal: number, lVal: number, variableName: string): string => {
        const pVal = nVal - lVal - 1;
        const qVal = 2 * lVal + 1;
        const terms: string[] = [];
        for (let k = 0; k <= pVal; k++) {
            const numerator = Math.pow(-1, k) * factorial(pVal + qVal);
            const denominator = factorial(pVal - k) * factorial(qVal + k) * factorial(k);
            terms.push(`((${numerator})/(${denominator}))*${variableName}^(${k})`);
        }
        return terms.join('+').replace(/\+\-/g, '-');
    };

    const associatedLegendrePolynomialExpr = (lVal: number, mVal: number, variableName: string): string => {
        const absM = Math.abs(mVal);
        const maxJ = Math.floor((lVal - absM) / 2);
        const terms: string[] = [];
        for (let j = 0; j <= maxJ; j++) {
            const numerator = Math.pow(-1, j) * factorial(2 * lVal - 2 * j);
            const denominator = Math.pow(2, lVal) * factorial(j) * factorial(lVal - j) * factorial(lVal - absM - 2 * j);
            const power = lVal - absM - 2 * j;
            terms.push(`((${numerator})/(${denominator}))*${variableName}^(${power})`);
        }
        return terms.join('+').replace(/\+\-/g, '-');
    };

    const radialNormalizationExpr = (nVal: number, lVal: number): string => {
        const num = 4 * factorial(nVal - lVal - 1);
        const den = Math.pow(nVal, 4) * factorial(nVal + lVal);
        return simplifyExprRaw(`sqrt((${num})/(${den}*a_0^3))`);
    };

    const angularNormalizationExpr = (lVal: number, mVal: number): string => {
        const absM = Math.abs(mVal);
        const num = (2 * lVal + 1) * factorial(lVal - absM);
        const den = 4 * factorial(lVal + absM);
        return simplifyExprRaw(`sqrt((${num})/(${den}*pi))`);
    };

    const simplifiedNormalizationExpr = (nVal: number, lVal: number, mVal: number): string => {
        const absM = Math.abs(mVal);
        const num = factorial(nVal - lVal - 1) * (2 * lVal + 1) * factorial(lVal - absM);
        const den = Math.pow(nVal, 4) * factorial(nVal + lVal) * factorial(lVal + absM);
        const expr = `sqrt((${num})/(${den}*pi*a_0^3))`;
        return simplifyExprRaw(expr);
    };

    const simplifiedRadialExpr = (nVal: number, lVal: number): string => {
        const radialVar = 'xradial';
        const lagExpr = laguerrePolynomialExpr(nVal, lVal, radialVar);
        const expr = `(${radialNormalizationExpr(nVal, lVal)})*exp(-r/(${nVal}*a_0))*(${radialVar}^(${lVal}))*(${lagExpr})`;
        return simplifyExprRaw(expr);
    };

    const simplifiedAngularExpr = (lVal: number, mVal: number): string => {
        const absM = Math.abs(mVal);
        const cosVar = 'ucostheta';
        const sinVar = 'ssintheta';
        const legExpr = associatedLegendrePolynomialExpr(lVal, mVal, cosVar);
        const phaseExpr = mVal > 0
            ? `exp(i*${mVal}*phi)`
            : (mVal < 0
                ? `exp(-i*${Math.abs(mVal)}*phi)`
                : '1');
        const expr = `(${angularNormalizationExpr(lVal, mVal)})*(${sinVar}^(${absM}))*(${legExpr})*(${phaseExpr})`;
        return simplifyExprRaw(expr);
    };

    const simplifiedOrbitalCoreExpr = (nVal: number, lVal: number, mVal: number): string => {
        const absM = Math.abs(mVal);
        const radialVar = 'xradial';
        const cosVar = 'ucostheta';
        const sinVar = 'ssintheta';
        const lagExpr = laguerrePolynomialExpr(nVal, lVal, radialVar);
        const legExpr = associatedLegendrePolynomialExpr(lVal, mVal, cosVar);
        const combinedExpr = `(${radialVar}^(${lVal}))*(${lagExpr})*(${sinVar}^(${absM}))*(${legExpr})`;
        return simplifyExprRaw(combinedExpr);
    };

    const hydrogenExprToLatex = (expr: string, nVal: number): string => {
        const latex = exprToLatex(expr);

        return latex
            .replace(/xradial/g, String.raw`\left(\frac{2r}{${nVal}a_0}\right)`)
            .replace(/ucostheta/g, String.raw`\cos\theta`)
            .replace(/ssintheta/g, String.raw`\sin\theta`)
            .replace(/\ba0\b/g, String.raw`a_0`);
    };

    const isControlled = controlledN !== undefined && controlledL !== undefined && controlledM !== undefined;
    const [internalN, setInternalN] = useState(controlledN ?? 2);
    const [internalL, setInternalL] = useState(controlledL ?? 1);
    const [internalM, setInternalM] = useState(controlledM ?? 0);

    useEffect(() => {
        if (!isControlled) return;
        setInternalN(controlledN!);
        setInternalL(controlledL!);
        setInternalM(controlledM!);
    }, [isControlled, controlledN, controlledL, controlledM]);

    const n = isControlled ? controlledN! : internalN;
    const l = isControlled ? controlledL! : internalL;
    const m = isControlled ? controlledM! : internalM;

    const commitState = (nextN: number, nextL: number, nextM: number) => {
        if (!isControlled) {
            setInternalN(nextN);
            setInternalL(nextL);
            setInternalM(nextM);
        }
        onStateChange?.({ n: nextN, l: nextL, m: nextM });
    };

    const updateN = (value: number) => {
        const nextN = Math.max(1, Math.floor(value) || 1);
        const nextL = Math.min(l, nextN - 1);
        const nextM = Math.max(-nextL, Math.min(m, nextL));
        commitState(nextN, nextL, nextM);
    };

    const updateL = (value: number) => {
        const maxL = n - 1;
        const nextL = Math.max(0, Math.min(Math.floor(value) || 0, maxL));
        const nextM = Math.max(-nextL, Math.min(m, nextL));
        commitState(n, nextL, nextM);
    };

    const updateM = (value: number) => {
        const nextM = Math.max(-l, Math.min(Math.floor(value) || 0, l));
        commitState(n, l, nextM);
    };

    const isValidState = l >= 0 && l < n && Math.abs(m) <= l;
    const p = n - l - 1;
    const q = 2 * l + 1;
    const mAbs = Math.abs(m);
    const jMax = Math.floor((l - mAbs) / 2);

    const stateWavefunctionLatex = isValidState
        ? String.raw`
            \Psi_{${n},${l},${m}}(r,\theta,\phi)=
            \sqrt{\left(\frac{2}{${n}a_0}\right)^3\frac{(${n}-${l}-1)!}{2(${n})(${n}+${l})!}}
            e^{-r/(${n}a_0)}
            \left(\frac{2r}{${n}a_0}\right)^{${l}}
            L_{${n - l - 1}}^{${2 * l + 1}}\!\left(\frac{2r}{${n}a_0}\right)
            Y_{${l},${m}}(\theta,\phi)
        `
        : String.raw`\text{Invalid state: require } n\ge1,\ 0\le l\le n-1,\ |m|\le l`;

        const expandedWavefunctionLatex = isValidState
                ? String.raw`
                        \Psi_{${n},${l},${m}}(r,\theta,\phi)=
                        \sqrt{\left(\frac{2}{${n}a_0}\right)^3\frac{${p}!}{2(${n})(${n}+${l})!}}
                        e^{-r/(${n}a_0)}
                        \left(\frac{2r}{${n}a_0}\right)^{${l}}
                        \left[
                            \sum_{k=0}^{${p}}
                            (-1)^k
                            \frac{(${p}+${q})!}{(${p}-k)!(${q}+k)!k!}
                            \left(\frac{2r}{${n}a_0}\right)^k
                        \right]
                        \\
                        	imes
                        \sqrt{\frac{2\cdot${l}+1}{4\pi}\frac{(${l}-${mAbs})!}{(${l}+${mAbs})!}}
                        (\sin\theta)^{${mAbs}}
                        \left[
                            \sum_{j=0}^{${jMax}}
                            (-1)^j
                            \frac{(2\cdot${l}-2j)!}{2^{${l}}\,j!\,(${l}-j)!\,(${l}-${mAbs}-2j)!}
                            (\cos\theta)^{${l - mAbs}-2j}
                        \right]
                        e^{i(${m})\phi}
                `
                : String.raw`\text{Invalid state: require } n\ge1,\ 0\le l\le n-1,\ |m|\le l`;

                const simplifiedSelectedStateLatex = (() => {
                    if (!isValidState) {
                        return String.raw`\text{Invalid state: require } n\ge1,\ 0\le l\le n-1,\ |m|\le l`;
                    }

                    const MAX_N_FOR_SIMPLIFIED = 7;
                    if (n > MAX_N_FOR_SIMPLIFIED) {
                        return String.raw`\text{Simplified state expansion is enabled for }n\le ${MAX_N_FOR_SIMPLIFIED}\text{ to keep expressions readable.}`;
                    }

                    const normalizationExpr = simplifiedNormalizationExpr(n, l, m);
                    const orbitalCoreExpr = simplifiedOrbitalCoreExpr(n, l, m);
                    const phaseExpr = m > 0
                        ? `exp(i*${m}*phi)`
                        : (m < 0
                            ? `exp(-i*${Math.abs(m)}*phi)`
                            : '1');
                    const fullExpr = `(${normalizationExpr})*exp(-r/(${n}*a_0))*(${orbitalCoreExpr})*(${phaseExpr})`;
                    const fullSimplifiedExpr = simplifyExprRaw(fullExpr);
                    const fullLatex = hydrogenExprToLatex(fullSimplifiedExpr, n);

                    return String.raw`\psi_{${n}${l}${m}}(r,\theta,\phi)=${fullLatex}`;
                })();

    const selectedRadialLatex = (() => {
        if (!isValidState) {
            return String.raw`\text{Invalid state: require } n\ge1,\ 0\le l\le n-1,\ |m|\le l`;
        }

        const radialExpr = simplifiedRadialExpr(n, l);
        return String.raw`R_{${n}${l}}(r)=${hydrogenExprToLatex(radialExpr, n)}`;
    })();

    const selectedAngularLatex = (() => {
        if (!isValidState) {
            return String.raw`\text{Invalid state: require } n\ge1,\ 0\le l\le n-1,\ |m|\le l`;
        }

        const angularExpr = simplifiedAngularExpr(l, m);
        return String.raw`Y_{${l}${m}}(\theta,\phi)=${hydrogenExprToLatex(angularExpr, n)}`;
    })();

    const stateInput = (
         <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
            <label>
                n:&nbsp;
                <input
                    type="number"
                    min={1}
                    value={n}
                    onChange={e => updateN(Number(e.target.value))}
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
                    onChange={e => updateL(Number(e.target.value))}
                    style={{ width: 50 }}
                />
            </label>
            <label>
                m:&nbsp;
                <input
                    type="number"
                    min={-l}
                    max={l}
                    value={m}
                    onChange={e => updateM(Number(e.target.value))}
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
        <h2>Separation of Variables</h2>
        <p>In spherical coordinates, the Laplacian expands as:</p>
        <BlockMath math="
            \nabla^2 = 
            \frac{1}{r^2}\frac{\partial}{\partial r}
            \bigg( 
                r^2\frac{\partial}{\partial r}
            \bigg) +
            \frac{1}{r^2\sin\theta}\frac{\partial}{\partial \theta}
            \bigg( 
                \sin\theta\frac{\partial}{\partial \theta}
            \bigg) +
            \frac{1}{r^2 \sin^2\theta}\frac{\partial^2}{\partial \phi^2}
        "/>
        <p>Assuming <InlineMath math="\Psi(r,\theta,\phi)=R(r)Y(\theta,\phi)" /> and dividing by <InlineMath math="RY" />, the equation separates into independent radial and angular parts:</p>
        <BlockMath math="
            \frac{1}{R}\frac{d}{dr}
            \bigg[
                r^2\frac{dR}{dr}
            \bigg] - \frac{2mr^2}{\hbar^2}\bigg(U(r)-E\bigg)
            =
            -\frac{1}{Y}
            \bigg[
                \frac{1}{\sin\theta}\frac{\partial}{\partial\theta}
                \bigg( 
                    \sin\theta\frac{\partial Y}{\partial\theta}
                \bigg) +
                \frac{1}{\sin^2\theta}\frac{\partial^2 Y}{\partial \phi^2}
            \bigg]
        "/>
        <p>Each side equals the same separation constant <InlineMath math="\ell(\ell+1)" />, giving the factored wavefunction:</p>
        <BlockMath math="
            \Psi_{n,\ell,m}(r, \theta, \phi) = R_{n,\ell}(r)\, Y_{\ell,m}(\theta, \phi)
        "/>

        <h2>Radial part</h2>
        <BlockMath math="
            R_{n,\ell}(\rho) = 
            \rho^\ell
            e^{-\rho/2}
            L_{n-\ell-1}^{2\ell+1}\bigg(\frac{2r}{na}\bigg)
        "/>
        <h2>Angular part</h2>
        <BlockMath math="
            Y_\ell^m(\theta, \phi) = 
            \sqrt{\frac{(2\ell+1)(\ell-m)!}{4\pi(\ell+m)!}}
            e^{im\phi}
            P_{\ell}^{m}(\cos\theta)
        "/>
        <p>where</p>
        <BlockMath math="
            \rho = \frac{2Z}{na_0}r \quad\quad 
            c_{j+1} = \frac{j+\ell+1-n}{(j+1)(j+2\ell+2)} c_j
        "/>
        <BlockMath math="
            P_{\ell}^{m}(x) \equiv (-1)^m (1-x^2)^{m/2} \bigg(\frac{d}{dx}\bigg)^{m} P_{\ell}(x) \quad\quad
            P_{\ell}(x) \equiv \frac{1}{2^\ell \ell!} \bigg(\frac{d}{dx}\bigg)^{\ell} (x^2-1)^\ell
        " />
        <p>&nbsp;&nbsp;&nbsp;&nbsp;*Associated Legendre Polynomials <InlineMath math="\left(P_{\ell}^{m}\right)" /></p>
        {/* <h2>Time-Dependent</h2>
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
        "/> */}
        
        <h1>The Hydrogen Atom</h1>
        <div className="divider" />

        <h2>General Wavefunction</h2>
        <BlockMath math="
            \Psi_{n,\ell,m}(r, \theta, \phi) = 
            \sqrt{\bigg(\frac{2}{na}\bigg)^3 \frac{(n-\ell-1)!}{2n(n+\ell)!}}
            e^{-r/na}
            \bigg(\frac{2r}{na}\bigg)^\ell
            \bigg[L_{n-\ell-1}^{2\ell+1}\bigg(\frac{2r}{na}\bigg)\bigg]
            Y_{\ell,m}(\theta,\phi)
        "/>
        <p>where</p>
        <BlockMath math="
            L_{q}^{p}(x) \equiv (-1)^p \bigg(\frac{d}{dx}\bigg)^p L_{p+q}(x) \quad\quad 
            L_{q}(x) \equiv \frac{e^x}{q!} \bigg(\frac{d}{dx}\bigg)^q (e^{-x} x^q)
        " />
        <p>&nbsp;&nbsp;&nbsp;&nbsp;*Associated Laguerre Polynomials <InlineMath math="\left(L_{q}^{p}\right)" /></p>

        <h2>Select a State</h2>
        {stateInput}
        <p>Wavefunction</p>
        <BlockMath math={simplifiedSelectedStateLatex} />

        <p>Radial Equation</p>
        <BlockMath math={selectedRadialLatex} />

        <p>Angular Equation</p>
        <BlockMath math={selectedAngularLatex} />


        
    </>);
}
    