"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderRequirements = getOrderRequirements;
const package_1 = require("@/lib/package");
/**
 * Determines whether a string value is present and non-empty.
 */
function isPresent(val) {
    if (!val)
        return false;
    const cleaned = val.trim().toUpperCase();
    return (cleaned !== "" &&
        cleaned !== "NONE" &&
        cleaned !== "-" &&
        cleaned !== "TBD" &&
        cleaned !== "EMPTY" &&
        cleaned !== "N/A");
}
/**
 * Canonical Requirements Engine (Implementation 2):
 * Derives exact package-specific requirements based on Main Category -> Subcategory -> Package.
 *
 * Rules derived directly from Megan's September 15, 2026 specification.
 */
function getOrderRequirements(order) {
    const requirements = [];
    const category = (order.category || "").trim().toLowerCase();
    const rawFormType = (order.formType || "").trim().toLowerCase();
    const pkgStr = (order.package || order.packageType || "").trim().toUpperCase();
    const parsedPkg = (0, package_1.parsePackage)(order.package || order.packageType || "");
    const isMarchingBand = category.includes("band") || rawFormType.includes("band") || pkgStr.includes("CHANT") || pkgStr.includes("CADENCE");
    const isDance = category.includes("dance") || rawFormType.includes("dance") || pkgStr.includes("POM") || pkgStr.includes("GAMEDAY PERFORMANCE");
    const isCheer = category.includes("cheer") || rawFormType.includes("cheer") || pkgStr.includes("BRONZE") || pkgStr.includes("SILVER") || pkgStr.includes("GOLD") || pkgStr.includes("PLATINUM") || pkgStr.includes("TITANIUM");
    const isAnthem = category.includes("anthem") || rawFormType.includes("anthem");
    const isSports = category.includes("sports") || rawFormType.includes("sports");
    // Define boolean flags for required fields per package specification
    let needSongs = false;
    let songsLabel = "Songs";
    let needNotes = false;
    let needTimeOfMix = false;
    let needCompliancy = false;
    let needEightCount = false;
    let needVideo = false;
    if (isDance) {
        if (pkgStr.includes("JAZZ SIMPLE CUT")) {
            needSongs = true;
            songsLabel = "Song";
            needTimeOfMix = true;
            needNotes = true;
            needCompliancy = false;
        }
        else {
            // Dance Mix, Dance Plus, Custom POM, Custom Hip Hop, Gameday Mix/Plus/Extreme, Jazz/Kick Mix
            needSongs = true;
            songsLabel = pkgStr.includes("JAZZ/KICK") ? "Song(s)" : "Songs";
            needTimeOfMix = true;
            needCompliancy = true;
        }
    }
    else if (isCheer) {
        if (pkgStr.includes("TITANIUM")) {
            needNotes = true;
            needEightCount = true;
            needVideo = true;
            needSongs = false;
        }
        else if (pkgStr.includes("PLATINUM")) {
            needSongs = true;
            songsLabel = "Songs";
            needEightCount = true;
            needVideo = true;
        }
        else if (pkgStr.includes("GOLD") || pkgStr.includes("SILVER") || pkgStr.includes("BRONZE")) {
            needSongs = true;
            songsLabel = "Songs";
        }
        else {
            // Default Cheer fallback
            needSongs = true;
            songsLabel = "Songs";
            needEightCount = true;
        }
    }
    else if (isMarchingBand) {
        if (pkgStr.includes("BAND CHANT")) {
            needSongs = true;
            songsLabel = "Song";
            needTimeOfMix = true;
        }
        else if (pkgStr.includes("DRUM CADENCE") || pkgStr.includes("BOTH FIGHT SONG")) {
            needTimeOfMix = true;
            needNotes = true;
        }
        else {
            needSongs = true;
            songsLabel = "Song";
            needTimeOfMix = true;
        }
    }
    else if (isSports) {
        needSongs = true;
        songsLabel = "Songs";
        needNotes = true;
        needTimeOfMix = true;
    }
    else if (isAnthem) {
        needSongs = true;
        songsLabel = "Song";
        needNotes = true;
        needTimeOfMix = true;
    }
    else {
        // General fallback
        needSongs = true;
        needTimeOfMix = true;
        needCompliancy = true;
    }
    // --- DATA FIELD EVALUATION & MAPPING ---
    // 1. TIME OF MIX (Collections)
    if (needTimeOfMix) {
        const hasOrderTimeProp = order.timeLengthOfMix !== undefined ||
            order.time_length_of_mix !== undefined;
        const rawTime = hasOrderTimeProp
            ? order.timeLengthOfMix || order.time_length_of_mix
            : parsedPkg.limit;
        const provided = isPresent(rawTime) && rawTime !== "-";
        requirements.push({
            id: "time_of_mix",
            label: "Time of Mix",
            category: "collections",
            provided,
            value: provided ? rawTime.trim() : undefined,
            status: provided ? "green" : "red",
        });
    }
    // 2. COMPLIANCY / MUSIC AFFILIATE (Collections)
    if (needCompliancy) {
        const affiliate = order.musicAffiliate || order.music_affiliate || order.powerMusicCovers;
        const provided = isPresent(affiliate);
        requirements.push({
            id: "compliancy",
            label: "Compliancy",
            category: "collections",
            provided,
            value: provided ? affiliate.trim() : undefined,
            status: provided ? "green" : "red",
        });
    }
    // 3. 8-COUNT SHEETS (Collections)
    if (needEightCount) {
        const sheetVal = order.eightCountSheet ||
            order.sendingEightCountSheets ||
            order.usingEightCountSheets ||
            order.eight_count_sheet;
        const sheetStr = String(sheetVal || "").toUpperCase();
        const provided = sheetStr.includes("YES") ||
            sheetStr.includes("HAVE") ||
            sheetStr.includes("ATTACHED") ||
            sheetStr.includes("RECEIVED") ||
            sheetStr.includes("TRUE") ||
            sheetStr === "Y";
        requirements.push({
            id: "eight_count",
            label: "8-count Sheets",
            category: "collections",
            provided,
            status: provided ? "green" : "red",
        });
    }
    // 4. VIDEO (Collections)
    if (needVideo) {
        const notesVal = order.routineNotes ||
            order.musicTheme ||
            order.routine_notes ||
            order.video_url;
        const notesStr = String(notesVal || "").toUpperCase();
        const provided = isPresent(notesVal) &&
            (notesStr.includes("VIDEO") ||
                notesStr.includes("HTTP") ||
                notesStr.includes("YOUTUBE") ||
                notesStr.includes("VIMEO") ||
                notesStr.includes("ATTACHED") ||
                notesStr.includes("YES") ||
                notesStr.length > 3);
        requirements.push({
            id: "video",
            label: "Video",
            category: "collections",
            provided,
            status: provided ? "green" : "red",
        });
    }
    // 5. SONGS / SONG (Songs Area)
    if (needSongs) {
        const songsVal = order.songListSuggestions ||
            order.haveSongs ||
            order.song_list_suggestions ||
            order.have_songs;
        const songsStr = String(songsVal || "").toUpperCase();
        const provided = isPresent(songsVal) &&
            !songsStr.includes("NEED") &&
            !songsStr.includes("NO") &&
            (songsStr.includes("HAVE") ||
                songsStr.includes("READY") ||
                songsStr.includes("YES") ||
                songsStr.length > 3);
        requirements.push({
            id: "songs",
            label: songsLabel,
            category: "songs",
            provided,
            status: provided ? "green" : "red",
        });
    }
    // 6. NOTES (Songs Area)
    if (needNotes) {
        const notesVal = order.routineNotes ||
            order.customVoiceovers ||
            order.musicTheme ||
            order.routine_notes ||
            order.custom_voiceovers ||
            order.music_theme;
        const provided = isPresent(notesVal);
        requirements.push({
            id: "notes",
            label: "Notes",
            category: "songs",
            provided,
            status: provided ? "green" : "red",
        });
    }
    const collections = requirements.filter((r) => r.category === "collections");
    const songsArea = requirements.filter((r) => r.category === "songs");
    const allMet = requirements.every((r) => r.provided);
    const missingCount = requirements.filter((r) => !r.provided).length;
    return {
        collections,
        songsArea,
        all: requirements,
        allMet,
        missingCount,
    };
}
