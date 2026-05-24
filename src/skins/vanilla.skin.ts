import type {Skin} from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Vanilla — plain-English base skin with no thematic flavour.
// All terminology is neutral and self-explanatory.
// ─────────────────────────────────────────────────────────────────────────────

export const vanillaSkin: Skin = {
    id:          'vanilla',
    displayName: 'Default',

    identity: {
        appName:    'Commitment Tracker',
        appShort:   'TRACK',
        appTagline: 'COMMITMENT TRACKER',
        scoreName:  'Score',
        shareTitle: 'Commitment Tracker — Stay accountable',
        sharePitch:
            'Stay on top of your commitments with a tool that tracks ' +
            'what actually matters — not just due dates.',
    },

    characters: {
        ally: {
            name:      'Your Guide',
            shortName: 'Guide',
            title:     'Coach',
            role:      'agent',
        },
        overseer: {
            name:      'The System',
            shortName: 'System',
            title:     'Accountability',
            role:      'director',
        },
    },

    ranks: {
        level0: 'Off Track',
        level1: 'Struggling',
        level2: 'On Track',
        level3: 'Consistent',
        level4: 'Excellent',
    },

    bands: {
        mandatory: {
            label:    "TODAY'S MUST-DOS",
            subtitle: 'Must happen today.',
            empty:    'Nothing mandatory today.',
        },
        suggested: {
            label:    'SUGGESTED FOR TODAY',
            subtitle: 'Recommended. Flexible if needed.',
            empty:    'Nothing suggested for today.',
        },
        radar: {
            label:    'COMING UP',
            subtitle: 'Deadline approaching soon.',
            empty:    'Nothing coming up.',
        },
        backlog: {
            label:    'BACKLOG',
            subtitle: 'No pressure today.',
            empty:    'Backlog clear.',
        },
    },

    streaks: {
        skipWarning:   n => `Skipped ×${n}`,
        skipCaution:   n => `Skipped ×${n} — Forming a pattern`,
        skipDanger:    n => `FLAGGED — Skipped ×${n}`,
        skipCritical:  n => `CHRONIC AVOIDANCE ×${n}`,

        snoozeWarning:  n => `Snoozed ×${n}`,
        snoozeCaution:  n => `Snoozed ×${n} — Noted`,
        snoozeDanger:   n => `FLAGGED — Snoozed ×${n}`,
        snoozeCritical: n => `OVERDUE REVIEW ×${n}`,

        remediationLow:    n => `Recovering — ${n} left`,
        remediationMedium: n => `Rebuilding — ${n} needed`,
        remediationHigh:   n => `COMMITMENT REVIEW ×${n}`,
    },

    types: {
        routine:    'Routine',
        task:       'Task',
        goal:       'Goal',
        goalPlural: 'Goals',
        idea:       'Idea',
        ideaPlural: 'Ideas',
    },

    nav: {
        daily:           'Daily',
        areas:           'Areas',
        ideas:           'Ideas',
        goals:           'Goals',
        areasBreadcrumb: 'AREAS',
    },

    menu: {
        menuTitle:            'Menu',
        insightsSectionLabel: 'Insights',
        shareSectionLabel:    'Share',
        shareItemLabel:       'Invite a Friend',
        shareItemSub:         'Share the app with someone',
    },

    pages: {
        ideasTitle:    'IDEAS',
        ideasSubtitle: 'CAPTURE · REFINE · PROMOTE',
        ideasEmpty:    'No ideas filed yet.',

        goalsTitle:    'GOALS',
        goalsSubtitle: 'LONG-TERM OUTCOMES · TAP A GOAL TO MANAGE COMMITMENTS',

        insightsTitle:    'Insights',
        insightsSubtitle: 'Patterns, gaps, and performance over time.',
    },

    actions: {
        newRoutineTitle:  'NEW ROUTINE',
        newTaskTitle:     'NEW TASK',
        newGoalTitle:     'NEW GOAL',
        newIdeaTitle:     'NEW IDEA',

        editRoutineTitle: 'EDIT ROUTINE',
        editTaskTitle:    'EDIT TASK',
        editGoalTitle:    'EDIT GOAL',
        editIdeaTitle:    'EDIT IDEA',

        submitRoutine:    'ADD ROUTINE',
        submitTask:       'ADD TASK',
        submitGoal:       'ADD GOAL',
        submitIdea:       'ADD IDEA',

        saveRoutine:      'SAVE ROUTINE',
        saveTask:         'SAVE TASK',
        saveGoal:         'SAVE GOAL',
        saveIdea:         'SAVE IDEA',

        deleteRoutineLabel:   'DELETE ROUTINE',
        deleteTaskLabel:      'DELETE TASK',
        deleteGoalLabel:      'DELETE GOAL',
        deleteIdeaLabel:      'DELETE IDEA',

        deleteRoutineConfirm: 'PERMANENTLY DELETE THIS ROUTINE?',
        deleteTaskConfirm:    'PERMANENTLY DELETE THIS TASK?',
        deleteGoalConfirm:    'PERMANENTLY DELETE THIS GOAL?',
        deleteIdeaConfirm:    'PERMANENTLY DELETE THIS IDEA?',

        deleteRoutineBtn:     'DELETE',
        deleteTaskBtn:        'DELETE',
        deleteGoalBtn:        'DELETE',
        deleteIdeaBtn:        'DELETE',

        makeCommitmentCta:    '+ ADD COMMITMENT',
    },

    cssVars: undefined,
};
