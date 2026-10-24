// Region metadata for public/brainImages/brain.glb (built by scripts/brain/cerebra_meshes.py and
// scripts/build-brain-model.mjs from the CerebrA atlas). Every mesh is named `${L|R}-${regionId}`
// after CerebrA's label name; REGIONS describes each bilateral region once, with optional notes on
// how the left and right copies differ (lateralization) and open-access sources. `wiki` values
// are English Wikipedia titles (checked against the API, no redirects); REFS are DOIs checked against
// OpenAlex (all open access).

export type GroupId =
  | 'frontal' | 'parietal' | 'temporal' | 'occipital' | 'cingulate' | 'insula' | 'limbic'
  | 'basalGanglia' | 'diencephalon' | 'whiteMatter' | 'ventricles' | 'brainstem' | 'cerebellum';

export type Side = 'Left' | 'Right';

export interface Group {
  label: string;
  hue: number;
  desc: string;
  wiki: string;
  // Surface layers that cover the deep structures; the "Hide cortex" toggle hides these.
  outer?: boolean;
}

export const GROUPS: Record<GroupId, Group> = {
  frontal: {
    label: 'Frontal Lobe', hue: 8, outer: true, wiki: 'Frontal lobe',
    desc: 'The largest lobe, in front of the central sulcus. Its prefrontal cortex handles planning, working memory, impulse control and personality, while its back edge holds the motor areas that drive voluntary movement.',
  },
  parietal: {
    label: 'Parietal Lobe', hue: 40, outer: true, wiki: 'Parietal lobe',
    desc: 'Behind the central sulcus. Combines touch, pain, temperature and body-position signals into a map of the body and the space around it, and supports attention, reading and arithmetic.',
  },
  temporal: {
    label: 'Temporal Lobe', hue: 115, outer: true, wiki: 'Temporal lobe',
    desc: 'Below the lateral sulcus, beside the ears. Processes sound and spoken language, recognizes objects and faces, and holds the medial temporal memory system on its inner surface.',
  },
  occipital: {
    label: 'Occipital Lobe', hue: 212, outer: true, wiki: 'Occipital lobe',
    desc: 'The back of the brain and home of the visual cortex, which turns signals from the eyes into edges, color, depth and motion.',
  },
  cingulate: {
    label: 'Cingulate Cortex', hue: 330, outer: true, wiki: 'Cingulate cortex',
    desc: 'A belt of cortex on the inner face of each hemisphere, wrapped around the corpus callosum. It links emotion, motivation, attention and memory.',
  },
  insula: {
    label: 'Insula', hue: 272, outer: true, wiki: 'Insular cortex',
    desc: 'A lobe of cortex folded out of sight inside the lateral sulcus, covered by the frontal, parietal and temporal lobes. It turns signals from inside the body into feelings.',
  },
  limbic: {
    label: 'Medial Temporal Lobe', hue: 300, wiki: 'Limbic system',
    desc: 'The memory system on the inner temporal lobe: hippocampus, amygdala and the entorhinal and parahippocampal cortex that feed them.',
  },
  basalGanglia: {
    label: 'Basal Nuclei', hue: 55, wiki: 'Basal ganglia',
    desc: 'Deep grey-matter nuclei that act as a gate for movement and behavior: they release wanted actions, suppress competing ones, and learn habits from reward.',
  },
  diencephalon: {
    label: 'Diencephalon', hue: 28, wiki: 'Diencephalon',
    desc: 'The "between-brain" at the top of the brainstem: the thalamus, hypothalamus and surrounding nuclei, which relay sensation to the cortex and run the body\'s internal regulation.',
  },
  whiteMatter: {
    label: 'White Matter', hue: 40, outer: true, wiki: 'White matter',
    desc: 'Bundles of myelinated axons that wire cortical areas to each other and to deeper structures. CerebrA labels only grey matter, so this is the space the labelled regions enclose.',
  },
  ventricles: {
    label: 'Ventricles', hue: 200, wiki: 'Ventricular system',
    desc: 'Four connected cavities that produce and circulate cerebrospinal fluid, which floats the brain, cushions it and carries away waste.',
  },
  brainstem: {
    label: 'Brainstem', hue: 250, wiki: 'Brainstem',
    desc: 'The stalk joining the brain to the spinal cord: midbrain, pons and medulla. Every signal between brain and body passes through it, and it runs breathing, heart rate, swallowing and arousal on its own.',
  },
  cerebellum: {
    label: 'Cerebellum', hue: 285, wiki: 'Cerebellum',
    desc: 'The "little brain" under the occipital lobe. It compares intended movements with what actually happened and corrects them, and also takes part in language, thought and emotion.',
  },
};

export interface Ref {
  cite: string;
  title: string;
  doi: string;
}

export const REFS = {
  manera2020: { cite: 'Manera et al. 2020, Scientific Data', title: 'CerebrA, registration and manual label correction of Mindboggle-101 atlas for MNI-ICBM152 template', doi: '10.1038/s41597-020-0557-9' },
  klein2012: { cite: 'Klein & Tourville 2012, Frontiers in Neuroscience', title: '101 labeled brain images and a consistent human cortical labeling protocol', doi: '10.3389/fnins.2012.00171' },
  fischl2002: { cite: 'Fischl et al. 2002, Neuron', title: 'Whole brain segmentation', doi: '10.1016/S0896-6273(02)00569-X' },
  mazoyer2014: { cite: 'Mazoyer et al. 2014, PLoS ONE', title: 'Gaussian mixture modeling of hemispheric lateralization for language in a large sample of healthy individuals balanced for handedness', doi: '10.1371/journal.pone.0101165' },
  hampshire2010: { cite: 'Hampshire et al. 2010, NeuroImage', title: 'The role of the right inferior frontal gyrus: inhibition and attentional control', doi: '10.1016/j.neuroimage.2009.12.109' },
  kanwisher1997: { cite: 'Kanwisher et al. 1997, Journal of Neuroscience', title: 'The fusiform face area: a module in human extrastriate cortex specialized for face perception', doi: '10.1523/JNEUROSCI.17-11-04302.1997' },
  corbetta2011: { cite: 'Corbetta & Shulman 2011, Annual Review of Neuroscience', title: 'Spatial neglect and attention networks', doi: '10.1146/annurev-neuro-061010-113731' },
  burgess2002: { cite: 'Burgess et al. 2002, Neuron', title: 'The human hippocampus and spatial and episodic memory', doi: '10.1016/S0896-6273(02)00830-9' },
  seghier2013: { cite: 'Seghier 2013, The Neuroscientist', title: 'The angular gyrus: multiple functions and multiple subdivisions', doi: '10.1177/1073858412440596' },
  silani2013: { cite: 'Silani et al. 2013, Journal of Neuroscience', title: 'Right supramarginal gyrus is crucial to overcome emotional egocentricity bias in social judgments', doi: '10.1523/JNEUROSCI.1488-13.2013' },
  menon2010: { cite: 'Menon & Uddin 2010, Brain Structure and Function', title: 'Saliency, switching, attention and control: a network model of insula function', doi: '10.1007/s00429-010-0262-0' },
  uddin2017: { cite: 'Uddin et al. 2017, Journal of Clinical Neurophysiology', title: 'Structure and function of the human insula', doi: '10.1097/WNP.0000000000000377' },
  critchley2004: { cite: 'Critchley et al. 2004, Nature Neuroscience', title: 'Neural systems supporting interoceptive awareness', doi: '10.1038/nn1176' },
  marien2014: { cite: 'Mariën et al. 2014, The Cerebellum', title: 'Consensus paper: language and the cerebellum: an ongoing enigma', doi: '10.1007/s12311-013-0540-5' },
  grillspector2001: { cite: 'Grill-Spector et al. 2001, Vision Research', title: 'The lateral occipital complex and its role in object recognition', doi: '10.1016/S0042-6989(01)00073-6' },
  raichle2001: { cite: 'Raichle et al. 2001, PNAS', title: 'A default mode of brain function', doi: '10.1073/pnas.98.2.676' },
  leech2014: { cite: 'Leech & Sharp 2014, Brain', title: 'The role of the posterior cingulate cortex in cognition and disease', doi: '10.1093/brain/awt162' },
  doeller2010: { cite: 'Doeller et al. 2010, Nature', title: 'Evidence for grid cells in a human memory network', doi: '10.1038/nature08704' },
  epstein2008: { cite: 'Epstein 2008, Trends in Cognitive Sciences', title: 'Parahippocampal and retrosplenial contributions to human spatial navigation', doi: '10.1016/j.tics.2008.07.004' },
  stoodley2010: { cite: 'Stoodley & Schmahmann 2010, Cortex', title: 'Evidence for topographic organization in the cerebellum of motor control versus cognitive and affective processing', doi: '10.1016/j.cortex.2009.11.008' },
  buckner2011: { cite: 'Buckner et al. 2011, Journal of Neurophysiology', title: 'The organization of the human cerebellum estimated by intrinsic functional connectivity', doi: '10.1152/jn.00339.2011' },
  knutson2001: { cite: 'Knutson et al. 2001, Journal of Neuroscience', title: 'Anticipation of increasing monetary reward selectively recruits nucleus accumbens', doi: '10.1523/JNEUROSCI.21-16-j0002.2001' },
} satisfies Record<string, Ref>;

export type RefId = keyof typeof REFS;

export interface Region {
  name: string;
  group: GroupId;
  desc: string;
  wiki: string;
  // How the left and right copies differ, where the literature shows a consistent difference.
  left?: string;
  right?: string;
  refs?: RefId[];
}

// Shared notes for areas whose only left/right difference is which half of the body or visual
// field they serve.
const CONTRA_BODY = {
  left: 'Serves the right side of the body.',
  right: 'Serves the left side of the body.',
};
const CONTRA_VISUAL = {
  left: 'Sees the right half of the visual field (from both eyes).',
  right: 'Sees the left half of the visual field (from both eyes).',
};
const LANGUAGE_LEFT = 'In most people this is part of the language-dominant hemisphere.';

// Keyed by CerebrA's label name, slugified (matches the mesh names minus the "L-"/"R-" prefix).
export const REGIONS: Record<string, Region> = {
  // ── Frontal lobe ──
  'superior-frontal': {
    name: 'Superior Frontal Gyrus', group: 'frontal', wiki: 'Superior frontal gyrus',
    desc: 'The top strip of the frontal lobe, running front to back along the midline and down its inner face. It supports working memory and self-awareness, and its rear part holds the supplementary motor area, which plans sequences of movement.',
  },
  'rostral-middle-frontal': {
    name: 'Rostral Middle Frontal Gyrus', group: 'frontal', wiki: 'Dorsolateral prefrontal cortex',
    desc: 'The front of the middle frontal gyrus and most of the dorsolateral prefrontal cortex: the brain\'s workspace for holding goals and information in mind, switching between tasks and reasoning.',
  },
  'caudal-middle-frontal': {
    name: 'Caudal Middle Frontal Gyrus', group: 'frontal', wiki: 'Frontal eye fields',
    desc: 'The back of the middle frontal gyrus, just in front of the motor cortex. It contains the frontal eye field, which steers voluntary eye movements and shifts of attention.',
  },
  'pars-opercularis': {
    name: 'Pars Opercularis', group: 'frontal', wiki: "Broca's area",
    desc: 'The rear third of the inferior frontal gyrus, next to the motor cortex for the face and mouth. Together with the pars triangularis it forms Broca\'s area.',
    left: `Core of Broca's area: planning speech and building grammar. ${LANGUAGE_LEFT}`,
    right: 'Consistently active when stopping an action or catching an important cue; damage impairs response inhibition.',
    refs: ['mazoyer2014', 'hampshire2010'],
  },
  'pars-triangularis': {
    name: 'Pars Triangularis', group: 'frontal', wiki: "Broca's area",
    desc: 'The middle, triangular part of the inferior frontal gyrus and the front half of Broca\'s area. It selects and retrieves word meanings.',
    left: `Part of Broca's area, used for word retrieval and sentence comprehension. ${LANGUAGE_LEFT}`,
    right: 'Joins the right pars opercularis in attentional control and inhibition.',
    refs: ['mazoyer2014', 'hampshire2010'],
  },
  'pars-orbitalis': {
    name: 'Pars Orbitalis', group: 'frontal', wiki: 'Inferior frontal gyrus',
    desc: 'The front, lowest part of the inferior frontal gyrus, curving onto the underside of the frontal lobe. It is involved in the meaning of words and sentences.',
    left: `Retrieves word and sentence meaning. ${LANGUAGE_LEFT}`,
    refs: ['mazoyer2014'],
  },
  'lateral-orbitofrontal': {
    name: 'Lateral Orbitofrontal Cortex', group: 'frontal', wiki: 'Orbitofrontal cortex',
    desc: 'The outer underside of the frontal lobe, above the eye sockets. It tracks punishments and unexpected outcomes and helps stop or change behavior when a choice stops paying off.',
  },
  'medial-orbitofrontal': {
    name: 'Medial Orbitofrontal Cortex', group: 'frontal', wiki: 'Orbitofrontal cortex',
    desc: 'The inner underside of the frontal lobe, including the gyrus rectus. It assigns value to rewards and guides decisions; damage here changes personality and social behavior, as in the famous case of Phineas Gage.',
  },
  'precentral': {
    name: 'Precentral Gyrus', group: 'frontal', wiki: 'Precentral gyrus',
    desc: 'The primary motor cortex, just in front of the central sulcus. It holds a map of the body (the motor homunculus) and sends the commands for voluntary movement to the spinal cord.',
    ...CONTRA_BODY,
  },
  'paracentral': {
    name: 'Paracentral Lobule', group: 'frontal', wiki: 'Paracentral lobule',
    desc: 'Where the motor and sensory strips wrap onto the inner face of the hemisphere. It controls and feels the leg and foot, and helps control the bladder.',
    ...CONTRA_BODY,
  },

  // ── Parietal lobe ──
  'postcentral': {
    name: 'Postcentral Gyrus', group: 'parietal', wiki: 'Postcentral gyrus',
    desc: 'The primary somatosensory cortex, just behind the central sulcus. It receives touch, pressure, pain, temperature and joint position laid out as a map of the body, with oversized areas for the hands and lips.',
    ...CONTRA_BODY,
  },
  'superior-parietal': {
    name: 'Superior Parietal Lobule', group: 'parietal', wiki: 'Superior parietal lobule',
    desc: 'The upper back of the parietal lobe. It keeps track of where your body and limbs are in space and guides reaching, grasping and eye movements toward targets.',
  },
  'supramarginal': {
    name: 'Supramarginal Gyrus', group: 'parietal', wiki: 'Supramarginal gyrus',
    desc: 'Curves around the end of the lateral sulcus, the front part of the inferior parietal lobule. It links sounds to words and supports skilled actions like using tools.',
    left: `Holds speech sounds in short-term memory (the phonological store). ${LANGUAGE_LEFT}`,
    right: 'Helps separate your own feelings from other people\'s; disrupting it makes people project their own emotions onto others.',
    refs: ['mazoyer2014', 'silani2013'],
  },
  'inferior-parietal': {
    name: 'Inferior Parietal Lobule', group: 'parietal', wiki: 'Angular gyrus',
    desc: 'CerebrA\'s inferior parietal region is mostly the angular gyrus, where the parietal, temporal and occipital lobes meet. It connects concepts across the senses and is a hub of the default mode network.',
    left: 'Links written words and numbers to their meaning; damage causes problems with reading, writing and arithmetic.',
    right: 'Directs attention across space. Damage here (more than on the left) causes spatial neglect: ignoring the left side of the world.',
    refs: ['seghier2013', 'corbetta2011'],
  },
  'precuneus': {
    name: 'Precuneus', group: 'parietal', wiki: 'Precuneus',
    desc: 'The inner face of the parietal lobe. Among the most active regions at rest, it supports mental imagery, recalling personal memories and taking another viewpoint, and is a core hub of the default mode network.',
    refs: ['raichle2001'],
  },

  // ── Temporal lobe ──
  'superior-temporal': {
    name: 'Superior Temporal Gyrus', group: 'temporal', wiki: 'Superior temporal gyrus',
    desc: 'The top strip of the temporal lobe, around the auditory cortex. It identifies sounds and voices and turns speech sounds into words.',
    left: `Its rear part is Wernicke's area, needed to understand speech; damage leaves fluent but meaningless language. ${LANGUAGE_LEFT}`,
    right: 'Its rear part, at the temporo-parietal junction, reorients attention to unexpected events.',
    refs: ['mazoyer2014', 'corbetta2011'],
  },
  'transverse-temporal': {
    name: 'Transverse Temporal Gyrus', group: 'temporal', wiki: 'Transverse temporal gyrus',
    desc: 'Heschl\'s gyrus, hidden on the floor of the lateral sulcus: the primary auditory cortex. It maps sound by pitch and receives input from both ears, more from the opposite one.',
  },
  'middle-temporal': {
    name: 'Middle Temporal Gyrus', group: 'temporal', wiki: 'Middle temporal gyrus',
    desc: 'Involved in retrieving word meanings and recognizing familiar faces and objects. Its rear end, near the occipital lobe, borders area MT/V5, which detects motion.',
    left: `Stores and retrieves word meanings. ${LANGUAGE_LEFT}`,
    refs: ['mazoyer2014'],
  },
  'inferior-temporal': {
    name: 'Inferior Temporal Gyrus', group: 'temporal', wiki: 'Inferior temporal gyrus',
    desc: 'The end of the ventral "what" visual stream. Its neurons respond to whole objects regardless of size, angle or position, which is what lets you recognize a cup from any viewpoint.',
  },
  'fusiform': {
    name: 'Fusiform Gyrus', group: 'temporal', wiki: 'Fusiform gyrus',
    desc: 'On the underside of the temporal lobe. It recognizes faces, bodies and written words; damage causes face blindness (prosopagnosia).',
    left: 'Contains the visual word form area, which recognizes letters and words when reading.',
    right: 'Its fusiform face area responds more strongly and consistently to faces than its left counterpart.',
    refs: ['kanwisher1997'],
  },

  // ── Occipital lobe ──
  'pericalcarine': {
    name: 'Pericalcarine Cortex', group: 'occipital', wiki: 'Visual cortex',
    desc: 'The primary visual cortex (V1) lining the calcarine sulcus. It maps the visual field point by point, with the center of gaze at the back of the brain.',
    ...CONTRA_VISUAL,
  },
  'cuneus': {
    name: 'Cuneus', group: 'occipital', wiki: 'Cuneus',
    desc: 'The wedge above the calcarine sulcus on the inner face of the occipital lobe. Its visual cortex processes the lower half of the visual field.',
    left: 'Sees the lower right quarter of the visual field.',
    right: 'Sees the lower left quarter of the visual field.',
  },
  'lingual': {
    name: 'Lingual Gyrus', group: 'occipital', wiki: 'Lingual gyrus',
    desc: 'Below the calcarine sulcus. Its visual cortex processes the upper half of the visual field, and it helps recognize letters and scenes.',
    left: 'Sees the upper right quarter of the visual field.',
    right: 'Sees the upper left quarter of the visual field.',
  },
  'lateral-occipital': {
    name: 'Lateral Occipital Cortex', group: 'occipital', wiki: 'Occipital lobe',
    desc: 'The outer surface of the occipital lobe, holding the lateral occipital complex, which pulls edges together into recognizable object shapes.',
    refs: ['grillspector2001'],
    ...CONTRA_VISUAL,
  },

  // ── Cingulate ──
  'rostral-anterior-cingulate': {
    name: 'Rostral Anterior Cingulate', group: 'cingulate', wiki: 'Anterior cingulate cortex',
    desc: 'The front of the cingulate gyrus, wrapped around the front of the corpus callosum. It regulates emotion and mood and is linked to depression.',
  },
  'caudal-anterior-cingulate': {
    name: 'Caudal Anterior Cingulate', group: 'cingulate', wiki: 'Anterior cingulate cortex',
    desc: 'Above the middle of the corpus callosum. It detects errors and conflicting responses, judges how much effort a task is worth, and registers how unpleasant pain is.',
  },
  'posterior-cingulate': {
    name: 'Posterior Cingulate', group: 'cingulate', wiki: 'Posterior cingulate cortex',
    desc: 'A central hub of the default mode network, most active during mind-wandering, autobiographical memory and thinking about the future. Its metabolism drops early in Alzheimer\'s disease.',
    refs: ['raichle2001', 'leech2014'],
  },
  'isthmus-cingulate': {
    name: 'Isthmus Cingulate', group: 'cingulate', wiki: 'Retrosplenial cortex',
    desc: 'The narrow bend behind the corpus callosum, holding the retrosplenial cortex. It translates between "where I am" and "where things are" and is essential for finding your way.',
    refs: ['epstein2008'],
  },

  // ── Insula ──
  'insula': {
    name: 'Insula', group: 'insula', wiki: 'Insular cortex',
    desc: 'Senses the body\'s internal state (heartbeat, breathing, hunger, pain) and turns it into feelings. It contains the primary taste cortex and is active in disgust, empathy and craving.',
    right: 'The right anterior insula tracks your heartbeat most closely, and acts as a switch that flags important events and moves the brain between inward and outward attention.',
    refs: ['uddin2017', 'critchley2004', 'menon2010'],
  },

  // ── Medial temporal lobe ──
  'entorhinal': {
    name: 'Entorhinal Cortex', group: 'limbic', wiki: 'Entorhinal cortex',
    desc: 'The main gateway between the cortex and the hippocampus. Its grid cells map space like graph paper, and it is one of the first areas damaged in Alzheimer\'s disease.',
    refs: ['doeller2010'],
  },
  'parahippocampal': {
    name: 'Parahippocampal Gyrus', group: 'limbic', wiki: 'Parahippocampal gyrus',
    desc: 'Lines the hippocampus and feeds it information about places. Its parahippocampal place area responds to scenes, landmarks and layouts rather than objects.',
    refs: ['epstein2008'],
  },
  'hippocampus': {
    name: 'Hippocampus', group: 'limbic', wiki: 'Hippocampus',
    desc: 'A seahorse-shaped structure on the floor of the lateral ventricle. It turns experiences into long-term memories and builds mental maps of space; removing both, as in patient H.M., stops new memories from forming.',
    left: 'More involved in verbal and narrative (episodic) memory.',
    right: 'More involved in spatial memory and navigation.',
    refs: ['burgess2002'],
  },
  'amygdala': {
    name: 'Amygdala', group: 'limbic', wiki: 'Amygdala',
    desc: 'An almond-sized cluster of nuclei in front of the hippocampus. It detects threats, triggers fear responses, and tags memories with emotional weight, which is why emotional events are remembered so vividly.',
  },

  // ── Basal nuclei ──
  'caudate': {
    name: 'Caudate Nucleus', group: 'basalGanglia', wiki: 'Caudate nucleus',
    desc: 'A C-shaped nucleus curving along the lateral ventricle. Part of the striatum, it helps plan goal-directed actions and learn from feedback, and its loss is the hallmark of Huntington\'s disease.',
  },
  'putamen': {
    name: 'Putamen', group: 'basalGanglia', wiki: 'Putamen',
    desc: 'The outer part of the striatum. It receives input from the motor cortex and drives learned, automatic movements, and is the area most starved of dopamine in Parkinson\'s disease.',
    ...CONTRA_BODY,
  },
  'pallidum': {
    name: 'Globus Pallidus', group: 'basalGanglia', wiki: 'Globus pallidus',
    desc: 'The basal ganglia\'s main output, just inside the putamen. It continuously inhibits the thalamus and releases that brake for the movement selected; it is a target for deep brain stimulation.',
  },
  'accumbens-area': {
    name: 'Nucleus Accumbens', group: 'basalGanglia', wiki: 'Nucleus accumbens',
    desc: 'Where the caudate and putamen meet at the front. It ramps up when a reward is expected, turning motivation into action, and is a key target of addictive drugs.',
    refs: ['knutson2001'],
  },
  'basal-forebrain': {
    name: 'Basal Forebrain', group: 'basalGanglia', wiki: 'Basal forebrain',
    desc: 'A set of nuclei below the striatum, including the nucleus basalis, the main source of acetylcholine for the cortex. It supports attention and memory and degenerates early in Alzheimer\'s disease.',
  },

  // ── Diencephalon ──
  'thalamus': {
    name: 'Thalamus', group: 'diencephalon', wiki: 'Thalamus',
    desc: 'The brain\'s central relay. Every sense except smell passes through one of its nuclei on the way to the cortex, and it also routes motor loops and helps regulate sleep, wakefulness and consciousness.',
    ...CONTRA_BODY,
  },
  'ventral-diencephalon': {
    name: 'Ventral Diencephalon', group: 'diencephalon', wiki: 'Hypothalamus',
    desc: 'An atlas label for everything below the thalamus that MRI can\'t separate: the hypothalamus, mammillary body, subthalamic nucleus, substantia nigra, red nucleus and nearby tracts. The hypothalamus controls temperature, hunger, thirst, sleep and hormones.',
    refs: ['fischl2002'],
  },
  'optic-chiasm': {
    name: 'Optic Chiasm', group: 'diencephalon', wiki: 'Optic chiasm',
    desc: 'The X where the optic nerves meet under the hypothalamus. Fibers from the inner half of each retina cross over, so each hemisphere receives the opposite half of the visual field from both eyes. Pituitary tumors pressing here cause tunnel vision.',
  },

  // ── White matter ──
  'cerebral-white-matter': {
    name: 'Cerebral White Matter', group: 'whiteMatter', wiki: 'White matter',
    desc: 'The wiring beneath the cortex: association fibers within a hemisphere, projection fibers like the internal capsule to and from the brainstem, and the corpus callosum crossing to the other side. It makes up about half the brain\'s volume.',
  },

  // ── Ventricles ──
  'lateral-ventricle': {
    name: 'Lateral Ventricle', group: 'ventricles', wiki: 'Lateral ventricles',
    desc: 'The largest ventricles, one C-shaped cavity in each hemisphere. Their choroid plexus produces most of the cerebrospinal fluid; they enlarge in hydrocephalus and with brain atrophy.',
  },
  'inferior-lateral-ventricle': {
    name: 'Temporal Horn of Lateral Ventricle', group: 'ventricles', wiki: 'Lateral ventricles',
    desc: 'The part of the lateral ventricle that curls down into the temporal lobe, with the hippocampus along its floor. It widens as the hippocampus shrinks in Alzheimer\'s disease.',
  },
  'third-ventricle': {
    name: 'Third Ventricle', group: 'ventricles', wiki: 'Third ventricle',
    desc: 'A narrow midline slit between the two thalami that receives fluid from the lateral ventricles and drains through the cerebral aqueduct. CerebrA splits it into left and right halves.',
  },
  'fourth-ventricle': {
    name: 'Fourth Ventricle', group: 'ventricles', wiki: 'Fourth ventricle',
    desc: 'A tent-shaped cavity between the brainstem and cerebellum. Fluid leaves it through three openings into the space around the brain and spinal cord. CerebrA splits it into left and right halves.',
  },

  // ── Brainstem ──
  'brainstem': {
    name: 'Brainstem', group: 'brainstem', wiki: 'Brainstem',
    desc: 'Midbrain, pons and medulla, which CerebrA labels as one region split down the midline. It holds the nuclei of most cranial nerves and the centers for breathing, heart rate and arousal.',
    left: 'Its cranial nerve nuclei serve the left side of the face and head; motor fibers here will cross (at the medulla) to control the right side of the body.',
    right: 'Its cranial nerve nuclei serve the right side of the face and head; motor fibers here will cross (at the medulla) to control the left side of the body.',
  },

  // ── Cerebellum ──
  'cerebellum-gray-matter': {
    name: 'Cerebellar Cortex', group: 'cerebellum', wiki: 'Cerebellum',
    desc: 'The tightly folded outer layer of the cerebellar hemisphere, holding over half of the brain\'s neurons. It fine-tunes the timing and accuracy of movement and, through loops with the opposite cerebral hemisphere, supports thinking and language.',
    left: 'Works with the right cerebral hemisphere and controls the left side of the body (the cerebellum is uncrossed).',
    right: 'Works with the left cerebral hemisphere, so it joins in language and verbal tasks; it controls the right side of the body.',
    refs: ['buckner2011', 'marien2014'],
  },
  'cerebellum-white-matter': {
    name: 'Cerebellar White Matter', group: 'cerebellum', wiki: 'Arbor vitae (anatomy)',
    desc: 'The branching core of the cerebellum (the "tree of life"), carrying fibers to and from the cerebellar cortex and housing the deep cerebellar nuclei, its only output.',
  },
  'vermal-lobules-i-v': {
    name: 'Vermis, Lobules I–V', group: 'cerebellum', wiki: 'Cerebellar vermis',
    desc: 'The front (anterior lobe) of the cerebellum\'s midline worm. It coordinates the trunk and legs, posture and gait; alcohol damages it first, causing a wide, unsteady walk. CerebrA splits the vermis into left and right halves.',
    refs: ['stoodley2010'],
  },
  'vermal-lobules-vi-vii': {
    name: 'Vermis, Lobules VI–VII', group: 'cerebellum', wiki: 'Cerebellar vermis',
    desc: 'The middle of the vermis. It controls fast eye movements and, with its connections to limbic areas, is linked to emotion; damage here contributes to the cerebellar cognitive affective syndrome.',
    refs: ['stoodley2010'],
  },
  'vermal-lobules-viii-x': {
    name: 'Vermis, Lobules VIII–X', group: 'cerebellum', wiki: 'Cerebellar vermis',
    desc: 'The back and underside of the vermis, ending in the nodulus. It works with the vestibular system to keep balance and steady the eyes during head movement.',
    refs: ['stoodley2010'],
  },
};

// Colors: each region a shade of its group's hue, so neighbouring regions in a lobe stay distinct.
export const REGION_COLORS: Record<string, string> = {};
{
  const counts: Partial<Record<GroupId, number>> = {};
  const SHADES = [[0, 55], [12, 44], [-10, 62], [20, 50], [-18, 40], [6, 58]];
  for (const [id, r] of Object.entries(REGIONS)) {
    const i = counts[r.group] ?? 0;
    counts[r.group] = i + 1;
    const [dh, l] = SHADES[i % SHADES.length];
    REGION_COLORS[id] = r.group === 'whiteMatter'
      ? 'hsl(40, 12%, 62%)' // muted, so it reads as depth where it shows in deep sulci
      : `hsl(${(GROUPS[r.group].hue + dh + 360) % 360}, 58%, ${l}%)`; // three.js rejects negative hues
  }
}

export interface Part {
  regionId: string;
  region: Region;
  side: Side;
}

// Mesh name -> region and side.
export function partFor(meshName: string): Part | null {
  const m = /^([LR])-(.+)$/.exec(meshName);
  const region = m && REGIONS[m[2]];
  return region ? { regionId: m[2], region, side: m[1] === 'L' ? 'Left' : 'Right' } : null;
}

export const meshName = (regionId: string, side: Side) => `${side[0]}-${regionId}`;

export const wikiUrl = (title: string) =>
  `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%23/, '#')}`;

export const doiUrl = (doi: string) => `https://doi.org/${doi}`;
