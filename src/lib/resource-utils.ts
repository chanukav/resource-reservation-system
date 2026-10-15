export function getAssetCode(categoryName: string, id: string) {
  let prefix = "AST";
  const lower = categoryName.toLowerCase();
  if (lower.includes("conference") || lower.includes("meeting")) prefix = "CR";
  else if (lower.includes("workstation") || lower.includes("lab")) prefix = "WS";
  else if (lower.includes("media") || lower.includes("production") || lower.includes("hardware") || lower.includes("equipment")) prefix = "EQ";
  else if (lower.includes("training") || lower.includes("workshop") || lower.includes("collaboration")) prefix = "TR";
  else if (lower.includes("presentation") || lower.includes("shared it") || lower.includes("it")) prefix = "IT";
  const num = Math.abs(id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 900) + 100;
  return `${prefix}-${num}`;
}

export function scrollToResourceCard(resourceId: string) {
  if (typeof document === "undefined") return;

  const cardId = `resource-card-${resourceId}`;
  const rowId = `resource-row-${resourceId}`;
  const el = document.getElementById(cardId) || document.getElementById(rowId);

  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // Add high-visibility highlight effect
    el.classList.add(
      "ring-4",
      "ring-emerald-500",
      "ring-offset-4",
      "scale-[1.02]",
      "transition-all",
      "duration-500"
    );
    setTimeout(() => {
      el.classList.remove("scale-[1.02]");
    }, 500);
    setTimeout(() => {
      el.classList.remove("ring-4", "ring-emerald-500", "ring-offset-4");
    }, 3500);
  } else {
    const catalogSection = document.getElementById("catalog-section");
    if (catalogSection) {
      catalogSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}
