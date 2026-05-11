"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";

type AspectKey = "bp" | "mf" | "cc";

type Aspect = {
  key: AspectKey;
  label: string;
  short: string;
  icon: string;
  question: string;
  color: string;
};

type GoTerm = {
  term: string;
  name: string;
  score: number;
};

type Example = {
  id: string;
  label: string;
  sequence: string;
  before: string[];
  prediction: Record<AspectKey, GoTerm[]>;
};

type ModelVariant = {
  title: string;
  tag: string;
  description: string;
};

const aspectData: Aspect[] = [
  {
    key: "bp",
    label: "Biological Process",
    short: "BP",
    icon: "🌱",
    question: "Which biological program?",
    color: "from-emerald-500 to-teal-500",
  },
  {
    key: "mf",
    label: "Molecular Function",
    short: "MF",
    icon: "⚙️",
    question: "What does the protein do?",
    color: "from-indigo-500 to-violet-500",
  },
  {
    key: "cc",
    label: "Cellular Component",
    short: "CC",
    icon: "📍",
    question: "Where does it act?",
    color: "from-orange-500 to-rose-500",
  },
];

const modelVariants: ModelVariant[] = [
  {
    title: "CNN baseline",
    tag: "Variant 1",
    description:
      "A sequence-only baseline that tokenizes amino acids and learns GO scores with a convolutional neural network.",
  },
  {
    title: "GO-ESM-MLP",
    tag: "Variant 2",
    description:
      "The strongest completed system: ESM2 embeddings are passed to three aspect-specific MLP heads for BP, MF and CC.",
  },
  {
    title: "MLP + kNN",
    tag: "Variant 3",
    description:
      "Adds nearest-neighbor smoothing in embedding space, so predictions can use evidence from similar annotated proteins.",
  },
  {
    title: "FAISS hybrid",
    tag: "Variant 4",
    description:
      "Scales the retrieval idea with FAISS, seed ensembling, calibrated blending and output control.",
  },
];

const examples: Example[] = [
  {
    id: "A0A087X1C5",
    label: "Dataset-style example: binding + localization",
    sequence:
      "MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGPDEAPRMPEAAPPVAPAPAAPTPAAPAPAPSWPLSSSVPSQKTYQGSYGFRLGFLHSGTAKSVTCTYSPALNKMFCQLAKTCPVQLWVDSTPPPGTRVRAMAIYKQSQHMTEVVRRCPHHERCSDSSDGLAPPQHLIRVEGNLRVEYLDDRNTFRHSVVVPYEPPEVGSDCTTIHYNYMCNSSCMGGMNRRPILTIITLEDSDGNLVYQAIHLK",
    before: [
      "Unknown function",
      "Only sequence is available",
      "No readable biological explanation",
    ],
    prediction: {
      mf: [
        { term: "GO:0005515", name: "protein binding", score: 0.86 },
        { term: "GO:0003674", name: "molecular function", score: 0.62 },
      ],
      bp: [
        {
          term: "GO:0006351",
          name: "transcription, DNA-templated",
          score: 0.48,
        },
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
    before: [
      "Raw amino-acid sequence",
      "Function not obvious",
      "Needs GO annotation",
    ],
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
      mf: [
        {
          term: "GO:0005198",
          name: "structural molecule activity",
          score: 0.52,
        },
      ],
      bp: [{ term: "GO:0006950", name: "response to stress", score: 0.39 }],
      cc: [
        { term: "GO:0016020", name: "membrane", score: 0.74 },
        { term: "GO:0005886", name: "plasma membrane", score: 0.69 },
        { term: "GO:0005615", name: "extracellular space", score: 0.56 },
      ],
    },
  },
];

function scoreWidth(score: number): string {
  return `${Math.round(score * 100)}%`;
}

function ProteinRibbon({ sequence }: { sequence: string }) {
  const residues = sequence.slice(0, 96).split("");
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Before
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            Raw protein sequence
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {sequence.length} residues
        </span>
      </div>
      <div className="grid grid-cols-16 gap-1 font-mono text-[11px] leading-6">
        {residues.map((r, i) => (
          <motion.span
            key={`${r}-${i}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.004 }}
            className="rounded-md bg-slate-50 text-center text-slate-700 ring-1 ring-slate-100"
          >
            {r}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function AspectPredictionCard({
  aspect,
  terms,
}: {
  aspect: Aspect;
  terms: GoTerm[];
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`rounded-2xl bg-gradient-to-br ${aspect.color} px-3 py-2 text-lg text-white shadow-sm`}
        >
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
              <span className="font-mono text-slate-500">
                {term.score.toFixed(2)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: scoreWidth(term.score) }}
                transition={{ duration: 0.55 }}
                className={`h-full rounded-full bg-gradient-to-r ${aspect.color}`}
              />
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-400">
              {term.term}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VariantOverview() {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {modelVariants.map((variant, index) => (
        <motion.div
          key={variant.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
          className={`rounded-3xl border p-4 shadow-sm ${variant.title === "GO-ESM-MLP" ? "border-indigo-200 bg-indigo-50" : "border-slate-100 bg-white"}`}
        >
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${variant.title === "GO-ESM-MLP" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {variant.tag}
          </span>
          <h3 className="mt-3 font-bold text-slate-900">{variant.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {variant.description}
          </p>
        </motion.div>
      ))}
    </section>
  );
}

function BeforeAfter({ example }: { example: Example }) {
  const textPrediction = useMemo(() => {
    const mf = example.prediction.mf[0]?.name;
    const bp = example.prediction.bp[0]?.name;
    const cc = example.prediction.cc
      .slice(0, 3)
      .map((x) => x.name)
      .join(", ");
    return `This protein is predicted to have ${mf} molecular function${bp ? `, may participate in ${bp}` : ""}, and may be localized to ${cc}.`;
  }, [example]);

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_80px_1.2fr]">
      <div className="space-y-4">
        <ProteinRibbon sequence={example.sequence} />
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-slate-400">
            Initial state
          </p>
          <div className="space-y-2">
            {example.before.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden place-items-center lg:grid">
        <motion.div
          animate={{ x: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="grid h-14 w-14 place-items-center rounded-full bg-indigo-600 text-2xl text-white shadow-lg"
        >
          →
        </motion.div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                After
              </p>
              <h3 className="text-lg font-semibold text-slate-900">
                Predicted GO annotation
              </h3>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              interpretable output
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {aspectData.map((aspect) => (
              <AspectPredictionCard
                key={aspect.key}
                aspect={aspect}
                terms={example.prediction[aspect.key]}
              />
            ))}
          </div>
        </div>
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Text prediction
          </p>
          <p className="mt-2 text-base leading-7 text-slate-700">
            {textPrediction}
          </p>
        </div>
      </div>
    </section>
  );
}

function ResultsPanel() {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
          Best completed submission
        </p>
        <h3 className="mt-2 text-4xl font-bold text-slate-900">GO-ESM-MLP</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          ESM2 protein embeddings with three aspect-specific MLP heads for BP,
          MF and CC.
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
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
          Conclusion
        </p>
        <h3 className="mt-2 text-xl font-bold text-slate-900">
          The largest gain came from better sequence representation.
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          The CNN baseline validated the workflow, but ESM2 embeddings gave the
          strongest completed system. kNN and FAISS were explored as hybrid
          extensions, but they did not improve over GO-ESM-MLP in the reported
          submissions.
        </p>
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Limitation: sequence-only prediction is especially difficult for
          Biological Process, where pathway context and interaction evidence may
          be needed.
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-6 shadow-sm lg:col-span-2">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
          Validation-tuned thresholds
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">
              Biological Process
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">0.16</p>
            <p className="mt-1 text-xs text-emerald-700/70">
              lower threshold for broad, heterogeneous labels
            </p>
          </div>
          <div className="rounded-2xl bg-indigo-50 p-4">
            <p className="text-sm font-semibold text-indigo-800">
              Molecular Function
            </p>
            <p className="mt-2 text-3xl font-bold text-indigo-700">0.51</p>
            <p className="mt-1 text-xs text-indigo-700/70">
              stricter threshold for sequence-linked functions
            </p>
          </div>
          <div className="rounded-2xl bg-orange-50 p-4">
            <p className="text-sm font-semibold text-orange-800">
              Cellular Component
            </p>
            <p className="mt-2 text-3xl font-bold text-orange-700">0.29</p>
            <p className="mt-1 text-xs text-orange-700/70">
              intermediate threshold for localization terms
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CafaThesisDemo() {
  const [view, setView] = useState<"demo" | "results">("demo");
  const [exampleIndex, setExampleIndex] = useState(0);
  const example = examples[exampleIndex] ?? examples[0];


  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="space-y-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
              CAFA 6 Protein Function Prediction
            </h1>
          </div>
          <VariantOverview />
        </header>

        <nav className="flex gap-2 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
          <button
            onClick={() => setView("demo")}
            className={`rounded-2xl px-5 py-2 text-sm font-semibold transition ${view === "demo" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Demo
          </button>
          <button
            onClick={() => setView("results")}
            className={`rounded-2xl px-5 py-2 text-sm font-semibold transition ${view === "results" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Results
          </button>
        </nav>

        {view === "demo" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
              {examples.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => setExampleIndex(i)}
                  className={`rounded-2xl px-4 py-3 text-left text-sm transition ${exampleIndex === i ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                >
                  <span className="block font-mono font-bold">{item.id}</span>
                  <span className="text-xs opacity-80">{item.label}</span>
                </button>
              ))}
            </div>
            <BeforeAfter example={example} />
          </div>
        )}

        {view === "results" && <ResultsPanel />}
      </div>
    </main>
  );
}
