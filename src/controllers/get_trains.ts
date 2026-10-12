import { logger } from '../utils/logger';
import { withCache } from '../utils/cache';

// Train schedules rarely change within a day; 6h keeps repeat searches free
// while still picking up timetable changes reasonably quickly.
const TRAINS_TTL_SECONDS = 6 * 60 * 60;

export interface TrainSummary {
  train_name: string;
  train_number: string;
  duration: string;
  from_std: string;
  to_std: string;
}

const fetchTrains = async function (
  from: string,
  to: string,
  date: string
): Promise<TrainSummary[] | undefined> {
  const url = `https://irctc1.p.rapidapi.com/api/v3/trainBetweenStations?fromStationCode=${encodeURIComponent(from)}&toStationCode=${encodeURIComponent(to)}&dateOfJourney=${encodeURIComponent(date)}`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': process.env.xrapid_apikey as string,
      'x-rapidapi-host': 'irctc1.p.rapidapi.com',
    },
  };
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const fetched_data = (await response.json()) as {
      data?: Array<{
        train_name: string;
        train_number: string;
        duration: string;
        from_std: string;
        to_std: string;
      }>;
    };
    const trains: TrainSummary[] | undefined = fetched_data.data?.map((train) => ({
      train_name: train.train_name,
      train_number: train.train_number,
      duration: train.duration,
      from_std: train.from_std,
      to_std: train.to_std,
    }));

    return trains;
  } catch (e) {
    logger.error({ err: e }, 'Error fetching trains from upstream API');
    return undefined;
  }
};

// Station codes are case-insensitive to users, so normalise before building
// the cache key (and the upstream URL) — 'ndls' and 'NDLS' are one search.
const normalizeCode = (value: string): string => String(value ?? '').trim().toUpperCase();

export const getTrains = async function (
  from: string,
  to: string,
  date: string
): Promise<TrainSummary[] | undefined> {
  const f = normalizeCode(from);
  const t = normalizeCode(to);
  const d = String(date ?? '').trim();
  return withCache(`trains:${f}:${t}:${d}`, TRAINS_TTL_SECONDS, () => fetchTrains(f, t, d));
};
