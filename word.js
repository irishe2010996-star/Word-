function normalizeWord(value) {
  const word = value.trim().replace(/[‘’]/g, "'").replace(/[‐‑]/g, "-")
    .replace(/^[\p{P}]+|[\p{P}]+$/gu, '');
  return word.length <= 80 && /^[a-z]+(?:['-][a-z]+)*$/i.test(word)
    ? word.toLowerCase()
    : '';
}
