export interface TrainSummary {
  train_name: string;
  train_number: string;
  duration: string;
  from_std: string;
  to_std: string;
}

export const getTrains = async function (
  from: string,
  to: string,
  date: string
): Promise<TrainSummary[] | undefined> {
  const url = `https://irctc1.p.rapidapi.com/api/v3/trainBetweenStations?fromStationCode=${from}&toStationCode=${to}&dateOfJourney=${date}`;
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
    console.error('Error Fetching the data:', (e as Error).message);
    return undefined;
  }
};
