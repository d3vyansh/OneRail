import { PnrData } from '../types/pnr';
import { logger } from '../utils/logger';

export const subscribePNR = async function (
  pnr: string,
  userId: string
): Promise<PnrData | undefined> {
  const url = `https://irctc1.p.rapidapi.com/api/v3/getPNRStatus?pnrNumber=${pnr}`;
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
    const apiData = (await response.json()) as {
      data: {
        Pnr: string;
        TrainNo: string;
        TrainName: string;
        From: string;
        To: string;
        DepartureTime: string;
        ArrivalTime: string;
      };
    };
    const pnrdata: PnrData = {
      user: userId,
      pnr: apiData.data.Pnr,
      trainNo: apiData.data.TrainNo,
      trainName: apiData.data.TrainName,
      from: apiData.data.From,
      to: apiData.data.To,
      departureTime: apiData.data.DepartureTime,
      arrivalTime: apiData.data.ArrivalTime,
    };
    return pnrdata;
  } catch (e) {
    logger.error({ err: e }, 'Error fetching PNR status from upstream API');
    return undefined;
  }
};
