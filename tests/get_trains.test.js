const { getTrains } = require('../controllers/get_trains');

describe('getTrains', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps the upstream response to a simplified train list', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            train_name: 'Shatabdi Express',
            train_number: '12034',
            duration: '05:30',
            from_std: 'NDLS',
            to_std: 'CNB',
          },
        ],
      }),
    });

    const result = await getTrains('NDLS', 'CNB', '2026-09-01');

    expect(result).toEqual([
      {
        train_name: 'Shatabdi Express',
        train_number: '12034',
        duration: '05:30',
        from_std: 'NDLS',
        to_std: 'CNB',
      },
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('fromStationCode=NDLS'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('returns undefined (does not throw) when the upstream API errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502 });

    const result = await getTrains('NDLS', 'CNB', '2026-09-01');

    expect(result).toBeUndefined();
  });

  it('returns undefined (does not throw) on a network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const result = await getTrains('NDLS', 'CNB', '2026-09-01');

    expect(result).toBeUndefined();
  });
});
