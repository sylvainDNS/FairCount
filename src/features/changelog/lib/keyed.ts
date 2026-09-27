// Stable React keys for plain text lists where the same text can appear twice
// (e.g. an identical improvement shipped in two merged releases)
export const withOccurrenceKeys = (
  texts: readonly string[],
): readonly { readonly key: string; readonly text: string }[] => {
  const seen = new Map<string, number>();
  return texts.map((text) => {
    const occurrence = seen.get(text) ?? 0;
    seen.set(text, occurrence + 1);
    return { key: `${text}#${occurrence}`, text };
  });
};
