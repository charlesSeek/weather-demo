import { 
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
  APIGatewayProxyEvent
} from 'aws-lambda';
import { getCoordinates, getHistoryWeather } from './utils';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'ap-southeast-2' });

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const bucketName = process.env.BUCKET_NAME;

  // Extract the city parameter from the query parameters
  const city = event.pathParameters?.city;
  if (!city) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'City parameter is required' }),
    };
  }

  // Extract the api_key from environment variable
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Missing weather api key in environment' }),
    };
  }

  // Extract the dt query parameter, if no dt parameter, we will assign it to date now timestamp.
  let dt = event.queryStringParameters?.dt ? parseFloat(event.queryStringParameters.dt) : Math.floor(Date.now() / 1000);

  if (isNaN(dt)) {
    dt = Math.floor(Date.now() / 1000);
  }

  try {
    const coordinate = await getCoordinates(city, apiKey);
    if (!coordinate) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'invoke coordinate api error.' }),
      };
    }

    const weather = await getHistoryWeather(coordinate, dt, apiKey);
    if (!weather) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'invoke history weather api error.' }),
      };
    }

    const responseBody = {
      data: weather,
    };

    const key = `responses/history-${city}-${Date.now()}.json`;

    const putObjectParams = {
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(responseBody),
      ContentType: 'application/json',
    };

    await s3.send(new PutObjectCommand(putObjectParams));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error('Error occurred:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
