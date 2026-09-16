import { logger } from '../utils/logger';

export interface FareSummary {
  classType: string;
  fare: number;
}

export const getFare = async function (
  trainNo: string,
  from: string,
  to: string
): Promise<FareSummary[] | undefined> {
  const url = `https://irctc1.p.rapidapi.com/api/v2/getFare?trainNo=${trainNo}&fromStationCode=${from}&toStationCode=${to}`;

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
