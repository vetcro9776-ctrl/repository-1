/**
 * Hangul -> Revised Romanization (simplified, syllable-block based).
 *
 * This does NOT apply cross-syllable sound changes (liaison, consonant
 * assimilation, palatalization, etc.) — it romanizes each syllable block
 * independently using the standard jamo tables. That covers the vast
 * majority of what a learner needs to sound a word out; real connected
 * speech can differ, so treat this as a reading aid, not a pronunciation
 * guarantee.
 */

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;

const CHOSEONG = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's',
  'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h',
];

const JUNGSEONG = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa',
  'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i',
];

const JONGSEONG = [
  '', 'g', 'kk', 'gs', 'n', 'nj', 'nh', 'd', 'l', 'lg',
  'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'b', 'bs', 's',
  'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h',
];

function isHangulSyllable(codePoint) {
  return codePoint >= HANGUL_BASE && codePoint <= HANGUL_LAST;
}

/** Romanize a single Hangul syllable character. Non-Hangul input is returned unchanged. */
function romanizeSyllable(char) {
  const code = char.codePointAt(0);
  if (!isHangulSyllable(code)) return char;

  const offset = code - HANGUL_BASE;
  const jongIndex = offset % 28;
  const jungIndex = ((offset - jongIndex) / 28) % 21;
  const choIndex = ((offset - jongIndex) / 28 - jungIndex) / 21;

  return CHOSEONG[choIndex] + JUNGSEONG[jungIndex] + JONGSEONG[jongIndex];
}

/** Romanize an arbitrary string, syllable by syllable, preserving spaces/punctuation. */
function romanizeText(text) {
  if (!text) return '';
  return Array.from(text).map(romanizeSyllable).join('');
}

/** True if the string contains at least one Hangul syllable character. */
function containsHangul(text) {
  return Array.from(text).some((ch) => isHangulSyllable(ch.codePointAt(0)));
}

window.Romanize = { romanizeText, romanizeSyllable, containsHangul };
