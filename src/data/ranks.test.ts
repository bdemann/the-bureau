import {assert} from '@augment-vir/assert';
import {describe, test} from 'node:test';
import {getRank} from './ranks.js';

describe('getRank', () => {
    test('130+ is Patriot', () => {
        assert.strictEquals(getRank(130), 'patriot');
        assert.strictEquals(getRank(175), 'patriot');
        assert.strictEquals(getRank(200), 'patriot');
    });

    test('100–129 is Loyal Citizen', () => {
        assert.strictEquals(getRank(100), 'loyal_citizen');
        assert.strictEquals(getRank(115), 'loyal_citizen');
        assert.strictEquals(getRank(129), 'loyal_citizen');
    });

    test('70–99 is Citizen', () => {
        assert.strictEquals(getRank(70),  'citizen');
        assert.strictEquals(getRank(85),  'citizen');
        assert.strictEquals(getRank(99),  'citizen');
    });

    test('40–69 is Disengaged Citizen', () => {
        assert.strictEquals(getRank(40), 'disengaged_citizen');
        assert.strictEquals(getRank(55), 'disengaged_citizen');
        assert.strictEquals(getRank(69), 'disengaged_citizen');
    });

    test('0–39 is Suspected Communist', () => {
        assert.strictEquals(getRank(0),  'suspected_communist');
        assert.strictEquals(getRank(25), 'suspected_communist');
        assert.strictEquals(getRank(39), 'suspected_communist');
    });
});
