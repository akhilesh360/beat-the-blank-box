"""Blank-box analysis on real data: WildChat-1M (allenai, ODC-BY).

Usage:
  .venv/bin/python scripts/wildchat_analysis.py extract   # raw shard(s) -> data/raw/first_msgs.parquet + label sample
  .venv/bin/python scripts/wildchat_analysis.py analyze   # stats, charts, PII-filtered sample, label report

Raw shards live in data/raw/ (gitignored). Download, e.g.:
  curl -L -o data/raw/train-00000-of-00014.parquet \
    https://huggingface.co/datasets/allenai/WildChat-1M/resolve/main/data/train-00000-of-00014.parquet
"""
import glob, json, re, subprocess, sys
import pandas as pd
import pyarrow.parquet as pq

RAW = "data/raw"
FIRST = f"{RAW}/first_msgs.parquet"
LABEL_SAMPLE = f"{RAW}/label_sample.jsonl"   # full text of the labelled messages (not committed)
LABELS = "data/wildchat_labels.csv"
SEED = 7

# Transparent vagueness rule: fewer than 6 words, or the whole message is a generic opener.
OPENERS = {"hi", "hello", "hey", "help", "help me", "can you help me", "can you help", "could you help me",
           "i need help", "hi there", "hello there", "test", "testing", "what can you do", "who are you",
           "what are you", "are you there", "good morning", "hey there", "yo", "sup", "hola", "start"}

def norm(t):
    return re.sub(r"[^a-z ]+", "", t.lower()).strip()

def is_vague(t):
    return len(t.split()) < 6 or norm(t) in OPENERS

# Conservative PII screen for anything committed: drop the message if it matches.
PII = [r"[\w.+-]+@[\w-]+\.[\w.]+", r"\+?\d[\d\s().-]{7,}\d", r"https?://", r"www\.",
       r"\bmy name is\b", r"\bi am [A-Z][a-z]+\b", r"\bi'm [A-Z][a-z]+\b", r"\bdear [A-Z]",
       r"\b(mr|mrs|ms|dr)\.? [A-Z]", r"\b[A-Z][a-z]+ [A-Z][a-z]+\b", r"\baddress\b", r"\bphone\b",
       r"\bpassword\b", r"\bapi[_ ]?key\b", r"\bsk-\w", r"\bPII\b|\bNAME_\d", r"\d{3,}"]
PII_RE = re.compile("|".join(PII))

def extract():
    rows = []
    for f in sorted(glob.glob(f"{RAW}/train-*.parquet")):
        pf = pq.ParquetFile(f)
        for g in range(pf.num_row_groups):
            t = pf.read_row_group(g, columns=["conversation_hash", "turn", "language", "toxic", "redacted",
                                              "timestamp", "conversation"]).to_pandas()
            t = t[t.language == "English"]
            for r in t.itertuples():
                first = next((m["content"] for m in r.conversation if m["role"] == "user"), "") or ""
                rows.append((r.conversation_hash, r.turn, bool(r.toxic), bool(r.redacted), r.timestamp, first.strip()))
    df = pd.DataFrame(rows, columns=["id", "turns", "toxic", "redacted", "ts", "text"])
    df = df[df.text != ""].drop_duplicates("id")
    df.to_parquet(FIRST)
    pool = df[~df.toxic & ~df.redacted]
    pool.sample(180, random_state=SEED)[["id", "text"]].to_json(LABEL_SAMPLE, orient="records", lines=True)
    print(f"{len(df)} English conversations -> {FIRST}; 180 label candidates -> {LABEL_SAMPLE}")

def analyze():
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    df = pd.read_parquet(FIRST)
    df["words"] = df.text.str.split().str.len()
    df["vague"] = df.text.map(is_vague)
    df["one_turn"] = df.turns == 1
    n = len(df)
    out = {"conversations": n, "period": f"{df.ts.min():%Y-%m-%d} to {df.ts.max():%Y-%m-%d}",
           "median_words": float(df.words.median()),
           "p25_words": float(df.words.quantile(.25)), "p75_words": float(df.words.quantile(.75)),
           "share_vague": round(df.vague.mean(), 4), "share_under_6_words": round((df.words < 6).mean(), 4),
           "share_generic_opener": round(df.text.map(lambda t: norm(t) in OPENERS).mean(), 4),
           "one_turn_rate": round(df.one_turn.mean(), 4),
           "one_turn_rate_vague": round(df[df.vague].one_turn.mean(), 4),
           "one_turn_rate_specific": round(df[~df.vague].one_turn.mean(), 4),
           "n_vague": int(df.vague.sum())}
    # two-proportion z-test, vague vs specific one-turn rate
    a, b = df[df.vague], df[~df.vague]
    p = df.one_turn.mean(); se = (p * (1 - p) * (1 / len(a) + 1 / len(b))) ** .5
    out["z_vague_vs_specific"] = round((a.one_turn.mean() - b.one_turn.mean()) / se, 1)
    bins = [0, 5, 10, 20, 50, 100, 300, 10**9]; lab = ["1-5", "6-10", "11-20", "21-50", "51-100", "101-300", "300+"]
    df["bucket"] = pd.cut(df.words, bins=bins, labels=lab)
    by = df.groupby("bucket", observed=False).agg(n=("id", "size"), one_turn=("one_turn", "mean")).reset_index()
    out["by_length"] = [{"words": r.bucket, "share": round(r.n / n, 4), "one_turn_rate": round(r.one_turn, 4)}
                        for r in by.itertuples()]

    fig, ax = plt.subplots(1, 2, figsize=(11, 4))
    ax[0].bar(lab, by.n / n * 100, color="#4C6EF5"); ax[0].set_title("First message length (words)")
    ax[0].set_ylabel("% of English conversations")
    ax[1].bar(lab, by.one_turn * 100, color="#E8590C"); ax[1].set_title("Conversations that end after 1 turn")
    ax[1].set_ylabel("% one-turn"); ax[1].set_xlabel("first message length (words)"); ax[0].set_xlabel("words")
    for a_ in ax: a_.spines[["top", "right"]].set_visible(False)
    fig.suptitle(f"WildChat-1M, {n:,} English conversations (shard 0)", fontsize=10)
    fig.tight_layout(); fig.savefig("docs/wildchat_first_message.png", dpi=130); plt.close(fig)

    # Small committed sample: non-toxic, non-redacted, PII-screened, short first messages.
    pool = df[~df.toxic & ~df.redacted & (df.words <= 60)]
    pool = pool[~pool.text.map(lambda t: bool(PII_RE.search(t)))]
    samp = pool.sample(min(2000, len(pool)), random_state=SEED)[["id", "turns", "words", "vague", "text"]]
    samp.to_csv("data/wildchat_first_messages_sample.csv", index=False)

    if glob.glob(LABELS):
        lab_df = pd.read_csv(LABELS)
        out["labelled"] = len(lab_df)
        out["role_mix"] = lab_df.role.value_counts().to_dict()
        out["topic_mix"] = (lab_df.topic.value_counts(normalize=True).round(3)).to_dict()
        ev = subprocess.run(["node", "scripts/eval_intent_wildchat.js", "--json"], capture_output=True, text=True)
        out["classifier"] = json.loads(ev.stdout)
        tm = lab_df.topic.value_counts(normalize=True).sort_values() * 100
        fig, ax = plt.subplots(figsize=(7, 4)); ax.barh(tm.index, tm.values, color="#4C6EF5")
        ax.set_xlabel(f"% of {len(lab_df)} hand-labelled first messages"); ax.set_title("What people ask first (WildChat sample)")
        ax.spines[["top", "right"]].set_visible(False); fig.tight_layout(); fig.savefig("docs/wildchat_topics.png", dpi=130)
    json.dump(out, open("data/wildchat_summary.json", "w"), indent=2, default=str)
    print(json.dumps(out, indent=2, default=str))

if __name__ == "__main__":
    {"extract": extract, "analyze": analyze}[sys.argv[1]]()
