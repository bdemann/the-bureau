import type {Character} from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Character voice lines for Director R. Harlan Briggs and Agent Henry "Hal" Whitaker
//
// Briggs:    Clipped. Accusatory. Patriotism-as-surveillance. Never truly warm.
// Whitaker:  Pragmatic. Genuinely invested. Knows the system is imperfect.
//            He's on your side, but he's also got a file to maintain.
// ─────────────────────────────────────────────────────────────────────────────

export type DialogueTrigger =
    | 'task_added'
    | 'task_completed'
    | 'task_snoozed_1'
    | 'task_snoozed_2_3'
    | 'task_snoozed_4_5'
    | 'task_snoozed_6plus'
    | 'task_overdue'
    | 'project_completed'
    | 'score_low'
    | 'score_high'
    | 'day_start'
    | 'streak';

export interface DialogueLine {
    character: Character;
    trigger: DialogueTrigger;
    message: string;
}

export const DIALOGUES: readonly DialogueLine[] = [
    // ── TASK ADDED ────────────────────────────────────────────────────────────
    {
        character: 'agent',
        trigger: 'task_added',
        message:
            "New item on the docket. I've got my eye on it — and so do you now. Let's keep it that way.",
    },
    {
        character: 'agent',
        trigger: 'task_added',
        message:
            'A documented task is a task that can be cleared. That\'s how this works.',
    },
    {
        character: 'agent',
        trigger: 'task_added',
        message:
            "Good. Getting it out of your head and into the system is half the battle.",
    },

    // ── TASK COMPLETED — Agent Whitaker ─────────────────────────────────────────
    {
        character: 'agent',
        trigger: 'task_completed',
        message:
            "There it is. Done, documented, and out of the file. That's exactly what I'm talking about.",
    },
    {
        character: 'agent',
        trigger: 'task_completed',
        message:
            'Good. Keep that momentum. One completed task is evidence of a pattern — make it a good one.',
    },
    {
        character: 'agent',
        trigger: 'task_completed',
        message: "Cleared. I'll make sure this goes in your record — the good column.",
    },
    {
        character: 'agent',
        trigger: 'task_completed',
        message:
            "Handled. You know Briggs watches the completion rate? This keeps him off both our backs.",
    },
    {
        character: 'agent',
        trigger: 'task_completed',
        message:
            "Done. That felt good, didn't it? That's not nothing. Hold onto that.",
    },

    // ── TASK COMPLETED — Director Briggs ─────────────────────────────────────
    {
        character: 'director',
        trigger: 'task_completed',
        message: 'Adequate. A true patriot would have completed this before it was even due.',
    },
    {
        character: 'director',
        trigger: 'task_completed',
        message: 'Task cleared. This is what I expect. Continued excellence is not optional.',
    },
    {
        character: 'director',
        trigger: 'task_completed',
        message:
            'Noted. The completion record is updated. Do not let this become the exception rather than the rule.',
    },

    // ── SNOOZE ×1 — Agent Whitaker ──────────────────────────────────────────────
    {
        character: 'agent',
        trigger: 'task_snoozed_1',
        message: "Fine. Everyone gets a day. Just don't let this become a habit — the file stays open.",
    },
    {
        character: 'agent',
        trigger: 'task_snoozed_1',
        message: "One snooze — that's well within normal parameters. We're good. For now.",
    },
    {
        character: 'agent',
        trigger: 'task_snoozed_1',
        message:
            "Okay. Tomorrow then. I'll have it back in front of you first thing.",
    },

    // ── SNOOZE ×2–3 — Agent Whitaker ────────────────────────────────────────────
    {
        character: 'agent',
        trigger: 'task_snoozed_2_3',
        message:
            "This is the second time. Or third. I lose count, which is actually the problem.",
    },
    {
        character: 'agent',
        trigger: 'task_snoozed_2_3',
        message:
            "I'm not going to lecture you. But I am going to point out that this task keeps showing up.",
    },
    {
        character: 'agent',
        trigger: 'task_snoozed_2_3',
        message:
            "Still here. Still watching. What's actually in the way on this one?",
    },
    {
        character: 'agent',
        trigger: 'task_snoozed_2_3',
        message:
            "You know I can see the snooze count, right? Briggs can too. Let's get ahead of this.",
    },

    // ── SNOOZE ×4–5 — Agent Whitaker (urgency escalates) ────────────────────────
    {
        character: 'agent',
        trigger: 'task_snoozed_4_5',
        message:
            'Okay, I need you to listen to me. Briggs reviews snooze logs on Thursdays. Do this task.',
    },
    {
        character: 'agent',
        trigger: 'task_snoozed_4_5',
        message:
            "Four delays. I'm not filing this as negligence — yet. But I need to see movement.",
    },
    {
        character: 'agent',
        trigger: 'task_snoozed_4_5',
        message:
            "I'm in your corner. But I can only defend a pattern that's actually improving. Help me out here.",
    },
    {
        character: 'agent',
        trigger: 'task_snoozed_4_5',
        message:
            "This is the fourth or fifth time. I've been making excuses. I'm running low on good ones.",
    },

    // ── SNOOZE ×6+ — Director Briggs (takes over) ────────────────────────────
    {
        character: 'director',
        trigger: 'task_snoozed_6plus',
        message:
            'This task has been delayed SIX TIMES. I have flagged it in your permanent record.',
    },
    {
        character: 'director',
        trigger: 'task_snoozed_6plus',
        message:
            'An enemy of productivity is an enemy of this nation. You are on notice, citizen.',
    },
    {
        character: 'director',
        trigger: 'task_snoozed_6plus',
        message:
            "I will be monitoring your file personally until this item is resolved. Whitaker has been notified of his failure to motivate you.",
    },
    {
        character: 'director',
        trigger: 'task_snoozed_6plus',
        message:
            'Six delays. In my day we called that sabotage. I am choosing to call it incompetence. For now.',
    },

    // ── TASK OVERDUE — Director Briggs ───────────────────────────────────────
    {
        character: 'director',
        trigger: 'task_overdue',
        message: 'This task is overdue. I do not accept excuses. I accept completed tasks.',
    },
    {
        character: 'director',
        trigger: 'task_overdue',
        message: "The deadline was not a suggestion. Your patriot score reflects this.",
    },
    {
        character: 'director',
        trigger: 'task_overdue',
        message:
            "I have added an overdue notation to your file. This is not a small thing.",
    },

    // ── TASK OVERDUE — Agent Whitaker ────────────────────────────────────────────
    {
        character: 'agent',
        trigger: 'task_overdue',
        message:
            "This one's past due. I know. Let's just focus on getting it done before Briggs makes it worse.",
    },
    {
        character: 'agent',
        trigger: 'task_overdue',
        message:
            "Overdue. Look — I've seen worse cases turn around. But it starts with doing the task.",
    },

    // ── SCORE LOW ─────────────────────────────────────────────────────────────
    {
        character: 'director',
        trigger: 'score_low',
        message:
            'Your patriot score is below acceptable thresholds. I am deeply concerned. You should be too.',
    },
    {
        character: 'director',
        trigger: 'score_low',
        message:
            'A score this low raises questions I would prefer not to have to ask. Get it together.',
    },
    {
        character: 'agent',
        trigger: 'score_low',
        message:
            "Your score is down. I know these numbers feel arbitrary. But they're what he looks at. Let's bring it up.",
    },
    {
        character: 'agent',
        trigger: 'score_low',
        message:
            "I've been running interference for you but this score is getting hard to explain. Start with one thing.",
    },

    // ── SCORE HIGH ────────────────────────────────────────────────────────────
    {
        character: 'agent',
        trigger: 'score_high',
        message:
            "Your patriot score is looking solid. This is what consistent follow-through looks like. Hold the line.",
    },
    {
        character: 'agent',
        trigger: 'score_high',
        message:
            "Good standing. Don't let it make you complacent — that's when things start slipping.",
    },
    {
        character: 'director',
        trigger: 'score_high',
        message:
            'Your current standing is acceptable. Do not interpret this as permission to relax.',
    },

    // ── DAY START — Agent Whitaker ───────────────────────────────────────────────
    {
        character: 'agent',
        trigger: 'day_start',
        message:
            "New day. Clean slate — well, mostly. You've got some things to clear. Let's do this.",
    },
    {
        character: 'agent',
        trigger: 'day_start',
        message:
            "Morning. I've reviewed your queue. There's work to do, but nothing you can't handle.",
    },
    {
        character: 'agent',
        trigger: 'day_start',
        message:
            "Good morning, citizen. Your file is open. Let's make sure what goes in it today is worth reading.",
    },
    {
        character: 'agent',
        trigger: 'day_start',
        message:
            "Day start. I've got your back — same as always. But you've got to meet me halfway.",
    },

    // ── STREAK ────────────────────────────────────────────────────────────────
    {
        character: 'agent',
        trigger: 'streak',
        message:
            "You've been consistent. I've made note of that. So has Briggs, for once in a positive way.",
    },
    {
        character: 'agent',
        trigger: 'streak',
        message:
            "This is a streak. This is what it looks like when things are working. Remember this feeling.",
    },
    {
        character: 'director',
        trigger: 'streak',
        message: 'Your streak is noted. This is the baseline expectation. Maintain it.',
    },

    // ── PROJECT COMPLETED ─────────────────────────────────────────────────────
    {
        character: 'agent',
        trigger: 'project_completed',
        message:
            "All tasks cleared. That's a project off the board. I'm genuinely impressed — you should be too.",
    },
    {
        character: 'director',
        trigger: 'project_completed',
        message:
            "Project complete. This is what a functioning citizen looks like. File that feeling away.",
    },
];

export function getDialogueFor(
    trigger: DialogueTrigger,
    preferDirector = false,
): DialogueLine {
    const matching = DIALOGUES.filter(d => d.trigger === trigger);
    if (!matching.length) {
        return {character: 'agent', trigger, message: 'Status noted.'};
    }
    const preferred = matching.filter(
        d => d.character === (preferDirector ? 'director' : 'agent'),
    );
    const pool = preferred.length ? preferred : matching;
    return pool[Math.floor(Math.random() * pool.length)]!;
}
