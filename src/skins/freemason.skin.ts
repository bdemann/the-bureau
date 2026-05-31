import type { Skin } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// The Trestle Board — Freemason skin.
//
// Tone: dignified, fraternal, allegorical. The language of Masonry is built
// on craft metaphor — building, light, labor, and self-improvement through
// disciplined work. Less surveillance-state, more brotherhood and the pursuit
// of a more perfect edifice.
//
// Characters: rather than named individuals, the voice lines are Masonic
// maxims and lodge wisdom. The "ally" voice is fraternal and encouraging;
// the "director" voice is the lodge holding you to your obligation.
//
// Color palette: near-black field with Masonic gold accents on aged parchment.
// ─────────────────────────────────────────────────────────────────────────────

export const freemasonSkin: Skin = {
    id: "freemason",
    displayName: "The Trestle Board",

    identity: {
        appName: "The Trestle Board",
        appShort: "TRESTLE",
        appTagline: "LODGE OF COMMITTED LABOR",
        scoreName: "Craft Standing",
        shareTitle: "The Trestle Board — A Mason's Ledger of Labor",
        sharePitch:
            "The trestle board holds the designs by which the Craft works. " +
            "Add your labors and obligations, build your days with intention, " +
            "and bring your rough ashlar to a polished stone.",
    },

    characters: {
        ally: {
            name: "The Craft",
            shortName: "The Craft",
            title: "Fraternal Voice",
            role: "agent",
        },
        overseer: {
            name: "The Lodge",
            shortName: "The Lodge",
            title: "Obligations & Standards",
            role: "director",
        },
    },

    ranks: {
        level0: "Uninitiated",
        level1: "Entered Apprentice",
        level2: "Fellow Craft",
        level3: "Master Mason",
        level4: "Worshipful Master",
    },

    bands: {
        mandatory: {
            label: "BOUND BY OBLIGATION",
            subtitle: "Sworn work. Honor demands completion.",
            empty: "No obligations due. The lodge is satisfied.",
        },
        suggested: {
            label: "RECOMMENDED LABOR",
            subtitle: "Work the Craft recommends today.",
            empty: "No labor recommended today.",
        },
        radar: {
            label: "APPROACHING LODGE NIGHT",
            subtitle: "Coming due. Plan your work.",
            empty: "Nothing approaching.",
        },
        backlog: {
            label: "THE TRESTLE BOARD",
            subtitle: "Future labor. No urgency today.",
            empty: "The trestle board is clear.",
        },
    },

    streaks: {
        skipWarning: (n) => `Avoided ×${n}`,
        skipCaution: (n) => `Labor avoided ×${n} — noted in the minutes`,
        skipDanger: (n) => `FLAGGED — Obligation avoided ×${n}`,
        skipCritical: (n) => `BREACH OF OBLIGATION ×${n}`,

        snoozeWarning: (n) => `Deferred ×${n}`,
        snoozeCaution: (n) => `Deferred ×${n} — the lodge takes note`,
        snoozeDanger: (n) => `UNDER REVIEW ×${n}`,
        snoozeCritical: (n) => `LODGE INQUIRY ×${n}`,

        remediationLow: (n) => `Making amends — ${n} labors remain`,
        remediationMedium: (n) => `Penance work — ${n} labors due`,
        remediationHigh: (n) => `DEGREE REVIEW ×${n}`,
    },

    types: {
        routine: "Ritual",
        task: "Labor",
        goal: "Great Work",
        goalPlural: "Great Works",
        idea: "Rough Ashlar",
        ideaPlural: "Rough Ashlars",
    },

    nav: {
        daily: "Daily Labor",
        areas: "Pillars",
        ideas: "Rough Ashlars",
        goals: "Great Works",
        areasBreadcrumb: "PILLARS",
    },

    pages: {
        ideasTitle: "ROUGH ASHLARS",
        ideasSubtitle: "UNREFINED WORK · AWAITING THE CHISEL",
        ideasEmpty: "The trestle board is clear. New ashlars await shaping.",

        goalsTitle: "GREAT WORKS",
        goalsSubtitle: "LONG-HORIZON LABORS · TAP A WORK TO MANAGE OBLIGATIONS",

        insightsTitle: "The Working Tools",
        insightsSubtitle: "A Mason keeps an accurate account of his labor.",
    },

    menu: {
        menuTitle: "Lodge Menu",
        insightsSectionLabel: "Working Tools",
        shareSectionLabel: "Spread the Light",
        shareItemLabel: "Hail a Fellow Craftsman",
        shareItemSub: "Invite a brother to the lodge",
    },

    actions: {
        newRoutineTitle: "INSTITUTE NEW RITUAL",
        newTaskTitle: "ASSIGN NEW LABOR",
        newGoalTitle: "BEGIN GREAT WORK",
        newIdeaTitle: "NEW ROUGH ASHLAR",

        editRoutineTitle: "AMEND RITUAL",
        editTaskTitle: "REVISE LABOR",
        editGoalTitle: "REVISE GREAT WORK",
        editIdeaTitle: "SHAPE THE ASHLAR",

        submitRoutine: "CONSECRATE RITUAL",
        submitTask: "ASSIGN LABOR",
        submitGoal: "UNDERTAKE GREAT WORK",
        submitIdea: "RECORD ASHLAR",

        saveRoutine: "SAVE RITUAL",
        saveTask: "SAVE LABOR",
        saveGoal: "SAVE GREAT WORK",
        saveIdea: "SAVE ASHLAR",

        deleteRoutineLabel: "DISSOLVE RITUAL",
        deleteTaskLabel: "RELEASE LABOR",
        deleteGoalLabel: "ABANDON GREAT WORK",
        deleteIdeaLabel: "DISCARD ASHLAR",

        deleteRoutineConfirm: "PERMANENTLY DISSOLVE THIS RITUAL?",
        deleteTaskConfirm: "PERMANENTLY RELEASE THIS LABOR?",
        deleteGoalConfirm: "PERMANENTLY ABANDON THIS GREAT WORK?",
        deleteIdeaConfirm: "PERMANENTLY DISCARD THIS ASHLAR?",

        deleteRoutineBtn: "DISSOLVE",
        deleteTaskBtn: "RELEASE",
        deleteGoalBtn: "ABANDON",
        deleteIdeaBtn: "DISCARD",

        makeCommitmentCta: "+ UNDERTAKE LABOR",
    },

    dialogues: {
        // ── TASK ADDED ───────────────────────────────────────────────────────
        task_added: [
            {
                character: "agent",
                message:
                    "The stone is placed upon the trestle board. Now the work begins.",
            },
            {
                character: "agent",
                message:
                    "Every great edifice begins with a single stone laid true. This is yours.",
            },
            {
                character: "agent",
                message:
                    "What is begun must be finished. Let it be so with this.",
            },
            {
                character: "director",
                message:
                    "A new obligation is recorded. The Craft demands it be honored.",
            },
        ],

        // ── TASK COMPLETED ───────────────────────────────────────────────────
        task_completed: [
            {
                character: "agent",
                message: "The stone is dressed and set. Well worked, brother.",
            },
            {
                character: "agent",
                message:
                    "A labor completed is a testament to your craft. That is how the edifice rises.",
            },
            {
                character: "agent",
                message:
                    "The ashlar is perfected. This is the purpose of our work.",
            },
            {
                character: "agent",
                message:
                    "Work well done is its own reward. The lodge has noted it.",
            },
            {
                character: "director",
                message:
                    "Obligation fulfilled. The Craft expects nothing less.",
            },
            {
                character: "director",
                message: "Labor completed. Continue to build upward.",
            },
            {
                character: "director",
                message:
                    "The record shows it done. See that the next is likewise.",
            },
        ],

        // ── SNOOZE ×1 ────────────────────────────────────────────────────────
        task_snoozed_1: [
            {
                character: "agent",
                message:
                    "Deferred to the next working day. The lodge is patient — for now.",
            },
            {
                character: "agent",
                message:
                    "One postponement noted. The stone awaits when you take it up again.",
            },
            {
                character: "director",
                message:
                    "Deferred. Let it not be a habit. A mason does not leave his work unfinished.",
            },
        ],

        // ── SNOOZE ×2–3 ──────────────────────────────────────────────────────
        task_snoozed_2_3: [
            {
                character: "agent",
                message:
                    "Again deferred. A mason does not leave his stone half-dressed.",
            },
            {
                character: "agent",
                message:
                    "The work accumulates. What prevents your hand from taking it up?",
            },
            {
                character: "director",
                message:
                    "Repeated deferral is noted. The Craft expects diligence, not delay.",
            },
            {
                character: "director",
                message:
                    "Two or three postponements. Consider what holds you back from your obligation.",
            },
        ],

        // ── SNOOZE ×4–5 ──────────────────────────────────────────────────────
        task_snoozed_4_5: [
            {
                character: "agent",
                message:
                    "Four deferrals. This labor begins to dishonor the obligation you took on.",
            },
            {
                character: "agent",
                message:
                    "A rough ashlar neglected remains rough. Take it up, brother.",
            },
            {
                character: "director",
                message:
                    "This matter has been deferred too many times. The lodge takes notice.",
            },
            {
                character: "director",
                message:
                    "A craftsman does not perpetually avoid his work. Resolve this.",
            },
        ],

        // ── SNOOZE ×6+ ───────────────────────────────────────────────────────
        task_snoozed_6plus: [
            {
                character: "director",
                message:
                    "Six postponements. You stand in violation of your sworn obligation to the lodge.",
            },
            {
                character: "director",
                message:
                    "The lodge calls you to account. This cannot continue.",
            },
            {
                character: "director",
                message:
                    "A Master Mason does not avoid his labor. Take this up at once.",
            },
        ],

        // ── TASK SKIPPED ─────────────────────────────────────────────────────
        task_skipped: [
            {
                character: "agent",
                message:
                    "The labor was set aside. The ashlar remains rough. It will return.",
            },
            {
                character: "agent",
                message:
                    "Skipped. The lodge does not forget. Neither should you.",
            },
            {
                character: "director",
                message: "Labor avoided. That goes in the lodge minutes.",
            },
            {
                character: "director",
                message:
                    "You chose not to take up your tools today. The Craft has noted it.",
            },
        ],

        // ── TASK OVERDUE ─────────────────────────────────────────────────────
        task_overdue: [
            {
                character: "agent",
                message:
                    "This labor is past due. Take it up before the lodge opens inquiry.",
            },
            {
                character: "agent",
                message:
                    "Overdue. Recovery starts with picking up the working tools and beginning.",
            },
            {
                character: "director",
                message:
                    "Overdue. A mason settles his accounts. See to this at once.",
            },
            {
                character: "director",
                message:
                    "The deadline has passed. There is no virtue in further delay.",
            },
        ],

        // ── AREA COMPLETED ───────────────────────────────────────────────────
        area_completed: [
            {
                character: "agent",
                message:
                    "The pillar stands complete. A worthy labor, well and truly finished.",
            },
            {
                character: "agent",
                message:
                    "All obligations fulfilled. The edifice is raised. Well done, brother.",
            },
            {
                character: "director",
                message:
                    "All labor in this pillar is complete. This is the mark of a true craftsman.",
            },
        ],

        // ── SCORE LOW ────────────────────────────────────────────────────────
        score_low: [
            {
                character: "agent",
                message:
                    "Your Craft Standing is low. Return to first principles. Work the square and compass.",
            },
            {
                character: "agent",
                message:
                    "The edifice suffers when the craftsman neglects his tools. Start with one labor today.",
            },
            {
                character: "director",
                message:
                    "Your standing falls short of what the Craft demands. Bring yourself back to the plumb line.",
            },
            {
                character: "director",
                message:
                    "Low standing reflects neglected obligation. The lodge expects improvement.",
            },
        ],

        // ── SCORE HIGH ───────────────────────────────────────────────────────
        score_high: [
            {
                character: "agent",
                message:
                    "Your Craft Standing reflects a brother who works true to the square. Keep it so.",
            },
            {
                character: "agent",
                message:
                    "Good standing. The edifice rises when every craftsman works faithfully.",
            },
            {
                character: "director",
                message:
                    "Your standing is commendable. The Craft expects it to remain so.",
            },
        ],

        // ── DAY START ────────────────────────────────────────────────────────
        day_start: [
            {
                character: "agent",
                message:
                    "The lodge is open. The trestle board is before you. Take up your working tools.",
            },
            {
                character: "agent",
                message:
                    "A new day. The Craft asks only that you work true, work steady, and work well.",
            },
            {
                character: "agent",
                message:
                    "Every stone laid true today brings the edifice one course higher. Begin.",
            },
            {
                character: "agent",
                message:
                    "Morning, brother. The trestle board holds your designs. Honor them.",
            },
        ],

        // ── STREAK ───────────────────────────────────────────────────────────
        streak: [
            {
                character: "agent",
                message:
                    "Consistency is the mark of a master craftsman. Your streak is noted with respect.",
            },
            {
                character: "agent",
                message:
                    "This is a streak. This is what labor and dedication build — stone by stone.",
            },
            {
                character: "director",
                message:
                    "Your dedication is acknowledged by the lodge. This is the standard expected.",
            },
        ],
    },

    // ── Freemason colour palette ──────────────────────────────────────────────
    // Near-black primary on aged parchment, with Masonic gold as the accent.
    cssVars: {
        "--color-primary": "#1A1A2E", // deep indigo-black (lodge night)
        "--color-primary-hover": "#2C2C4A", // slightly lighter for hovers
        "--color-primary-rgb": "26, 26, 46",

        "--color-surface": "#F2EDD7", // aged parchment
        "--color-card": "#EDE8D2", // slightly deeper parchment for cards
        "--color-input-bg": "#F8F4E6", // lightest parchment for inputs

        "--color-text": "#1A1A1A", // near-black text
        "--color-text-muted": "#5C5240", // warm brown-gray for muted text
        "--color-text-faint": "#9E9079", // warm faint for placeholders

        "--color-danger": "#8B0000", // deep crimson (Masonic red)
        "--color-danger-dark": "#5C0000", // darker crimson for hovers
        "--color-danger-rgb": "139, 0, 0",

        "--color-warning": "#C5A028", // Masonic gold
        "--color-success": "#2C5F2E", // deep forest green
        "--color-success-dark": "#1E4020",
        "--color-snooze": "#A0610A", // warm amber-brown

        "--font-display": "'Cinzel', 'Bebas Neue', sans-serif",
        "--font-mono": "'Courier Prime', monospace",
        "--font-accent": "'Cinzel', 'Special Elite', serif",
    },
};
