// Plain-language descriptions of the 19 PET targets in receptors.ts (Hansen et al. 2022), keyed by
// target id, with each one's Wikipedia title (checked against the API, no redirects).

export const RECEPTOR_INFO: Record<string, { desc: string; wiki: string }> = {
  '5HT1a': {
    wiki: '5-HT1A receptor',
    desc: 'Inhibitory serotonin receptor, dense in the hippocampus and limbic cortex. It also sits on the raphe\'s own serotonin neurons as a brake, and is a target of anti-anxiety drugs like buspirone.',
  },
  '5HT1b': {
    wiki: '5-HT1B receptor',
    desc: 'Mostly on axon terminals, where it reduces transmitter release; richest in the pallidum and visual cortex. Triptan migraine drugs act on it.',
  },
  '5HT2a': {
    wiki: '5-HT2A receptor',
    desc: 'Excitatory serotonin receptor on cortical pyramidal neurons, densest in association and sensory cortex. Psychedelics such as psilocybin and LSD act mainly through it.',
  },
  '5HT4': {
    wiki: '5-HT4 receptor',
    desc: 'Excitatory serotonin receptor concentrated in the striatum and hippocampus, linked to learning and memory.',
  },
  '5HT6': {
    wiki: '5-HT6 receptor',
    desc: 'Serotonin receptor found almost only in the brain, densest in the striatum; studied as a target for improving cognition.',
  },
  '5HTT': {
    wiki: 'Serotonin transporter',
    desc: 'Pumps released serotonin back into the neuron, so it marks serotonin axons. Highest near the raphe and in subcortical targets; SSRI antidepressants block it.',
  },
  D1: {
    wiki: 'Dopamine receptor D1',
    desc: 'The most common dopamine receptor, excitatory. Dense on the striatum\'s "go" (direct-pathway) neurons and present in prefrontal cortex, where it supports working memory.',
  },
  D2: {
    wiki: 'Dopamine receptor D2',
    desc: 'Inhibitory dopamine receptor on the striatum\'s "no-go" (indirect-pathway) neurons and on dopamine neurons themselves. Almost all antipsychotic drugs block it.',
  },
  DAT: {
    wiki: 'Dopamine transporter',
    desc: 'Recycles released dopamine, so it marks dopamine axons, overwhelmingly in the striatum. Cocaine and methylphenidate block it; its loss is imaged to diagnose Parkinson\'s disease.',
  },
  NET: {
    wiki: 'Norepinephrine transporter',
    desc: 'Recycles noradrenaline released by axons from the locus coeruleus, which reach the whole brain; highest in the thalamus and brainstem. Some antidepressants and ADHD drugs block it.',
  },
  H3: {
    wiki: 'Histamine H3 receptor',
    desc: 'A brake on the release of histamine and other transmitters, dense in the striatum. Blocking it promotes wakefulness (pitolisant, a narcolepsy drug).',
  },
  A4B2: {
    wiki: 'Alpha-4 beta-2 nicotinic receptor',
    desc: 'The brain\'s main nicotine receptor, an ion channel opened by acetylcholine. Densest in the thalamus; it drives nicotine addiction.',
  },
  M1: {
    wiki: 'Muscarinic acetylcholine receptor M1',
    desc: 'Excitatory acetylcholine receptor on cortical, hippocampal and striatal neurons, involved in attention and memory.',
  },
  VAChT: {
    wiki: 'Vesicular acetylcholine transporter',
    desc: 'Loads acetylcholine into vesicles, so it marks cholinergic axons and neurons: densest in the striatum (its own cholinergic interneurons) and the basal forebrain.',
  },
  MOR: {
    wiki: 'Mu-opioid receptor',
    desc: 'Receptor for endorphins and for morphine, fentanyl and heroin; it mediates pain relief and reward. Densest in the accumbens, thalamus and amygdala.',
  },
  CB1: {
    wiki: 'Cannabinoid receptor 1',
    desc: 'One of the most abundant receptors in the brain, on axon terminals, where endocannabinoids made by the receiving neuron turn down transmitter release. THC acts on it.',
  },
  GABAa: {
    wiki: 'GABAA receptor',
    desc: 'The main fast inhibitory receptor, a chloride channel opened by GABA. The tracer binds its benzodiazepine site (where drugs like diazepam act), densest in visual cortex.',
  },
  NMDA: {
    wiki: 'NMDA receptor',
    desc: 'Glutamate receptor channel that opens only when the neuron is already excited, making it the key trigger for synaptic strengthening in learning. Ketamine blocks it.',
  },
  mGluR5: {
    wiki: 'Metabotropic glutamate receptor 5',
    desc: 'Slow glutamate receptor that tunes excitability and synaptic plasticity, widespread in cortex and striatum.',
  },
};
