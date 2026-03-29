# LongMemEval Benchmark

Agentic memory evaluation using napkin + pi CLI. Tests the ability of an AI agent to retrieve and reason over long user-assistant chat histories stored as napkin vault notes.

Paper: [Wu et al., LongMemEval (ICLR 2025)](https://arxiv.org/abs/2410.10813) — 500 questions across 5 memory abilities.

## Results (Sonnet, n=100)

| Dataset | Sessions/question | Accuracy | vs SOTA |
|---------|:-----------------:|:--------:|:-------:|
| Oracle | 1–6 (evidence only) | **92.0%** | ≈ GPT-4o+CoN (92.4%) |
| S | ~40–60 (~115k tokens) | **91.0%** | **+5pp** vs Emergence (86%) |
| M | ~480 (~1.5M tokens) | **83.0%** | **+11pp** vs GPT-4o RAG (72%) |

The harder the retrieval, the bigger the advantage. On M, no model can context-stuff — napkin's search-based retrieval dominates.

## Setup

```bash
# Install deps
bun install

# Download datasets (auto-downloads on first run for oracle/S)
# For M dataset (2.6GB), convert to JSONL first:
cd bench/data
wget https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main/longmemeval_m_cleaned.json
python3 -c "
import json
data = json.load(open('longmemeval_m_cleaned.json'))
with open('longmemeval_m_cleaned.jsonl', 'w') as f:
    for d in data:
        f.write(json.dumps(d) + '\n')
"
# Pre-extract sample for M
python3 -c "
import json, random
random.seed(42)
with open('longmemeval_m_cleaned.jsonl') as f:
    data = [json.loads(l) for l in f]
random.shuffle(data)
json.dump(data[:100], open('longmemeval_m_cleaned_sample100.json', 'w'))
"
```

## Running

```bash
# Oracle dataset (evidence sessions only) — downloads automatically
npx tsx bench/longmemeval-eval.ts

# S dataset (~40 sessions per question)
npx tsx bench/longmemeval-eval.ts --dataset s --n 100

# M dataset (~480 sessions per question) — requires pre-extracted sample
npx tsx bench/longmemeval-eval.ts --dataset m --n 100

# Choose model
npx tsx bench/longmemeval-eval.ts --model "anthropic/claude-sonnet-4-20250514"
npx tsx bench/longmemeval-eval.ts --model "anthropic/claude-haiku-4-5-20251001"

# Specific questions (for debugging)
npx tsx bench/longmemeval-eval.ts --ids "id1,id2,id3" --verbose

# Save full results JSON
npx tsx bench/longmemeval-eval.ts --json
```

## How it works

### Vault structure

Each question's haystack sessions are converted into a napkin vault. Sessions are split into **per-round notes** — one note per user+assistant exchange, grouped by day:

```
.napkin/
  NAPKIN.md               # Overview: N notes across K days
  2023-05-20/
    round-1.md            # User message + assistant response
    round-2.md
    ...
  2023-05-21/
    round-1.md
    ...
```

Each note's mtime is set from the session timestamp so napkin's recency ranking is accurate.

Per-round notes were critical for accuracy (+6pp on S vs full sessions). Smaller notes give better BM25 signal, better per-day keywords in overview, and less noise for the agent to read through.

### Agent workflow

The agent (pi CLI) uses the napkin-context extension which injects the vault overview. It then:
1. Sees per-day keyword clusters in the overview
2. Runs `napkin search` to find relevant rounds
3. Runs `napkin read` to read specific notes
4. Reasons over the extracted facts to answer

### Scoring

LLM-as-judge matching the paper's `evaluate_qa.py` methodology. Type-aware prompts:
- Preference questions: rubric-based
- Abstention: checks for correct refusal
- Temporal: allows off-by-one errors

### Key design decisions

- **Per-round vault** — splits sessions into individual exchanges. Full sessions are 10-15k chars; rounds are 300-2500 chars. Better BM25, better overview keywords.
- **Full assistant response** — critical for questions referencing what the assistant said. User-only vault failed on 7/11 assistant-recall questions.
- **`--system-prompt` not `--append-system-prompt`** — pi injects the real date (2026) which conflicts with question dates (2023). Using `--system-prompt` prevents this and fixed all temporal reasoning failures.
- **Day directories** — per-day TF-IDF keywords let the agent narrow by time period from the overview alone.
- **appendFileSync** — sync writes prevent data loss if killed mid-run.

## Prompt

The agent prompt lives in `bench/longmemeval-prompt.md` and is loaded at runtime. Edit it to experiment with different instructions. The file has two sections separated by `---SPLIT---`: SYSTEM_PROMPT and USER_PROMPT. Variables `{{vault_path}}`, `{{question_date}}`, and `{{question}}` are filled per question.

## Output

Results are saved to `bench/results/`:
- `longmemeval-<dataset>-<timestamp>.jsonl` — one line per question, written incrementally
- `longmemeval-<dataset>-<timestamp>.json` — full results with summary (with `--json`)

Each result includes: `accuracy`, `sessionRecall`, `toolCalls`, `searchCalls`, `readCalls`, `inputTokens`, `outputTokens`, `elapsed`.
