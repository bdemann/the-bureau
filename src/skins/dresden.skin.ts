import { defaultSkin } from "./default.skin.js";
import type { Skin } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Dresden's Docket — Dresden Files skin.
//
// Tone: noir Chicago, dry wit, self-aware supernatural thriller. Harry Dresden
// is Chicago's only professional wizard in the phonebook — perpetually behind
// on rent, perpetually in over his head, perpetually showing up anyway.
//
// Ally:    Harry Dresden — warm, self-deprecating, occasionally heroic.
//          "I never claimed to know what I was doing. I just kept moving."
//
// Overseer: Bob the Skull — snarky, analytically cruel, secretly invested.
//           Bob has no patience for excuses and a razor memory for every
//           failure. He also, grudgingly, respects actual follow-through.
//
// Terminology:
//   Areas    → Cases
//   Routines → Rituals (magical practice is routine, or should be)
//   Tasks    → Obligations (a Warden's word for things you can't ignore)
//   Goals    → Investigations (open files Harry is working)
//   Ideas    → Hunches (scrawled on napkins at McAnally's)
//
// Score: White Council Standing — fluctuates with effort, under scrutiny.
//
// Color palette: late-night Chicago — deep charcoal and navy with cold blue
// fluorescent and amber streetlight. Duster-brown accents.
// ─────────────────────────────────────────────────────────────────────────────

export const dresdenSkin: Skin = {
    ...defaultSkin,

    id: "dresden",
    displayName: "Dresden's Docket",

    identity: {
        appName: "Dresden's Docket",
        appShort: "DOCKET",
        appTagline: "CHICAGO WIZARD — CONSULTATION & CASES",
        scoreName: "White Council Standing",
        shareTitle: "Dresden's Docket — A Wizard's Case Files",
        sharePitch:
            "Chicago's only professional wizard keeps a docket: obligations, rituals, " +
            "investigations, and hunches. If it worked for Harry Dresden, it might work " +
            "for you. Don't let the skull talk you out of trying.",
    },

    characters: {
        ally: {
            name: "Harry Dresden",
            shortName: "Harry",
            title: "Wizard, P.I.",
            memoType: "FIELD NOTE",
            role: "agent",
        },
        overseer: {
            name: "Bob the Skull",
            shortName: "Bob",
            title: "Spirit of Intellect",
            memoType: "OCCULT ANALYSIS",
            role: "director",
        },
    },

    ranks: {
        level0: "Vanilla Mortal",
        level1: "Apprentice",
        level2: "Practitioner",
        level3: "Warden",
        level4: "Wizard of the White Council",
    },

    bands: {
        mandatory: {
            label: "BINDING OBLIGATIONS",
            subtitle: "These must be handled. No exceptions.",
            empty: "No binding obligations today. Don't get cocky.",
        },
        suggested: {
            label: "RECOMMENDED TODAY",
            subtitle: "Harry thinks you should get to these.",
            empty: "Nothing pressing today. Enjoy it while it lasts.",
        },
        radar: {
            label: "CLOSING IN",
            subtitle: "Coming due soon. Get ahead of it.",
            empty: "Nothing closing in. Clean slate.",
        },
        backlog: {
            label: "COLD CASES",
            subtitle: "On the board but not urgent.",
            empty: "No cold cases. The docket is clear.",
        },
    },

    streaks: {
        skipWarning: (n) => `Dodged it ×${n}`,
        skipCaution: (n) => `Avoided ×${n} — Harry's noticed`,
        skipDanger: (n) => `RUNNING FROM IT ×${n}`,
        skipCritical: (n) => `WARDEN WILL HEAR ABOUT THIS ×${n}`,

        snoozeWarning: (n) => `Punted ×${n}`,
        snoozeCaution: (n) => `Pushed back ×${n} — Bob is judging you`,
        snoozeDanger: (n) => `UNDER WARDEN REVIEW ×${n}`,
        snoozeCritical: (n) => `WARDEN INQUIRY ×${n}`,

        remediationLow: (n) => `Making up for it — ${n} obligations remain`,
        remediationMedium: (n) => `Penance obligations — ${n} due`,
        remediationHigh: (n) => `WHITE COUNCIL REVIEW ×${n}`,
        criticalSnoozeLabel: "CASE STALLED",
    },

    types: {
        routine: "Ritual",
        task: "Obligation",
        goal: "Investigation",
        goalPlural: "Investigations",
        idea: "Hunch",
        ideaPlural: "Hunches",
        goalAchieved: "solved",
        goalAbandoned: "cold case",
    },

    nav: {
        daily: "Daily Docket",
        areas: "Cases",
        ideas: "Hunches",
        goals: "Investigations",
        areasBreadcrumb: "CASES",
    },

    pages: {
        ideasTitle: "HUNCHES",
        ideasSubtitle: "SCRAWLED ON NAPKINS · AWAITING INVESTIGATION",
        ideasEmpty:
            "The napkin pile is empty. Harry hasn't had a hunch lately.",

        goalsTitle: "INVESTIGATIONS",
        goalsSubtitle:
            "OPEN CASES · TAP AN INVESTIGATION TO MANAGE OBLIGATIONS",

        insightsTitle: "Harry's Notes",
        insightsSubtitle: "A wizard who keeps no records repeats his mistakes.",
        scoreDisclaimer: "",
    },

    menu: {
        menuTitle: "Case Files",
        allCommitmentsSection: "The Docket",
        allTasksLabel: "All Obligations",
        allTasksSub: "Every obligation and ritual across all cases",
        allRoutinesLabel: "All Rituals",
        allRoutinesSub: "Every recurring ritual across all cases",
        allCommitmentsLabel: "Full Docket",
        allCommitmentsSub: "Every obligation, ritual, investigation & hunch on file",
        insightsSectionLabel: "Harry's Notes",
        insightsLabel: "Case Summary",
        insightsSub: "Missed obligations, patterns, and field performance",
        shareSectionLabel: "Spread the Word",
        shareItemLabel: "Recommend a Wizard",
        shareItemSub: "Tell a friend about the docket",
        shoppingListLabel: "Supply Run",
        shoppingListSub: "Groceries, potions, and sundries",

        preferencesLabel: "Preferences",
        appearanceLabel: "Wardrobe",

        dataSectionLabel: "Data",
        exportJsonLabel: "Export Backup",
        exportJsonSub: "Download full backup as JSON",
        exportCsvLabel: "Export Obligation List",
        exportCsvSub: "Download all obligations as CSV",
        importLabel: "Import Backup",
        importSub: "Restore from a previous JSON backup",
    },

    actions: {
        newRoutineTitle: "NEW RITUAL",
        newTaskTitle: "NEW OBLIGATION",
        newGoalTitle: "OPEN INVESTIGATION",
        newIdeaTitle: "NEW HUNCH",

        editRoutineTitle: "REVISE RITUAL",
        editTaskTitle: "REVISE OBLIGATION",
        editGoalTitle: "REVISE INVESTIGATION",
        editIdeaTitle: "DEVELOP HUNCH",

        submitRoutine: "ESTABLISH RITUAL",
        submitTask: "TAKE ON OBLIGATION",
        submitGoal: "OPEN CASE",
        submitIdea: "JOLT IT DOWN",

        saveRoutine: "SAVE RITUAL",
        saveTask: "SAVE OBLIGATION",
        saveGoal: "SAVE INVESTIGATION",
        saveIdea: "SAVE HUNCH",

        deleteRoutineLabel: "ABANDON RITUAL",
        deleteTaskLabel: "DROP OBLIGATION",
        deleteGoalLabel: "CLOSE CASE",
        deleteIdeaLabel: "DISCARD HUNCH",

        deleteRoutineConfirm: "PERMANENTLY ABANDON THIS RITUAL?",
        deleteTaskConfirm: "PERMANENTLY DROP THIS OBLIGATION?",
        deleteGoalConfirm: "PERMANENTLY CLOSE THIS CASE?",
        deleteIdeaConfirm: "PERMANENTLY DISCARD THIS HUNCH?",

        deleteRoutineBtn: "ABANDON",
        deleteTaskBtn: "DROP IT",
        deleteGoalBtn: "CLOSE CASE",
        deleteIdeaBtn: "DISCARD",

        makeCommitmentCta: "+ ADD OBLIGATION",
    },

    areaCard: {
        ...defaultSkin.areaCard,
        watchingFlag: "★ BOB WATCHING",
        allClearedFlag: "✓ CASE CLOSED",
    },

    commitmentList: {
        ...defaultSkin.commitmentList,
        activeHeader: "OPEN OBLIGATIONS",
        pausedHeader: "ON HOLD",
        snoozedHeader: "PUNTED",
        clearedToggleShow: (n) =>
            `Show ${n} closed obligation${n !== 1 ? "s" : ""}`,
        clearedToggleHide: (n) =>
            `Hide ${n} closed obligation${n !== 1 ? "s" : ""}`,
        emptyState: "No open obligations on this case.",
        emptyQuote:
            '"The only way out is through." — Harry Dresden',
        newCommitmentCta: "+ TAKE ON OBLIGATION",
    },

    areaEdit: {
        ...defaultSkin.areaEdit,
        nameLabel: "Case Name",
        briefingLabel: "Case Notes",
        colorLabel: "Case Color",
        editBtn: "REVISE CASE",
        deleteBtn: "CLOSE CASE FILE",
        deleteConfirmBtn: "CLOSE",
        deletePrompt:
            "PERMANENTLY CLOSE THIS CASE AND ALL ITS OBLIGATIONS?",
    },

    commitmentRow: {
        ...defaultSkin.commitmentRow,
        completeTitle: "Mark obligation fulfilled",
        logProgressTitle: "Log progress or fulfill the obligation",
        snoozeBtn: "Punt (+24h)",
        skipBtn: "Dodge",
        wakeUpBtn: "Back on it",
        routineKindBadge: "RITUAL",
    },

    wizard: {
        ...defaultSkin.wizard,
        step1Title: "OPEN A NEW CASE",
        step1Prompt:
            "What area of your life is asking for your attention? Give it a name and put it on the board.",
        step1NameLabel: "Case Name *",
        step1NamePlaceholder: "e.g. Health, Side Business, Home",
        step1BriefingLabel: "Case Notes (optional)",
        step1BriefingPlaceholder:
            "What's the deal with this one? Give yourself context.",
        step1ColorLabel: "Case Color",
        step1QuickCreateBtn: "Open case (no obligations yet)",
        step2Title: "NAME YOUR OBLIGATIONS",
        step2Prompt: (areaName) =>
            `If this is a real case — "${areaName}" — what are you actually on the hook for? Be honest. List one per line.`,
        step2CommitmentsLabel: "Obligations (one per line)",
        step2CommitmentsPlaceholder:
            "e.g.\nRun 3× per week\nCall accountant monthly\nReview investments quarterly",
        step2CreateWithoutBtn: "Open without obligations",
        step2ConfigureBtn: (n) =>
            `Configure ${n} obligation${n !== 1 ? "s" : ""} →`,
        step2CreateAreaBtn: "Open case →",
        step3Title: "CONFIGURE OBLIGATION",
        step3NameLabel: "Obligation Name *",
        step3NamePlaceholder: "What exactly are you on the hook for?",
        step3CreateSoFarBtn: "Open case with obligations so far",
        step3CreateWithoutBtn: "Open without obligations",
        step3FinishBtn: "Open Case ✓",
    },

    dialogues: {
        // ── TASK ADDED ───────────────────────────────────────────────────────
        task_added: [
            {
                character: "agent",
                message: "Okay, it's on the docket. Don't let it collect dust.",
            },
            {
                character: "agent",
                message:
                    "Added. I've taken on obligations with worse odds. We'll figure it out.",
            },
            {
                character: "agent",
                message:
                    "Written down. Now I just have to actually do it. Classic wizard problem.",
            },
            {
                character: "director",
                message:
                    "New obligation logged. Do try to handle it before it becomes a crisis. For once.",
            },
            {
                character: "director",
                message:
                    "Noted. Whether you'll follow through is, as always, the open question.",
            },
        ],

        // ── TASK COMPLETED ───────────────────────────────────────────────────
        task_completed: [
            {
                character: "agent",
                message: "Done. I'll take a win wherever I can get one.",
            },
            {
                character: "agent",
                message: "Got it handled. Murphy would be impressed. Probably.",
            },
            {
                character: "agent",
                message:
                    "Finished. It only took three times as long as it should have.",
            },
            {
                character: "agent",
                message:
                    "That's off the docket. One less thing trying to kill me.",
            },
            {
                character: "director",
                message:
                    "Completed. I note this without sarcasm, which should tell you something.",
            },
            {
                character: "director",
                message:
                    "Obligation fulfilled. The White Council expects consistency, not just occasional heroics.",
            },
            {
                character: "director",
                message:
                    "Done. See? Not impossible. Just improbable with you involved.",
            },
        ],

        // ── SNOOZE ×1 ────────────────────────────────────────────────────────
        task_snoozed_1: [
            {
                character: "agent",
                message:
                    "Pushed it to tomorrow. I do that more than I'd like to admit.",
            },
            {
                character: "agent",
                message: "Snoozed. It'll still be there. They always are.",
            },
            {
                character: "director",
                message:
                    "Deferred. Understandable, I suppose, though it sets a pattern I don't love.",
            },
        ],

        // ── SNOOZE ×2–3 ──────────────────────────────────────────────────────
        task_snoozed_2_3: [
            {
                character: "agent",
                message: "Again. Okay. I'm not going to lecture myself. Much.",
            },
            {
                character: "agent",
                message:
                    "Second snooze. Even I have limits on how long I can ignore something.",
            },
            {
                character: "director",
                message:
                    "Multiple deferrals. This is beginning to look less like scheduling and more like avoidance.",
            },
            {
                character: "director",
                message: "Still not handled. I have noticed. I always notice.",
            },
        ],

        // ── SNOOZE ×4–5 ──────────────────────────────────────────────────────
        task_snoozed_4_5: [
            {
                character: "agent",
                message:
                    "Four times. Okay. This one is clearly scared of me. Or I'm scared of it.",
            },
            {
                character: "agent",
                message:
                    "At some point, avoiding the obligation IS the problem. I know this. I hate knowing this.",
            },
            {
                character: "director",
                message:
                    "You've deferred this four times. The White Council would not be amused.",
            },
            {
                character: "director",
                message:
                    "This is becoming a habit. Bad habits are how wizards get killed. Just saying.",
            },
        ],

        // ── SNOOZE ×6+ ───────────────────────────────────────────────────────
        task_snoozed_6plus: [
            {
                character: "director",
                message:
                    "Six deferrals. You're not managing this; you're hoping it disappears. It won't.",
            },
            {
                character: "director",
                message:
                    "At this point you should just admit you're not doing it and delete it. Or do it. Those are the options.",
            },
            {
                character: "director",
                message:
                    "A Warden who runs from their obligations is just a mortal with a sword. Do better.",
            },
        ],

        // ── TASK SKIPPED ─────────────────────────────────────────────────────
        task_skipped: [
            {
                character: "agent",
                message: "Skipped. It'll come back around. It always does.",
            },
            {
                character: "agent",
                message:
                    "Marked skipped. I'm not proud of it, but I'm not lying about it either.",
            },
            {
                character: "director",
                message:
                    "Skipped. Noted in the records, which I keep meticulously, unlike some wizards.",
            },
            {
                character: "director",
                message:
                    "You ran from it. The White Council doesn't forget. Neither do I.",
            },
        ],

        // ── TASK OVERDUE ─────────────────────────────────────────────────────
        task_overdue: [
            {
                character: "agent",
                message:
                    "It's overdue. I know. Knowing doesn't help much, but here we are.",
            },
            {
                character: "agent",
                message:
                    "Past due. The best time to handle it was yesterday. Second best time is now.",
            },
            {
                character: "director",
                message:
                    "Overdue. The window is closing. Act before it closes on your fingers.",
            },
            {
                character: "director",
                message:
                    "You are behind. This is not a new observation. What are you going to do about it?",
            },
        ],

        // ── AREA COMPLETED ───────────────────────────────────────────────────
        area_completed: [
            {
                character: "agent",
                message:
                    "Case closed. I don't say that often enough. Case. Closed.",
            },
            {
                character: "agent",
                message:
                    "All obligations on this one — handled. That's the whole job, right there.",
            },
            {
                character: "director",
                message:
                    "Investigation complete. All obligations fulfilled. I am, very grudgingly, impressed.",
            },
        ],

        // ── SCORE LOW ────────────────────────────────────────────────────────
        score_low: [
            {
                character: "agent",
                message:
                    "My White Council Standing is in the gutter. Story of my life. Let's fix it.",
            },
            {
                character: "agent",
                message:
                    "Low standing. Okay. I've come back from worse. Technically. Mostly.",
            },
            {
                character: "director",
                message:
                    "Your standing is embarrassingly low. The Senior Council has noticed. I would fix that.",
            },
            {
                character: "director",
                message:
                    "At this standing, you're one review away from probation. Pick up the pace.",
            },
        ],

        // ── SCORE HIGH ───────────────────────────────────────────────────────
        score_high: [
            {
                character: "agent",
                message:
                    "Good standing. Don't let it go to your head. Something will try to ruin it.",
            },
            {
                character: "agent",
                message:
                    "Strong showing. Almost like a professional wizard who has his act together.",
            },
            {
                character: "director",
                message:
                    "Your standing is commendable. I'd say enjoy it, but you'll find a way to complicate it.",
            },
        ],

        // ── DAY START ────────────────────────────────────────────────────────
        day_start: [
            {
                character: "agent",
                message:
                    "Another day in Chicago. The docket's waiting. Let's see what wants to kill me today.",
            },
            {
                character: "agent",
                message:
                    "Morning. I've already had coffee. Now I just need to survive everything on this list.",
            },
            {
                character: "agent",
                message:
                    "New day, new obligations. I've faced worse odds. Technically. Let's go.",
            },
            {
                character: "agent",
                message:
                    "Docket's open. Dresden, P.I., is in the office. Relatively speaking.",
            },
        ],

        // ── STREAK ───────────────────────────────────────────────────────────
        streak: [
            {
                character: "agent",
                message:
                    "A streak. Actual, sustained effort. I impress myself sometimes.",
            },
            {
                character: "agent",
                message:
                    "Keeping it going. This is what separates a professional wizard from a guy who was really into Tolkien.",
            },
            {
                character: "director",
                message:
                    "Your streak is noted. Consistency is the least appreciated form of power. You're proving that.",
            },
        ],
    },

    // ── Dresden Files colour palette ─────────────────────────────────────────
    // Noir Chicago night: deep charcoal-navy with cold blue and amber streetlight.
    cssVars: {
        "--color-primary": "#1C1F2E", // near-black Chicago night
        "--color-primary-hover": "#2A2D40", // slightly lighter
        "--color-primary-rgb": "28, 31, 46",

        "--color-surface": "#F0EDE8", // pale off-white, old paper
        "--color-card": "#E8E4DD", // slightly warm card background
        "--color-input-bg": "#F5F2ED", // lightest for inputs

        "--color-text": "#1A1A22", // near-black text
        "--color-text-muted": "#565060", // muted with slight blue-gray cast
        "--color-text-faint": "#9A95A0", // faint placeholder text

        "--color-danger": "#A0271A", // Chicago fire red
        "--color-danger-dark": "#6E1810",
        "--color-danger-rgb": "160, 39, 26",

        "--color-warning": "#C8842A", // amber streetlight gold
        "--color-success": "#2B5E3A", // dark Chicago park green
        "--color-success-dark": "#1C3E28",
        "--color-snooze": "#8A5A1A", // warm amber-brown

        "--font-display": "'Special Elite', 'Bebas Neue', sans-serif",
        "--font-mono": "'Courier Prime', monospace",
        "--font-accent": "'Special Elite', serif",
    },
};
