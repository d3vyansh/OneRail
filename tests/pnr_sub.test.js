const { subscribePNR } = require('../controllers/pnr_sub');

describe('subscribePNR', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps the upstream PNR response and attaches the userId', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          Pnr: '2810651211',
          TrainNo: '12034',
          TrainName: 'Shatabdi Express',
          From: 'NDLS',
          To: 'CNB',
          DepartureTime: '06:00',
          ArrivalTime: '11:30',
        },
      }),
    });

    const result = await subscribePNR('2810651211', 'user-id-123');

    expect(result).toEqual({
      user: 'user-id-123',
      pnr: '2810651211',
      trainNo: '12034',
      trainName: 'Shatabdi Express',
      from: 'NDLS',
      to: 'CNB',
      departureTime: '06:00',
      arrivalTime: '11:30',
    });
  });

  it('returns undefined (does not throw) when the upstream API errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    const result = await subscribePNR('2810651211', 'user-id-123');

    expect(result).toBeUndefined();
  });
});
