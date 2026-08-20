export const PERSONAL_TIME_OFF_REASONS = [
  "Vacation",
  "Family",
  "Medical",
  "Personal appointment",
  "Travel",
  "Bereavement",
  "Other",
] as const;

/** Common US federal + widely observed holidays */
export const US_HOLIDAYS = [
  "New Year's Day",
  "Martin Luther King Jr. Day",
  "Presidents' Day",
  "Memorial Day",
  "Juneteenth",
  "Independence Day",
  "Labor Day",
  "Columbus Day / Indigenous Peoples' Day",
  "Veterans Day",
  "Thanksgiving",
  "Day after Thanksgiving",
  "Christmas Eve",
  "Christmas Day",
  "New Year's Eve",
  "Other holiday",
] as const;

export function reasonsForTimeOffType(
  type: "holiday" | "personal"
): readonly string[] {
  return type === "holiday" ? US_HOLIDAYS : PERSONAL_TIME_OFF_REASONS;
}

export function defaultReasonForTimeOffType(
  type: "holiday" | "personal"
): string {
  return reasonsForTimeOffType(type)[0];
}
