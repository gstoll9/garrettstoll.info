'use client';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import StandardLayout from "@/layouts/standardLayout";
import CodeBlock from './CodeBlock';
import D3InterpolationPlot from './D3InterpolationPlot';

export default function NumericalMethodsPage() {
  const main = (
    <div>
      <h1>Numerical Methods</h1>
      <p>This page is notes I have taken from An Introduction to Computational Physics by Tao Pang.</p>
      
      {/* Chapter 2 */}
      <h2>Chapter 2: Approximation of a function</h2>
      <h3>2.1 Interpolation</h3>
        <p>Wikipedia: <a href="https://en.wikipedia.org/wiki/Interpolation">Interpolation</a></p>
        <p>Interpolation is the process of estimating unknown values that fall within the range of known data points.</p>
      <h4>Linear Interpolation</h4>
        <p>Linear interpolation assumes the data follows a linear function between each data point.</p>
        <table style={{ width: '100%' }}>
            <thead>
                <tr>
                    <th>Equation</th>
                    <th>Error</th>
                    <th>Max Error</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><BlockMath math="f(x) = f_i + \frac{x - x_i}{x_{i+1} - x_i} (f_{i+1} - f_i) + \Delta f(x)" /></td>
                    <td><BlockMath math="\Delta f(x) = \frac{f''(x)}{2} (x-x_i)(x-x_{i+1})" /></td>
                    <td><BlockMath math="|\Delta f(x)| \leq \frac{\text{max}[|f''(x)|]}{8} (x_{i+1}-x_i)^2" /></td>
                </tr>
            </tbody>
        </table>
        <div style={{ width: '100%', display: 'flex' }}>
            <div style={{ flex: 1, order: 0 }}>
            <CodeBlock codeMap={{
                Python: "def linearInterpolation(xn, fn, x):\n\txn = xn.sorted()\n\treturn 0",
                TypeScript: "function linearInterpolation(x: number, x_i: number, x_i1: number, f_i: number, f_i1: number): number",
            }} />
            </div>
            <div style={{ flex: 1, order: 1 }}>
            <D3InterpolationPlot />
            </div>
        </div>
      <h4>Lagrange Interpolation</h4>
        <p>Wikipedia: <a href="https://en.wikipedia.org/wiki/Lagrange_polynomial">Lagrange polynomial</a></p>
        <p>Lagrange interpolation fits a polynomial that passes through all the data points and has a degree less than or equal to the number of data points.</p>
        <table style={{ width: '100%' }}>
            <thead>
                <tr>
                    <th>Equation</th>
                    <th>Error</th>
                    <th>Max Error</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <BlockMath math="f(x) = \sum_{i=0}^n f_i p_{nj} + \Delta f(x)" />
                        <BlockMath math="p_{nj} = \prod_{i\neq j}^n \frac{x-x_j}{x_i-x_j}" />
                    </td>
                    <td><BlockMath math="\Delta f(x) = \frac{f^{(n+1)}(x)}{(n+1)!} \prod_{i=0}^n(x-x_i)" /></td>
                    <td><BlockMath math="|\Delta f(x)| \leq \frac{\text{max}[|f^{(n+1)}(x)|]}{4(n+1)} h^{n+1}" /></td>
                </tr>
            </tbody>
        </table>
      <h3>2.2 Least-squares approximation</h3>
            <p>Wikipedia: <a href="https://en.wikipedia.org/wiki/Least_squares">Least-squares</a></p>
            <p>The least-squares approximation finds an <InlineMath math="m"/>th-order polynomial, <InlineMath math="p_m(x)" />, that minimizes the square of the residuals, <InlineMath math="[p_m(x)-f(x)]^2" /></p>
            <BlockMath math="p_m(x) = \sum_{k=0}^m a_k x^k" />
            <p>To find the coefficients <InlineMath math="a_k"/>, we need to minimize <InlineMath math="\chi^2[a_k]" /> "<InlineMath math="\chi^2" /> is the conventional notation for the summation of the squares of the deviation." (Pang p.24)</p>
            <table style={{ width: '100%' }}>
                <thead>
                    <tr>
                        <th>Continuous</th>
                        <th>Discrete</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><BlockMath math="\chi^2[a_k] = \int_a^b [p_m(x)-f(x)]^2 dx" /></td>
                        <td><BlockMath math="\chi^2[a_k] = \sum_{i=0}^n [p_m(x_i)-f(x_i)]^2" /></td>
                    </tr>
                </tbody>
            </table>
            <p><InlineMath math="\chi^2[a_k]" /> can be minimized using <InlineMath math="\frac{\partial \chi^2[a_k]}{\partial a_l} = 0" /> for <InlineMath math="l=0,1,\ldots,m" /></p>
            <br />
            <p><InlineMath math="p_m(x)" /> can also be represented as a set of real orthogonal polynomials, <InlineMath math="u_k(x)" />, satisfying</p>
            <table style={{ width: '100%' }}>
                <thead>
                    <tr>
                        <th>Continuous</th>
                        <th>Discrete</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><BlockMath math="\langle u_k|u_l \rangle = \int_a^b u_k(x)w(x)u_l(x) dx = \delta_{kl} N_k" /></td>
                        <td><BlockMath math="\langle u_k|u_l \rangle = \sum_{i=0}^n u_k(x_i)w(x_i)u_l(x_i) = \delta_{kl} N_k" /></td>
                    </tr>
                </tbody>
            </table>
            <p><InlineMath math="u_k(x)" /> can be generated with <InlineMath math="u_0(x)=1" />, <InlineMath math="h_0=0" />, <InlineMath math="g_k = \frac{\langle xu_k|u_k\rangle}{\langle u_k|u_k\rangle}" />, <InlineMath math="h_k = \frac{\langle xu_k|u_{k-1}\rangle}{\langle u_{k-1}|u_{k-1}\rangle}" />, and </p>
            <BlockMath math="u_{k+1}(x) = (x-g_k)u_k(x)-h_ku_{k-1}(x)" />
            <CodeBlock codeMap={{
                Python: "def orthogonalPolynomialFit(m: int, x: list, f: list) -> np.ndarray:\n\tn = len(x) - 1\n\tu  = np.zeros((m + 1, n + 2))\n\ts = np.zeros(n + 1)\n\tg = np.zeros(n + 1)\n\th = np.zeros(n + 1)\n\n\t# Check and fix the order of the curve\n\tif m  > n:\n\t\tm = n\n\t\tprint(\"The highest power is adjacent to:\", n)\n\n\t# Set up the zeroth-order polynomial\n\tfor i in range(n + 1):\n\t\tu[0][i] = 1\n\t\tstmp = u[0][i] * u[0][i]\n\t\ts[0] += stmp\n\t\tg[0] += x[i] * stmp\n\t\tu[0][n+1] += u[0][i] * f[i]\n\n\tg[0] /= s[0]\n\tu[0][n + 1] /= s[0]\n\n\t# Set up the first-order polynomial\n\tfor i in range(n + 1):\n\t\tu[1][i] = (x[i] - g[0]) * u[0][i]\n\t\tstmp = u[1][i] * u[1][i]\n\t\ts[1] += stmp\n\t\tg[1] += x[i] * stmp\n\t\th[1] += x[i] * u[0][i] * u[1][i]\n\t\tu[1][n + 1] += u[1][i] * f[i]\n\n\tg[1] /= s[1]\n\th[1] /= s[0]\n\tu[1][n + 1] /= s[1]\n\n\t# Obtain the higher-order polynomials recursively\n\tif m >= 2:\n\t\tfor i in range(1, m):\n\t\t\tfor j in range(n + 1):\n\t\t\t\tu[i + 1][j] = (x[j] - g[i]) * u[i][j] - h[i] * u[i - 1][j]\n\t\t\t\tstmp = u[i + 1][j] * u[i + 1][j]\n\t\t\t\ts[i + 1] += stmp\n\t\t\t\tg[i + 1] += x[j] * stmp\n\t\t\t\th[i + 1] += x[j] * u[i][j] * u[i + 1][j]\n\t\t\t\tu[i + 1][n + 1] += u[i + 1][j] * f[j]\n\n\t\t\tg[i + 1] /= s[i + 1]\n\t\t\th[i + 1] /= s[i]\n\t\t\tu[i + 1][n + 1] /= s[i + 1]\n\t\n\treturn u",
                TypeScript: "function orthogonalPolynomialFit(\n  m: number,\n  x: number[],\n  f: number[]\n): number[][] {\n  const n = x.length - 1;\n\n  // Initialize arrays\n  const u: number[][] = Array.from({ length: m + 1 }, () =>\n\tArray(n + 2).fill(0)\n  );\n  const s: number[] = Array(n + 1).fill(0);\n  const g: number[] = Array(n + 1).fill(0);\n  const h: number[] = Array(n + 1).fill(0);\n\n  // Check and fix the order of the curve\n  if (m > n) {\n\tm = n;\n\tconsole.log(\"The highest power is adjacent to:\", n);\n  }\n\n  // Set up the zeroth-order polynomial\n  for (let i = 0; i <= n; i++) {\n\tu[0][i] = 1;\n\tconst stmp = u[0][i] * u[0][i];\n\ts[0] += stmp;\n\tg[0] += x[i] * stmp;\n\tu[0][n + 1] += u[0][i] * f[i];\n  }\n\n  g[0] /= s[0];\n  u[0][n + 1] /= s[0];\n\n  // Set up the first-order polynomial\n  for (let i = 0; i <= n; i++) {\n\tu[1][i] = (x[i] - g[0]) * u[0][i];\n\tconst stmp = u[1][i] * u[1][i];\n\ts[1] += stmp;\n\tg[1] += x[i] * stmp;\n\th[1] += x[i] * u[0][i] * u[1][i];\n\tu[1][n + 1] += u[1][i] * f[i];\n  }\n\n  g[1] /= s[1];\n  h[1] /= s[0];\n  u[1][n + 1] /= s[1];\n\n  // Obtain the higher-order polynomials recursively\n  if (m >= 2) {\n\tfor (let i = 1; i < m; i++) {\n\t  for (let j = 0; j <= n; j++) {\n\t\tu[i + 1][j] =\n\t\t  (x[j] - g[i]) * u[i][j] - h[i] * u[i - 1][j];\n\t\tconst stmp = u[i + 1][j] * u[i + 1][j];\n\t\ts[i + 1] += stmp;\n\t\tg[i + 1] += x[j] * stmp;\n\t\th[i + 1] += x[j] * u[i][j] * u[i + 1][j];\n\t\tu[i + 1][n + 1] += u[i + 1][j] * f[j];\n\t  }\n\n\t  g[i + 1] /= s[i + 1];\n\t  h[i + 1] /= s[i];\n\t  u[i + 1][n + 1] /= s[i + 1];\n\t}\n  }\n\n  return u;\n}\n\n// Example usage\nconst x = [1, 2, 3, 4, 5];\nconst f = [1, 8, 27, 64, 125];\nconst m = 2;\n\nconst result = orthogonalPolynomialFit(m, x, f);\nconsole.log(result);",
            }} />
            <br />
            <p>For <InlineMath math="m=1" />, we have <b>Linear Least-Squares Approximation</b></p>
            <BlockMath math="p_1(x) = a_0 + a_1 x \qquad \text{and} \qquad \chi^2[a_k] = \sum_{i=0}^n (a_0 + a_1 x_i - f_i)^2" />
            <p>Using <InlineMath math="\frac{\partial \chi^2[a_k]}{\partial a_l} = 0" />, we find <InlineMath math="m + 1" /> linear equations.</p>
            <BlockMath math="(n+1) a_0 + c_1 a_1 - c_3 = 0" />
            <BlockMath math="c_1 a_0 + c_2 a_1 - c_4 = 0" />
            <p>Where</p><table style={{ width: '100%' }}>
                <tbody>
                    <tr>
                        <td><BlockMath math="c_1 = \sum_{i=0}^n x_i" /></td>
                        <td><BlockMath math="c_2 = \sum_{i=0}^n x_i^2" /></td>
                    </tr>
                    <tr>
                        <td><BlockMath math="c_3 = \sum_{i=0}^n f_i" /></td>
                        <td><BlockMath math="c_4 = \sum_{i=0}^n x_i f_i" /></td>
                    </tr>
                </tbody>
            </table>
            <p>We can solve for <InlineMath math="a_0" /> and <InlineMath math="a_1" /></p>
            <BlockMath math="a_0 = \frac{c_1 c_4 - c_2 c_3}{c_1^2 - (n+1)c_2} \qquad a_1 = \frac{c_1 c_3 - (n+1) c_4}{c_1^2 - (n+1)c_2}" />
            <br />
            <BlockMath math="p_1(x) = \frac{c_1 c_4 - c_2 c_3}{c_1^2 - (n+1)c_2} + x \frac{c_1 c_3 - (n+1) c_4}{c_1^2 - (n+1)c_2}" />

      <h3>2.4 Spline approximation</h3>
            <p>Wikipedia: <a href="https://en.wikipedia.org/wiki/Spline_interpolation">Spline interpolation</a></p>
            <p>A spline approximation locally fits polynomials piece-like and smoothly connects them, requiring <InlineMath math="p_i^{(l)}(x_{i+1}) = p_{i+1}^{(l)}(x_{i+1})" /></p>

      <h3>2.5 Random-number generators</h3>
      <h4>Uniform random-number generators</h4>
        <p>Good uniform random-number generators have three characteristics:</p>
        <ol>
            <li>Long period: This should be close to the range of numbers being generated. For a 32-bit integer the range should be about <InlineMath math="2^{32}-1"/></li>
            <li>Independence: The numbers should be statistically independent. If you have a set of random numbers <InlineMath math="(x_0,x_1,\cdots,x_n)"/> and plot them like <InlineMath math="(x_i,x_{i+1})"/>, there should be no patterns and the correlation should be close to 0.</li>
            <li>Fast: In practice we need a lot of random numbers, so a good random-number generator should not be a computational bottleneck.</li>
        </ol>
      <h4>Linear congruent scheme</h4>
        Defined below, <InlineMath math="a"/>, <InlineMath math="b"/>, and <InlineMath math="c"/> are called magic numbers. Their values determine the quality of the generator. A common choice is <InlineMath math="a=7^5,\ b=0,\ c=2^{32}-1"/>. The initial value <InlineMath math="x_0"/> is called the seed. The next value is generated by the equation:
        <BlockMath math="x_{i+1} = (a x_i + b) \mod c"/>
      <h2>Chapter 3: Numerical calculus</h2>
        <h4>Taylor series</h4>
        <p>Wikipedia: <a href="https://en.wikipedia.org/wiki/Taylor_series">Taylor series</a></p>
        <p>A Taylor series is used as an approximation of a function around a point <InlineMath math="a"/> and is defined as a sum of terms derived from the derivatives at <InlineMath math="a"/>.</p>
        <BlockMath math="f(x) = f(x) + f'(a)(x-a) + \frac{f''(a)}{n!} (x-a)^2 + \cdots + \frac{f^{(n)}(a)}{n!} (x-a)^n = \sum_{n=0}^\infty \frac{f^{(n)}(a)}{n!} (x-a)^n" />
      <h3>3.1 Numerical differentiation</h3>
        <p>Wikipedia: <a href="https://en.wikipedia.org/wiki/Numerical_differentiation">Numerical differentiation</a></p>
        <h4>First-order derivatives</h4>
            <table style={{ width: '100%' }}>
                <thead>
                    <tr>
                        <th></th>
                        <th>uniform <InlineMath math="h"/></th>
                        <th>non-uniform <InlineMath math="h"/></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th>two-point formula</th>
                        <td><BlockMath math="f'_i = \frac{f_{i+1}-f_i}{h} + O(h)" /></td>
                        <td><BlockMath math="f'_i = \frac{f_{i+1}-f_i}{h} + O(h)" /></td>
                    </tr>
                    <tr>
                        <th>three-point formula</th>
                        <td><BlockMath math="f'_i = \frac{f_{i+1}-f_{i-1}}{2h} + O(h^2)" /></td>
                        <td><BlockMath math="
                            f'_i = \frac{
                                h^2_{i-1}f_{i+1} + (h^2_i - h^2_{i-1})f_i + h^2_{i}f_{i-1}
                            }{
                                h_ih_{i-1}(h_i + h_{i-1})
                            } + O(h^2)" /></td>
                    </tr>
                    <tr>
                        <th>five-point formula</th>
                        <td><BlockMath math="f'_i = \frac{1}{12h} (f_{i-2}-8f_{i-1}+8f_{i+1}-f_{i+2}) + O(h^4)" /></td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        <h4>Second-order derivatives</h4>
            <table style={{ width: '100%' }}>
                <thead>
                    <tr>
                        <th></th>
                        <th>uniform <InlineMath math="h"/></th>
                        <th>non-uniform <InlineMath math="h"/></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th>three-point formula</th>
                        <td><BlockMath math="f''_i = \frac{f_{i+1}-2f_i+f_{i-1}}{h^2} + O(h^2)" /></td>
                        <td><BlockMath math="
                            f''_i = \frac{
                                2[h_{i-1}f_{i+1} - (h_i + h_{i-1})f_i + h_if_{i-1}]
                            }{
                                h_ih_{i+1}(h_i + h_{i-1})
                            } + O(h)" /></td>
                    </tr>
                    <tr>
                        <th>five-point formula</th>
                        <td><BlockMath math="f'_i = \frac{1}{12h^2} (-f_{i-2}+16f_{i-1}-30f_i-16f_{i+1}-f_{i+2}) + O(h^4)" /></td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        <p>Using higher order point formulas result in higher accuracy at a computational expense.</p>
        <h4>Corrections if <InlineMath math="f(x)"/> is continuous and <InlineMath math="h"/> is uniform</h4>
            <table style={{ width: '100%' }}>
                <thead>
                    <tr>
                        <th>first-order</th>
                        <th>second-order</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><BlockMath math="\Delta_1(h) = \frac{f(x+h) - f(x-h)}{2h}" /></td>
                        <td><BlockMath math="\Delta_2(h) = \frac{f(x+h) - 2f(x) + f(x-h)}{h^2}" /></td>
                    </tr>
                </tbody>
            </table>
      <h3>3.2 Numerical integration</h3>
      <h3>3.3 Roots of an equation</h3>
      <h3>3.4 Extremes of a function</h3>
      <h3>3.5 Classical scattering</h3>
    </div>
  );

  return StandardLayout({ title: "Numerical Methods", main });
}