// ─────────────────────────────────────────────────────────────────────────────
// BCR — Entry point
// Import all elements to register them as custom elements, then swap the root
// element to <urgency-test> when ?dev=urgency is present in the URL.
// ─────────────────────────────────────────────────────────────────────────────

import './components/bureau-app.element.js';
import './components/bureau-header.element.js';
import './components/character-dialogue.element.js';
import './components/snooze-indicator.element.js';
import './components/task-item.element.js';
import './components/add-task-dialog.element.js';
import './components/add-project-dialog.element.js';
import './components/project-card.element.js';
import './components/project-detail.element.js';
import './components/dashboard-view.element.js';
import './components/urgency-test.element.js';

// Dev routes ------------------------------------------------------------------
const params = new URLSearchParams(window.location.search);
const dev = params.get('dev');
if (dev === 'urgency') {
    const root = document.querySelector('bureau-app');
    if (root) {
        const replacement = document.createElement('urgency-test');
        root.replaceWith(replacement);
    }
}
