// Region metadata for public/brainImages/brain.glb (built by scripts/build-brain-model.mjs from
// BodyParts3D). Every mesh in the GLB is named by its FMA id; PARTS maps each id to a display
// name, side, region group, description and Wikipedia article. GROUPS hold the shared color,
// overview and article per region. `wiki` values are English Wikipedia titles (checked against
// the API, no redirects except the colliculus brachia, which have no article of their own).

export type GroupId =
  | 'frontal' | 'parietal' | 'temporal' | 'occipital' | 'insula' | 'limbic'
  | 'basalGanglia' | 'diencephalon' | 'commissures' | 'visual' | 'ventricles'
  | 'brainstem' | 'cerebellum';

export interface Group {
  label: string;
  color: string;
  desc: string;
  wiki: string;
  // Deep structures that sit inside the cortex; the "Show cortex" toggle hides what covers them.
  cortex?: boolean;
}

export const wikiUrl = (title: string) =>
  `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%23/, '#')}`;

export const GROUPS: Record<GroupId, Group> = {
  frontal: {
    label: 'Frontal Lobe', color: '#e07a6a', cortex: true, wiki: 'Frontal lobe',
    desc: 'The largest lobe, in front of the central sulcus. Its prefrontal cortex handles planning, working memory, impulse control and personality, while its back edge holds the motor areas that drive voluntary movement.',
  },
  parietal: {
    label: 'Parietal Lobe', color: '#e8b65a', cortex: true, wiki: 'Parietal lobe',
    desc: 'Behind the central sulcus. Combines touch, pain, temperature and body-position signals into a map of the body and the space around it, and supports attention, reading and arithmetic.',
  },
  temporal: {
    label: 'Temporal Lobe', color: '#7cc47a', cortex: true, wiki: 'Temporal lobe',
    desc: 'Below the lateral sulcus, beside the ears. Processes sound and spoken language, recognizes objects and faces, and (with the hippocampus on its inner surface) stores long-term memories.',
  },
  occipital: {
    label: 'Occipital Lobe', color: '#6a9fe0', cortex: true, wiki: 'Occipital lobe',
    desc: 'The back of the brain and home of the visual cortex, which turns signals from the eyes into edges, color, depth and motion.',
  },
  insula: {
    label: 'Insula', color: '#b48ce0', cortex: true, wiki: 'Insular cortex',
    desc: 'A lobe of cortex folded out of sight inside the lateral sulcus, covered by the frontal, parietal and temporal lobes.',
  },
  limbic: {
    label: 'Limbic System', color: '#e07ab8', wiki: 'Limbic system',
    desc: 'A ring of structures around the brain\'s core that ties memory to emotion and motivation.',
  },
  basalGanglia: {
    label: 'Basal Ganglia', color: '#d9d36a', wiki: 'Basal ganglia',
    desc: 'Deep nuclei that act as a gate for movement and behavior: they release wanted actions, suppress competing ones, and learn habits from reward. Parkinson\'s and Huntington\'s disease both begin here.',
  },
  diencephalon: {
    label: 'Diencephalon', color: '#f0a050', wiki: 'Diencephalon',
    desc: 'The "between-brain" at the top of the brainstem: the thalamus, hypothalamus and epithalamus, which relay sensation to the cortex and run the body\'s internal regulation.',
  },
  commissures: {
    label: 'Commissures', color: '#e8e2d0', wiki: 'Commissural fiber',
    desc: 'White-matter bridges that connect the left and right hemispheres so they can share information.',
  },
  visual: {
    label: 'Visual Pathway', color: '#5fd0d0', wiki: 'Visual system',
    desc: 'The route from the eyes to the visual cortex: optic nerve, optic chiasm, optic tract, lateral geniculate nucleus, then the optic radiation to the occipital lobe.',
  },
  ventricles: {
    label: 'Ventricles', color: '#58b8f0', wiki: 'Ventricular system',
    desc: 'Four connected cavities that produce and circulate cerebrospinal fluid, which floats the brain, cushions it and carries away waste.',
  },
  brainstem: {
    label: 'Brainstem', color: '#a8a0c8', wiki: 'Brainstem',
    desc: 'The stalk joining the brain to the spinal cord: midbrain, pons and medulla. Every signal between brain and body passes through it, and it runs breathing, heart rate, swallowing and arousal on its own.',
  },
  cerebellum: {
    label: 'Cerebellum', color: '#c890e0', wiki: 'Cerebellum',
    desc: 'The "little brain" under the occipital lobe. It compares intended movements with what actually happened and corrects them, giving movement its smoothness, timing and balance.',
  },
};

export interface Part {
  name: string;
  group: GroupId;
  desc: string;
  wiki: string;
  side?: 'Left' | 'Right';
}

type PartInfo = Omit<Part, 'side'>;

const lr = (left: string, right: string, info: PartInfo): Record<string, Part> => ({
  [left]: { ...info, side: 'Left' },
  [right]: { ...info, side: 'Right' },
});

export const PARTS: Record<string, Part> = {
  // ── Frontal lobe ──
  ...lr('FMA72654', 'FMA72653', {
    name: 'Superior Frontal Gyrus', group: 'frontal', wiki: 'Superior frontal gyrus',
    desc: 'The top strip of the frontal lobe, running front to back along the midline. It contributes to working memory and self-awareness, and its rear part includes the supplementary motor area, which plans sequences of movement.',
  }),
  ...lr('FMA72656', 'FMA72655', {
    name: 'Middle Frontal Gyrus', group: 'frontal', wiki: 'Middle frontal gyrus',
    desc: 'Contains much of the dorsolateral prefrontal cortex, central to working memory, attention and keeping goals in mind. Its rear part includes the frontal eye field, which steers voluntary eye movements.',
  }),
  ...lr('FMA72662', 'FMA72661', {
    name: 'Precentral Gyrus', group: 'frontal', wiki: 'Precentral gyrus',
    desc: 'The primary motor cortex, just in front of the central sulcus. It holds a map of the body (the motor homunculus) and sends the commands for voluntary movement down to the spinal cord, controlling the opposite side of the body.',
  }),
  // BodyParts3D's name; the mesh covers the lateral inferior frontal gyrus (frontal operculum).
  ...lr('FMA72702', 'FMA72701', {
    name: 'Accessory Short Gyrus', group: 'frontal', wiki: 'Inferior frontal gyrus',
    desc: 'BodyParts3D\'s name for this mesh; it covers the inferior frontal gyrus, the lowest strip of the lateral frontal lobe. On the dominant (usually left) side this includes Broca\'s area, which produces speech and grammar.',
  }),
  BP51: {
    name: 'Orbital Gyri & Gyrus Rectus', group: 'frontal', wiki: 'Orbitofrontal cortex',
    desc: 'The underside of the frontal lobe, resting above the eye sockets. This orbitofrontal cortex weighs rewards and punishments to guide decisions, and damage here changes personality and social behavior, as in the famous case of Phineas Gage.',
  },

  // ── Parietal lobe ──
  ...lr('FMA72666', 'FMA72665', {
    name: 'Postcentral Gyrus', group: 'parietal', wiki: 'Postcentral gyrus',
    desc: 'The primary somatosensory cortex, just behind the central sulcus. It receives touch, pressure, pain, temperature and joint-position signals laid out as a map of the body (the sensory homunculus), with oversized areas for the hands and lips.',
  }),
  ...lr('FMA72668', 'FMA72667', {
    name: 'Supramarginal Gyrus', group: 'parietal', wiki: 'Supramarginal gyrus',
    desc: 'Curves around the end of the lateral sulcus. It links sound to meaning in language, supports phonological working memory, and helps tell your own perspective and feelings apart from other people\'s.',
  }),
  ...lr('FMA72670', 'FMA72669', {
    name: 'Angular Gyrus', group: 'parietal', wiki: 'Angular gyrus',
    desc: 'Where the parietal, temporal and occipital lobes meet. It connects written words to their meaning and is important for reading, number processing and spatial attention; stimulating it can trigger out-of-body experiences.',
  }),
  ...lr('BP49', 'BP50', {
    name: 'Superior Parietal Lobule & Precuneus', group: 'parietal', wiki: 'Superior parietal lobule',
    desc: 'The upper parietal lobe and its inner face. It builds a sense of where your body and limbs are in space and guides reaching and grasping; the precuneus on the midline is involved in self-reflection and recalling personal memories.',
  }),

  // ── Temporal lobe ──
  ...lr('FMA72801', 'FMA72800', {
    name: 'Superior Temporal Gyrus (Anterior)', group: 'temporal', wiki: 'Superior temporal gyrus',
    desc: 'The front of the top temporal strip, near the primary auditory cortex (Heschl\'s gyrus, hidden in the lateral sulcus). It helps identify sounds and voices and recognize spoken words.',
  }),
  ...lr('FMA72805', 'FMA72804', {
    name: 'Superior Temporal Gyrus (Posterior)', group: 'temporal', wiki: 'Superior temporal gyrus',
    desc: 'The back of the top temporal strip. On the dominant (usually left) side this is Wernicke\'s area, needed to understand speech; damage leaves fluent but meaningless language.',
  }),
  ...lr('FMA72686', 'FMA72685', {
    name: 'Middle Temporal Gyrus', group: 'temporal', wiki: 'Middle temporal gyrus',
    desc: 'Involved in retrieving word meanings, recognizing known faces, and judging distance. Its rear end borders visual area MT/V5, which detects motion.',
  }),
  ...lr('FMA72688', 'FMA72687', {
    name: 'Inferior Temporal Gyrus', group: 'temporal', wiki: 'Inferior temporal gyrus',
    desc: 'The end of the ventral "what" visual stream. Its neurons respond to whole objects regardless of size, angle or position, which is what lets you recognize a cup from any viewpoint.',
  }),
  ...lr('FMA72690', 'FMA72689', {
    name: 'Fusiform Gyrus', group: 'temporal', wiki: 'Fusiform gyrus',
    desc: 'On the underside of the temporal lobe. It contains the fusiform face area, specialized for recognizing faces (damage causes face blindness), and the visual word-form area used in reading.',
  }),

  // ── Occipital lobe ──
  ...lr('FMA72976', 'FMA72975', {
    name: 'Occipital Lobe', group: 'occipital', wiki: 'Visual cortex',
    desc: 'Holds the primary visual cortex (V1) around the calcarine sulcus, which maps the opposite half of the visual field point by point, and higher areas (V2–V4) that extract color, shape and texture.',
  }),

  // ── Insula ──
  ...lr('FMA72978', 'FMA72977', {
    name: 'Insula', group: 'insula', wiki: 'Insular cortex',
    desc: 'Senses the body\'s internal state (heartbeat, breathing, hunger, pain) and turns it into feelings. It contains the primary taste cortex and is active in disgust, empathy and craving.',
  }),

  // ── Limbic system ──
  ...lr('FMA72718', 'FMA72717', {
    name: 'Cingulate Gyrus', group: 'limbic', wiki: 'Cingulate cortex',
    desc: 'Arches over the corpus callosum on the inner face of each hemisphere. The front part detects errors and conflict and registers how unpleasant pain is; the back part is linked to memory and self-reflection.',
  }),
  ...lr('FMA72706', 'FMA72705', {
    name: 'Parahippocampal Gyrus', group: 'limbic', wiki: 'Parahippocampal gyrus',
    desc: 'Lines the hippocampus and feeds it information. It recognizes scenes and places (the parahippocampal place area), and its front part, the entorhinal cortex, is one of the first areas hit by Alzheimer\'s disease.',
  }),
  ...lr('FMA72714', 'FMA72713', {
    name: 'Hippocampus', group: 'limbic', wiki: 'Hippocampus',
    desc: 'A seahorse-shaped structure on the floor of the lateral ventricle. It turns experiences into long-term memories and builds mental maps of space using place cells; removing both, as in patient H.M., stops new memories from forming.',
  }),
  ...lr('FMA72833', 'FMA72832', {
    name: 'Amygdala', group: 'limbic', wiki: 'Amygdala',
    desc: 'An almond-sized cluster of nuclei in front of the hippocampus. It detects threats, triggers fear responses, and tags memories with emotional weight, which is why emotional events are remembered so vividly.',
  }),
  ...lr('FMA72925', 'FMA72924', {
    name: 'Fornix', group: 'limbic', wiki: 'Fornix (neuroanatomy)',
    desc: 'An arching bundle of fibers that carries the hippocampus\'s output forward to the mammillary bodies and septal area, a key link in the memory circuit.',
  }),
  FMA61970: {
    name: 'Commissure of Fornix', group: 'limbic', wiki: 'Fornix (neuroanatomy)#Commissure',
    desc: 'Also called the hippocampal commissure: fibers crossing between the two fornices beneath the corpus callosum, connecting the left and right hippocampi.',
  },
  FMA74877: {
    name: 'Mammillary Bodies', group: 'limbic', wiki: 'Mammillary body',
    desc: 'Two small round bumps under the hypothalamus that relay memory signals from the fornix to the thalamus. They degenerate in Korsakoff syndrome, caused by thiamine deficiency.',
  },

  // ── Basal ganglia ──
  ...lr('FMA72827', 'FMA72826', {
    name: 'Caudate Nucleus', group: 'basalGanglia', wiki: 'Caudate nucleus',
    desc: 'A C-shaped nucleus curving along the lateral ventricle. Part of the striatum, it helps plan goal-directed actions and learn from feedback, and its loss is the hallmark of Huntington\'s disease.',
  }),
  ...lr('FMA72829', 'FMA72828', {
    name: 'Putamen', group: 'basalGanglia', wiki: 'Putamen',
    desc: 'The outer part of the striatum. It receives input from the motor cortex and drives learned, automatic movements, and is the area most starved of dopamine in Parkinson\'s disease.',
  }),
  ...lr('FMA72831', 'FMA72830', {
    name: 'Globus Pallidus', group: 'basalGanglia', wiki: 'Globus pallidus',
    desc: 'The basal ganglia\'s main output, just inside the putamen. It continuously inhibits the thalamus and releases that brake for the movement selected; it is a target for deep brain stimulation.',
  }),

  // ── Diencephalon ──
  ...lr('FMA258716', 'FMA258714', {
    name: 'Thalamus', group: 'diencephalon', wiki: 'Thalamus',
    desc: 'The brain\'s central relay. Every sense except smell passes through one of its nuclei on the way to the cortex, and it also routes motor loops and helps regulate sleep, wakefulness and consciousness.',
  }),
  FMA62008nsn: {
    name: 'Hypothalamus', group: 'diencephalon', wiki: 'Hypothalamus',
    desc: 'About the size of an almond, yet it controls body temperature, hunger, thirst, sleep cycles and the stress response, and directs the pituitary gland\'s hormones.',
  },
  FMA62327: {
    name: 'Tuber Cinereum', group: 'diencephalon', wiki: 'Tuber cinereum',
    desc: 'The bulge on the underside of the hypothalamus from which the pituitary stalk descends. Its nuclei release hormones that control the pituitary.',
  },
  FMA62032: {
    name: 'Habenula', group: 'diencephalon', wiki: 'Habenula',
    desc: 'A small paired nucleus at the back of the thalamus that signals disappointment (rewards that don\'t arrive) and suppresses dopamine; overactivity is linked to depression.',
  },
  FMA62033: {
    name: 'Pineal Gland', group: 'diencephalon', wiki: 'Pineal gland',
    desc: 'A pine-cone-shaped gland that releases melatonin in darkness, timing the sleep–wake cycle. Descartes considered it the seat of the soul.',
  },
  FMA13889: {
    name: 'Pituitary Gland', group: 'diencephalon', wiki: 'Pituitary gland',
    desc: 'The pea-sized "master gland" hanging from the hypothalamus. Its hormones control growth, metabolism (via the thyroid), stress (via the adrenals), reproduction and water balance.',
  },
  ...lr('FMA73310', 'FMA73309', {
    name: 'Medial Geniculate Body', group: 'diencephalon', wiki: 'Medial geniculate nucleus',
    desc: 'The thalamus\'s relay for hearing: it receives signals from the inferior colliculus and passes them to the auditory cortex.',
  }),

  // ── Commissures ──
  FMA86464: {
    name: 'Corpus Callosum', group: 'commissures', wiki: 'Corpus callosum',
    desc: 'The largest white-matter structure in the brain, with about 200 million axons connecting matching areas of the two hemispheres. Cutting it ("split-brain" surgery) leaves each hemisphere unaware of what the other sees.',
  },
  FMA61844: {
    name: 'Septum Pellucidum', group: 'commissures', wiki: 'Septum pellucidum',
    desc: 'A thin membrane hanging from the corpus callosum that separates the two lateral ventricles.',
  },

  // ── Visual pathway ──
  ...lr('FMA50878', 'FMA50875', {
    name: 'Optic Nerve', group: 'visual', wiki: 'Optic nerve',
    desc: 'About a million axons from the retina\'s ganglion cells, carrying everything one eye sees. Where it leaves the eye there are no photoreceptors, creating the blind spot.',
  }),
  FMA62045: {
    name: 'Optic Chiasm', group: 'visual', wiki: 'Optic chiasm',
    desc: 'The X where the optic nerves meet. Fibers from the inner half of each retina cross over, so each hemisphere receives the opposite half of the visual field from both eyes. Pituitary tumors pressing here cause tunnel vision.',
  },
  ...lr('FMA67936', 'FMA62382', {
    name: 'Optic Tract', group: 'visual', wiki: 'Optic tract',
    desc: 'Carries visual signals from the chiasm around the brainstem to the lateral geniculate nucleus, with branches to the superior colliculus for reflexive eye movements.',
  }),
  ...lr('FMA73304', 'FMA73303', {
    name: 'Lateral Geniculate Body', group: 'visual', wiki: 'Lateral geniculate nucleus',
    desc: 'The thalamus\'s relay for vision. Its six layers keep inputs from the two eyes separate and pass them to the primary visual cortex.',
  }),

  // ── Ventricles ──
  ...lr('FMA78450', 'FMA78449', {
    name: 'Lateral Ventricle', group: 'ventricles', wiki: 'Lateral ventricles',
    desc: 'The largest ventricles, one C-shaped cavity in each hemisphere. Their choroid plexus produces most of the brain\'s cerebrospinal fluid; they enlarge in hydrocephalus and with brain atrophy.',
  }),
  FMA78454: {
    name: 'Third Ventricle', group: 'ventricles', wiki: 'Third ventricle',
    desc: 'A narrow slit between the two thalami that receives fluid from the lateral ventricles and drains through the cerebral aqueduct.',
  },
  FMA78467: {
    name: 'Cerebral Aqueduct', group: 'ventricles', wiki: 'Cerebral aqueduct',
    desc: 'A thin channel through the midbrain linking the third and fourth ventricles. Its narrowness makes it the most common site of blockage causing hydrocephalus.',
  },
  FMA78469: {
    name: 'Fourth Ventricle', group: 'ventricles', wiki: 'Fourth ventricle',
    desc: 'A tent-shaped cavity between the brainstem and cerebellum. Fluid leaves it through three openings into the space around the brain and spinal cord.',
  },

  // ── Brainstem ──
  FMA61993nsn: {
    name: 'Midbrain', group: 'brainstem', wiki: 'Midbrain',
    desc: 'The top of the brainstem. It contains the substantia nigra (whose dopamine neurons die in Parkinson\'s disease), nuclei for eye movement, and relays for visual and auditory reflexes.',
  },
  FMA62394: {
    name: 'Cerebral Peduncle', group: 'brainstem', wiki: 'Cerebral peduncle',
    desc: 'The two thick stalks on the front of the midbrain, carrying the motor pathways from the cortex down to the brainstem and spinal cord.',
  },
  ...lr('FMA73423', 'FMA73422', {
    name: 'Superior Colliculus', group: 'brainstem', wiki: 'Superior colliculus',
    desc: 'A bump on the back of the midbrain that holds a map of visual space and snaps the eyes and head toward anything that suddenly appears.',
  }),
  ...lr('FMA73435', 'FMA73434', {
    name: 'Inferior Colliculus', group: 'brainstem', wiki: 'Inferior colliculus',
    desc: 'The main auditory hub of the midbrain. It combines signals from both ears to locate where a sound came from and triggers the startle reflex.',
  }),
  ...lr('FMA73462', 'FMA73461', {
    name: 'Brachium of Superior Colliculus', group: 'brainstem', wiki: 'Superior colliculus',
    desc: 'A fiber bundle carrying visual input from the optic tract to the superior colliculus.',
  }),
  ...lr('FMA73464', 'FMA73463', {
    name: 'Brachium of Inferior Colliculus', group: 'brainstem', wiki: 'Inferior colliculus',
    desc: 'A fiber bundle carrying auditory signals from the inferior colliculus to the medial geniculate body of the thalamus.',
  }),
  FMA67943: {
    name: 'Pons', group: 'brainstem', wiki: 'Pons',
    desc: 'Latin for "bridge": the bulge that relays signals from the cortex to the cerebellum. It also helps set breathing rhythm, controls facial movement and chewing, and helps generate REM sleep.',
  },
  FMA62004: {
    name: 'Medulla Oblongata', group: 'brainstem', wiki: 'Medulla oblongata',
    desc: 'The lowest part of the brainstem, continuous with the spinal cord. It contains the centers for breathing, heart rate and blood pressure, as well as the reflexes for swallowing, coughing and vomiting. Motor pathways cross sides here.',
  },

  // ── Cerebellum ──
  FMA67944: {
    name: 'Cerebellum', group: 'cerebellum', wiki: 'Cerebellum',
    desc: 'Only about 10% of the brain\'s volume but over half of its neurons. It coordinates timing and accuracy of movement, balance and motor learning, and damage causes clumsy, unsteady movement (ataxia).',
  },
};
