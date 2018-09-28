import { createGenerationMask } from './inbuilt';

describe('createGenerationMask', () => {
  it('uses the existing functions to generate object with false values', () => {
    const obj = createGenerationMask();
    expect(obj).toEqual({
      either: false,
      use: false,
      cq: false,
    });
  });

  it('always creates a new object', () => {
    const obj1 = createGenerationMask();
    const obj2 = createGenerationMask();
    expect(obj1).not.toBe(obj2);
  });
});
