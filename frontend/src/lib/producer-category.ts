/**
 * Map order form / subtype / legacy category strings onto the producer
 * subcategory labels used for rates, assign limits, and calendars.
 */
export function orderCategoryToProducerCategory(
  formType: string | undefined,
  subtype: string | undefined,
  legacyCategory?: string | undefined
): string {
  // Use subtype-specific mapping first
  if (subtype) {
    const s = subtype.trim().toLowerCase();
    if (s === "all-star-cheer") return "All-Star Cheer";
    if (s === "school-cheer-viroc-yes" || s === "school-cheer-viroc-no") {
      return "School Cheer";
    }
    if (s === "youth-rec-cheer") return "Youth Rec Cheer";
    if (s === "pom") return "Pom";
    if (s === "hip-hop" || s === "hiphop") return "Hip Hop";
    if (s === "team-performance-variety" || s === "team-performance") {
      return "Team Performance / Variety";
    }
    if (s === "gameday") return "Gameday";
    if (s === "jazz-kick" || s === "jazz/kick") return "Jazz / Kick";
  }
  // Use form type mapping
  if (formType) {
    const f = formType.trim().toLowerCase();
    if (f === "marching-band") return "Marching Band";
    if (f === "sports-entertainment") return "Sports Entertainment";
    if (f === "school-anthem") return "School Anthem";
  }
  // Legacy category string fallback (used by MTD records which store plain strings)
  if (legacyCategory) {
    const c = legacyCategory.trim().toLowerCase();
    if (c === "cheer") return "All-Star Cheer";
    if (c === "dance") return "Pom";
    if (c === "marching band" || c === "marching-band") return "Marching Band";
    if (c === "hip-hop" || c === "hip hop") return "Hip Hop";
    if (c === "sports entertainment" || c === "sports-entertainment") {
      return "Sports Entertainment";
    }
    if (c === "school anthem" || c === "school-anthem") return "School Anthem";
    if (c === "school cheer" || c === "school-cheer") return "School Cheer";
    if (c === "all-star cheer" || c === "all star cheer") return "All-Star Cheer";
    if (c === "youth rec cheer" || c === "youth-rec-cheer") return "Youth Rec Cheer";
    if (c === "pom") return "Pom";
    if (c === "gameday") return "Gameday";
    if (c === "jazz / kick" || c === "jazz/kick" || c === "jazz-kick") {
      return "Jazz / Kick";
    }
    if (
      c === "team performance / variety" ||
      c === "team performance" ||
      c === "general"
    ) {
      return "Team Performance / Variety";
    }
    // Return the category as-is if no mapping found
    return legacyCategory;
  }
  return "";
}
