import { BlockMath } from 'react-katex';

export default function Hydrogen() {
    return (
        <>
            <h2>Radial part</h2>
            <BlockMath math="
                R_{n,\ell}(\rho) = 
                \rho^\ell
                e^{-\rho/2}
                L_{n-\ell-1}^{2\ell+1}\bigg(\frac{2r}{na}\bigg)
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
        </>
    );
}