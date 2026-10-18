# Real Logic Cheat Sheet

**Real Logic** is a fully-differentiable first-order logic language that forms the foundation of Logic Tensor Networks (LTN). It allows learning and reasoning in real-world scenarios where degrees of truth are fuzzy and objects are represented as tensors.

## 1. Syntax
Real Logic operates on a first-order language $\mathcal{L}$ with typed elements based on domains.

* **Domains ($\mathcal{D}$):** Non-empty sets of symbols (e.g., `people`, `images`).
* **Constants ($\mathcal{C}$):** Denote specific objects. e.g., $D(	ext{Alice}) = 	ext{people}$.
* **Variables ($\mathcal{X}$):** Denote sequences of objects/instances (like batches of data).
* **Functions ($\mathcal{F}$):** Map inputs from specific domains to an output domain. e.g., $D_{in}(	ext{fatherOf}) = 	ext{people}$, $D_{out}(	ext{fatherOf}) = 	ext{people}$.
* **Predicates ($\mathcal{P}$):** Map inputs from specific domains to a truth value in $[0, 1]$.

## 2. Semantics & Grounding ($\mathcal{G}$)
In Real Logic, abstract symbols are interpreted concretely by tensors in the real field via the **grounding** operation $\mathcal{G}$.

* **Domains:** Grounded as tensors, e.g., $\mathcal{G}(	ext{images}) = \mathbb{R}^{256 	imes 256 	imes 3}$.
* **Variables ($x$):** Grounded as a finite sequence of $k$ tensors (instances/examples) in the domain. $\mathcal{G}(x) = \langle d_1, ..., d_k 
angle$.
* **Constants ($c$):** Grounded as a single tensor $\mathcal{G}(c)$.
* **Functions ($f$):** Grounded as real functions or tensor operations (e.g., a neural network). $\mathcal{G}(f(x))$ applies the function element-wise.
* **Predicates ($p$):** Grounded as functions returning a real number in $[0, 1]$. e.g., a neural classifier with a sigmoid/softmax output.

## 3. Connectives (Fuzzy Semantics)
Formulas evaluate to a truth value in $[0, 1]$ using first-order fuzzy logic operations.

* **Conjunction ($\land$):** T-norm (e.g., Product T-norm: $a \cdot b$)
* **Disjunction ($\lor$):** T-conorm (e.g., Probabilistic Sum: $a + b - a \cdot b$)
* **Negation ($\lnot$):** Fuzzy negation (e.g., Standard: $1 - a$)
* **Implication ($
ightarrow$):** Fuzzy implication (e.g., Reichenbach: $1 - a + a \cdot b$)

## 4. Quantifiers & Aggregation
Quantifiers reduce tensor dimensions corresponding to variables using aggregation operators (like a smooth max or min).

* **Existential ($\exists$):** Aggregated via generalized mean $A_{pM}$ (smooth max).
* **Universal ($\forall$):** Aggregated via generalized mean error $A_{pME}$ (smooth min).
* **Diagonal Quantification (`Diag`):** E.g., $orall 	ext{Diag}(x,y) p(x,y)$. Instead of iterating over all combinations of $x$ and $y$, it evaluates only matching pairs (the $i$-th instance of $x$ with the $i$-th instance of $y$).
* **Guarded Quantifiers:** E.g., $\forall y (\exists x : 	ext{age}(x) > 	ext{age}(y) (p(x,y)))$. Restricts quantification only to instances that satisfy a boolean mask condition.

## 5. Stable Product Real Logic
Standard fuzzy operators suffer from gradient issues (vanishing or exploding) when applied to deep learning. **Stable Product Real Logic** introduces projections to bound values away from the extremes:

* $\pi_0(a) = (1-\epsilon)a + \epsilon$ (keeps values slightly above 0)
* $\pi_1(a) = (1-\epsilon)a$ (keeps values slightly below 1)

**Stable Operators:**
* **Conjunction:** $T_P'(a,b) = T_P(\pi_0(a), \pi_0(b))$
* **Disjunction:** $S_P'(a,b) = S_P(\pi_1(a), \pi_1(b))$
* **Implication:** $I_R'(a,b) = I_R(\pi_0(a), \pi_1(b))$
* **Aggregators ($A_{pM}'$, $A_{pME}'$):** Apply the respective projection before the generalized mean calculation.