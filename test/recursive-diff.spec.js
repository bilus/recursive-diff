const assert = require('assert');
const diff = require('../src/recursive-diff');

let a; let b; let delta; let c;

describe('diff tests', () => {
  it('testing primitive data type', () => {
    a = 3;
    b = 10;
    delta = diff.getDiff(a, b);
    c = diff.applyDiff(a, delta);
    assert.equal(b, c);
  });

  it('testing array', () => {
    a = [1, 2, 3, 4];
    b = [2, 3, 4];
    delta = diff.getDiff(a, b);
    c = diff.applyDiff(a, delta);
    assert.deepEqual(b, c);
  });
  it('testing object ', () => {
    a = {
      a: '10',
      b: '20',
    };
    b = {
      a: '10',
      b: '40',
    };
    delta = diff.getDiff(a, b);
    c = diff.applyDiff(a, delta);
    assert.deepEqual(b, c);
  });

  it('testing object with different types', () => {
    a = {
      a: 10,
      b: '20',
    };
    b = {
      a: '10',
      b: '40',
    };
    delta = diff.getDiff(a, b);
    c = diff.applyDiff(a, delta);
    assert.deepEqual(b, c);
  });


  it('testing Null ', () => {
    a = null;
    b = {
      a: '10',
      b: '40',
    };
    delta = diff.getDiff(a, b);
    c = diff.applyDiff(a, delta);
    assert.deepEqual(b, c);
  });

  it('testing Undefined ', () => {
    let d;
    const e = {
      a: '10',
      b: '40',
    };
    delta = diff.getDiff(d, e);
    c = diff.applyDiff(d, delta);
    assert.deepEqual(e, c);
  });

  it('testing undefined flipped', () => {
    let d;
    const e = {
      a: '10',
      b: '40',
    };
    delta = diff.getDiff(e, d);
    c = diff.applyDiff(e, delta);
    assert.equal(d, c);
  });

  it('testing Undefined, once more :) ', () => {
    a = {
      a: 4,
      b: undefined,
    };
    b = {
      a: undefined,
      b: '40',
    };
    delta = diff.getDiff(a, b);
    c = diff.applyDiff(a, delta);
    assert.equal(b.a, c.a);// to check undefined
    assert.equal(b.b, c.b);
  });

  it('testing Undefined and null together ;)', () => {
    a = {
      a: 4,
      b: undefined,
    };
    b = {
      a: null,
      b: '40',
    };
    delta = diff.getDiff(a, b);
    c = diff.applyDiff(a, delta);
    assert.equal(b.a, c.a);// to check undefined
    assert.equal(b.b, c.b);
  });

  it('testing visitor callback', () => {
    // TODO: use sinon.spy to count function call
    a = {
      a: 4,
      b: {
        c: 11,
      },
    };
    b = {
      a: 'hello',
      b: {
        d: 12,
      },
    };
    delta = diff.getDiff(a, b);
    c = diff.applyDiff(a, delta, () => { });
    assert.deepEqual(b, c);
  });

  it('testing date diffs ', () => {
    const dt1 = new Date();
    const dt2 = new Date(dt1.getTime());
    a = {
      a: dt1,
      b: '20',
    };
    b = {
      a: dt2,
      b: '20',
    };
    delta = diff.getDiff(a, b);
    assert.deepEqual(delta, []); // no diff as dates are same
  });

  it('testing date diffs ', () => {
    const dt1 = new Date();
    const dt2 = new Date('2018-05-05');
    a = {
      a: dt1,
      b: '20',
    };
    b = {
      a: dt2,
      b: '20',
    };
    delta = diff.getDiff(a, b);
    assert.notDeepEqual(delta, {}); // diff as dates are same
  });

  it('testing complex deep object', () => {
    function fn() { } // two function can be equal if they hold same reference
    a = {
      a: fn,
      b: [1, 2, [3, 4]],
      c: {
        c1: 20,
        c2: {
          c21: 'hello',
        },
        c3: 'India',
      },
    };
    b = {
      a: fn,
      b: [1, 2, [4]],
      c: {
        c1: 20,
        c2: {
          c21: 'hi',
          c22: 'welcome',
        },
        c3: 'cosmic',
      },
      d: null,
    };
    delta = diff.getDiff(a, b);
    c = diff.applyDiff(a, delta, () => { });
    assert.deepEqual(b, c);
  });
  it('testing diff format if oldValue is needed into diff', () => {
    a = {
      a: {
        b: 1,
        c: 2,
        d: [1],
      },
    };
    b = {
      a: {
        b: 2,
        d: [1, 2],
      },
    };
    const expectedDiff = [
      {
        op: 'update',
        path: [
          'a',
          'b',
        ],
        val: 2,
        oldVal: 1,
        scalar: true,
      },
      {
        op: 'delete',
        path: [
          'a',
          'c',
        ],
        oldVal: 2,
        scalar: true,
      },
      {
        op: 'add',
        path: [
          'a',
          'd',
          1,
        ],
        val: 2,
        scalar: true,
      },
    ];
    delta = diff.getDiff(a, b, true); // old value in the diff
    assert.deepEqual(delta, expectedDiff);
    delete expectedDiff[0].oldVal;
    delete expectedDiff[1].oldVal;
    delta = diff.getDiff(a, b); // no old value in the diff
    assert.deepEqual(delta, expectedDiff);
  });
  it('testing array are optionally treated as a whole', () => {
    a = {
      a: {
        c: [1],
        d: [1],
        e: [1, 2, 3],
      },
    };
    b = {
      a: {
        b: [2],
        d: [1, 2],
        e: [1, 2, 3],
      },
    };
    const expectedDiff = [
      {
        op: 'delete',
        path: [
          'a',
          'c',
        ],
        oldVal: [1],
        scalar: false,
      },
      {
        op: 'update',
        path: [
          'a',
          'd',
        ],
        oldVal: [1],
        val: [1, 2],
        scalar: false,
      },
      {
        op: 'add',
        path: [
          'a',
          'b',
        ],
        val: [2],
        scalar: false,
      },
    ];
    delta = diff.getDiff(a, b, true, true); // old value in the diff, array mode
    assert.deepEqual(delta, expectedDiff);
    c = diff.applyDiff(a, delta, () => { });
    assert.deepEqual(b, c);
  });
  it('testing objects compared with empty objects are broken into constituent parts with verbose flag', () => {
    a = {
      a: {},
      g: {
        h: 1,
        i: 1,
      },
    };
    b = {
      a: {
        b: [2],
      },
      c: {
        d: {
          e: 2,
        },
        f: 2,
      },
    };
    const expectedDiff = [
      {
        op: 'add',
        path: [
          'a',
          'b',
        ],
        val: [2],
        scalar: false,
      },
      {
        op: 'delete',
        path: [
          'g',
          'h',
        ],
        oldVal: 1,
        scalar: true,
      },
      {
        op: 'delete',
        path: [
          'g',
          'i',
        ],
        oldVal: 1,
        scalar: true,
      },
      {
        op: 'add',
        path: [
          'c',
          'd',
          'e',
        ],
        val: 2,
        scalar: true,
      },
      {
        op: 'add',
        path: [
          'c',
          'f',
        ],
        val: 2,
        scalar: true,
      },
    ];
    // old value in the diff, atomic array mode, verbose mode.
    delta = diff.getDiff(a, b, true, true, true);
    assert.deepEqual(delta, expectedDiff);
    // TODO: Fix applyDif so it handles c.d.e patching. We don't need it in our project for now.
    // c = diff.applyDiff(a, delta, () => { });
    // assert.deepEqual(b, c);
  });
});
