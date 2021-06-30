import { dedent } from '..';

describe('Issue 21', () => {
  it('should dedent nested dedents correctly', () => {
    const fieldDocs = dedent`
      * a
      * b
      * c
    `

    const a = dedent`
      /**
       ${fieldIntro()}
       *
       ${fieldDocs}
       *
       ${fieldExample()}
       */
    `

    function fieldIntro() {
      return dedent`
        * 0
      `
    }
    function fieldExample() {
      return dedent`
        * d
      `
    }

    const expected = `/**
 * 0
 *
 * a
 * b
 * c
 *
 * d
 */`

    expect(a).toEqual(expected);
  });
});
