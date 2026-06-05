import {css, defineElement, defineElementEvent, html, listen} from 'element-vir';
import {ViraInput} from 'vira';
import type {ShoppingItem} from '../data/types.js';
import {getActiveSkin} from '../skins/active-skin.js';

export const ShoppingListElement = defineElement<{
    items: ReadonlyArray<ShoppingItem>;
}>()({
    tagName: 'shopping-list',

    events: {
        itemAdded: defineElementEvent<ShoppingItem>(),
        itemToggled: defineElementEvent<string>(),   // item id
        itemRemoved: defineElementEvent<string>(),   // item id
        checkedCleared: defineElementEvent<void>(),
    },

    state: () => ({
        inputValue: '',
    }),

    styles: css`
        :host {
            display: block;
            padding: 16px 16px 80px;
        }

        .page-title {
            font-family: var(--font-display);
            font-size: 1.4rem;
            letter-spacing: 0.25em;
            color: var(--color-primary);
            margin-bottom: 4px;
        }

        .page-subtitle {
            font-family: var(--font-mono);
            font-size: 0.65rem;
            letter-spacing: 0.1em;
            color: var(--color-text-muted);
            margin-bottom: 20px;
        }

        .add-row {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
        }

        .add-input {
            flex: 1;
        }

        .add-btn {
            background: var(--color-primary);
            color: var(--color-surface);
            border: none;
            font-family: var(--font-display);
            font-size: 0.85rem;
            letter-spacing: 0.15em;
            padding: 0 16px;
            cursor: pointer;
            flex-shrink: 0;
        }
        .add-btn:disabled {
            opacity: 0.4;
            cursor: default;
        }

        .items-list {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .item-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 8px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
        }
        .item-row:last-child {
            border-bottom: none;
        }
        .item-row.checked {
            opacity: 0.45;
        }

        .item-check {
            width: 18px;
            height: 18px;
            border: 1.5px solid var(--color-primary);
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 0.7rem;
            color: var(--color-primary);
            background: transparent;
        }
        .item-row.checked .item-check {
            background: var(--color-primary);
            color: var(--color-surface);
        }

        .item-name {
            flex: 1;
            font-family: var(--font-accent);
            font-size: 0.9rem;
            color: var(--color-primary);
        }
        .item-row.checked .item-name {
            text-decoration: line-through;
        }

        .item-remove {
            background: none;
            border: none;
            font-size: 0.75rem;
            color: var(--color-text-muted);
            cursor: pointer;
            padding: 4px 6px;
            -webkit-tap-highlight-color: transparent;
            flex-shrink: 0;
        }
        .item-remove:hover {
            color: var(--color-danger);
        }

        .list-empty {
            font-family: var(--font-accent);
            font-size: 0.85rem;
            color: var(--color-text-muted);
            text-align: center;
            padding: 24px 8px;
            border: 1px dashed rgba(0, 0, 0, 0.15);
        }

        .clear-row {
            display: flex;
            justify-content: flex-end;
            margin-top: 12px;
        }

        .clear-btn {
            background: none;
            border: none;
            font-family: var(--font-mono);
            font-size: 0.62rem;
            letter-spacing: 0.1em;
            color: var(--color-text-muted);
            cursor: pointer;
            padding: 4px 0;
            -webkit-tap-highlight-color: transparent;
        }
        .clear-btn:hover {
            color: var(--color-danger);
        }
    `,

    render({inputs, state, updateState, dispatch, events}) {
        const skin = getActiveSkin();
        const {items} = inputs;
        const unchecked = items.filter((i) => !i.checked);
        const checked = items.filter((i) => i.checked);
        const allItems = [...unchecked, ...checked];

        function handleAdd(): void {
            const name = state.inputValue.trim();
            if (!name) return;
            dispatch(new events.itemAdded({
                id: `shop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                name,
                checked: false,
            }));
            updateState({inputValue: ''});
        }

        return html`
            <div class="page-title">${skin.menu.shoppingListLabel ?? 'SHOPPING LIST'}</div>
            <div class="page-subtitle">HOUSEHOLD SUPPLY INVENTORY · PATRIOT PREPAREDNESS</div>

            <div class="add-row">
                <${ViraInput.assign({
                    value: state.inputValue,
                    placeholder: 'Add item...',
                })}
                    class="add-input"
                    ${listen(ViraInput.events.valueChange, (e) =>
                        updateState({inputValue: e.detail}),
                    )}
                    @keydown=${(e: KeyboardEvent) => {
                        if (e.key === 'Enter') handleAdd();
                    }}
                ></${ViraInput}>
                <button
                    class="add-btn"
                    @click=${handleAdd}
                    ?disabled=${!state.inputValue.trim()}
                >ADD</button>
            </div>

            ${allItems.length === 0
                ? html`<div class="list-empty">Supply list is empty. A prepared patriot keeps stock.</div>`
                : html`
                    <div class="items-list">
                        ${allItems.map((item) => html`
                            <div
                                class="item-row ${item.checked ? 'checked' : ''}"
                                @click=${() => dispatch(new events.itemToggled(item.id))}
                            >
                                <div class="item-check">${item.checked ? '✓' : ''}</div>
                                <span class="item-name">${item.name}</span>
                                <button
                                    class="item-remove"
                                    title="Remove item"
                                    @click=${(e: Event) => {
                                        e.stopPropagation();
                                        dispatch(new events.itemRemoved(item.id));
                                    }}
                                >✕</button>
                            </div>
                        `)}
                    </div>
                    ${checked.length > 0
                        ? html`
                            <div class="clear-row">
                                <button
                                    class="clear-btn"
                                    @click=${() => dispatch(new events.checkedCleared())}
                                >CLEAR CHECKED (${checked.length})</button>
                            </div>
                        `
                        : html``}
                `}
        `;
    },
});
