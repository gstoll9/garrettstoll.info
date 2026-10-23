// Region metadata for public/brainImages/brain.glb (built by scripts/build-brain-model.mjs from
// BodyParts3D). Every mesh in the GLB is named by its FMA id; PARTS maps each id to a display
// name, side and region group. GROUPS hold the shared color and description per region.

export type GroupId =
  | 'frontal' | 'parietal' | 'temporal' | 'occipital' | 'insula' | 'limbic'
  | 'basalGanglia' | 'diencephalon' | 'commissures' | 'visual' | 'ventricles'
  | 'brainstem' | 'cerebellum';

export interface Group {
  label: string;
  color: string;
  desc: string;
  // Deep structures that sit inside the cortex; the "Show cortex" toggle hides what covers them.
  cortex?: boolean;
}

export const GROUPS: Record<GroupId, Group> = {
  frontal: {
    label: 'Frontal Lobe', color: '#e07a6a', cortex: true,
    desc: 'Planning, decision making, working memory and personality. The precentral gyrus at its back edge is the primary motor cortex, which drives voluntary movement of the opposite side of the body.',
  },
  parietal: {
    label: 'Parietal Lobe', color: '#e8b65a', cortex: true,
    desc: 'Integrates touch, temperature, pain and body position. The postcentral gyrus is the primary somatosensory cortex; the angular and supramarginal gyri support reading, language and spatial attention.',
  },
  temporal: {
    label: 'Temporal Lobe', color: '#7cc47a', cortex: true,
    desc: 'Hearing and language comprehension (the superior temporal gyrus holds the auditory cortex and Wernicke\'s area), plus object and face recognition along the fusiform gyrus.',
  },
  occipital: {
    label: 'Occipital Lobe', color: '#6a9fe0', cortex: true,
    desc: 'The visual cortex: receives input from the eyes via the thalamus and processes shape, color and motion.',
  },
  insula: {
    label: 'Insula', color: '#b48ce0', cortex: true,
    desc: 'A cortex folded deep inside the lateral sulcus. Senses the body\'s internal state (heartbeat, hunger, pain) and is involved in emotion, taste and self-awareness.',
  },
  limbic: {
    label: 'Limbic System', color: '#e07ab8',
    desc: 'Emotion, motivation and memory. The hippocampus forms new long-term memories; the amygdala tags experiences with fear and emotional significance.',
  },
  basalGanglia: {
    label: 'Basal Ganglia', color: '#d9d36a',
    desc: 'Deep nuclei that select and initiate movements and form habits. Damage here underlies Parkinson\'s and Huntington\'s disease.',
  },
  diencephalon: {
    label: 'Diencephalon', color: '#f0a050',
    desc: 'The thalamus relays nearly all sensory signals to the cortex; the hypothalamus regulates temperature, hunger, thirst and hormones via the pituitary gland.',
  },
  commissures: {
    label: 'Commissures', color: '#e8e2d0',
    desc: 'White-matter bundles linking the two hemispheres. The corpus callosum carries ~200 million axons between left and right cortex.',
  },
  visual: {
    label: 'Visual Pathway', color: '#5fd0d0',
    desc: 'Optic nerves cross at the optic chiasm so each hemisphere receives the opposite half of the visual field, relaying through the lateral geniculate body to the occipital cortex.',
  },
  ventricles: {
    label: 'Ventricles', color: '#58b8f0',
    desc: 'Interconnected cavities filled with cerebrospinal fluid, which cushions the brain and clears waste.',
  },
  brainstem: {
    label: 'Brainstem', color: '#a8a0c8',
    desc: 'Connects the brain to the spinal cord and controls automatic functions: breathing, heart rate, blood pressure, swallowing and sleep/wake cycles.',
  },
  cerebellum: {
    label: 'Cerebellum', color: '#c890e0',
    desc: 'Coordinates movement, balance and posture, and fine-tunes motor learning. Holds over half of the brain\'s neurons.',
  },
};

export interface Part {
  name: string;
  group: GroupId;
  side?: 'Left' | 'Right';
}

const lr = (left: string, right: string, name: string, group: GroupId): Record<string, Part> => ({
  [left]: { name, group, side: 'Left' },
  [right]: { name, group, side: 'Right' },
});

export const PARTS: Record<string, Part> = {
  ...lr('FMA72654', 'FMA72653', 'Superior Frontal Gyrus', 'frontal'),
  ...lr('FMA72656', 'FMA72655', 'Middle Frontal Gyrus', 'frontal'),
  ...lr('FMA72662', 'FMA72661', 'Precentral Gyrus (Motor Cortex)', 'frontal'),
  BP51: { name: 'Orbital Gyri & Gyrus Rectus', group: 'frontal' },

  ...lr('FMA72666', 'FMA72665', 'Postcentral Gyrus (Somatosensory Cortex)', 'parietal'),
  ...lr('FMA72668', 'FMA72667', 'Supramarginal Gyrus', 'parietal'),
  ...lr('FMA72670', 'FMA72669', 'Angular Gyrus', 'parietal'),
  ...lr('BP49', 'BP50', 'Superior Parietal Lobule & Precuneus', 'parietal'),

  ...lr('FMA72801', 'FMA72800', 'Superior Temporal Gyrus (Anterior)', 'temporal'),
  ...lr('FMA72805', 'FMA72804', 'Superior Temporal Gyrus (Posterior)', 'temporal'),
  ...lr('FMA72686', 'FMA72685', 'Middle Temporal Gyrus', 'temporal'),
  ...lr('FMA72688', 'FMA72687', 'Inferior Temporal Gyrus', 'temporal'),
  ...lr('FMA72690', 'FMA72689', 'Fusiform Gyrus', 'temporal'),

  ...lr('FMA72976', 'FMA72975', 'Occipital Lobe', 'occipital'),

  ...lr('FMA72978', 'FMA72977', 'Insula', 'insula'),
  // BodyParts3D's name; the mesh covers the lateral inferior frontal gyrus (frontal operculum).
  ...lr('FMA72702', 'FMA72701', 'Accessory Short Gyrus', 'frontal'),

  ...lr('FMA72718', 'FMA72717', 'Cingulate Gyrus', 'limbic'),
  ...lr('FMA72706', 'FMA72705', 'Parahippocampal Gyrus', 'limbic'),
  ...lr('FMA72714', 'FMA72713', 'Hippocampus', 'limbic'),
  ...lr('FMA72833', 'FMA72832', 'Amygdala', 'limbic'),
  ...lr('FMA72925', 'FMA72924', 'Fornix', 'limbic'),
  FMA61970: { name: 'Commissure of Fornix', group: 'limbic' },
  FMA74877: { name: 'Mammillary Body', group: 'limbic' },

  ...lr('FMA72827', 'FMA72826', 'Caudate Nucleus', 'basalGanglia'),
  ...lr('FMA72829', 'FMA72828', 'Putamen', 'basalGanglia'),
  ...lr('FMA72831', 'FMA72830', 'Globus Pallidus', 'basalGanglia'),

  ...lr('FMA258716', 'FMA258714', 'Thalamus', 'diencephalon'),
  FMA62008nsn: { name: 'Hypothalamus', group: 'diencephalon' },
  FMA62327: { name: 'Tuber Cinereum', group: 'diencephalon' },
  FMA62032: { name: 'Habenula', group: 'diencephalon' },
  FMA62033: { name: 'Pineal Gland', group: 'diencephalon' },
  FMA13889: { name: 'Pituitary Gland', group: 'diencephalon' },
  ...lr('FMA73310', 'FMA73309', 'Medial Geniculate Body', 'diencephalon'),

  FMA86464: { name: 'Corpus Callosum', group: 'commissures' },
  FMA61844: { name: 'Septum Pellucidum', group: 'commissures' },

  ...lr('FMA50878', 'FMA50875', 'Optic Nerve', 'visual'),
  FMA62045: { name: 'Optic Chiasm', group: 'visual' },
  ...lr('FMA67936', 'FMA62382', 'Optic Tract', 'visual'),
  ...lr('FMA73304', 'FMA73303', 'Lateral Geniculate Body', 'visual'),

  ...lr('FMA78450', 'FMA78449', 'Lateral Ventricle', 'ventricles'),
  FMA78454: { name: 'Third Ventricle', group: 'ventricles' },
  FMA78467: { name: 'Cerebral Aqueduct', group: 'ventricles' },
  FMA78469: { name: 'Fourth Ventricle', group: 'ventricles' },

  FMA61993nsn: { name: 'Midbrain', group: 'brainstem' },
  FMA62394: { name: 'Cerebral Peduncle', group: 'brainstem' },
  ...lr('FMA73423', 'FMA73422', 'Superior Colliculus', 'brainstem'),
  ...lr('FMA73435', 'FMA73434', 'Inferior Colliculus', 'brainstem'),
  ...lr('FMA73462', 'FMA73461', 'Brachium of Superior Colliculus', 'brainstem'),
  ...lr('FMA73464', 'FMA73463', 'Brachium of Inferior Colliculus', 'brainstem'),
  FMA67943: { name: 'Pons', group: 'brainstem' },
  FMA62004: { name: 'Medulla Oblongata', group: 'brainstem' },

  FMA67944: { name: 'Cerebellum', group: 'cerebellum' },
};
