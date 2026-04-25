import { BlockMath, InlineMath } from 'react-katex';

export default function SpectrumMath() {
    return (
        <div style={{ textAlign: "left" }}>
            <h2>The Rydberg Formula</h2>
            <p>
                The spectral lines of hydrogen are calculated using the Rydberg formula, which determines the wavelength (or energy) of light emitted when an electron transitions between energy levels:
            </p>
            <BlockMath math="\frac{1}{\lambda} = R_H \left( \frac{1}{n_1^2} - \frac{1}{n_2^2} \right)" />
            <p>
                Where <InlineMath math="R_H \approx 1.097 \times 10^7 \text{ m}^{-1}" /> is the Rydberg constant, <InlineMath math="n_1" /> is the lower energy level, and <InlineMath math="n_2" /> is the upper energy level.
            </p>
            <p>
                The energy difference between these levels can also be expressed directly in electron-volts (eV) using the Bohr model approximation:
            </p>
            <BlockMath math="E_n = -13.6 \text{ eV} \frac{1}{n^2}" />
            <p>
                The transition energy is <InlineMath math="\Delta E = E_{n_2} - E_{n_1}" />.
            </p>
        </div>
    );
}