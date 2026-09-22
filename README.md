# K-Pop Korean Lyrics Practice

A small browser app for practicing Korean using K-pop-style lyrics.

## What it does

- **Lyrics view** — paste any Korean lyrics (or load a built-in example) and get:
  - automatic Hangul → romanization (syllable-based, Revised-Romanization-style)
  - click any word for its meaning, using a curated learner's dictionary of vocabulary common in K-pop lyrics (love, night, stars, dancing, longing, etc.)
  - unknown words can be defined on the spot — your definition is saved for next time
- **Flashcards** — save words while reading lyrics, then review them with a simple spaced-repetition (Leitner-style) loop: cards you know move further out, cards you miss come back sooner.
- **Quiz** — fill-in-the-blank drills generated from either your pasted lyrics or the built-in examples.

Everything runs client-side and persists in your browser's `localStorage` (your custom dictionary entries, flashcard deck, and last-pasted lyrics) — no backend, no accounts, no data leaves your browser.

## Why no real song lyrics are bundled

K-pop lyrics are copyrighted, so this app doesn't ship any. Instead, paste lyrics you already have (from a booklet, a lyrics site, etc.) into the Lyrics tab and the app will romanize and gloss them for you. Two short *original* practice verses (written for this app, not from any real song) are included so there's something to try immediately.

## Running it

No build step — it's plain HTML/CSS/JS. From the project root:

```bash
python3 -m http.server 8000
```

then open `http://localhost:8000` in a browser. (Or just open `index.html` directly.)

## Project layout

```
index.html          - page structure
css/styles.css       - styling
js/romanize.js       - Hangul → romanization algorithm
js/dictionary.js     - curated Korean-English vocabulary
js/examples.js       - original example practice verses
js/app.js            - app logic (lyrics view, dictionary lookup, flashcards, quiz)
```
