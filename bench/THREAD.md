# X Thread — LongMemEval Results

## Post 1/3 — The result

After the pi+napkin+HotpotQA post, people asked me to run more benchmarks on napkin and agentic search.

So I ran LongMemEval, the hardest long term conversational memory benchmark I could find up until yesterday (mem0 released BEAM and i will be looking into that as well).
LongMemEval is 500 questions across five abilities: information extraction, multisession reasoning, knowledge updates, temporal reasoning, and abstention.

Same setup, BM25, TF-IDF keyword overview, markdown files, no embeddings.

[image: benchmark chart]

---

## Post 2/3 — What the numbers actually mean (and don't)

Most companies don't disclose how they measure. They pick a benchmark, pick a split, report the best number.

LongMemEval comes in three flavors:

Oracle: 1-6 sessions in memory, ~5k tokens (everyone scores 90%+ for this one)
S: ~40 sessions in memory, ~115k tokens (paper's results are 64% with context stuffing)
S: ~500 sessions in memory, ~1.5M tokens (can't context-stuff, must retrieve. paper's best here is 72%)

The harder the retrieval, the bigger our gap over prior work. Oracle is basically a tie. S is +5 points. M is +11 points.

Some honest disclaimers:
- I ran a smaple of 250 questions on Oracle, and 100 on S and M.
- I didn't cherry pick questions, but i did iterate on the prompt and agent behavior based on failures i found during development. 
- I benchmaxxed the hell out of it, after 4 hours of tuning, I squeezed these numbers out.

Every benchmark paper does this, but it seems to me like its not clear to people looking at benchmark images.

---

## Post 3/3 — Why evals don't transfer (and what actually matters)

Evals show what you can squeeze out of a system under ideal conditions, single prompt, clean input. no conversation history competing for attention.

Real work is messy:

- existing tokens in the chat skew the LLM's behavior
- you're in a multi-turn conversation, not a single prompt
- the user's context drifts, the agent's attention drifts with it
- evals are expensive, most companies don't eval on multi-turn interactions at all

The real gains are in harness engineering. Anything that optimizes the "mechanism" the LLM lives under:

- Better steering (seeding a behavior in system message, than inject system reminders)
- Context offloading (remove irrelevant things from context, and let agent revisit if it needs it)
- Good idiomatic tool design (search that returns snippets, not just filenames)

That matters more than any eval can tell you.

---

## Post 4/3 — How it works + open source

Three things make this work:

TF-IDF terrain map:

Before the agent asks anything, `napkin overview` is injected into context. Each folder gets keywords extracted with weighted TF-IDF. The model sees the shape of the knowledge before it searches.

BM25 search with snippets:

`napkin search` returns ranked results with matching lines highlighted. The model doesn't just get filenames, it sees "why" each result matched. It can decide to read the full note or search again with different terms. Fuzzy matching, prefix matching. Backlink count and recency as boosters.

Wikilinks as edges

Every `[[link]]` in a note is a navigable connection. When the model reads a note about Scott Derrickson and sees `[[Doctor Strange (2016 film)]]`, it can follow that link. Multi-hop retrieval becomes: search, read, follow link, read again. no graph database. just double bracket syntax in markdown.

The agent does the rest. It decides what to search, what to read, when to follow links, and when it has enough to answer.

Everything is open source:

```
npx tsx bench/longmemeval-eval.ts --dataset s --n 100
npx tsx bench/hotpotqa-eval.ts --n 250 --seed 42
```

Same datasets. Same questions. Full JSONL logs - every answer, every tool call, every score.

github.com/nicepkg/napkin