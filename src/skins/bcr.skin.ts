import { defaultSkin } from "./default.skin.js";
import type { Skin } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// BCR Clear — Bureau of Civic Responsibility skin.
// The original flavour: cold-war bureaucracy, civic duty, character dialogue.
// ─────────────────────────────────────────────────────────────────────────────

export const bcrSkin: Skin = {
    ...defaultSkin,

    id: "bcr",
    displayName: "BCR Clear",

    identity: {
        appName: "BCR Clear",
        appShort: "CLEAR",
        appTagline: "BUREAU OF CIVIC RESPONSIBILITY",
        scoreName: "Patriot Score",
        shareTitle: "CLEAR — Civic Engagement Tracking System",
        sharePitch:
            "A neighbor has flagged you for potential civic disengagement. " +
            "Install CLEAR — the BCR's official self-monitoring application — " +
            "to verify your compliance record and demonstrate to the BCR that " +
            "your patriotism is beyond question.",
    },

    characters: {
        ally: {
            name: "Agent Whitaker",
            shortName: "Whitaker",
            title: "Field Agent",
            memoType: "INTERNAL MEMO",
            role: "agent",
        },
        overseer: {
            name: "Director Briggs",
            shortName: "Briggs",
            title: "Director",
            memoType: "OFFICIAL NOTICE",
            role: "director",
        },
    },

    ranks: {
        level0: "Suspected Communist",
        level1: "Disengaged Citizen",
        level2: "Citizen",
        level3: "Loyal Citizen",
        level4: "Patriot",
    },

    bands: {
        mandatory: {
            label: "TODAY'S MANDATORY",
            subtitle: "Must happen today. No exceptions.",
            empty: "No mandatory tasks today. Agent Whitaker approves.",
        },
        suggested: {
            label: "SUGGESTED FOR TODAY",
            subtitle: "Recommended. Moveable if life intervenes.",
            empty: "Nothing suggested for today.",
        },
        radar: {
            label: "ON YOUR RADAR",
            subtitle: "Approaching. Don't forget.",
            empty: "Nothing on the radar.",
        },
        backlog: {
            label: "BACKLOG",
            subtitle: "No pressure today.",
            empty: "Backlog clear.",
        },
    },

    streaks: {
        ...defaultSkin.streaks,
        skipCaution: (n) => `Skipped ×${n} — Pattern noted`,
        snoozeCritical: (n) => `UNDER REVIEW ×${n}`,
        remediationMedium: (n) => `Remediation — ${n} needed`,
        remediationHigh: (n) => `INTEGRITY AUDIT ×${n}`,
        criticalSnoozeLabel: "UNDER REVIEW",
    },

    types: {
        ...defaultSkin.types,
        routine: "Routine",
        task: "Task",
        goal: "Goal",
        goalPlural: "Goals",
        idea: "Idea",
        ideaPlural: "Ideas",
    },

    nav: {
        ...defaultSkin.nav,
        areasBreadcrumb: "RESPONSIBILITIES",
    },

    menu: {
        ...defaultSkin.menu,
        menuTitle: "Bureau Menu",
        allCommitmentsSection: "Filed Records",
        allTasksLabel: "All Tasks",
        allTasksSub: "Every task & routine across all areas",
        allRoutinesLabel: "All Routines",
        allRoutinesSub: "Every recurring routine across all areas",
        allCommitmentsLabel: "All Commitments",
        allCommitmentsSub: "Every task, routine, goal & idea on file",
        insightsSectionLabel: "Intelligence",
        insightsLabel: "Insights",
        insightsSub: "Compliance gaps, behavioral patterns, field performance",
        shareSectionLabel: "Community Duty",
        shareItemLabel: "Report a Neighbor",
        shareItemSub: "Refer a civic non-compliant to CLEAR",
        appearanceLabel: "Presentation",

        dataSectionLabel: "Bureau Records",
        exportJsonLabel: "Export Dossier",
        exportJsonSub: "Download full bureau records as JSON",
        exportCsvLabel: "Export Field Report",
        exportCsvSub: "Download all directives as CSV for analysis",
        importLabel: "Restore Records",
        importSub: "Restore bureau records from a JSON backup",
    },

    pages: {
        ideasTitle: "IDEAS",
        ideasSubtitle: "UNPROCESSED OBSERVATIONS · PROPOSED AREAS",
        ideasEmpty: "No intelligence on file. Observations go here.",
        goalsTitle: "GOALS",
        goalsSubtitle:
            "LONG-HORIZON OUTCOMES · CLICK A GOAL TO MANAGE COMMITMENTS",
        insightsTitle: "Insights",
        insightsSubtitle:
            "Behavioral patterns, compliance gaps, and field performance.",
    },

    actions: {
        ...defaultSkin.actions,
        newRoutineTitle: "MAKE NEW ROUTINE",
        newTaskTitle: "MAKE NEW TASK",
        newGoalTitle: "NEW GOAL",
        newIdeaTitle: "NEW IDEA",
        editRoutineTitle: "AMEND ROUTINE",
        editTaskTitle: "AMEND TASK",
        editGoalTitle: "AMEND GOAL",
        editIdeaTitle: "AMEND IDEA",
        submitRoutine: "COMMIT ROUTINE",
        submitTask: "ADD TASK",
        submitGoal: "SET GOAL",
        submitIdea: "FILE IDEA",
        saveRoutine: "COMMIT TO ROUTINE",
        saveTask: "SAVE TASK",
        saveGoal: "SAVE GOAL",
        saveIdea: "SAVE IDEA",
        deleteRoutineLabel: "TERMINATE COMMITMENT",
        deleteTaskLabel: "TERMINATE COMMITMENT",
        deleteGoalLabel: "DELETE GOAL",
        deleteIdeaLabel: "DELETE IDEA",
        deleteRoutineConfirm: "PERMANENTLY TERMINATE THIS COMMITMENT?",
        deleteTaskConfirm: "PERMANENTLY TERMINATE THIS COMMITMENT?",
        deleteGoalConfirm: "PERMANENTLY DELETE THIS GOAL?",
        deleteIdeaConfirm: "PERMANENTLY DELETE THIS IDEA?",
        deleteRoutineBtn: "TERMINATE",
        deleteTaskBtn: "TERMINATE",
        deleteGoalBtn: "DELETE",
        deleteIdeaBtn: "DELETE",
        makeCommitmentCta: "+ MAKE COMMITMENT",
    },

    areaCard: {
        ...defaultSkin.areaCard,
        watchingFlag: "★ BRIGGS WATCHING",
        allClearedFlag: "✓ CLEARED",
    },

    commitmentList: {
        ...defaultSkin.commitmentList,
        emptyQuote:
            '"A cleared docket is not an idle one — it is a prepared one."\n— Agent H. Whitaker',
    },

    areaEdit: {
        ...defaultSkin.areaEdit,
        briefingLabel: "Briefing",
        colorLabel: "Designation Color",
        editBtn: "EDIT AREA",
        deleteBtn: "DECOMMISSION AREA",
        deleteConfirmBtn: "DECOMMISSION",
        deletePrompt:
            "PERMANENTLY DECOMMISSION THIS AREA AND ALL ITS COMMITMENTS?",
    },

    wizard: {
        ...defaultSkin.wizard,
        step1Title: "NEW AREA OF RESPONSIBILITY",
        step1BriefingLabel: "Briefing (optional)",
        step1BriefingPlaceholder:
            "What does it mean to you to be on top of this area?",
        step1ColorLabel: "Designation Color",
        step2Title: "IDENTIFY YOUR COMMITMENTS",
        step2Prompt: (areaName) =>
            `If you told a friend you were into ${areaName}, what would you need to be doing regularly to feel honest saying that? List one item per line.`,
        step2CommitmentsLabel: "Your Commitments (one per line)",
        step2CommitmentsPlaceholder:
            "e.g.\nDo a weekly project\nTry a new technique monthly\nShare something I made quarterly\nCall mother daily",
    },

    dialogues: {
        // ── TASK ADDED ───────────────────────────────────────────────────────
        task_added: [
            {
                character: "director",
                message:
                    "The only good Commie is a Commi-tment. Welcome to the file, citizen.",
            },
            {
                character: "agent",
                message:
                    "New item on the docket. I've got my eye on it — and so do you now. Let's keep it that way.",
            },
            {
                character: "agent",
                message:
                    "A documented task is a task that can be cleared. That's how this works.",
            },
            {
                character: "agent",
                message:
                    "Good. Getting it out of your head and into the system is half the battle.",
            },
        ],

        // ── TASK COMPLETED ───────────────────────────────────────────────────
        task_completed: [
            {
                character: "agent",
                message:
                    "There it is. Done, documented, and out of the file. That's exactly what I'm talking about.",
            },
            {
                character: "agent",
                message:
                    "Good. Keep that momentum. One completed task is evidence of a pattern — make it a good one.",
            },
            {
                character: "agent",
                message:
                    "Cleared. I'll make sure this goes in your record — the good column.",
            },
            {
                character: "agent",
                message:
                    "Handled. You know Briggs watches the completion rate? This keeps him off both our backs.",
            },
            {
                character: "agent",
                message:
                    "Done. That felt good, didn't it? That's not nothing. Hold onto that.",
            },
            {
                character: "director",
                message:
                    "Adequate. A true patriot would have completed this before it was even due.",
            },
            {
                character: "director",
                message:
                    "Task cleared. This is what I expect. Continued excellence is not optional.",
            },
            {
                character: "director",
                message:
                    "Noted. The completion record is updated. Do not let this become the exception rather than the rule.",
            },
        ],

        // ── SNOOZE ×1 ────────────────────────────────────────────────────────
        task_snoozed_1: [
            {
                character: "agent",
                message:
                    "Fine. Everyone gets a day. Just don't let this become a habit — the file stays open.",
            },
            {
                character: "agent",
                message:
                    "One snooze — that's well within normal parameters. We're good. For now.",
            },
            {
                character: "agent",
                message:
                    "Okay. Tomorrow then. I'll have it back in front of you first thing.",
            },
        ],

        // ── SNOOZE ×2–3 ──────────────────────────────────────────────────────
        task_snoozed_2_3: [
            {
                character: "agent",
                message:
                    "This is the second time. Or third. I lose count, which is actually the problem.",
            },
            {
                character: "agent",
                message:
                    "I'm not going to lecture you. But I am going to point out that this task keeps showing up.",
            },
            {
                character: "agent",
                message:
                    "Still here. Still watching. What's actually in the way on this one?",
            },
            {
                character: "agent",
                message:
                    "You know I can see the snooze count, right? Briggs can too. Let's get ahead of this.",
            },
        ],

        // ── SNOOZE ×4–5 ──────────────────────────────────────────────────────
        task_snoozed_4_5: [
            {
                character: "agent",
                message:
                    "Okay, I need you to listen to me. Briggs reviews snooze logs on Thursdays. Do this task.",
            },
            {
                character: "agent",
                message:
                    "Four delays. I'm not filing this as negligence — yet. But I need to see movement.",
            },
            {
                character: "agent",
                message:
                    "I'm in your corner. But I can only defend a pattern that's actually improving. Help me out here.",
            },
            {
                character: "agent",
                message:
                    "This is the fourth or fifth time. I've been making excuses. I'm running low on good ones.",
            },
        ],

        // ── SNOOZE ×6+ (Director Briggs takes over) ──────────────────────────
        task_snoozed_6plus: [
            {
                character: "director",
                message:
                    "This task has been delayed SIX TIMES. I have flagged it in your permanent record.",
            },
            {
                character: "director",
                message:
                    "An enemy of productivity is an enemy of this nation. You are on notice, citizen.",
            },
            {
                character: "director",
                message:
                    "I will be monitoring your file personally until this item is resolved. Whitaker has been notified of his failure to motivate you.",
            },
            {
                character: "director",
                message:
                    "Six delays. In my day we called that sabotage. I am choosing to call it incompetence. For now.",
            },
        ],

        // ── TASK SKIPPED ─────────────────────────────────────────────────────
        task_skipped: [
            {
                character: "director",
                message:
                    "Skipped. That goes in the file, citizen. Every skip is a data point.",
            },
            {
                character: "director",
                message:
                    "You chose not to do it. That is a choice I will remember when scores are reviewed.",
            },
            {
                character: "agent",
                message:
                    "Skipping this one. Noted. Just make sure it doesn't become a pattern.",
            },
            {
                character: "agent",
                message:
                    "Alright, moving on. But your score took a hit — Briggs notices these things.",
            },
        ],

        // ── TASK OVERDUE ─────────────────────────────────────────────────────
        task_overdue: [
            {
                character: "director",
                message:
                    "This task is overdue. I do not accept excuses. I accept completed tasks.",
            },
            {
                character: "director",
                message:
                    "The deadline was not a suggestion. Your patriot score reflects this.",
            },
            {
                character: "director",
                message:
                    "I have added an overdue notation to your file. This is not a small thing.",
            },
            {
                character: "agent",
                message:
                    "This one's past due. I know. Let's just focus on getting it done before Briggs makes it worse.",
            },
            {
                character: "agent",
                message:
                    "Overdue. Look — I've seen worse cases turn around. But it starts with doing the task.",
            },
        ],

        // ── AREA COMPLETED ───────────────────────────────────────────────────
        area_completed: [
            {
                character: "agent",
                message:
                    "All tasks cleared. That's an area off the board. I'm genuinely impressed — you should be too.",
            },
            {
                character: "director",
                message:
                    "Area complete. This is what a functioning citizen looks like. File that feeling away.",
            },
        ],

        // ── SCORE LOW ────────────────────────────────────────────────────────
        score_low: [
            {
                character: "director",
                message:
                    "Your patriot score is below acceptable thresholds. I am deeply concerned. You should be too.",
            },
            {
                character: "director",
                message:
                    "A score this low raises questions I would prefer not to have to ask. Get it together.",
            },
            {
                character: "agent",
                message:
                    "Your score is down. I know these numbers feel arbitrary. But they're what he looks at. Let's bring it up.",
            },
            {
                character: "agent",
                message:
                    "I've been running interference for you but this score is getting hard to explain. Start with one thing.",
            },
        ],

        // ── SCORE HIGH ───────────────────────────────────────────────────────
        score_high: [
            {
                character: "agent",
                message:
                    "Your patriot score is looking solid. This is what consistent follow-through looks like. Hold the line.",
            },
            {
                character: "agent",
                message:
                    "Good standing. Don't let it make you complacent — that's when things start slipping.",
            },
            {
                character: "director",
                message:
                    "Your current standing is acceptable. Do not interpret this as permission to relax.",
            },
        ],

        // ── DAY START ────────────────────────────────────────────────────────
        day_start: [
            {
                character: "agent",
                message:
                    "New day. Clean slate — well, mostly. You've got some things to clear. Let's do this.",
            },
            {
                character: "agent",
                message:
                    "Morning. I've reviewed your queue. There's work to do, but nothing you can't handle.",
            },
            {
                character: "agent",
                message:
                    "Good morning, citizen. Your file is open. Let's make sure what goes in it today is worth reading.",
            },
            {
                character: "agent",
                message:
                    "Day start. I've got your back — same as always. But you've got to meet me halfway.",
            },
        ],

        // ── STREAK ───────────────────────────────────────────────────────────
        streak: [
            {
                character: "agent",
                message:
                    "You've been consistent. I've made note of that. So has Briggs, for once in a positive way.",
            },
            {
                character: "agent",
                message:
                    "This is a streak. This is what it looks like when things are working. Remember this feeling.",
            },
            {
                character: "director",
                message:
                    "Your streak is noted. This is the baseline expectation. Maintain it.",
            },
        ],
    },

    cssVars: undefined,
};
