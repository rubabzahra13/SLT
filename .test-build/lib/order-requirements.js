"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderRequirements = getOrderRequirements;
exports.getOrderStatus = getOrderStatus;
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
 * Reads explicit manual toggle override from record if present.
 */
function getOverrideState(order, itemId) {
    const overrides = order.collectionStates || order.collection_states;
    if (overrides && typeof overrides === "object") {
        if (typeof overrides[itemId] === "boolean")
            return overrides[itemId];
        if (itemId === "form" && typeof overrides["compliancy"] === "boolean")
            return overrides["compliancy"];
        if (itemId === "compliancy" && typeof overrides["form"] === "boolean")
            return overrides["form"];
        if (itemId === "mix" && typeof overrides["time_of_mix"] === "boolean")
            return overrides["time_of_mix"];
        if (itemId === "time_of_mix" && typeof overrides["mix"] === "boolean")
            return overrides["mix"];
        if (itemId === "cs" && typeof overrides["eight_count"] === "boolean")
            return overrides["eight_count"];
        if (itemId === "eight_count" && typeof overrides["cs"] === "boolean")
            return overrides["cs"];
    }
    if (itemId === "songs" || itemId === "song") {
        const val = order.haveSongs || order.have_songs;
        if (val === "HAVE" || val === "YES" || val === "COLLECTED" || val === "SONGS READY")
            return true;
        if (val === "NEED SONGS" || val === "NO" || val === "UNCOLLECTED" || val === "NEED")
            return false;
    }
    if (itemId === "cs" || itemId === "eight_count") {
        const val = order.eightCountSheet || order.sendingEightCountSheets || order.eight_count_sheet;
        if (val === "HAVE CS" || val === "CS CONFIRMED" || val === "HAVE" || val === "COLLECTED")
            return true;
        if (val === "NEED CS" || val === "UNCOLLECTED" || val === "NEED")
            return false;
    }
    return undefined;
}
/**
 * Canonical 3-State Requirements Engine:
 * Derives exact package-specific requirements based on Main Category -> Subcategory -> Package.
 *
 * Requirements evaluate to 3 distinct states:
 * - GREEN: Required + Collected
 * - RED: Required + Missing
 * - WHITE: Not Applicable (Ignored for status progression)
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
            needTimeOfMix = false;
        }
        else if (pkgStr.includes("PLATINUM")) {
            needSongs = true;
            songsLabel = "Songs";
            needEightCount = true;
            needVideo = true;
            needTimeOfMix = false;
        }
        else if (pkgStr.includes("GOLD") || pkgStr.includes("SILVER") || pkgStr.includes("BRONZE")) {
            needSongs = true;
            songsLabel = "Songs";
            needEightCount = false;
            needVideo = false;
            needTimeOfMix = false;
        }
        else {
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
            needNotes = false;
        }
        else if (pkgStr.includes("DRUM CADENCE") || pkgStr.includes("BOTH FIGHT SONG") || pkgStr.includes("ALMA MATER")) {
            needSongs = false;
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
        needSongs = true;
        needTimeOfMix = true;
    }
    // --- COLLECTIONS GROUP ---
    // Form field removed from collections table per user request
    // 1. MIX / TIME OF MIX
    {
        const override = getOverrideState(order, "mix") ?? getOverrideState(order, "time_of_mix");
        const hasOrderTimeProp = order.timeLengthOfMix !== undefined ||
            order.time_length_of_mix !== undefined;
        const rawTime = hasOrderTimeProp
            ? order.timeLengthOfMix || order.time_length_of_mix
            : parsedPkg.limit;
        const defaultProvided = isPresent(rawTime) && rawTime !== "-";
        const isApplicable = needTimeOfMix;
        let state = "white";
        if (isApplicable) {
            const isCollected = override !== undefined ? override : defaultProvided;
            state = isCollected ? "green" : "red";
        }
        requirements.push({
            id: "mix",
            label: "Mix",
            category: "collections",
            state,
            isApplicable,
            provided: state === "green",
            value: defaultProvided ? rawTime.trim() : undefined,
            status: state === "green" ? "green" : state === "red" ? "red" : "white",
        });
    }
    // 2. CS / 8-COUNT SHEETS
    {
        const override = getOverrideState(order, "cs") ?? getOverrideState(order, "eight_count");
        const sheetVal = order.eightCountSheet ||
            order.sendingEightCountSheets ||
            order.usingEightCountSheets ||
            order.eight_count_sheet;
        const sheetStr = String(sheetVal || "").toUpperCase();
        const defaultProvided = sheetStr.includes("YES") ||
            sheetStr.includes("HAVE") ||
            sheetStr.includes("ATTACHED") ||
            sheetStr.includes("RECEIVED") ||
            sheetStr.includes("TRUE") ||
            sheetStr === "Y";
        const isApplicable = needEightCount;
        let state = "white";
        if (isApplicable) {
            const isCollected = override !== undefined ? override : defaultProvided;
            state = isCollected ? "green" : "red";
        }
        requirements.push({
            id: "cs",
            label: "CS",
            category: "collections",
            state,
            isApplicable,
            provided: state === "green",
            status: state === "green" ? "green" : state === "red" ? "red" : "white",
        });
    }
    // 3. VIDEO
    {
        const override = getOverrideState(order, "video");
        const notesVal = order.routineNotes ||
            order.musicTheme ||
            order.routine_notes ||
            order.video_url;
        const notesStr = String(notesVal || "").toUpperCase();
        const defaultProvided = isPresent(notesVal) &&
            (notesStr.includes("VIDEO") ||
                notesStr.includes("HTTP") ||
                notesStr.includes("YOUTUBE") ||
                notesStr.includes("VIMEO") ||
                notesStr.includes("ATTACHED") ||
                notesStr.includes("YES") ||
                notesStr.length > 3);
        const isApplicable = needVideo;
        let state = "white";
        if (isApplicable) {
            const isCollected = override !== undefined ? override : defaultProvided;
            state = isCollected ? "green" : "red";
        }
        requirements.push({
            id: "video",
            label: "Video",
            category: "collections",
            state,
            isApplicable,
            provided: state === "green",
            status: state === "green" ? "green" : state === "red" ? "red" : "white",
        });
    }
    // --- SONGS GROUP ---
    // 4. SONGS
    {
        const override = getOverrideState(order, "songs");
        const songsVal = order.songListSuggestions ||
            order.haveSongs ||
            order.song_list_suggestions ||
            order.have_songs;
        const songsStr = String(songsVal || "").toUpperCase();
        const defaultProvided = isPresent(songsVal) &&
            !songsStr.includes("NEED") &&
            !songsStr.includes("NO") &&
            (songsStr.includes("HAVE") ||
                songsStr.includes("READY") ||
                songsStr.includes("YES") ||
                songsStr.length > 3);
        const isApplicable = needSongs;
        let state = "white";
        if (isApplicable) {
            const isCollected = override !== undefined ? override : defaultProvided;
            state = isCollected ? "green" : "red";
        }
        requirements.push({
            id: "songs",
            label: songsLabel,
            category: "songs",
            state,
            isApplicable,
            provided: state === "green",
            status: state === "green" ? "green" : state === "red" ? "red" : "white",
        });
    }
    // 5. NOTES
    {
        const override = getOverrideState(order, "notes");
        const notesVal = order.routineNotes ||
            order.customVoiceovers ||
            order.musicTheme ||
            order.routine_notes ||
            order.custom_voiceovers ||
            order.music_theme;
        const defaultProvided = isPresent(notesVal);
        const isApplicable = needNotes;
        let state = "white";
        if (isApplicable) {
            const isCollected = override !== undefined ? override : defaultProvided;
            state = isCollected ? "green" : "red";
        }
        requirements.push({
            id: "notes",
            label: "Notes",
            category: "songs",
            state,
            isApplicable,
            provided: state === "green",
            status: state === "green" ? "green" : state === "red" ? "red" : "white",
        });
    }
    // Background Compliancy check for status calculation if required
    let compliancyMet = true;
    if (needCompliancy) {
        const override = getOverrideState(order, "compliancy") ?? getOverrideState(order, "form");
        const affiliate = order.musicAffiliate || order.music_affiliate || order.powerMusicCovers;
        const defaultProvided = typeof affiliate === "string" && affiliate.trim().length > 0;
        compliancyMet = override !== undefined ? override : defaultProvided;
    }
    const collections = requirements.filter((r) => r.category === "collections");
    const songsArea = requirements.filter((r) => r.category === "songs");
    // Filter applicable items only (state is red or green)
    const applicableItems = requirements.filter((r) => r.isApplicable);
    const hasRed = applicableItems.some((r) => r.state === "red") || !compliancyMet;
    const missingCount = applicableItems.filter((r) => r.state === "red").length + (!compliancyMet ? 1 : 0);
    const allMet = !hasRed;
    const calculatedStatus = hasRed ? "Waiting for Data" : "Need to be Scheduled";
    const manualStatus = order.orderStatus || order.order_status;
    const status = manualStatus === "Waiting for Data" || manualStatus === "Need to be Scheduled"
        ? manualStatus
        : calculatedStatus;
    const isWaitingForData = status === "Waiting for Data";
    return {
        collections,
        songsArea,
        all: requirements,
        allMet,
        missingCount,
        status,
        isWaitingForData,
        compliancyMet,
    };
}
function getOrderStatus(order) {
    const reqs = getOrderRequirements(order);
    return {
        status: reqs.status,
        isWaitingForData: reqs.isWaitingForData,
        missingCount: reqs.missingCount,
    };
}
