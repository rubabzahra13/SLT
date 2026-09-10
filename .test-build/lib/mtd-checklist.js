"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCollectionControlIds = getCollectionControlIds;
exports.getCollectionItemsForCategory = getCollectionItemsForCategory;
exports.getSongsItems = getSongsItems;
exports.parseEightCsState = parseEightCsState;
exports.encodeEightCsState = encodeEightCsState;
exports.cycleEightCsItem = cycleEightCsItem;
exports.parseSongsState = parseSongsState;
exports.encodeSongsState = encodeSongsState;
exports.cycleSongsItem = cycleSongsItem;
exports.parseEightCsFlags = parseEightCsFlags;
exports.encodeEightCs = encodeEightCs;
exports.parseSongsFlags = parseSongsFlags;
exports.encodeSongs = encodeSongs;
const EIGHT_CS_ITEM_LABELS = {
    form: "ORDER FORM",
    cs: "CS",
    video: "VIDEO",
    mix: "MIX",
};
const EMPTY_EIGHT_CS_STATE = {
    cs: "none",
    video: "none",
    form: "none",
    mix: "none",
};
function getCollectionControlIds(formType) {
    if (formType === "school-all-star-cheer") {
        return ["cs", "video", "form", "mix"];
    }
    return ["form", "mix"];
}
function getCollectionItemsForCategory(formType, state) {
    const ids = getCollectionControlIds(formType);
    const labels = {
        cs: "CS",
        video: "Video",
        form: "Form",
        mix: "Mix",
    };
    return ids.map((id) => ({
        id,
        label: labels[id],
        state: state[id],
    }));
}
function getSongsItems(state) {
    return [
        { id: "songs", label: "Songs", state: state.songs },
        { id: "notes", label: "Notes", state: state.notes },
    ];
}
function joinEightCsParts(prefix, parts) {
    if (parts.length === 0)
        return "";
    if (parts.length === 1)
        return `${prefix} ${parts[0]}`;
    if (parts.length === 2)
        return `${prefix} ${parts[0]} & ${parts[1]}`;
    const last = parts[parts.length - 1];
    const rest = parts.slice(0, -1).join(", ");
    return `${prefix} ${rest}, & ${last}`;
}
function detectItems(clause) {
    const upper = clause.toUpperCase();
    const items = [];
    if (upper.includes("ORDER FORM"))
        items.push("form");
    if (/\bCS\b/.test(upper))
        items.push("cs");
    if (upper.includes("VIDEO"))
        items.push("video");
    if (/\bMIX\b/.test(upper))
        items.push("mix");
    return items;
}
function parseEightCsState(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return { ...EMPTY_EIGHT_CS_STATE };
    const state = { ...EMPTY_EIGHT_CS_STATE };
    const clauses = trimmed.split(/,\s*(?=HAVE|NEED)/i);
    for (const clause of clauses) {
        const upper = clause.trim().toUpperCase();
        const kind = upper.startsWith("NEED")
            ? "need"
            : upper.startsWith("HAVE")
                ? "have"
                : null;
        if (!kind)
            continue;
        for (const item of detectItems(upper)) {
            state[item] = kind;
        }
    }
    return state;
}
function encodeEightCsState(state) {
    const haveParts = [];
    const needParts = [];
    Object.keys(EIGHT_CS_ITEM_LABELS).forEach((key) => {
        const label = EIGHT_CS_ITEM_LABELS[key];
        if (state[key] === "have")
            haveParts.push(label);
        if (state[key] === "need")
            needParts.push(label);
    });
    const segments = [
        joinEightCsParts("HAVE", haveParts),
        joinEightCsParts("NEED", needParts),
    ].filter(Boolean);
    return segments.join(", ");
}
function cycleEightCsItem(state, id) {
    const cycle = ["none", "have", "need"];
    const next = cycle[(cycle.indexOf(state[id]) + 1) % cycle.length];
    return { ...state, [id]: next };
}
const EMPTY_SONGS_STATE = {
    songs: "none",
    notes: "none",
};
const SONGS_ITEM_LABELS = {
    songs: "SONGS",
    notes: "NOTES",
};
function detectSongItems(clause) {
    const upper = clause.toUpperCase();
    const items = [];
    if (upper.includes("SONGS"))
        items.push("songs");
    if (upper.includes("NOTES"))
        items.push("notes");
    return items;
}
function parseSongsState(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return { ...EMPTY_SONGS_STATE };
    const upper = trimmed.toUpperCase();
    if (upper === "NO")
        return { ...EMPTY_SONGS_STATE };
    if (upper === "HAVE")
        return { songs: "have", notes: "none" };
    const state = { ...EMPTY_SONGS_STATE };
    const clauses = trimmed.split(/,\s*(?=HAVE|NEED)/i);
    for (const clause of clauses) {
        const clauseUpper = clause.trim().toUpperCase();
        const kind = clauseUpper.startsWith("NEED")
            ? "need"
            : clauseUpper.startsWith("HAVE")
                ? "have"
                : null;
        if (!kind)
            continue;
        for (const item of detectSongItems(clauseUpper)) {
            state[item] = kind;
        }
    }
    return state;
}
function encodeSongsState(state) {
    if (state.songs === "none" && state.notes === "none")
        return "NO";
    if (state.songs === "have" && state.notes === "none")
        return "HAVE";
    const haveParts = [];
    const needParts = [];
    Object.keys(SONGS_ITEM_LABELS).forEach((key) => {
        const label = SONGS_ITEM_LABELS[key];
        if (state[key] === "have")
            haveParts.push(label);
        if (state[key] === "need")
            needParts.push(label);
    });
    const segments = [
        joinEightCsParts("HAVE", haveParts),
        joinEightCsParts("NEED", needParts),
    ].filter(Boolean);
    return segments.join(", ");
}
function cycleSongsItem(state, id) {
    const cycle = ["none", "have", "need"];
    const next = cycle[(cycle.indexOf(state[id]) + 1) % cycle.length];
    return { ...state, [id]: next };
}
/** @deprecated Use parseEightCsState */
function parseEightCsFlags(value) {
    const state = parseEightCsState(value);
    return {
        cs: state.cs !== "none",
        video: state.video !== "none",
        form: state.form !== "none",
        mix: state.mix !== "none",
    };
}
/** @deprecated Use encodeEightCsState */
function encodeEightCs(flags, current) {
    const state = parseEightCsState(current);
    return encodeEightCsState({
        cs: flags.cs ? (state.cs === "need" ? "need" : "have") : "none",
        video: flags.video ? (state.video === "need" ? "need" : "have") : "none",
        form: flags.form ? (state.form === "need" ? "need" : "have") : "none",
        mix: flags.mix ? (state.mix === "need" ? "need" : "have") : "none",
    });
}
function parseSongsFlags(value) {
    const state = parseSongsState(value);
    if (state.songs === "none" && state.notes === "none")
        return "no";
    if (state.songs === "need" || state.notes === "need")
        return "need";
    return "have";
}
function encodeSongs(status) {
    if (status === "have")
        return "HAVE";
    if (status === "no")
        return "NO";
    return "NEED SONGS";
}
