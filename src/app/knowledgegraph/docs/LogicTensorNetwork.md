# Logic Tensor Networks (LTN) Cheat Sheet

Logic Tensor Networks (LTN) is a neurosymbolic framework that bridges the gap between deep learning and symbolic reasoning [cite: 2120, 2146]. It enables agents to learn from sub-symbolic data (like images or sensors) while maintaining the rich, interpretable structure of high-level logical representations [cite: 2119, 2131, 2144].

## 1. Core Framework: Real Logic

At the heart of LTN is **Real Logic**, a fully differentiable first-order logic language [cite: 2121, 2147]. Real Logic departs from classical abstract semantics by interpreting domains concretely using tensors in the real field [cite: 2215].

### Signature & Syntax
Real Logic operates on a first-order language $\mathcal{L}$ with typed elements [cite: 2182, 2186]:
* **Domains ($\mathcal{D}$):** Non-empty sets of symbols denoting types of objects (e.g., people, images) [cite: 2187, 2188].
* **Constants ($\mathcal{C}$):** Symbols representing specific, distinct objects within a domain [cite: 2182].
* **Variables ($\mathcal{X}$):** Symbols ranging over elements of a domain [cite: 2182]. In Real Logic, a variable typically denotes a finite sequence of multiple instances (e.g., a batch of data) [cite: 2235, 2236].
* **Functions ($\mathcal{F}$):** Symbols mapping inputs from specified domains to an output domain [cite: 2182, 2193].
* **Predicates ($\mathcal{P}$):** Symbols taking inputs and returning a truth value [cite: 2182].

## 2. The Grounding Operation ($\mathcal{G}$)

Grounding explicitly connects symbolic representations to real-world data and neural computation [cite: 2220, 2247].
* **Domains:** Grounded as tensors in the real field (e.g., images as $\mathbb{R}^{256 	\times 256 	\times 3}$) [cite: 2229, 2232].
* **Constants & Variables:** Grounded as tensors or sequences of tensors representing their features [cite: 2234, 2235].
* **Functions:** Grounded as real functions or tensor operations (e.g., a neural network outputting an embedding) [cite: 2237].
* **Predicates:** Grounded as real functions projecting onto the interval $[0, 1]$, representing a degree of truth [cite: 2219, 2238].

## 3. Fuzzy Semantics & Connectives

Logical connectives in LTN are executed via differentiable fuzzy logic operators [cite: 2301].
* **Conjunction ($\land$):** Modeled using a T-norm (e.g., product T-norm $T_P(a,b) = a \cdot b$) [cite: 2302, 2394, 4016].
* **Disjunction ($\lor$):** Modeled using a T-conorm (e.g., probabilistic sum $S_P(a,b) = a + b - a \cdot b$) [cite: 2302, 2395, 4033].
* **Negation ($\lnot$):** Modeled using a fuzzy negation (e.g., standard strict negation $N_S(a) = 1 - a$) [cite: 2302, 2393, 4011].
* **Implication ($\rightarrow$):** Modeled using fuzzy implications (e.g., Reichenbach $I_R(a,b) = 1 - a + a \cdot b$) [cite: 2302, 2396, 4057].

### Stable Product Real Logic
Standard fuzzy operators often suffer from vanishing or exploding gradients during backpropagation [cite: 2388, 2389, 2413]. LTN implements **Stable Product Real Logic** using projections ($\pi_0, \pi_1$) to pull truth values slightly away from the extreme bounds of $0$ and $1$, ensuring stable gradient flow throughout the computational graph [cite: 2416, 2420].

## 4. Aggregators & Quantification

Quantifiers in LTN reduce sequence dimensions by aggregating truth values [cite: 2310, 2317].
* **Existential Quantifier ($\exists$):** Approximated using the generalized mean $A_{pM}$ (smooth maximum) [cite: 2399, 2403].
* **Universal Quantifier ($\forall$):** Approximated using the generalized mean error $A_{pME}$ (smooth minimum), penalizing deviations from ground truth [cite: 2400, 2404].

### Specialized Quantifiers
* **Diagonal Quantification (`Diag`):** Quantifies over specific, corresponding tuples across variables (e.g., pairing the $i$-th input sample with the $i$-th target label) rather than computing the full Cartesian product [cite: 2336, 2337].
* **Guarded Quantifiers:** Restricts quantification only to elements that satisfy a specific Boolean masking condition (e.g., aggregating relations only for inputs where `age(x) > age(y)`) [cite: 2341, 2362].

## 5. Learning and Reasoning

A Real Logic knowledge base is defined as $\mathcal{T} = \langle \mathcal{K}, \mathcal{G}(\cdot|	\theta), \Theta 
\rangle$, containing a set of closed logical formulas ($\mathcal{K}$), parametric groundings ($\mathcal{G}(\cdot|	\theta)$), and a hypothesis space of parameters ($\Theta$) [cite: 2504, 2506].

### Learning (Optimization)
Learning is inductive inference [cite: 2437]. It is the process of searching for neural network parameters ($	\theta^*$) that maximize the overall satisfiability of the knowledge base [cite: 2511, 2512].
* The objective function aggregates the truth values of all axioms and facts [cite: 2509, 2510].
* Gradient descent updates the underlying embeddings, classifiers, or regression models to make the symbolic rules mathematically true [cite: 2434, 2626].

### Querying
Once trained, the framework can be queried [cite: 2439]:
* **Truth queries:** Evaluate the truth value of a formula (e.g., "Is this image a dog?") [cite: 2532, 2533].
* **Value queries:** Extract the underlying feature tensors (e.g., "Get the embedding vector for this object") [cite: 2536, 2537].

### Reasoning (Logical Consequence)
Reasoning checks if a new formula $\phi$ logically follows from the knowledge base $\mathcal{K}$ [cite: 2550].
* **Querying after learning:** A naive approach that assumes logical consequence holds if $\phi$ evaluates to a high truth value using parameters $	heta^*$ that satisfy $\mathcal{K}$ [cite: 2560, 2564].
* **Proof by Refutation:** The preferred approach. LTN actively searches for a counter-example by deliberately trying to minimize the truth value of $\phi$ while maintaining a high satisfiability penalty for breaking $\mathcal{K}$ [cite: 2568, 2579]. If the optimization fails to find such parameters, the logical consequence holds [cite: 2578].