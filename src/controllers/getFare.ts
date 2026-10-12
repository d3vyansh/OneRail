import { logger } from '../utils/logger';
import { withCache } from '../utils/cache';

// Fares change even less often than schedules.
const FARE_TTL_SECONDS = 24 * 60 * 60;

export interface FareSummary {
  classType: string;
  fare: number;
}

const fetchFare = async function (
  trainNo: string,
  from: string,
  to: string
): Promise<FareSummary[] | undefined> {
  const url = `https://irctc1.p.rapidapi.com/api/v2/getFare?trainNo=${encodeURIComponent(trainNo)}&fromStationCode=${encodeURIComponent(from)}&toStationCode=${encodeURIComponent(to)}`;

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

    const apiResponse = (await response.json()) as {
      data: { general: Array<{ classType: string; fare: number }> };
    };
    const simplifiedFareData: FareSummary[] = apiResponse.data.general.map((item) => ({
      classType: item.classType,
      fare: item.fare,
    }));

    return simplifiedFareData;
  } catch (e) {
    logger.error({ err: e }, 'Error fetching fare from upstream API');
    return undefined;
  }
};

const normalize = (value: string): string => String(value ?? '').trim().toUpperCase();

export const getFare = async function (
  trainNo: string,
  from: string,
  to: string
): Promise<FareSummary[] | undefined> {
  const n = normalize(trainNo);
  const f = normalize(from);
  const t = normalize(to);
  return withCache(`fare:${n}:${f}:${t}`, FARE_TTL_SECONDS, () => fetchFare(n, f, t));
};
