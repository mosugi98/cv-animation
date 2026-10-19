import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import App from '../src/App';
import { SCENES } from '../src/data/scenes';

const DISCLAIMER = 'Illustrative teaching animation; interpret real ECGs in clinical context.';

describe('App renders every scene', () => {
  for (const scene of SCENES) {
    it(`scene ${scene.id}`, () => {
      const html = renderToString(<App initialTime={scene.start + 1.5} />);
      expect(html).toContain(scene.kind === 'end' ? 'Save this' : scene.title);
      expect(html).toContain(DISCLAIMER);
      expect(html).not.toMatch(/undefined|NaN/);
    });
  }

  it('shows the schematic label and the recap label', () => {
    expect(renderToString(<App initialTime={4} />)).toContain('simplified schematic');
    expect(renderToString(<App initialTime={28} />)).toContain('TEACHING DRAWING');
  });

  it('offers step buttons instead of play in reduced-motion mode', () => {
    const html = renderToString(<App initialTime={4} forceReduced />);
    expect(html).toContain('Next scene');
    expect(html).not.toContain('>Play<');
  });
});
