jest.mock('../src/utils/cache', () => ({
  // Pass-through: run the fetcher, so we can assert on the key/TTL the
  // controllers hand to the cache and on the upstream URL they build.
  withCache: jest.fn((_key: string, _ttl: number, fetcher: () => Promise<unknown>) => fetcher()),
}));

import { getTrains } from '../src/controllers/get_trains';
import { getFare } from '../src/controllers/getFare';
import { withCache } from '../src/utils/cache';

const mockedWithCache = jest.mocked(withCache);

describe('controllers use the response cache', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], general: [] }),
    }) as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('getTrains: normalised key, 6h TTL', async () => {
    await getTrains('ndls', ' cnb ', '2026-11-01');

    expect(mockedWithCache).toHaveBeenCalledWith(
      'trains:NDLS:CNB:2026-11-01',
      6 * 60 * 60,
      expect.any(Function)
    );
  });

  it('getTrains: sends the normalised, URL-encoded values upstream', async () => {
    await getTrains('ndls', 'cnb&x=1', '2026-11-01');

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('fromStationCode=NDLS');
    expect(url).toContain('toStationCode=CNB%26X%3D1');
    expect(url).not.toContain('&x=1');
  });

  it('getTrains: missing query params do not throw', async () => {
    await expect(
      getTrains(undefined as unknown as string, undefined as unknown as string, undefined as unknown as string)
    ).resolves.not.toThrow();
    expect(mockedWithCache).toHaveBeenCalledWith('trains:::', 6 * 60 * 60, expect.any(Function));
  });

  it('getFare: normalised key, 24h TTL', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { general: [{ classType: 'SL', fare: 350 }] } }),
    });

    await expect(getFare('12034', 'ndls', 'cnb')).resolves.toEqual([
      { classType: 'SL', fare: 350 },
    ]);

    expect(mockedWithCache).toHaveBeenCalledWith(
      'fare:12034:NDLS:CNB',
      24 * 60 * 60,
      expect.any(Function)
    );
  });

  it('getFare: missing query params do not throw', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 400 });

    await expect(
      getFare(undefined as unknown as string, undefined as unknown as string, undefined as unknown as string)
    ).resolves.toBeUndefined();
    expect(mockedWithCache).toHaveBeenCalledWith('fare:::', 24 * 60 * 60, expect.any(Function));
  });
});
