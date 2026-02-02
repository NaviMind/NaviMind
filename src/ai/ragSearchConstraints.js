export function buildSearchConstraints(intent) {
  const filters = {};

  if (intent.domain && intent.domain !== "mixed") {
    filters.category = intent.domain;
  }

  if (intent.regulation_likelihood === "high") {
    filters.prefer_regulatory = true;
  }

  return filters;
}