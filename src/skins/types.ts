// ─────────────────────────────────────────────────────────────────────────────
// Skin — the full flavour contract for the app.
//
// A skin file supplies every piece of user-visible text that has a flavour
// opinion, plus optional CSS custom-property overrides for colours and fonts.
// The data model, scoring maths, and recurrence logic are skin-agnostic.
//
// Usage: load a skin at startup and pass it down via SkinProvider (to come).
// For now, import the skin object directly where needed.
// ─────────────────────────────────────────────────────────────────────────────

// ── Rank tiers (5 levels, low → high) ────────────────────────────────────────

export interface SkinRanks {
    /** Thresholds are fixed (40 / 70 / 100 / 130); only labels change. */
    level0: string;   // score < 40    (BCR: "Suspected Communist")
    level1: string;   // 40–69         (BCR: "Disengaged Citizen")
    level2: string;   // 70–99         (BCR: "Citizen")
    level3: string;   // 100–129       (BCR: "Loyal Citizen")
    level4: string;   // 130+          (BCR: "Patriot")
}

// ── Daily view bands ──────────────────────────────────────────────────────────

export interface SkinBand {
    label: string;     // short all-caps header  ("TODAY'S MANDATORY")
    subtitle: string;  // one-line description shown below the header
    empty: string;     // shown when the band has no items
}

export interface SkinBands {
    mandatory: SkinBand;
    suggested: SkinBand;
    radar:     SkinBand;
    backlog:   SkinBand;
}

// ── Streak / remediation badge text ──────────────────────────────────────────

export interface SkinStreakLabels {
    /** skip badge, severity warning  — e.g. "Skipped ×N"                   */
    skipWarning:   (n: number) => string;
    /** skip badge, severity caution  — e.g. "Skipped ×N — Pattern noted"   */
    skipCaution:   (n: number) => string;
    /** skip badge, severity danger   — e.g. "FLAGGED — Skipped ×N"         */
    skipDanger:    (n: number) => string;
    /** skip badge, severity critical — e.g. "CHRONIC AVOIDANCE ×N"         */
    skipCritical:  (n: number) => string;

    /** snooze badge, severity warning  — e.g. "Snoozed ×N"                 */
    snoozeWarning:  (n: number) => string;
    /** snooze badge, severity caution  — e.g. "Snoozed ×N — Noted"         */
    snoozeCaution:  (n: number) => string;
    /** snooze badge, severity danger   — e.g. "FLAGGED — Snoozed ×N"       */
    snoozeDanger:   (n: number) => string;
    /** snooze badge, severity critical — e.g. "UNDER REVIEW ×N"            */
    snoozeCritical: (n: number) => string;

    /** remediation badge, low severity    — e.g. "Recovering — N left"     */
    remediationLow:    (n: number) => string;
    /** remediation badge, medium severity — e.g. "Remediation — N needed"  */
    remediationMedium: (n: number) => string;
    /** remediation badge, high severity   — e.g. "INTEGRITY AUDIT ×N"      */
    remediationHigh:   (n: number) => string;
}

// ── Commitment type names ─────────────────────────────────────────────────────

export interface SkinCommitmentTypes {
    routine:      string;   // "Routine"      / "Ritual"
    task:         string;   // "Task"         / "Obligation"
    goal:         string;   // "Objective"    / "Investigation"
    goalPlural:   string;   // "Objectives"   / "Investigations"
    idea:         string;   // "Idea"         / "Hunch"
    ideaPlural:   string;   // "Ideas"        / "Hunches"
}

// ── Navigation labels ─────────────────────────────────────────────────────────

export interface SkinNav {
    daily:           string;   // "Daily"           / "Today's Case"
    areas:           string;   // "Areas"           / "Open Cases"
    ideas:           string;   // "Ideas"           / "Hunches"
    goals:           string;   // "Goals"           / "Long Game"
    /** Used in the breadcrumb inside a project: "RESPONSIBILITIES › NAME" */
    areasBreadcrumb: string;   // "RESPONSIBILITIES" / "AREAS"
}

// ── Page titles & subtitles ───────────────────────────────────────────────────

export interface SkinPages {
    ideasTitle:    string;   // "IDEAS"
    ideasSubtitle: string;   // "UNPROCESSED OBSERVATIONS · PROPOSED AREAS"
    ideasEmpty:    string;   // "No intelligence on file. Observations go here."

    goalsTitle:    string;   // "GOALS"
    goalsSubtitle: string;   // "LONG-HORIZON OUTCOMES · CLICK AN OBJECTIVE TO MANAGE COMMITMENTS"

    insightsTitle:    string;   // "Insights"
    insightsSubtitle: string;   // "Behavioral patterns, compliance gaps, and field performance."
}

// ── Score & app identity ──────────────────────────────────────────────────────

export interface SkinIdentity {
    appName:     string;   // "BCR Clear"   / "Dresden's Docket"
    appShort:    string;   // "CLEAR"       / "DOCKET"
    /** Sub-brand line shown under the logotype. */
    appTagline:  string;   // "BUREAU OF CIVIC RESPONSIBILITY" / "COMMITMENT TRACKER"
    scoreName:   string;   // "Patriot Score" / "White Council Standing"
    /** Title used in the OS share sheet. */
    shareTitle:  string;   // "CLEAR — Civic Engagement Tracking System"
    /** Body text used in the OS share sheet. */
    sharePitch:  string;
}

// ── Hamburger menu strings ────────────────────────────────────────────────────

export interface SkinMenu {
    menuTitle:          string;   // "Bureau Menu"   / "Menu"
    insightsSectionLabel: string; // "Intelligence"  / "Insights"
    shareSectionLabel:  string;   // "Community Duty" / "Share"
    shareItemLabel:     string;   // "Report a Neighbor" / "Invite a Friend"
    shareItemSub:       string;   // "Refer a civic non-compliant to CLEAR" / "Share the app"
}

// ── Characters ────────────────────────────────────────────────────────────────

export interface SkinCharacter {
    name:      string;   // "Agent Whitaker"  / "Harry Dresden"
    shortName: string;   // "Whitaker"        / "Harry"
    title:     string;   // "Field Agent"     / "Wizard for Hire"
    /** 'agent' = empathetic ally; 'director' = demanding overseer */
    role:      'agent' | 'director';
}

export interface SkinCharacters {
    ally:     SkinCharacter;   // warm, on your side
    overseer: SkinCharacter;   // demanding, compliance-focused
}

// ── The full skin ─────────────────────────────────────────────────────────────

export interface Skin {
    id:          string;   // 'bcr' | 'vanilla' | 'dresden'
    displayName: string;   // shown in a future skin-picker UI

    identity:    SkinIdentity;
    characters:  SkinCharacters;
    ranks:       SkinRanks;
    bands:       SkinBands;
    streaks:     SkinStreakLabels;
    types:       SkinCommitmentTypes;
    nav:         SkinNav;
    pages:       SkinPages;
    menu:        SkinMenu;

    /**
     * Optional CSS custom-property overrides injected into :root.
     * Keys must be valid CSS custom property names (start with --).
     * Applied after the base stylesheet so they win without !important.
     */
    cssVars?: Record<string, string>;
}
