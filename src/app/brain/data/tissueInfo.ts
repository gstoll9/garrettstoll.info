// Hand-curated tissue type of every /brain region: what kind of grey matter (or other tissue) it
// is and how it is layered. Types follow the standard cytoarchitectonic classes (Wikipedia titles
// checked against the API, no redirects); notes call out where a region mixes types.

export type TissueTypeId =
  | 'neocortex' | 'koniocortex' | 'agranular' | 'paralimbic' | 'periallocortex' | 'allocortex'
  | 'nuclear' | 'brainstem' | 'cerebellarCortex' | 'cerebellarWhite' | 'whiteMatter' | 'ventricle';

export interface TissueType {
  label: string;
  layers?: string;
  desc: string;
  wiki: string;
}

export const TISSUE_TYPES: Record<TissueTypeId, TissueType> = {
  neocortex: {
    label: 'Neocortex (isocortex)', layers: '6 layers', wiki: 'Neocortex',
    desc: 'The six-layered cortex that makes up ~90% of the cerebral cortex. Layer 4 receives input from the thalamus, layers 2–3 talk to other cortical areas, and layers 5–6 send output to deeper structures.',
  },
  koniocortex: {
    label: 'Koniocortex (granular neocortex)', layers: '6 layers, thick layer 4', wiki: 'Neocortex',
    desc: 'The cortex of the primary sensory areas. Its input layer 4 is packed with small "granule" cells that receive the thalamus\'s sensory signals, so densely that the cortex looks dusty (Greek konia) under the microscope.',
  },
  agranular: {
    label: 'Agranular neocortex', layers: '6 layers, layer 4 almost absent', wiki: 'Agranular cortex',
    desc: 'Motor cortex, with little or no granular layer 4 but a thick layer 5 holding the giant Betz cells whose axons run down the spinal cord.',
  },
  paralimbic: {
    label: 'Paralimbic cortex (mesocortex)', layers: 'transitional, 4–6 layers', wiki: 'Paralimbic cortex',
    desc: 'A transitional belt between the six-layered neocortex and the simpler limbic allocortex, with poorly defined layers (especially layer 4).',
  },
  periallocortex: {
    label: 'Periallocortex', layers: 'transitional', wiki: 'Periallocortex',
    desc: 'The border zone next to the three-layered allocortex, where extra layers begin to appear. The entorhinal cortex has distinctive clusters of large stellate cells in its layer 2.',
  },
  allocortex: {
    label: 'Allocortex (archicortex)', layers: '3 layers', wiki: 'Allocortex',
    desc: 'The evolutionarily older three-layered cortex: one main cell layer (pyramidal or granule cells) between an inner layer of axons and an outer layer of dendrites.',
  },
  nuclear: {
    label: 'Nuclear grey matter', wiki: 'Nucleus (neuroanatomy)',
    desc: 'Unlayered grey matter: neurons gathered into nuclei rather than sheets, crossed by bundles of myelinated fibres.',
  },
  brainstem: {
    label: 'Nuclei interleaved with tracts', wiki: 'Reticular formation',
    desc: 'Small nuclei and the diffuse reticular formation sit among long white-matter tracts running between brain and spinal cord, so grey and white matter are finely mixed.',
  },
  cerebellarCortex: {
    label: 'Cerebellar cortex', layers: '3 layers', wiki: 'Cerebellum',
    desc: 'A thin, tightly folded sheet: an outer molecular layer of dendrites and parallel fibres, a single row of Purkinje cells, and an inner granular layer holding about half of all the neurons in the brain.',
  },
  cerebellarWhite: {
    label: 'White matter with deep nuclei', wiki: 'Deep cerebellar nuclei',
    desc: 'The cerebellum\'s core of myelinated fibres, with the deep cerebellar nuclei (dentate, interposed, fastigial) embedded in it as its output stations.',
  },
  whiteMatter: {
    label: 'White matter', wiki: 'White matter',
    desc: 'Myelinated axons with the oligodendrocytes that wrap them and astrocytes, but almost no neuron cell bodies. The fatty myelin is what makes it look white.',
  },
  ventricle: {
    label: 'Cerebrospinal fluid space', wiki: 'Choroid plexus',
    desc: 'A fluid-filled cavity lined by ependymal cells. Fronds of choroid plexus, a capillary bed covered in secretory epithelium, produce the cerebrospinal fluid.',
  },
};

export const REGION_TISSUE: Record<string, { type: TissueTypeId; note?: string }> = {
  'superior-frontal': { type: 'neocortex', note: 'Its back end (supplementary motor area) is agranular.' },
  'rostral-middle-frontal': { type: 'neocortex' },
  'caudal-middle-frontal': { type: 'neocortex', note: 'Grades into agranular premotor cortex toward the back.' },
  'pars-opercularis': { type: 'neocortex', note: 'Dysgranular: layer 4 is thin (Brodmann area 44).' },
  'pars-triangularis': { type: 'neocortex' },
  'pars-orbitalis': { type: 'neocortex' },
  'lateral-orbitofrontal': { type: 'neocortex', note: 'Its back edge becomes agranular paralimbic cortex.' },
  'medial-orbitofrontal': { type: 'neocortex', note: 'Includes paralimbic subgenual cortex (area 25) at its back.' },
  precentral: { type: 'agranular', note: 'Primary motor cortex (Brodmann area 4).' },
  paracentral: { type: 'neocortex', note: 'Contains both agranular motor and granular sensory cortex for the legs.' },
  postcentral: { type: 'koniocortex', note: 'Area 3b, in the back wall of the central sulcus, is koniocortex; areas 1 and 2 on the crown are ordinary neocortex.' },
  'superior-parietal': { type: 'neocortex' },
  supramarginal: { type: 'neocortex' },
  'inferior-parietal': { type: 'neocortex' },
  precuneus: { type: 'neocortex' },
  'superior-temporal': { type: 'neocortex', note: 'Its front end (temporal pole) is paralimbic.' },
  'transverse-temporal': { type: 'koniocortex', note: 'Primary auditory cortex (Brodmann area 41).' },
  'middle-temporal': { type: 'neocortex' },
  'inferior-temporal': { type: 'neocortex' },
  fusiform: { type: 'neocortex' },
  pericalcarine: { type: 'koniocortex', note: 'Primary visual cortex (area 17), whose layer 4 is so thick and myelinated that it shows as a white stripe to the naked eye (the stria of Gennari).' },
  cuneus: { type: 'neocortex' },
  lingual: { type: 'neocortex' },
  'lateral-occipital': { type: 'neocortex' },
  'rostral-anterior-cingulate': { type: 'paralimbic', note: 'Agranular cingulate cortex (areas 24 and 32).' },
  'caudal-anterior-cingulate': { type: 'paralimbic', note: 'Agranular midcingulate cortex (area 24).' },
  'posterior-cingulate': { type: 'neocortex', note: 'Dysgranular area 23, the transition from paralimbic to full neocortex.' },
  'isthmus-cingulate': { type: 'periallocortex', note: 'Retrosplenial cortex (areas 29 and 30) next to the hippocampal allocortex.' },
  insula: { type: 'paralimbic', note: 'Agranular at the front, dysgranular in the middle and granular at the back.' },
  entorhinal: { type: 'periallocortex' },
  parahippocampal: { type: 'paralimbic', note: 'Includes perirhinal cortex (areas 35 and 36), which borders the entorhinal periallocortex.' },
  hippocampus: { type: 'allocortex', note: 'Pyramidal cells in Ammon\'s horn (CA1–CA3), granule cells in the dentate gyrus.' },
  amygdala: { type: 'nuclear', note: 'About a dozen nuclei; the basolateral group is cortex-like in its cells, the central group striatum-like.' },
  caudate: { type: 'nuclear', note: 'Striatum: crossed by thin fibre bundles that give it a striped look.' },
  putamen: { type: 'nuclear', note: 'Striatum: crossed by thin fibre bundles that give it a striped look.' },
  pallidum: { type: 'nuclear', note: 'So densely crossed by myelinated fibres that it looks pale, hence "globus pallidus"; MRI classifies it mostly as white matter.' },
  'accumbens-area': { type: 'nuclear', note: 'Ventral striatum, divided into a core and a shell.' },
  'basal-forebrain': { type: 'nuclear', note: 'Scattered large cholinergic neurons (nucleus basalis) among fibre tracts.' },
  thalamus: { type: 'nuclear', note: 'About 50 nuclei separated by thin sheets of white matter (the internal medullary laminae).' },
  'ventral-diencephalon': { type: 'brainstem', note: 'Hypothalamic nuclei, subthalamic nucleus and substantia nigra among major tracts.' },
  'optic-chiasm': { type: 'whiteMatter', note: 'Optic nerve fibres, half of which cross to the other side here.' },
  'cerebral-white-matter': { type: 'whiteMatter' },
  'lateral-ventricle': { type: 'ventricle' },
  'inferior-lateral-ventricle': { type: 'ventricle', note: 'A narrow slit, so the MRI average mostly sees the grey matter around it.' },
  'third-ventricle': { type: 'ventricle' },
  'fourth-ventricle': { type: 'ventricle' },
  brainstem: { type: 'brainstem' },
  'cerebellum-gray-matter': { type: 'cerebellarCortex' },
  'cerebellum-white-matter': { type: 'cerebellarWhite' },
  'vermal-lobules-i-v': { type: 'cerebellarCortex' },
  'vermal-lobules-vi-vii': { type: 'cerebellarCortex' },
  'vermal-lobules-viii-x': { type: 'cerebellarCortex' },
};
