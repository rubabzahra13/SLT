import type { Order } from "@/types";
import type { Column } from "@/components/ui/DataTable";
import type { CheerFormSubtype } from "@/types";
import { displayMultiline, displayText } from "@/lib/order-form";

function textCol(
  key: string,
  header: string,
  accessor: (o: Order) => string | undefined,
  width = "140px",
  wide = false
): Column<Order> {
  return {
    key,
    header,
    width,
    nowrap: !wide,
    render: (o) => (
      <span className={wide ? "block max-w-[220px] truncate" : "block truncate"}>
        {displayText(accessor(o))}
      </span>
    ),
  };
}

function multiCol(
  key: string,
  header: string,
  accessor: (o: Order) => string | undefined,
  width = "220px"
): Column<Order> {
  return {
    key,
    header,
    width,
    nowrap: false,
    render: (o) => (
      <span className="block max-w-[240px] text-[12px] leading-snug text-brand-ink-secondary">
        {displayMultiline(accessor(o), 140)}
      </span>
    ),
  };
}

function addressCols(prefix: "gym" | "school" | "billing", includeName = true): Column<Order>[] {
  const nameKey =
    prefix === "gym" ? "gymName" : prefix === "school" ? "schoolName" : "programName";
  const addrKey =
    prefix === "gym"
      ? "gymBillingAddress"
      : prefix === "school"
        ? "schoolBillingAddress"
        : "youthRecBillingAddress";
  const nameHeader =
    prefix === "gym" ? "Gym Name" : prefix === "school" ? "School Name" : "Program Name";

  const cols: Column<Order>[] = [];

  if (includeName) {
    cols.push(
      textCol(nameKey, nameHeader, (o) => (o[nameKey as keyof Order] as string) || o.schoolProgramName, "160px", true)
    );
  }

  cols.push(
    textCol(addrKey, prefix === "billing" ? "Billing Address" : prefix === "gym" ? "Gym Billing Address" : "School Billing Address", (o) => (o[addrKey as keyof Order] as string) || o.schoolAddress, "160px"),
    textCol("city", "City", (o) => o.city, "100px"),
    textCol("stateProvince", "State/Province", (o) => o.stateProvince, "90px"),
    {
      key: "zipPostalCode",
      header: "ZIP/Postal Code",
      width: "90px",
      render: (o) => <span className="tabular-nums">{o.zipPostalCode || "—"}</span>,
    },
    textCol("country", "Country", (o) => o.country, "110px")
  );

  return cols;
}

function teamInfoCols(includeMascot = false): Column<Order>[] {
  const cols: Column<Order>[] = [];
  if (includeMascot) {
    cols.push(textCol("mascot", "Mascot", (o) => o.mascot || "", "100px"));
  }
  cols.push(
    textCol("division", "Division", (o) => o.division, "160px", true),
    textCol("teamCoedAllGirl", "My Team Is", (o) => o.teamCoedAllGirl || "", "110px"),
    textCol("teamColors", "Team Colors", (o) => o.teamColors || "", "110px"),
    {
      key: "numberOfCopies",
      header: "Copies",
      width: "72px",
      align: "center",
      render: (o) => <span className="tabular-nums">{o.numberOfCopies || "—"}</span>,
    }
  );
  return cols;
}

function contactCols(): Column<Order>[] {
  return [
    textCol("coachName", "Coach", (o) => o.coachName || o.coachContactFullName || "", "120px"),
    {
      key: "coachPhone",
      header: "Coach Phone",
      width: "110px",
      render: (o) => <span className="tabular-nums">{o.coachPhone || "—"}</span>,
    },
    textCol("coachEmail", "Coach Email", (o) => o.coachEmail || o.coachEmailAddress || "", "180px"),
    textCol("billingPersonName", "Billing Contact", (o) => o.billingPersonName, "120px"),
    textCol("billingPersonEmail", "Billing Email", (o) => o.billingPersonEmail, "180px"),
  ];
}

function mixInfoCols(options: {
  split?: boolean;
  eightCountLabel?: string;
  /** Youth Rec Magento form has no Requested Editor field. */
  includeRequestedEditor?: boolean;
}): Column<Order>[] {
  const cols: Column<Order>[] = [];
  if (options.includeRequestedEditor !== false) {
    cols.push(
      textCol(
        "requestedEditor",
        "Requested Editor",
        (o) => {
          const raw = o.requestedEditor?.trim() || "";
          if (!raw || /^(fa|first available)$/i.test(raw)) return "First Available";
          return raw.split(/\s+/)[0];
        },
        "120px"
      )
    );
  }
  cols.push(
    multiCol("packageType", "Package Type", (o) => o.packageType, "160px"),
    textCol("timeLengthOfMix", "Length of Mix", (o) => o.timeLengthOfMix, "100px")
  );
  if (options.split) {
    cols.push(textCol("splitOrNoSplit", "Split or No Split", (o) => o.splitOrNoSplit || "", "110px"));
  }
  cols.push(
    textCol("musicAffiliate", "Music Affiliate", (o) => o.musicAffiliate, "140px"),
    textCol(
      "sendingEightCountSheets",
      options.eightCountLabel || "8-Count Sheets",
      (o) => o.sendingEightCountSheets || "",
      "120px"
    ),
    multiCol("songListSuggestions", "Song List/Suggestions", (o) => o.songListSuggestions || "", "220px"),
    multiCol("routineNotes", "Routine Notes", (o) => o.routineNotes, "220px"),
    textCol("couponCode", "Coupon Code", (o) => o.couponCode || "", "100px"),
    textCol("howDidYouFindOut", "How Did You Find Out", (o) => o.howDidYouFindOut || "", "140px")
  );
  return cols;
}

function allStarCheerColumns(): Column<Order>[] {
  return [
    ...addressCols("gym"),
    textCol("teamName", "Team Name", (o) => o.teamName || o.programName, "160px", true),
    ...teamInfoCols(),
    ...contactCols(),
    ...mixInfoCols({ eightCountLabel: "Sending 8-Count Sheets?" }),
  ];
}

function schoolCheerColumns(viroc: boolean): Column<Order>[] {
  const cols: Column<Order>[] = [
    ...addressCols("school"),
    ...teamInfoCols(true),
    ...contactCols(),
  ];
  if (viroc) {
    cols.push(
      textCol("virocChoreographerName", "V!ROC Choreographer", (o) => o.choreographerName || o.virocChoreographerName, "140px"),
      textCol("virocChoreographerEmail", "V!ROC Choreographer Email", (o) => o.choreographerEmail || o.virocChoreographerEmail, "180px")
    );
  } else {
    cols.push(
      textCol("choreographerName", "Choreographer", (o) => o.choreographerName, "140px"),
      textCol("choreographerEmail", "Choreographer Email", (o) => o.choreographerEmail, "180px")
    );
  }
  cols.push(...mixInfoCols({ split: true, eightCountLabel: "Sending 8-Count Sheets?" }));
  return cols;
}

function youthRecCheerColumns(): Column<Order>[] {
  return [
    textCol(
      "schoolName",
      "Program Name",
      (o) => o.schoolName || o.schoolProgramName || o.programName || "",
      "160px",
      true
    ),
    textCol(
      "teamName",
      "Team Name",
      (o) => o.teamName || "",
      "140px"
    ),
    textCol("youthRecColors", "Colors", (o) => o.youthRecColors || "", "100px"),
    ...addressCols("billing", false),
    textCol("coachContactFullName", "Coach Contact", (o) => o.coachContactFullName || o.coachName, "120px"),
    textCol("coachEmailAddress", "Coach Email", (o) => o.coachEmailAddress || o.coachEmail, "180px"),
    {
      key: "coachPhone",
      header: "Phone #",
      width: "110px",
      render: (o) => <span className="tabular-nums">{o.coachPhone || "—"}</span>,
    },
    textCol(
      "youthRecExtraEmailAddress",
      "Email Address",
      (o) => o.youthRecExtraEmailAddress || o.emailAddress || "",
      "180px"
    ),
    ...mixInfoCols({
      split: true,
      eightCountLabel: "Using 8 Count Sheets?",
      includeRequestedEditor: false,
    }),
  ];
}

export function getCheerOrderColumns(subtype: CheerFormSubtype): Column<Order>[] {
  switch (subtype) {
    case "all-star-cheer":
      return allStarCheerColumns();
    case "school-cheer-viroc-yes":
      return schoolCheerColumns(true);
    case "school-cheer-viroc-no":
      return schoolCheerColumns(false);
    case "youth-rec-cheer":
      return youthRecCheerColumns();
    default:
      return allStarCheerColumns();
  }
}
