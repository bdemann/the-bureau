import type { Skin } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Vanilla — plain-English base skin with no thematic flavour.
// All terminology is neutral and self-explanatory.
// ─────────────────────────────────────────────────────────────────────────────

export const vanillaSkin: Skin = {
    id: "vanilla",
    displayName: "Default",

    identity: {
        appName: "Commitment Tracker",
        appShort: "TRACK",
        appTagline: "COMMITMENT TRACKER",
        scoreName: "Score",
        shareTitle: "Commitment Tracker — Stay accountable",
        sharePitch:
            "Stay on top of your commitments with a tool that tracks " +
            "what actually matters — not just due dates.",
    },

    characters: {
        ally: {
            name: "Your Guide",
            shortName: "Guide",
            title: "Coach",
            memoType: "GUIDANCE",
            role: "agent",
        },
        overseer: {
            name: "The System",
            shortName: "System",
            title: "Accountability",
            memoType: "SYSTEM NOTICE",
            role: "director",
        },
    },

    ranks: {
        level0: "Off Track",
        level1: "Struggling",
        level2: "On Track",
        level3: "Consistent",
        level4: "Excellent",
    },

    bands: {
        mandatory: {
            label: "TODAY'S MUST-DOS",
            subtitle: "Must happen today.",
            empty: "Nothing mandatory today.",
        },
        suggested: {
            label: "SUGGESTED FOR TODAY",
            subtitle: "Recommended. Flexible if needed.",
            empty: "Nothing suggested for today.",
        },
        radar: {
            label: "COMING UP",
            subtitle: "Deadline approaching soon.",
            empty: "Nothing coming up.",
        },
        backlog: {
            label: "BACKLOG",
            subtitle: "No pressure today.",
            empty: "Backlog clear.",
        },
    },

    streaks: {
        skipWarning: (n) => `Skipped ×${n}`,
        skipCaution: (n) => `Skipped ×${n} — Forming a pattern`,
        skipDanger: (n) => `FLAGGED — Skipped ×${n}`,
        skipCritical: (n) => `CHRONIC AVOIDANCE ×${n}`,

        snoozeWarning: (n) => `Snoozed ×${n}`,
        snoozeCaution: (n) => `Snoozed ×${n} — Noted`,
        snoozeDanger: (n) => `FLAGGED — Snoozed ×${n}`,
        snoozeCritical: (n) => `OVERDUE REVIEW ×${n}`,

        remediationLow: (n) => `Recovering — ${n} left`,
        remediationMedium: (n) => `Rebuilding — ${n} needed`,
        remediationHigh: (n) => `COMMITMENT REVIEW ×${n}`,
        criticalSnoozeLabel: "OVERDUE",
    },

    types: {
        routine: "Routine",
        task: "Task",
        goal: "Goal",
        goalPlural: "Goals",
        idea: "Idea",
        ideaPlural: "Ideas",
    },

    nav: {
        daily: "Daily",
        areas: "Areas",
        ideas: "Ideas",
        goals: "Goals",
        areasBreadcrumb: "AREAS",
    },

    menu: {
        menuTitle: "Menu",
        insightsSectionLabel: "Insights",
        shareSectionLabel: "Share",
        shareItemLabel: "Invite a Friend",
        shareItemSub: "Share the app with someone",
    },

    pages: {
        ideasTitle: "IDEAS",
        ideasSubtitle: "CAPTURE · REFINE · PROMOTE",
        ideasEmpty: "No ideas filed yet.",

        goalsTitle: "GOALS",
        goalsSubtitle: "LONG-TERM OUTCOMES · TAP A GOAL TO MANAGE COMMITMENTS",

        insightsTitle: "Insights",
        insightsSubtitle: "Patterns, gaps, and performance over time.",
    },

    actions: {
        newRoutineTitle: "NEW ROUTINE",
        newTaskTitle: "NEW TASK",
        newGoalTitle: "NEW GOAL",
        newIdeaTitle: "NEW IDEA",

        editRoutineTitle: "EDIT ROUTINE",
        editTaskTitle: "EDIT TASK",
        editGoalTitle: "EDIT GOAL",
        editIdeaTitle: "EDIT IDEA",

        submitRoutine: "ADD ROUTINE",
        submitTask: "ADD TASK",
        submitGoal: "ADD GOAL",
        submitIdea: "ADD IDEA",

        saveRoutine: "SAVE ROUTINE",
        saveTask: "SAVE TASK",
        saveGoal: "SAVE GOAL",
        saveIdea: "SAVE IDEA",

        deleteRoutineLabel: "DELETE ROUTINE",
        deleteTaskLabel: "DELETE TASK",
        deleteGoalLabel: "DELETE GOAL",
        deleteIdeaLabel: "DELETE IDEA",

        deleteRoutineConfirm: "PERMANENTLY DELETE THIS ROUTINE?",
        deleteTaskConfirm: "PERMANENTLY DELETE THIS TASK?",
        deleteGoalConfirm: "PERMANENTLY DELETE THIS GOAL?",
        deleteIdeaConfirm: "PERMANENTLY DELETE THIS IDEA?",

        deleteRoutineBtn: "DELETE",
        deleteTaskBtn: "DELETE",
        deleteGoalBtn: "DELETE",
        deleteIdeaBtn: "DELETE",

        makeCommitmentCta: "+ ADD COMMITMENT",
    },

    dialogues: {
        task_added: [
            {
                character: "agent",
                message: "Added to your list. Now follow through.",
            },
            {
                character: "agent",
                message: "Commitment logged. It's visible now — make it count.",
            },
            {
                character: "agent",
                message: "Good start. The hard part is still ahead.",
            },
        ],

        task_completed: [
            {
                character: "agent",
                message: "Done. That's how it's supposed to work.",
            },
            {
                character: "agent",
                message: "Completed. Keep that momentum going.",
            },
            {
                character: "agent",
                message: "Good work. One less thing on the list.",
            },
            {
                character: "agent",
                message: "Marked done. You followed through — that matters.",
            },
            {
                character: "director",
                message: "Completed. Meet the same standard tomorrow.",
            },
            {
                character: "director",
                message: "Task done. This is the expected baseline.",
            },
        ],

        task_snoozed_1: [
            {
                character: "agent",
                message: "Pushed to tomorrow. Don't make a habit of it.",
            },
            {
                character: "agent",
                message: "Snoozed once — that's fine. Once.",
            },
            {
                character: "agent",
                message: "Rescheduled. It'll be back in front of you soon.",
            },
        ],

        task_snoozed_2_3: [
            {
                character: "agent",
                message:
                    "This is the second or third push. What's actually blocking this?",
            },
            {
                character: "agent",
                message:
                    "Still showing up, still getting moved. That's a pattern worth noticing.",
            },
            {
                character: "agent",
                message:
                    "Snoozed again. Consider whether this belongs on your list at all.",
            },
        ],

        task_snoozed_4_5: [
            {
                character: "agent",
                message:
                    "Four or five delays. This needs to happen or it needs to come off the list.",
            },
            {
                character: "agent",
                message:
                    "You keep deferring this. Either do it or decide it's not a priority.",
            },
            {
                character: "director",
                message: "This has been delayed repeatedly. Resolve it.",
            },
        ],

        task_snoozed_6plus: [
            {
                character: "director",
                message: "Six or more delays. This is no longer acceptable.",
            },
            {
                character: "director",
                message:
                    "Repeated avoidance is not a strategy. Deal with this.",
            },
            {
                character: "director",
                message: "This has been on the list long enough. Act on it.",
            },
        ],

        task_skipped: [
            {
                character: "agent",
                message:
                    "Skipped. Your score dropped. Move on, but don't forget.",
            },
            {
                character: "agent",
                message: "Passed on this one. It goes in the record.",
            },
            {
                character: "director",
                message: "Skipped. That choice has consequences.",
            },
        ],

        task_overdue: [
            {
                character: "agent",
                message: "This is overdue. Focus on getting it done.",
            },
            {
                character: "agent",
                message:
                    "Past the deadline. Recovery starts with doing the task.",
            },
            {
                character: "director",
                message:
                    "Overdue. No further commentary needed — just finish it.",
            },
        ],

        area_completed: [
            {
                character: "agent",
                message: "All done. That's a complete area — well done.",
            },
            {
                character: "director",
                message: "Area cleared. Maintain this standard.",
            },
        ],

        score_low: [
            {
                character: "agent",
                message:
                    "Your score is low. Small consistent actions will bring it back up.",
            },
            {
                character: "agent",
                message: "Numbers are down. Start with one thing today.",
            },
            {
                character: "director",
                message: "Your score is below expectations. Improve it.",
            },
        ],

        score_high: [
            {
                character: "agent",
                message: "Score is looking good. Keep doing what's working.",
            },
            {
                character: "agent",
                message: "Solid standing. Don't get complacent.",
            },
            {
                character: "director",
                message: "Acceptable performance. Sustain it.",
            },
        ],

        day_start: [
            {
                character: "agent",
                message: "New day. You know what needs doing.",
            },
            {
                character: "agent",
                message:
                    "Morning. Your list is waiting — let's work through it.",
            },
            {
                character: "agent",
                message: "Day started. Focus on what actually matters today.",
            },
        ],

        streak: [
            {
                character: "agent",
                message:
                    "You're on a streak. That's consistency in action — keep it going.",
            },
            {
                character: "agent",
                message: "Streak active. This is what showing up looks like.",
            },
            {
                character: "director",
                message: "Streak noted. This is the standard. Maintain it.",
            },
        ],
    },

    cssVars: undefined,
};
