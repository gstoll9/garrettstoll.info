import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

export default function SchrodingEquation() {

    return (<>
        <h1>Hydrogen Atom: Electron Probability Cloud</h1>
        <p>Mathematical formulation of hydrogen atom states using Schrodinger's equation...</p>
        <h2>Time-Independent Schrodinger's Equation</h2>
        <BlockMath math="
            \frac{\hbar^2}{2m}
            \bigg(
                \frac{\partial^2\Psi}{\partial x^2} + \frac{\partial^2\Psi}{\partial y^2} + \frac{\partial^2\Psi}{\partial z^2}
            \bigg)
            + U\Psi
            = E\Psi"
        />
        <h4>To Radial Coordinates</h4>
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
        <ul>
            <li>Radial part: <InlineMath math="R_{n,l}(r)" /></li>
            <li>Angular part: <InlineMath math="Y_{l,m}(\theta, \phi)" /></li>
            <li>Total: <InlineMath math="\Psi_{n,l,m}(r, \theta, \phi) = R_{n,l}(r) Y_{l,m}(\theta, \phi)" /></li>
        </ul>
    </>);
}
    