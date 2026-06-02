// ─────────────────────────────────────────────────────────────────────────────
// Skin — the full flavour contract for the app.
//
// Every piece of user-visible text lives here so any skin can rephrase,
// rename, or reframe the entire UI without touching component code.
//
// All fields are required. Import defaultSkin and spread it to inherit
// neutral defaults, then override only what your skin needs to change:
//
//   export const mySkin: Skin = {
//     ...defaultSkin,
//     identity: { ...defaultSkin.identity, appName: "My App" },
//   };
//
// The data model, scoring maths, and recurrence logic are skin-agnostic.
// ─────────────────────────────────────────────────────────────────────────────

import type { DialogueTrigger } from "../data/dialogues.js";

// ── Dialogue pool ─────────────────────────────────────────────────────────────

/** A single voice line in a skin's dialogue pool (trigger is implicit via the map key). */
export interface SkinDialogueLine {
    character: "agent" | "director";
    message: string;
}

/**
 * Complete set of voice lines for a skin.
 * Every trigger key must have at least one entry.
 */
export type DialogueMap = Record<
    DialogueTrigger,
    ReadonlyArray<SkinDialogueLine>
>;

// ── Rank tiers (5 levels, low → high) ────────────────────────────────────────

export interface SkinRanks {
    level0: string; // lowest tier
    level1: string;
    level2: string;
    level3: string;
    level4: string; // highest tier
}

// ── Daily view bands ──────────────────────────────────────────────────────────

export interface SkinBand {
    label: string;    // short header shown above the band
    subtitle: string; // one-line description shown below the header
    empty: string;    // shown when the band has no items
}

export interface SkinBands {
    mandatory: SkinBand;
    suggested: SkinBand;
    radar: SkinBand;
    backlog: SkinBand;
}

// ── Streak / remediation badge text ──────────────────────────────────────────

export interface SkinStreakLabels {
    skipWarning: (n: number) => string;    // low-level skip badge
    skipCaution: (n: number) => string;    // mid-level skip badge
    skipDanger: (n: number) => string;     // high-level skip badge
    skipCritical: (n: number) => string;   // critical skip badge

    snoozeWarning: (n: number) => string;  // low-level snooze badge
    snoozeCaution: (n: number) => string;  // mid-level snooze badge
    snoozeDanger: (n: number) => string;   // high-level snooze badge
    snoozeCritical: (n: number) => string; // critical snooze badge

    remediationLow: (n: number) => string;    // early recovery badge
    remediationMedium: (n: number) => string; // mid recovery badge
    remediationHigh: (n: number) => string;   // severe recovery badge

    /** Watermark text stamped diagonally on a card at critical snooze level. */
    criticalSnoozeLabel: string;
}

// ── Commitment type names ─────────────────────────────────────────────────────

export interface SkinCommitmentTypes {
    routine: string;      // recurring commitment label
    task: string;         // one-time or recurring task label
    goal: string;         // goal / objective label (singular)
    goalPlural: string;   // goal / objective label (plural)
    idea: string;         // idea / hunch label (singular)
    ideaPlural: string;   // idea / hunch label (plural)
    goalAchieved: string; // status badge on a completed goal
    goalAbandoned: string; // status badge on an abandoned goal
}

// ── Navigation labels ─────────────────────────────────────────────────────────

export interface SkinNav {
    daily: string;          // primary daily view tab
    areas: string;          // areas-of-responsibility tab
    ideas: string;          // ideas / intel tab
    goals: string;          // goals / objectives tab
    areasBreadcrumb: string; // breadcrumb prefix when inside an area
}

// ── Action verbs (dialog titles, submit/delete buttons, CTA) ─────────────────

export interface SkinActions {
    newRoutineTitle: string;
    newTaskTitle: string;
    newGoalTitle: string;
    newIdeaTitle: string;

    editRoutineTitle: string;
    editTaskTitle: string;
    editGoalTitle: string;
    editIdeaTitle: string;

    submitRoutine: string;
    submitTask: string;
    submitGoal: string;
    submitIdea: string;

    saveRoutine: string;
    saveTask: string;
    saveGoal: string;
    saveIdea: string;

    deleteRoutineLabel: string;
    deleteTaskLabel: string;
    deleteGoalLabel: string;
    deleteIdeaLabel: string;

    deleteRoutineConfirm: string;
    deleteTaskConfirm: string;
    deleteGoalConfirm: string;
    deleteIdeaConfirm: string;

    deleteRoutineBtn: string;
    deleteTaskBtn: string;
    deleteGoalBtn: string;
    deleteIdeaBtn: string;

    /** Floating CTA on the daily view. */
    makeCommitmentCta: string;
}

// ── Page titles & subtitles ───────────────────────────────────────────────────

export interface SkinPages {
    ideasTitle: string;
    ideasSubtitle: string;
    ideasEmpty: string;

    goalsTitle: string;
    goalsSubtitle: string;

    insightsTitle: string;
    insightsSubtitle: string;
}

// ── Score & app identity ──────────────────────────────────────────────────────

export interface SkinIdentity {
    appName: string;
    appShort: string;       // abbreviated name used in headers
    appTagline: string;     // sub-brand line shown under the logotype
    scoreName: string;      // label for the running score
    shareTitle: string;     // title used in the OS share sheet
    sharePitch: string;     // body text used in the OS share sheet
}

// ── Hamburger menu ────────────────────────────────────────────────────────────

export interface SkinMenu {
    menuTitle: string;

    /** Section heading above the all-tasks / all-routines / all-commitments links. */
    allCommitmentsSection: string;
    allTasksLabel: string;
    allTasksSub: string;
    allRoutinesLabel: string;
    allRoutinesSub: string;
    allCommitmentsLabel: string;
    allCommitmentsSub: string;

    insightsSectionLabel: string;
    insightsLabel: string;
    insightsSub: string;

    shareSectionLabel: string;
    shareItemLabel: string;
    shareItemSub: string;

    /** Section heading above the skin / appearance picker. */
    appearanceLabel: string;

    /** Section heading above the data export / import controls. */
    dataSectionLabel: string;
    exportJsonLabel: string;
    exportJsonSub: string;
    exportCsvLabel: string;
    exportCsvSub: string;
    importLabel: string;
    importSub: string;
}

// ── Characters ────────────────────────────────────────────────────────────────

export interface SkinCharacter {
    name: string;      // full display name
    shortName: string; // abbreviated name used in compact labels
    title: string;     // role / position label
    memoType: string;  // header label on the dialogue memo card
    role: "agent" | "director";
}

export interface SkinCharacters {
    ally: SkinCharacter;     // supportive voice
    overseer: SkinCharacter; // demanding / evaluative voice
}

// ── Area summary card ─────────────────────────────────────────────────────────

export interface SkinAreaCard {
    pendingLabel: string;                    // label next to the pending-task count
    clearedLabel: string;                    // label next to the cleared-task count
    overdueFlag: (n: number) => string;      // flag shown when tasks are overdue
    watchingFlag: string;                    // flag shown when any task is at critical snooze
    allClearedFlag: string;                  // flag shown when every task is complete
}

// ── Commitment list section headers & controls ────────────────────────────────

export interface SkinCommitmentList {
    activeHeader: string;                           // heading above active commitments
    pausedHeader: string;                           // heading above paused commitments
    snoozedHeader: string;                          // heading above snoozed commitments
    clearedHeader: string;                          // heading above the revealed cleared section
    clearedToggleShow: (n: number) => string;       // expand-cleared toggle (collapsed state)
    clearedToggleHide: (n: number) => string;       // expand-cleared toggle (expanded state)
    emptyState: string;                             // shown when an area has no active items
    emptyQuote: string;                             // optional flavour quote below the empty state
    newCommitmentCta: string;                       // button that opens the add-commitment sheet
}

// ── Area edit / management form ───────────────────────────────────────────────

export interface SkinAreaEdit {
    nameLabel: string;
    briefingLabel: string;
    colorLabel: string;
    saveBtn: string;
    cancelBtn: string;
    editBtn: string;
    deleteBtn: string;
    deleteConfirmBtn: string;
    deletePrompt: string;
}

// ── Individual commitment row ─────────────────────────────────────────────────

export interface SkinCommitmentRow {
    completeTitle: string;                         // tooltip / title on the complete button
    logProgressTitle: string;                      // tooltip on the log-progress button (milestone)
    snoozeBtn: string;                             // snooze action button
    cannotSnoozeBtn: string;                       // snooze button when snoozing is blocked
    skipBtn: string;                               // skip action button
    wakeUpBtn: string;                             // un-snooze button
    snoozedUntilLabel: (date: string) => string;   // label showing when item wakes
    sessionsLoggedLabel: (n: number) => string;    // progress-count label on milestone cards
    logSessionBtn: string;                         // log-a-session button (milestone confirmation)
    allDoneBtn: string;                            // final-completion button (milestone)
    routineKindBadge: string;                      // chip shown on routine cards
    dueDatePrefix: string;                         // text prepended to a future due date
    missedDatePrefix: string;                      // text prepended to an overdue date
}

// ── Area creation wizard ──────────────────────────────────────────────────────

export interface SkinWizard {
    discardTitle: string;
    discardMessage: string;
    discardKeepBtn: string;
    discardConfirmBtn: string;
    cancelBtn: string;

    step1Indicator: string;
    step1Title: string;
    step1Prompt: string;
    step1NameLabel: string;
    step1NamePlaceholder: string;
    step1BriefingLabel: string;
    step1BriefingPlaceholder: string;
    step1ColorLabel: string;
    step1QuickCreateBtn: string;
    step1ContinueBtn: string;

    step2Title: string;
    step2Prompt: (areaName: string) => string;
    step2CommitmentsLabel: string;
    step2CommitmentsPlaceholder: string;
    step2BackBtn: string;
    step2CreateWithoutBtn: string;
    step2ConfigureBtn: (n: number) => string;
    step2CreateAreaBtn: string;

    step3Title: string;
    step3NameLabel: string;
    step3NamePlaceholder: string;
    step3CreateSoFarBtn: string;
    step3CreateWithoutBtn: string;
    step3NextBtn: string;
    step3FinishBtn: string;
}

// ── The full skin ─────────────────────────────────────────────────────────────

export interface Skin {
    id: string;
    displayName: string;

    identity: SkinIdentity;
    characters: SkinCharacters;
    ranks: SkinRanks;
    bands: SkinBands;
    streaks: SkinStreakLabels;
    types: SkinCommitmentTypes;
    nav: SkinNav;
    pages: SkinPages;
    menu: SkinMenu;
    actions: SkinActions;
    areaCard: SkinAreaCard;
    commitmentList: SkinCommitmentList;
    areaEdit: SkinAreaEdit;
    commitmentRow: SkinCommitmentRow;
    wizard: SkinWizard;
    dialogues: DialogueMap;

    /**
     * Optional CSS custom-property overrides injected into :root.
     * Keys must be valid CSS custom property names (start with --).
     * Applied after the base stylesheet so they win without !important.
     */
    cssVars?: Record<string, string>;
}
