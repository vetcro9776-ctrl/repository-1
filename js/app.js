(function () {
  'use strict';

  const { romanizeText, containsHangul } = window.Romanize;

  const STORAGE_KEYS = {
    customDict: 'kpop_practice_custom_dict_v1',
    flashcards: 'kpop_practice_flashcards_v1',
    lastLyrics: 'kpop_practice_last_lyrics_v1',
  };

  const PARTICLES = [
    '에게서', '한테서', '에게', '에서', '한테', '까지', '부터', '처럼', '보다',
    '이라도', '라도', '이나마', '이나', '이랑', '랑', '과', '와', '은', '는',
    '이', '가', '을', '를', '의', '에', '도', '만', '요', '야', '아', '여',
  ];

  // ---------- persistence ----------

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable (private mode, quota) - fail silently */
    }
  }

  let customDict = loadJSON(STORAGE_KEYS.customDict, []); // [{kr, en}]
  let flashcards = loadJSON(STORAGE_KEYS.flashcards, []); // [{id, kr, en, box, dueAt}]

  function persistDict() { saveJSON(STORAGE_KEYS.customDict, customDict); }
  function persistCards() { saveJSON(STORAGE_KEYS.flashcards, flashcards); }

  // ---------- dictionary lookup ----------

  function cleanToken(raw) {
    return raw.replace(/[.,!?~"'“”‘’()\[\]…]/g, '').trim();
  }

  function findInDict(word) {
    const hit = customDict.find((e) => e.kr === word) || BASE_DICTIONARY.find((e) => e.kr === word);
    return hit || null;
  }

  /** Try the word as-is, then progressively strip trailing particles. */
  function lookupWord(rawToken) {
    const cleaned = cleanToken(rawToken);
    if (!cleaned) return { query: cleaned, entry: null };

    let hit = findInDict(cleaned);
    if (hit) return { query: cleaned, entry: hit };

    for (const p of PARTICLES) {
      if (cleaned.endsWith(p) && cleaned.length > p.length) {
        const stem = cleaned.slice(0, cleaned.length - p.length);
        hit = findInDict(stem);
        if (hit) return { query: cleaned, entry: hit, strippedParticle: p, stem };
      }
    }
    return { query: cleaned, entry: null };
  }

  // ---------- tabs ----------

  const tabs = document.querySelectorAll('.tab-button');
  const panels = document.querySelectorAll('.tab-panel');
  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabs.forEach((b) => b.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'panel-flashcards') renderFlashcardList();
      if (btn.dataset.tab === 'panel-quiz') populateQuizSourceOptions();
    });
  });

  // ---------- lyrics view ----------

  const lyricsInput = document.getElementById('lyrics-input');
  const lyricsOutput = document.getElementById('lyrics-output');
  const romanizationToggle = document.getElementById('toggle-romanization');
  const wordPanel = document.getElementById('word-panel');
  const exampleButtonsWrap = document.getElementById('example-buttons');

  let currentLineSet = []; // [{kr, en?}]

  function setLyricsFromText(text) {
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    currentLineSet = lines.map((kr) => ({ kr }));
    saveJSON(STORAGE_KEYS.lastLyrics, text);
    renderLyrics();
  }

  function setLyricsFromExample(exampleSet) {
    currentLineSet = exampleSet.lines;
    lyricsInput.value = exampleSet.lines.map((l) => l.kr).join('\n');
    saveJSON(STORAGE_KEYS.lastLyrics, lyricsInput.value);
    renderLyrics();
  }

  function renderLyrics() {
    lyricsOutput.innerHTML = '';
    wordPanel.innerHTML = '<p class="hint">Click any Korean word above to see its meaning.</p>';

    if (currentLineSet.length === 0) {
      lyricsOutput.innerHTML = '<p class="hint">Paste some Korean lyrics on the left, or load an example, then click "Show lyrics".</p>';
      return;
    }

    currentLineSet.forEach((line) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'lyric-line';

      const krRow = document.createElement('div');
      krRow.className = 'kr-row';
      const tokens = line.kr.split(/(\s+)/); // keep whitespace as separate tokens
      tokens.forEach((tok) => {
        if (tok.trim() === '') {
          krRow.appendChild(document.createTextNode(tok));
          return;
        }
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = tok;
        if (containsHangul(tok)) {
          span.addEventListener('click', () => showWordInfo(tok));
        } else {
          span.classList.add('non-hangul');
        }
        krRow.appendChild(span);
      });
      lineEl.appendChild(krRow);

      const roRow = document.createElement('div');
      roRow.className = 'ro-row';
      roRow.textContent = romanizeText(line.kr);
      if (!romanizationToggle.checked) roRow.classList.add('hidden');
      lineEl.appendChild(roRow);

      if (line.en) {
        const enRow = document.createElement('div');
        enRow.className = 'en-row';
        enRow.textContent = line.en;
        lineEl.appendChild(enRow);
      }

      lyricsOutput.appendChild(lineEl);
    });
  }

  function showWordInfo(rawToken) {
    const result = lookupWord(rawToken);
    const romanized = romanizeText(result.query);

    wordPanel.innerHTML = '';
    const title = document.createElement('h3');
    title.textContent = result.query;
    wordPanel.appendChild(title);

    const ro = document.createElement('p');
    ro.className = 'romanization-line';
    ro.textContent = romanized;
    wordPanel.appendChild(ro);

    if (result.entry) {
      const meaning = document.createElement('p');
      meaning.className = 'meaning';
      meaning.textContent = result.entry.en;
      wordPanel.appendChild(meaning);

      if (result.entry.pos) {
        const pos = document.createElement('p');
        pos.className = 'pos-note';
        pos.textContent = result.entry.pos;
        wordPanel.appendChild(pos);
      }

      if (result.strippedParticle) {
        const note = document.createElement('p');
        note.className = 'hint small';
        note.textContent = `(matched base word "${result.stem}" after removing particle "${result.strippedParticle}")`;
        wordPanel.appendChild(note);
      }

      const addBtn = document.createElement('button');
      addBtn.textContent = '+ Add to flashcards';
      addBtn.className = 'small-btn';
      addBtn.addEventListener('click', () => addFlashcard(result.query, result.entry.en));
      wordPanel.appendChild(addBtn);
    } else {
      const notFound = document.createElement('p');
      notFound.className = 'hint';
      notFound.textContent = 'Not in the dictionary yet. Add your own definition:';
      wordPanel.appendChild(notFound);

      const form = document.createElement('div');
      form.className = 'add-word-form';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Meaning in English';
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.className = 'small-btn';
      saveBtn.addEventListener('click', () => {
        const en = input.value.trim();
        if (!en) return;
        customDict.push({ kr: result.query, en });
        persistDict();
        addFlashcard(result.query, en);
        showWordInfo(rawToken);
      });
      form.appendChild(input);
      form.appendChild(saveBtn);
      wordPanel.appendChild(form);
    }
  }

  romanizationToggle.addEventListener('change', () => {
    document.querySelectorAll('.ro-row').forEach((el) => el.classList.toggle('hidden', !romanizationToggle.checked));
  });

  document.getElementById('show-lyrics-btn').addEventListener('click', () => {
    setLyricsFromText(lyricsInput.value);
  });

  EXAMPLE_SETS.forEach((set, idx) => {
    const btn = document.createElement('button');
    btn.textContent = set.title;
    btn.className = 'example-btn';
    btn.addEventListener('click', () => setLyricsFromExample(set));
    exampleButtonsWrap.appendChild(btn);
  });

  // restore last session's pasted lyrics, if any
  const savedLyrics = loadJSON(STORAGE_KEYS.lastLyrics, '');
  if (savedLyrics) {
    lyricsInput.value = savedLyrics;
    setLyricsFromText(savedLyrics);
  } else {
    renderLyrics();
  }

  // ---------- flashcards ----------

  const BOX_INTERVAL_MS = {
    1: 0,
    2: 24 * 60 * 60 * 1000,
    3: 3 * 24 * 60 * 60 * 1000,
    4: 7 * 24 * 60 * 60 * 1000,
    5: 14 * 24 * 60 * 60 * 1000,
  };

  function addFlashcard(kr, en) {
    if (flashcards.some((c) => c.kr === kr)) return;
    flashcards.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kr,
      en,
      box: 1,
      dueAt: Date.now(),
    });
    persistCards();
    renderFlashcardList();
  }

  function removeFlashcard(id) {
    flashcards = flashcards.filter((c) => c.id !== id);
    persistCards();
    renderFlashcardList();
  }

  const flashcardListEl = document.getElementById('flashcard-list');
  const flashcardCountEl = document.getElementById('flashcard-count');

  function renderFlashcardList() {
    flashcardListEl.innerHTML = '';
    flashcardCountEl.textContent = flashcards.length;
    if (flashcards.length === 0) {
      flashcardListEl.innerHTML = '<p class="hint">No flashcards yet — click a word in the Lyrics tab and "Add to flashcards".</p>';
      return;
    }
    flashcards.forEach((c) => {
      const row = document.createElement('div');
      row.className = 'flashcard-row';
      const info = document.createElement('div');
      info.innerHTML = `<strong>${c.kr}</strong> <span class="ro-inline">(${romanizeText(c.kr)})</span> — ${c.en}`;
      const boxBadge = document.createElement('span');
      boxBadge.className = 'box-badge';
      boxBadge.textContent = `box ${c.box}`;
      info.appendChild(boxBadge);
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Remove';
      delBtn.className = 'small-btn danger';
      delBtn.addEventListener('click', () => removeFlashcard(c.id));
      row.appendChild(info);
      row.appendChild(delBtn);
      flashcardListEl.appendChild(row);
    });
  }

  // ---------- flashcard review ----------

  let reviewQueue = [];
  let reviewIndex = 0;
  let reviewShowingAnswer = false;

  const reviewArea = document.getElementById('review-area');
  const startReviewBtn = document.getElementById('start-review-btn');
  const reviewAllBtn = document.getElementById('review-all-btn');

  function buildQueue(all) {
    const now = Date.now();
    const pool = all ? flashcards.slice() : flashcards.filter((c) => c.dueAt <= now);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }

  function startReview(all) {
    reviewQueue = buildQueue(all);
    reviewIndex = 0;
    reviewShowingAnswer = false;
    if (reviewQueue.length === 0) {
      reviewArea.innerHTML = all
        ? '<p class="hint">Add some flashcards first.</p>'
        : '<p class="hint">Nothing due right now — nice work! Try "Review all" to practice anyway.</p>';
      return;
    }
    renderReviewCard();
  }

  function renderReviewCard() {
    if (reviewIndex >= reviewQueue.length) {
      reviewArea.innerHTML = '<p class="hint">Review complete! 🎉</p>';
      renderFlashcardList();
      return;
    }
    const card = reviewQueue[reviewIndex];
    reviewArea.innerHTML = '';

    const progress = document.createElement('p');
    progress.className = 'hint small';
    progress.textContent = `Card ${reviewIndex + 1} of ${reviewQueue.length}`;
    reviewArea.appendChild(progress);

    const front = document.createElement('div');
    front.className = 'review-card';
    const kr = document.createElement('div');
    kr.className = 'review-kr';
    kr.textContent = card.kr;
    front.appendChild(kr);

    const ro = document.createElement('div');
    ro.className = 'review-ro';
    ro.textContent = romanizeText(card.kr);
    front.appendChild(ro);

    if (reviewShowingAnswer) {
      const en = document.createElement('div');
      en.className = 'review-en';
      en.textContent = card.en;
      front.appendChild(en);
    }
    reviewArea.appendChild(front);

    if (!reviewShowingAnswer) {
      const showBtn = document.createElement('button');
      showBtn.textContent = 'Show answer';
      showBtn.className = 'primary-btn';
      showBtn.addEventListener('click', () => {
        reviewShowingAnswer = true;
        renderReviewCard();
      });
      reviewArea.appendChild(showBtn);
    } else {
      const btnRow = document.createElement('div');
      btnRow.className = 'review-btn-row';

      const gotIt = document.createElement('button');
      gotIt.textContent = 'Got it ✓';
      gotIt.className = 'primary-btn';
      gotIt.addEventListener('click', () => gradeCard(card, true));

      const stillLearning = document.createElement('button');
      stillLearning.textContent = 'Still learning';
      stillLearning.className = 'secondary-btn';
      stillLearning.addEventListener('click', () => gradeCard(card, false));

      btnRow.appendChild(stillLearning);
      btnRow.appendChild(gotIt);
      reviewArea.appendChild(btnRow);
    }
  }

  function gradeCard(card, gotIt) {
    const target = flashcards.find((c) => c.id === card.id);
    if (target) {
      target.box = gotIt ? Math.min(5, target.box + 1) : 1;
      target.dueAt = Date.now() + BOX_INTERVAL_MS[target.box];
      persistCards();
    }
    reviewIndex += 1;
    reviewShowingAnswer = false;
    renderReviewCard();
  }

  startReviewBtn.addEventListener('click', () => startReview(false));
  reviewAllBtn.addEventListener('click', () => startReview(true));

  // ---------- quiz ----------

  const quizSourceSelect = document.getElementById('quiz-source');
  const quizArea = document.getElementById('quiz-area');
  const startQuizBtn = document.getElementById('start-quiz-btn');

  function populateQuizSourceOptions() {
    quizSourceSelect.innerHTML = '';
    const opts = [];
    if (currentLineSet.length > 0) opts.push({ label: 'Current lyrics (Lyrics tab)', lines: currentLineSet });
    EXAMPLE_SETS.forEach((set) => opts.push({ label: set.title, lines: set.lines }));
    opts.forEach((opt, idx) => {
      const o = document.createElement('option');
      o.value = idx;
      o.textContent = opt.label;
      quizSourceSelect.appendChild(o);
    });
    quizSourceSelect._opts = opts;
  }

  let quizItems = [];
  let quizIndex = 0;
  let quizScore = 0;

  function buildQuizItems(lines) {
    const items = [];
    lines.forEach((line) => {
      const words = line.kr.split(/\s+/).filter((w) => containsHangul(w));
      if (words.length < 2) return; // need at least one context word + one blank
      const blankWord = words[Math.floor(Math.random() * words.length)];
      const cleaned = cleanToken(blankWord);
      const display = line.kr.replace(blankWord, '_____');
      items.push({ display, answer: cleaned, full: line.kr });
    });
    // shuffle and cap at 10 questions
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items.slice(0, 10);
  }

  startQuizBtn.addEventListener('click', () => {
    const opts = quizSourceSelect._opts || [];
    const chosen = opts[Number(quizSourceSelect.value)];
    if (!chosen) return;
    quizItems = buildQuizItems(chosen.lines);
    quizIndex = 0;
    quizScore = 0;
    renderQuizItem();
  });

  function renderQuizItem() {
    quizArea.innerHTML = '';
    if (quizItems.length === 0) {
      quizArea.innerHTML = '<p class="hint">Not enough words in that source to build a quiz.</p>';
      return;
    }
    if (quizIndex >= quizItems.length) {
      const done = document.createElement('p');
      done.className = 'hint';
      done.textContent = `Quiz complete! Score: ${quizScore} / ${quizItems.length}`;
      quizArea.appendChild(done);
      return;
    }

    const item = quizItems[quizIndex];
    const progress = document.createElement('p');
    progress.className = 'hint small';
    progress.textContent = `Question ${quizIndex + 1} of ${quizItems.length} — Score: ${quizScore}`;
    quizArea.appendChild(progress);

    const sentence = document.createElement('p');
    sentence.className = 'quiz-sentence';
    sentence.textContent = item.display;
    quizArea.appendChild(sentence);

    const inputRow = document.createElement('div');
    inputRow.className = 'quiz-input-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type the missing Korean word';
    const checkBtn = document.createElement('button');
    checkBtn.textContent = 'Check';
    checkBtn.className = 'primary-btn';

    const feedback = document.createElement('p');
    feedback.className = 'quiz-feedback';

    function check() {
      const guess = input.value.trim();
      if (guess === item.answer) {
        feedback.textContent = 'Correct! ✓';
        feedback.className = 'quiz-feedback correct';
        quizScore += 1;
      } else {
        feedback.textContent = `Not quite. Answer: ${item.answer} (${romanizeText(item.answer)})`;
        feedback.className = 'quiz-feedback incorrect';
      }
      input.disabled = true;
      checkBtn.disabled = true;

      const nextBtn = document.createElement('button');
      nextBtn.textContent = quizIndex + 1 < quizItems.length ? 'Next question' : 'Finish';
      nextBtn.className = 'secondary-btn';
      nextBtn.addEventListener('click', () => {
        quizIndex += 1;
        renderQuizItem();
      });
      quizArea.appendChild(nextBtn);
    }

    checkBtn.addEventListener('click', check);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') check();
    });

    inputRow.appendChild(input);
    inputRow.appendChild(checkBtn);
    quizArea.appendChild(inputRow);
    quizArea.appendChild(feedback);
    input.focus();
  }

  // initial renders
  renderFlashcardList();
  populateQuizSourceOptions();
})();
