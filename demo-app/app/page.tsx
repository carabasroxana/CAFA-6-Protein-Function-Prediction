"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import cafaDemoData from "./data/cafa_demo_data.json";

type AspectKey = "bp" | "mf" | "cc";
type GoAspectKey = "molecular_function" | "biological_process" | "cellular_component";
type View = "home" | "classify" | "explore" | "results";
type FrequencyMode = "most" | "rare";
type ClassifyMode = "choice" | "custom" | "examples";

type Aspect = {
  key: AspectKey;
  label: string;
  short: string;
  icon: string;
  question: string;
  color: string;
  soft: string;
};

type PredictionTerm = { term: string; name: string; score: number };
type KnownTerm = { term: string; name: string };
type CountedTerm = { term: string; name: string; count: number };

type ProteinPredictionExample = {
  id: string;
  label: string;
  sequence: string;
  before: string[];
  prediction: Record<AspectKey, PredictionTerm[]>;
};

type CorpusProteinExample = {
  id: string;
  length: number;
  sequence: string;
  annotation_count: number;
  known_terms: Record<AspectKey, KnownTerm[]>;
};

type DemoData = {
  summary: {
    training_proteins: number;
    test_proteins: number;
    training_annotation_rows: number;
    unique_go_terms: number;
    avg_annotations_per_protein: number;
    median_annotations_per_protein: number;
    sequence_length: { min: number; median: number; mean: number; max: number };
  };
  amino_acids: Array<{ aa: string; count: number; percent: number }>;
  top_go_terms: Record<GoAspectKey, CountedTerm[]>;
  rare_go_term_counts: Record<GoAspectKey, number>;
  rare_examples: Record<GoAspectKey, CountedTerm[]>;
  top_taxa: Array<{ taxon: string; species: string; count: number }>;
  cellular_location_aa_stats: Array<{
    term: string;
    name: string;
    proteins: number;
    most_common_aa: string;
    aa_percent: number;
    median_length: number;
    sample_proteins: string[];
  }>;
  function_to_proteins: Array<{
    term: string;
    name: string;
    aspect: string;
    count: number;
    sample_proteins: string[];
  }>;
  protein_examples: CorpusProteinExample[];
};

type ModelVariant = { title: string; tag: string; description: string };

const demoData = cafaDemoData as DemoData;

const aspectData: Aspect[] = [
  {
    key: "bp",
    label: "Biological Process",
    short: "BP",
    icon: "🌱",
    question: "Which biological program?",
    color: "from-emerald-500 to-teal-500",
    soft: "bg-emerald-50 text-emerald-800",
  },
  {
    key: "mf",
    label: "Molecular Function",
    short: "MF",
    icon: "⚙️",
    question: "What does the protein do?",
    color: "from-indigo-500 to-violet-500",
    soft: "bg-indigo-50 text-indigo-800",
  },
  {
    key: "cc",
    label: "Cellular Component",
    short: "CC",
    icon: "📍",
    question: "Where does it act?",
    color: "from-orange-500 to-rose-500",
    soft: "bg-orange-50 text-orange-800",
  },
];

const goAspectLabels: Record<GoAspectKey, string> = {
  molecular_function: "Molecular Function",
  biological_process: "Biological Process",
  cellular_component: "Cellular Component",
};

const modelVariants: ModelVariant[] = [
  {
    title: "CNN baseline",
    tag: "Variant 1",
    description:
      "Sequence-only baseline: amino acids are tokenized and scored with a convolutional neural network.",
  },
  {
    title: "GO-ESM-MLP",
    tag: "Variant 2",
    description:
      "Best completed system: ESM2 embeddings feed three aspect-specific MLP heads for BP, MF and CC.",
  },
  {
    title: "MLP + kNN",
    tag: "Variant 3",
    description:
      "Adds nearest-neighbor smoothing in embedding space, using similar annotated proteins as evidence.",
  },
  {
    title: "FAISS hybrid",
    tag: "Variant 4",
    description:
      "Scales retrieval with FAISS, seed ensembling, calibrated blending and output caps.",
  },
];

const predictionExamples: ProteinPredictionExample[] = [
  {
    id: "A0A087X1C5",
    label: "Dataset-style example: binding + localization",
    sequence:
      "MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGPDEAPRMPEAAPPVAPAPAAPTPAAPAPAPSWPLSSSVPSQKTYQGSYGFRLGFLHSGTAKSVTCTYSPALNKMFCQLWVDSTPPPGTRVRAMAIYKQSQHMTEVVRRCPHHERCSDSSDGLAPPQHLIRVEGNLRVEYLDDRNTFRHSVVVPYEPPEVGSDCTTIHYNYMCNSSCMGGMNRRPILTIITLEDSDGNLVYQAIHLK",
    before: ["Unknown function", "Only sequence is available", "No readable biological explanation"],
    prediction: {
      mf: [
        { term: "GO:0005515", name: "protein binding", score: 0.86 },
        { term: "GO:0003674", name: "molecular function", score: 0.62 },
      ],
      bp: [
        { term: "GO:0006351", name: "transcription, DNA-templated", score: 0.48 },
        { term: "GO:0008150", name: "biological process", score: 0.41 },
      ],
      cc: [
        { term: "GO:0005634", name: "nucleus", score: 0.77 },
        { term: "GO:0005829", name: "cytosol", score: 0.71 },
        { term: "GO:0005886", name: "plasma membrane", score: 0.63 },
      ],
    },
  },
  {
    id: "P12345",
    label: "Clear example: kinase-like story",
    sequence:
      "MGSSHHHHHHSSGLVPRGSHMASMTGGQQMGRGSEFELRRQQEGDYYKLAQEVGVDGIVLDVGCGTGKSTLLRLLAGQFPEGLVVVSRDGTQSFVDLKEGEKVRLQIWDTAGQERFRTITSSYYRGAHGIIVVYDVTDQESFNNVKQWLQEIDRYASENVNKLLVGNKCDMEEILKALQAQKVPVLVFANKQDLPKGHVRAQLQEEDVEQYIKALR",
    before: ["Raw amino-acid sequence", "Function not obvious", "Needs GO annotation"],
    prediction: {
      mf: [
        { term: "GO:0005524", name: "ATP binding", score: 0.91 },
        { term: "GO:0016301", name: "kinase activity", score: 0.79 },
        { term: "GO:0016740", name: "transferase activity", score: 0.65 },
      ],
      bp: [
        { term: "GO:0006468", name: "protein phosphorylation", score: 0.58 },
        { term: "GO:0007165", name: "signal transduction", score: 0.45 },
      ],
      cc: [{ term: "GO:0005737", name: "cytoplasm", score: 0.68 }],
    },
  },
  {
    id: "Q8XYZ1",
    label: "Localization-focused example",
    sequence:
      "MKVLWAALLVTFLAGCQAKVEAQKVTGVYEPGVTVKDSYVGDEAQSKRGILTLKYPIEHGIITNWDDMEKIWHHTFYNELRVAPEEHPVLLTEAPLNPKANREKMTQIMFETFNTPAMYVAIQAVLSLYASGRTTGIVMDSGDGVTHTVPIYEGYALPHAILRLDLAGRDLTDYLMKILTERGYSFVTTAEREIVRDIKEKLCYVALDFEQEMATAASSSSLEKSYELPDGQVITIGNERFRCPETLFQPSFIGMESAGIHETTYNSIMKCDVDIRKDLYANNVMSGGTTMYPGIADR",
    before: ["Sequence-only input", "Location unknown", "No cellular context"],
    prediction: {
      mf: [{ term: "GO:0005198", name: "structural molecule activity", score: 0.52 }],
      bp: [{ term: "GO:0006950", name: "response to stress", score: 0.39 }],
      cc: [
        { term: "GO:0016020", name: "membrane", score: 0.74 },
        { term: "GO:0005886", name: "plasma membrane", score: 0.69 },
        { term: "GO:0005615", name: "extracellular space", score: 0.56 },
      ],
    },
  },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function scoreWidth(score: number): string {
  return `${Math.round(score * 100)}%`;
}

function cleanSequence(input: string): string {
  return input.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, "");
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </div>
  );
}

function VariantOverview() {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {modelVariants.map((variant, index) => {
        const isSelected = variant.title === "GO-ESM-MLP";
        return (
          <motion.div
            key={variant.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className={`rounded-3xl border p-4 shadow-sm ${
              isSelected ? "border-indigo-200 bg-indigo-50" : "border-slate-100 bg-white"
            }`}
          >
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {variant.tag}
            </span>
            <h3 className="mt-3 font-bold text-slate-900">{variant.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{variant.description}</p>
          </motion.div>
        );
      })}
    </section>
  );
}

function HomePanel({ setView }: { setView: (view: View) => void }) {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <button
        type="button"
        onClick={() => setView("classify")}
        className="group rounded-3xl border border-indigo-100 bg-white p-8 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
      >
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-500">Research direction 1</p>
        <h2 className="mt-3 text-3xl font-bold text-slate-900">Classify a protein</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Start from an amino-acid sequence and inspect predicted Gene Ontology terms grouped by Molecular Function, Biological Process and Cellular Component.
        </p>
        <div className="mt-6 inline-flex rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white">
          Open prediction demo →
        </div>
      </button>

      <button
        type="button"
        onClick={() => setView("explore")}
        className="group rounded-3xl border border-emerald-100 bg-white p-8 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
      >
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-500">Research direction 2</p>
        <h2 className="mt-3 text-3xl font-bold text-slate-900">Explore the dataset</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Look through corpus statistics, frequent and rare GO functions, protein examples, taxa, and amino-acid patterns for cellular locations.
        </p>
        <div className="mt-6 inline-flex rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white">
          Open corpus explorer →
        </div>
      </button>
    </section>
  );
}

function ProteinRibbon({ sequence }: { sequence: string }) {
  const residues = sequence.slice(0, 120).split("");
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Input</p>
          <h3 className="text-lg font-semibold text-slate-900">Amino-acid sequence</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {sequence.length} residues
        </span>
      </div>
      <div className="grid grid-cols-8 gap-1 font-mono text-[11px] leading-6 sm:grid-cols-12 lg:grid-cols-16">
        {residues.map((residue, index) => (
          <motion.span
            key={`${residue}-${index}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.002 }}
            className="rounded-md bg-slate-50 text-center text-slate-700 ring-1 ring-slate-100"
          >
            {residue}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function AspectPredictionCard({ aspect, terms }: { aspect: Aspect; terms: PredictionTerm[] }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className={`rounded-2xl bg-gradient-to-br ${aspect.color} px-3 py-2 text-lg text-white shadow-sm`}>
          {aspect.icon}
        </div>
        <div>
          <h4 className="font-semibold text-slate-900">{aspect.short}</h4>
          <p className="text-xs text-slate-500">{aspect.question}</p>
        </div>
      </div>
      <div className="space-y-3">
        {terms.map((term) => (
          <div key={term.term}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-slate-700">{term.name}</span>
              <span className="font-mono text-slate-500">{term.score.toFixed(2)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: scoreWidth(term.score) }}
                transition={{ duration: 0.55 }}
                className={`h-full rounded-full bg-gradient-to-r ${aspect.color}`}
              />
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-400">{term.term}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassifyPanel() {
  const [mode, setMode] = useState<ClassifyMode>("choice");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [customSequence, setCustomSequence] = useState("");
  const example = predictionExamples[exampleIndex] ?? predictionExamples[0];
  const cleanedCustomSequence = cleanSequence(customSequence);

  const textPrediction = useMemo(() => {
    const mf = example.prediction.mf[0]?.name ?? "a predicted";
    const bp = example.prediction.bp[0]?.name;
    const cc = example.prediction.cc.slice(0, 3).map((term) => term.name).join(", ");
    return `This protein is predicted to have ${mf} molecular function${bp ? `, may participate in ${bp}` : ""}, and may be localized to ${cc}.`;
  }, [example]);

  if (mode === "choice") {
    return (
      <section className="grid gap-5 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("custom")}
          className="rounded-3xl border border-indigo-100 bg-white p-8 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-500">Option 1</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900">Try your own protein</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Paste an amino-acid sequence and check how it will be prepared for the model pipeline.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setMode("examples")}
          className="rounded-3xl border border-emerald-100 bg-white p-8 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-500">Option 2</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900">Precomputed proteins</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Open prepared examples with predicted GO terms for each ontology aspect.
          </p>
        </button>
      </section>
    );
  }

  if (mode === "custom") {
    return (
      <section className="space-y-5">
        <button
          type="button"
          onClick={() => setMode("choice")}
          className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-100 transition hover:bg-slate-100"
        >
          Back to options
        </button>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Try your own protein</p>
            <textarea
              value={customSequence}
              onChange={(event) => setCustomSequence(event.target.value)}
              placeholder="Paste amino-acid sequence here..."
              className="mt-3 min-h-56 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm outline-none ring-indigo-200 transition focus:ring-4"
            />
            <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              A new sequence would be processed by the offline model pipeline before predictions appear here.
              {cleanedCustomSequence && (
                <span className="mt-2 block font-semibold">
                  Cleaned sequence length: {cleanedCustomSequence.length} residues
                </span>
              )}
            </div>
          </div>

          <ProteinRibbon sequence={cleanedCustomSequence || "MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDL"} />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setMode("choice")}
          className="w-fit rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-100 transition hover:bg-slate-100"
        >
          Back to options
        </button>
        <div className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Selected protein: <span className="font-mono">{example.id}</span>
        </div>
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[340px_1fr]">
        <aside className="self-start rounded-3xl border bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Precomputed proteins</p>
          <div className="mt-3 grid gap-2">
            {predictionExamples.map((item, index) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setExampleIndex(index)}
                className={`rounded-2xl px-4 py-3 text-left text-sm transition ${
                  exampleIndex === index
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="block font-mono font-bold">{item.id}</span>
                <span className="text-xs opacity-80">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">Initial state</p>
            <div className="grid gap-2">
              {example.before.map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-3">
          <ProteinRibbon sequence={example.sequence} />

          <div className="rounded-3xl border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">After prediction</p>
                <h3 className="text-lg font-semibold text-slate-900">Predicted GO annotation</h3>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">interpretable output</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {aspectData.map((aspect) => (
                <AspectPredictionCard key={aspect.key} aspect={aspect} terms={example.prediction[aspect.key]} />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Text prediction</p>
            <p className="mt-2 text-base leading-7 text-slate-700">{textPrediction}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CorpusProteinCard({ protein }: { protein: CorpusProteinExample }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-lg font-bold text-slate-900">{protein.id}</p>
          <p className="text-sm text-slate-500">{protein.length} amino acids · {protein.annotation_count} known annotations</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">corpus</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {aspectData.map((aspect) => (
          <div key={aspect.key} className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{aspect.short}</p>
            <div className="mt-2 space-y-1">
              {protein.known_terms[aspect.key].slice(0, 3).map((term) => (
                <p key={term.term} className="text-xs leading-5 text-slate-700">
                  <span className="font-mono text-slate-400">{term.term}</span> {term.name}
                </p>
              ))}
              {protein.known_terms[aspect.key].length === 0 && <p className="text-xs text-slate-400">No terms shown</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExplorePanel() {
  const [query, setQuery] = useState("");
  const [goAspect, setGoAspect] = useState<GoAspectKey>("molecular_function");
  const [frequencyMode, setFrequencyMode] = useState<FrequencyMode>("most");
  const [locationIndex, setLocationIndex] = useState(0);

  const terms = frequencyMode === "most" ? demoData.top_go_terms[goAspect] : demoData.rare_examples[goAspect];
  const filteredTerms = terms.filter((term) =>
    `${term.term} ${term.name}`.toLowerCase().includes(query.toLowerCase())
  );
  const selectedLocation = demoData.cellular_location_aa_stats[locationIndex] ?? demoData.cellular_location_aa_stats[0];
  const maxAa = demoData.amino_acids[0]?.percent ?? 1;

  return (
    <section className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Training proteins" value={formatNumber(demoData.summary.training_proteins)} note="supervised split" />
        <StatCard label="Test proteins" value={formatNumber(demoData.summary.test_proteins)} note="CAFA target set" />
        <StatCard label="GO annotation rows" value={formatNumber(demoData.summary.training_annotation_rows)} note="protein-function pairs" />
        <StatCard label="Unique GO terms" value={formatNumber(demoData.summary.unique_go_terms)} note="sparse label space" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Corpus amino-acid statistics</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">Most frequent amino acids</h3>
          <div className="mt-5 space-y-3">
            {demoData.amino_acids.slice(0, 10).map((item) => (
              <div key={item.aa} className="grid grid-cols-[32px_1fr_60px] items-center gap-3 text-sm">
                <span className="font-mono font-bold text-slate-800">{item.aa}</span>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: `${(item.percent / maxAa) * 100}%` }} />
                </div>
                <span className="text-right font-mono text-xs text-slate-500">{item.percent.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Function → proteins</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">Search GO functions in the corpus</h3>
          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_190px_140px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search GO term or name..."
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none ring-indigo-200 transition focus:ring-4"
            />
            <select
              value={goAspect}
              onChange={(event) => setGoAspect(event.target.value as GoAspectKey)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            >
              <option value="molecular_function">Molecular Function</option>
              <option value="biological_process">Biological Process</option>
              <option value="cellular_component">Cellular Component</option>
            </select>
            <select
              value={frequencyMode}
              onChange={(event) => setFrequencyMode(event.target.value as FrequencyMode)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            >
              <option value="most">Most frequent</option>
              <option value="rare">Rare terms</option>
            </select>
          </div>
          <div className="mt-4 max-h-80 space-y-2 overflow-auto pr-1">
            {filteredTerms.slice(0, 8).map((term) => {
              const match = demoData.function_to_proteins.find((item) => item.term === term.term);
              return (
                <div key={term.term} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{term.name}</p>
                      <p className="font-mono text-xs text-slate-400">{term.term} · {goAspectLabels[goAspect]}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-100">
                      {formatNumber(term.count)} proteins
                    </span>
                  </div>
                  {match && (
                    <p className="mt-2 text-xs text-slate-500">
                      Example proteins: {match.sample_proteins.join(", ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Cellular location explorer</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">Amino-acid pattern by location</h3>
          <select
            value={locationIndex}
            onChange={(event) => setLocationIndex(Number(event.target.value))}
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
          >
            {demoData.cellular_location_aa_stats.map((location, index) => (
              <option key={location.term} value={index}>
                {location.name} — {formatNumber(location.proteins)} proteins
              </option>
            ))}
          </select>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Proteins</p>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(selectedLocation.proteins)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Median length</p>
              <p className="text-2xl font-bold text-slate-900">{selectedLocation.median_length}</p>
            </div>
            <div className="rounded-2xl bg-indigo-50 p-4">
              <p className="text-xs text-indigo-700/70">Most common amino acid</p>
              <p className="text-2xl font-bold text-indigo-700">{selectedLocation.most_common_aa}</p>
            </div>
            <div className="rounded-2xl bg-indigo-50 p-4">
              <p className="text-xs text-indigo-700/70">Frequency</p>
              <p className="text-2xl font-bold text-indigo-700">{selectedLocation.aa_percent.toFixed(2)}%</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">Example proteins: {selectedLocation.sample_proteins.join(", ")}</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Database examples</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Proteins already annotated in the corpus</h3>
          </div>
          {demoData.protein_examples.slice(0, 2).map((protein) => (
            <CorpusProteinCard key={protein.id} protein={protein} />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Taxonomic composition</p>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {demoData.top_taxa.slice(0, 5).map((taxon) => (
            <div key={taxon.taxon} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-900">{taxon.species}</p>
              <p className="mt-1 font-mono text-xs text-slate-400">taxon {taxon.taxon}</p>
              <p className="mt-2 text-lg font-bold text-slate-800">{formatNumber(taxon.count)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResultsPanel() {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Best completed submission</p>
        <h3 className="mt-2 text-4xl font-bold text-slate-900">GO-ESM-MLP</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          ESM2 protein embeddings with three aspect-specific MLP heads for BP, MF and CC.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-indigo-50 p-4">
            <p className="text-2xl font-bold text-indigo-700">0.116</p>
            <p className="text-xs text-indigo-700/70">public score</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-2xl font-bold text-slate-800">1795</p>
            <p className="text-xs text-slate-500">public rank</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-2xl font-bold text-slate-800">15</p>
            <p className="text-xs text-slate-500">submissions</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Conclusion</p>
        <h3 className="mt-2 text-xl font-bold text-slate-900">The largest gain came from better sequence representation.</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          The CNN baseline validated the workflow, but ESM2 embeddings gave the strongest completed system. kNN and FAISS were explored as hybrid extensions, but they did not improve over GO-ESM-MLP in the reported submissions.
        </p>
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Limitation: sequence-only prediction is especially difficult for Biological Process, where pathway context and interaction evidence may be needed.
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-6 shadow-sm lg:col-span-2">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Validation-tuned thresholds</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">Biological Process</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">0.16</p>
            <p className="mt-1 text-xs text-emerald-700/70">lower threshold for broad, heterogeneous labels</p>
          </div>
          <div className="rounded-2xl bg-indigo-50 p-4">
            <p className="text-sm font-semibold text-indigo-800">Molecular Function</p>
            <p className="mt-2 text-3xl font-bold text-indigo-700">0.51</p>
            <p className="mt-1 text-xs text-indigo-700/70">stricter threshold for sequence-linked functions</p>
          </div>
          <div className="rounded-2xl bg-orange-50 p-4">
            <p className="text-sm font-semibold text-orange-800">Cellular Component</p>
            <p className="mt-2 text-3xl font-bold text-orange-700">0.29</p>
            <p className="mt-1 text-xs text-orange-700/70">intermediate threshold for localization terms</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CafaThesisDemo() {
  const [view, setView] = useState<View>("home");

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="space-y-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
                CAFA 6 Protein Function Prediction
              </h1>
            </div>
          </div>
          <VariantOverview />
        </header>

        <nav className="flex flex-wrap gap-2 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
          {[
            ["home", "Start"],
            ["classify", "Classify a protein"],
            ["explore", "Explore dataset"],
            ["results", "Results"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key as View)}
              className={`rounded-2xl px-5 py-2 text-sm font-semibold transition ${
                view === key ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {view === "home" && <HomePanel setView={setView} />}
        {view === "classify" && <ClassifyPanel />}
        {view === "explore" && <ExplorePanel />}
        {view === "results" && <ResultsPanel />}
      </div>
    </main>
  );
}
