const { getFare } = require('../controllers/getFare');

describe('getFare', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps the upstream fare response to classType/fare pairs', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          general: [
            { classType: 'SL', fare: 350 },
            { classType: '3A', fare: 950 },
          ],
        },
      }),
    });

    const result = await getFare('12034', 'NDLS', 'CNB');

    expect(result).toEqual([
      { classType: 'SL', fare: 350 },
      { classType: '3A', fare: 950 },
    ]);
  });

  it('returns undefined (does not throw) when the upstream API errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const result = await getFare('12034', 'NDLS', 'CNB');

    expect(result).toBeUndefined();
  });
});
