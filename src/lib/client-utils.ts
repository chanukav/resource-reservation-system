"use client";

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
