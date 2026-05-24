import type {Skin} from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// BCR Clear — Bureau of Civic Responsibility skin.
// The original flavour: cold-war bureaucracy, civic duty, character dialogue.
// ─────────────────────────────────────────────────────────────────────────────

export const bcrSkin: Skin = {
    id:          'bcr',
    displayName: 'BCR Clear',

    identity: {
        appName:   'BCR Clear',
        appShort:  'CLEAR',
        scoreName: 'Patriot Score',
        sharePitch:
            "A neighbor has flagged you for potential civic disengagement. " +
            "Install CLEAR — the BCR's official self-monitoring application — " +
            "to verify your compliance record and demonstrate to the BCR that " +
            "your patriotism is beyond question.",
    },

    characters: {
        ally: {
            name:      'Agent Whitaker',
            shortName: 'Whitaker',
            title:     'Field Agent',
            role:      'agent',
        },
        overseer: {
            name:      'Director Briggs',
            shortName: 'Briggs',
            title:     'Director',
            role:      'director',
        },
    },

    ranks: {
        level0: 'Suspected Communist',
        level1: 'Disengaged Citizen',
        level2: 'Citizen',
        level3: 'Loyal Citizen',
        level4: 'Patriot',
    },

    bands: {
        mandatory: {
            label:    "TODAY'S MANDATORY",
            subtitle: 'Must happen today. No exceptions.',
            empty:    'No mandatory tasks today. Agent Whitaker approves.',
        },
        suggested: {
            label:    'SUGGESTED FOR TODAY',
            subtitle: 'Recommended. Moveable if life intervenes.',
            empty:    'Nothing suggested for today.',
        },
        radar: {
            label:    'ON YOUR RADAR',
            subtitle: "Approaching. Don't forget.",
            empty:    'Nothing on the radar.',
        },
        backlog: {
            label:    'BACKLOG',
            subtitle: 'No pressure today.',
            empty:    'Backlog clear.',
        },
    },

    streaks: {
        skipWarning:   n => `Skipped ×${n}`,
        skipCaution:   n => `Skipped ×${n} — Pattern noted`,
        skipDanger:    n => `FLAGGED — Skipped ×${n}`,
        skipCritical:  n => `CHRONIC AVOIDANCE ×${n}`,

        snoozeWarning:  n => `Snoozed ×${n}`,
        snoozeCaution:  n => `Snoozed ×${n} — Noted`,
        snoozeDanger:   n => `FLAGGED — Snoozed ×${n}`,
        snoozeCritical: n => `UNDER REVIEW ×${n}`,

        remediationLow:    n => `Recovering — ${n} left`,
        remediationMedium: n => `Remediation — ${n} needed`,
        remediationHigh:   n => `INTEGRITY AUDIT ×${n}`,
    },

    types: {
        routine:    'Routine',
        task:       'Task',
        goal:       'Objective',
        goalPlural: 'Objectives',
        idea:       'Idea',
        ideaPlural: 'Ideas',
    },

    nav: {
        daily: 'Daily',
        areas: 'Areas',
        ideas: 'Ideas',
        goals: 'Goals',
    },

    pages: {
        ideasTitle:    'IDEAS',
        ideasSubtitle: 'UNPROCESSED OBSERVATIONS · PROPOSED AREAS',
        ideasEmpty:    'No intelligence on file. Observations go here.',

        goalsTitle:    'GOALS',
        goalsSubtitle: 'LONG-HORIZON OUTCOMES · CLICK AN OBJECTIVE TO MANAGE COMMITMENTS',

        insightsTitle:    'Insights',
        insightsSubtitle: 'Behavioral patterns, compliance gaps, and field performance.',
    },

    // BCR uses the base stylesheet directly — no overrides needed.
    cssVars: undefined,
};
