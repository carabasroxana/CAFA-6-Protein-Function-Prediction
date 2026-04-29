import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Sparkles,
  Dna,
  ChevronRight,
  RotateCcw,
  Wand2,
  Info,
  ArrowRight,
  Clock3,
  GitBranch,
  ScanSearch,
} from "lucide-react";

const EXAMPLES = {
  kinase: {
    id: "P12931-like",
    name: "Kinase-like protein",
    sequence: "MKTAYIAKQRQISFVKSHFSRQDILDLWQ...VVVGKDVLNIRHQLA",
    raw: {
      MF: [
        { term: "ATP binding", score: 0.87, status: "keep" },
        { term: "protein kinase activity", score: 0.73, status: "keep" },
      ],
      BP: [
        { term: "protein phosphorylation", score: 0.81, status: "keep" },
        { term: "signal transduction", score: 0.62, status: "keep" },
      ],
      CC: [
        { term: "membrane", score: 0.76, status: "keep" },
        { term: "cytoplasm", score: 0.41, status: "drop" },
      ],
    },
    refined: {
      MF: [
        { term: "ATP binding", score: 0.87, badge: "retained" },
        { term: "protein kinase activity", score: 0.73, badge: "retained" },
      ],
      BP: [
        { term: "protein phosphorylation", score: 0.81, badge: "retained" },
        { term: "signaling process", score: 0.66, badge: "added ancestor" },
      ],
      CC: [
        { term: "membrane", score: 0.76, badge: "retained" },
        { term: "cellular anatomical entity", score: 0.58, badge: "added ancestor" },
      ],
      removed: ["cytoplasm (low confidence)"],
      hierarchy: {
        title: "GO hierarchy refinement",
        chain: [
          "protein phosphorylation",
          "signaling process",
          "biological process",
        ],
      },
      summary:
        "Likely involved in ATP-dependent kinase activity, participates in phosphorylation-related signaling, and is associated with membrane-related cellular localization.",
    },
  },
  binding: {
    id: "Q8ZIN0-like",
    name: "Binding / transport protein",
    sequence: "MNKLLTALALATATGSASAQAAPVVAVD...GFGGTSVNVLAPALA",
    raw: {
      MF: [
        { term: "metal ion binding", score: 0.79, status: "keep" },
        { term: "transporter activity", score: 0.58, status: "keep" },
      ],
      BP: [
        { term: "ion transport", score: 0.75, status: "keep" },
        { term: "cellular response to stress", score: 0.37, status: "drop" },
      ],
      CC: [
        { term: "membrane", score: 0.82, status: "keep" },
        { term: "periplasmic space", score: 0.55, status: "keep" },
      ],
    },
    refined: {
      MF: [
        { term: "metal ion binding", score: 0.79, badge: "retained" },
        { term: "transporter activity", score: 0.58, badge: "retained" },
      ],
      BP: [
        { term: "ion transport", score: 0.75, badge: "retained" },
        { term: "transport", score: 0.61, badge: "added ancestor" },
      ],
      CC: [
        { term: "membrane", score: 0.82, badge: "retained" },
        { term: "periplasmic space", score: 0.55, badge: "retained" },
      ],
      removed: ["cellular response to stress (low confidence)"],
      hierarchy: {
        title: "GO hierarchy refinement",
        chain: ["ion transport", "transport", "biological process"],
      },
      summary:
        "Likely binds metal ions, supports transport-related activity, and is associated with membrane-localized cellular organization.",
    },
  },
};

const aspectMeta = {
  MF: {
    label: "Molecular Function",
    chip: "bg-sky-100 text-sky-700 border-sky-200",
    bar: "bg-sky-500",
    soft: "bg-sky-50 border-sky-100",
    tint: "from-sky-500/10 to-sky-100/80",
  },
  BP: {
    label: "Biological Process",
    chip: "bg-emerald-100 text-emerald-700 border-emerald-200",
    bar: "bg-emerald-500",
    soft: "bg-emerald-50 border-emerald-100",
    tint: "from-emerald-500/10 to-emerald-100/80",
  },
  CC: {
    label: "Cellular Component",
    chip: "bg-amber-100 text-amber-700 border-amber-200",
    bar: "bg-amber-500",
    soft: "bg-amber-50 border-amber-100",
    tint: "from-amber-500/10 to-amber-100/80",
  },
};

function ProgressBar({ value, barClass }: { value: number; barClass: string }) {
  return (
    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${barClass}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ duration: 0.7 }}
      />
    </div>
  );
}

function StepPill({ active, done, children }: { active?: boolean; done?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={[
        "px-3 py-1.5 rounded-full border text-sm flex items-center gap-2 transition-all",
        done
          ? "bg-slate-900 text-white border-slate-900"
          : active
            ? "bg-white text-slate-900 border-slate-300 shadow-sm"
            : "bg-slate-50 text-slate-500 border-slate-200",
      ].join(" ")}
    >
      {done ? <Check className="w-4 h-4" /> : <span className="w-2 h-2 rounded-full bg-current opacity-70" />}
      {children}
    </div>
  );
}

function ScoreRow({ row, barClass, variant = "raw" }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-white border border-slate-200 p-3"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-sm font-medium text-slate-800 leading-snug">{row.term}</div>
        {variant === "refined" ? (
          <span
            className={[
              "text-[11px] px-2 py-1 rounded-full border whitespace-nowrap",
              row.badge === "added ancestor"
                ? "bg-violet-50 text-violet-700 border-violet-200"
                : "bg-slate-50 text-slate-600 border-slate-200",
            ].join(" ")}
          >
            {row.badge}
          </span>
        ) : row.status === "drop" ? (
          <span className="text-[11px] px-2 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-200 whitespace-nowrap">
            low confidence
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <ProgressBar value={row.score} barClass={barClass} />
        <div className="text-sm tabular-nums text-slate-600 w-11 text-right">{row.score.toFixed(2)}</div>
      </div>
    </motion.div>
  );
}

function AspectCard({ title, rows, variant = "raw" }: any) {
  const meta = aspectMeta[title as keyof typeof aspectMeta];
  return (
    <div className={`rounded-2xl border ${meta.soft} p-4 bg-gradient-to-br ${meta.tint}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
          <div className="font-semibold text-slate-900">{meta.label}</div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full border ${meta.chip}`}>{title}</span>
      </div>
      <div className="space-y-3">
        {rows.map((row: any, idx: number) => (
          <motion.div key={`${title}-${row.term}-${variant}`} transition={{ delay: idx * 0.06 }}>
            <ScoreRow row={row} barClass={meta.bar} variant={variant} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MiniLoading({ label }: { label: string }) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 min-h-[520px] flex items-center justify-center">
      <div className="w-full max-w-xl text-center">
        <motion.div
          className="mx-auto w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center mb-5"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 1.3 }}
        >
          <ScanSearch className="w-7 h-7" />
        </motion.div>
        <div className="text-2xl font-semibold mb-2">{label}</div>
        <div className="text-slate-600 mb-6">Using precomputed outputs for a smooth defense demo.</div>
        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-slate-900"
            initial={{ x: "-100%" }}
            animate={{ x: "220%" }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            style={{ width: "35%" }}
          />
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Clock3 className="w-4 h-4" />
          <span>~1 second stage transition</span>
        </div>
      </div>
    </div>
  );
}

function HierarchyMiniGraph({ chain }: { chain: string[] }) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-violet-900 mb-3">
        <GitBranch className="w-4 h-4" />
        Mini GO hierarchy view
      </div>
      <div className="flex flex-col gap-3">
        {chain.map((label, index) => {
          const isPrimary = index === 0;
          const isAdded = index > 0 && index < chain.length;
          return (
            <div key={label} className="flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.15 }}
                className={[
                  "rounded-2xl px-4 py-2.5 text-sm border text-center w-full max-w-xs",
                  isPrimary
                    ? "bg-white text-slate-900 border-slate-200"
                    : "bg-violet-100 text-violet-900 border-violet-200",
                ].join(" ")}
              >
                <div className="font-medium">{label}</div>
                {!isPrimary && <div className="text-[11px] mt-1 opacity-80">ancestor added for consistency</div>}
              </motion.div>
              {index < chain.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 24 }}
                  transition={{ delay: index * 0.15 + 0.1 }}
                  className="w-px bg-violet-300 my-1"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SideBySideComparison({ example }: any) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-slate-500">Before</div>
            <div className="text-lg font-semibold">Raw predictions</div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full border bg-white border-slate-200 text-slate-600">model output</span>
        </div>
        <div className="space-y-4">
          <AspectCard title="MF" rows={example.raw.MF} />
          <AspectCard title="BP" rows={example.raw.BP} />
          <AspectCard title="CC" rows={example.raw.CC} />
        </div>
      </div>

      <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-violet-700">After</div>
            <div className="text-lg font-semibold">Hierarchy-aware refinement</div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full border bg-white border-violet-200 text-violet-700">cleaned output</span>
        </div>
        <div className="space-y-4">
          <AspectCard title="MF" rows={example.refined.MF} variant="refined" />
          <AspectCard title="BP" rows={example.refined.BP} variant="refined" />
          <AspectCard title="CC" rows={example.refined.CC} variant="refined" />
        </div>
      </div>
    </div>
  );
}

export default function ProteinFunctionDemoApp() {
  const [exampleKey, setExampleKey] = useState<keyof typeof EXAMPLES>("kinase");
  const [phase, setPhase] = useState<"idle" | "predicting" | "raw" | "refining" | "refined">("idle");

  const example = useMemo(() => EXAMPLES[exampleKey], [exampleKey]);

  useEffect(() => {
    if (phase === "predicting") {
      const timer = window.setTimeout(() => setPhase("raw"), 1100);
      return () => window.clearTimeout(timer);
    }
    if (phase === "refining") {
      const timer = window.setTimeout(() => setPhase("refined"), 1100);
      return () => window.clearTimeout(timer);
    }
  }, [phase]);

  const predict = () => setPhase("predicting");
  const refine = () => {
    if (phase === "raw" || phase === "refined") setPhase("refining");
  };
  const reset = () => setPhase("idle");

  const stepIndex = phase === "idle" || phase === "predicting" ? 0 : phase === "raw" || phase === "refining" ? 1 : 2;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff,rgba(241,245,249,0.95),#e2e8f0)] p-6 md:p-8 text-slate-900">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 backdrop-blur border border-slate-200 text-sm text-slate-600 mb-4">
            <Sparkles className="w-4 h-4" />
            Thesis mini-demo · polished mock interface · optimized for a 60–90 second defense
          </div>
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Protein Function Predictor</h1>
              <p className="text-slate-600 mt-2 max-w-3xl leading-7">
                Sequence in, raw GO scores out, then thresholding and ontology-aware refinement to obtain a cleaner and more interpretable final prediction.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StepPill active={stepIndex === 0}>Input</StepPill>
              <StepPill active={stepIndex === 1} done={stepIndex > 1}>Raw predictions</StepPill>
              <StepPill active={stepIndex === 2}>Refined output</StepPill>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.02fr_1.98fr] gap-6">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-[28px] bg-white/90 backdrop-blur border border-slate-200 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.25)] p-5 md:p-6 h-fit"
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="text-sm text-slate-500 mb-1">Input protein</div>
                <div className="text-xl font-semibold">{example.name}</div>
                <div className="text-sm text-slate-500">ID: {example.id}</div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-lg shadow-slate-200">
                <Dna className="w-5 h-5" />
              </div>
            </div>

            <div className="mb-5">
              <div className="text-sm font-medium mb-2">Choose example</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(EXAMPLES).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setExampleKey(key as keyof typeof EXAMPLES);
                      setPhase("idle");
                    }}
                    className={[
                      "text-left rounded-2xl border px-4 py-3 transition-all",
                      exampleKey === key
                        ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200"
                        : "bg-slate-50 hover:bg-white border-slate-200 text-slate-800",
                    ].join(" ")}
                  >
                    <div className="font-medium">{value.name}</div>
                    <div className={exampleKey === key ? "text-slate-300 text-sm" : "text-slate-500 text-sm"}>{value.id}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-5">
              <div className="text-sm font-medium mb-2">Amino-acid sequence</div>
              <div className="font-mono text-sm leading-7 break-all text-slate-700">{example.sequence}</div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(aspectMeta).map(([key, meta]) => (
                <span key={key} className={`text-xs px-3 py-1.5 rounded-full border ${meta.chip}`}>
                  {key}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={predict}
                disabled={phase === "predicting" || phase === "refining"}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-3 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Predict
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={refine}
                disabled={phase !== "raw" && phase !== "refined"}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                <Wand2 className="w-4 h-4" />
                Refine with GO hierarchy
              </button>

              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  Defense flow: click <span className="font-semibold">Predict</span>, pause on the raw split view, then click <span className="font-semibold">Refine with GO hierarchy</span> and finish on the summary plus mini hierarchy graph.
                </p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {phase === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-[28px] bg-white/90 backdrop-blur border border-dashed border-slate-300 shadow-sm p-8 min-h-[520px] flex items-center justify-center"
                >
                  <div className="text-center max-w-xl">
                    <div className="mx-auto w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center mb-4 shadow-lg shadow-slate-200">
                      <Dna className="w-7 h-7" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">Ready for prediction</h2>
                    <p className="text-slate-600 leading-7">
                      This app is intentionally small and visual: one protein, one click for raw GO terms, one click for ontology-aware refinement, then a final natural-language summary.
                    </p>
                  </div>
                </motion.div>
              )}

              {phase === "predicting" && <MiniLoading key="predicting" label="Generating raw GO scores" />}

              {phase === "raw" && (
                <motion.div key="raw" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="rounded-[28px] bg-white/90 backdrop-blur border border-slate-200 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.25)] p-5 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                      <div>
                        <div className="text-sm text-slate-500">Stage 1</div>
                        <h2 className="text-2xl font-semibold">Raw model output</h2>
                      </div>
                      <div className="text-sm text-slate-500 flex items-center gap-2">
                        sequence <ArrowRight className="w-4 h-4" /> raw scores for MF / BP / CC
                      </div>
                    </div>
                    <SideBySideComparison example={{ ...example, refined: { MF: [], BP: [], CC: [] } }} />
                  </div>
                </motion.div>
              )}

              {phase === "refining" && <MiniLoading key="refining" label="Applying GO hierarchy refinement" />}

              {phase === "refined" && (
                <motion.div key="refined" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <div className="rounded-[28px] bg-white/90 backdrop-blur border border-slate-200 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.25)] p-5 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                      <div>
                        <div className="text-sm text-slate-500">Before vs after</div>
                        <h2 className="text-2xl font-semibold">Split-screen comparison</h2>
                      </div>
                      <div className="text-sm text-slate-500">weak terms removed · ancestors added · final output clarified</div>
                    </div>
                    <SideBySideComparison example={example} />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1.35fr] gap-6">
                    <HierarchyMiniGraph chain={example.refined.hierarchy.chain} />

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                        <div className="text-sm font-semibold text-rose-800 mb-2">Filtered out</div>
                        <div className="space-y-2">
                          {example.refined.removed.map((item) => (
                            <div key={item} className="text-sm text-rose-900 line-through decoration-rose-400">
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                        <div className="text-sm font-semibold text-violet-800 mb-2">Natural-language summary</div>
                        <div className="text-lg leading-8 text-violet-950">{example.refined.summary}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
