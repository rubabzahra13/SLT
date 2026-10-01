import type { MTDRecord, Order } from "@/types";

/** MTD patches when an order form field changes. */
export function mtdPatchFromOrderField(
  key: string,
  value: string
): Partial<MTDRecord> {
  switch (key) {
    case "coachName":
    case "contactName":
    case "customerName":
    case "coachContactFullName":
      return { contactName: value };
    case "teamName":
    case "programName":
      return { programName: value };
    case "packageType":
    case "package":
      return { package: value };
    case "songListSuggestions":
    case "routineNotes":
    case "powerMusicCovers":
    case "musicTheme":
      return { musicTheme: value };
    case "sendingEightCountSheets":
      return { eightCountSheet: value };
    case "division":
      return { section: value };
    default:
      return {};
  }
}

/** Order patches when spreadsheet / MTD fields change. */
export function orderPatchFromMTD(
  patch: Partial<MTDRecord>
): Partial<Order> {
  const orderPatch: Partial<Order> = {};

  if (patch.contactName !== undefined) {
    orderPatch.contactName = patch.contactName;
    orderPatch.customerName = patch.contactName;
    orderPatch.coachName = patch.contactName;
    orderPatch.coachContactFullName = patch.contactName;
  }
  if (patch.programName !== undefined) {
    orderPatch.programName = patch.programName;
    orderPatch.teamName = patch.programName;
    orderPatch.schoolProgramName = patch.programName;
  }
  if (patch.package !== undefined) {
    orderPatch.package = patch.package;
    orderPatch.packageType = patch.package;
  }
  if (patch.musicTheme !== undefined) {
    orderPatch.musicTheme = patch.musicTheme;
    orderPatch.songListSuggestions = patch.musicTheme;
    orderPatch.routineNotes = patch.musicTheme;
    orderPatch.powerMusicCovers = patch.musicTheme;
  }
  if (patch.price !== undefined) {
    orderPatch.price = patch.price;
  }
  if (patch.priceCompliance !== undefined) {
    orderPatch.priceCompliance = patch.priceCompliance;
  }
  if (patch.eightCountSheet !== undefined) {
    orderPatch.sendingEightCountSheets = patch.eightCountSheet;
  }
  if (patch.section !== undefined) {
    orderPatch.division = patch.section;
  }

  return orderPatch;
}

export function orderPatchFromOrderField(
  key: string,
  value: string
): Partial<Order> {
  const patch: Partial<Order> = { [key]: value } as Partial<Order>;

  if (key === "coachName" || key === "coachContactFullName") {
    patch.contactName = value;
    patch.customerName = value;
  }
  if (key === "teamName") {
    patch.programName = value;
    patch.schoolProgramName = value;
  }
  if (key === "packageType") {
    patch.package = value;
  }
  if (
    key === "songListSuggestions" ||
    key === "routineNotes" ||
    key === "powerMusicCovers"
  ) {
    patch.musicTheme = value;
  }

  return patch;
}
