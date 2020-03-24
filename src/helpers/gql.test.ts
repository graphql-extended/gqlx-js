import { convertToPureGql } from './gql';

describe('convertToPureGql', () => {
  it('does not change without positions', () => {
    const source = 'abcdefgh';
    const result = convertToPureGql(source, []);
    expect(result).toBe('abcdefgh');
  });

  it('does exclude the only position', () => {
    const source = 'abcdefgh';
    const result = convertToPureGql(source, [{ start: 2, end: 4 }]);
    expect(result).toBe('abefgh');
  });

  it('does exclude all positions', () => {
    const source = 'abcdefgh';
    const result = convertToPureGql(source, [
      { start: 2, end: 4 },
      { start: 6, end: 8 },
    ]);
    expect(result).toBe('abef');
  });

  it('does exclude beyond the end position', () => {
    const source = 'abcdefgh';
    const result = convertToPureGql(source, [{ start: 2, end: 10 }]);
    expect(result).toBe('ab');
  });
});
