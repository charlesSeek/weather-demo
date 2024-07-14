import { 
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
  APIGatewayProxyEvent
} from 'aws-lambda';
import { 
  getCoordinates,
  getCurrentWeather
} from './utils';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'ap-southeast-2' });

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const bucketName = process.env.BUCKET_NAME;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Header': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    'Content-Type': 'application/json',
  }

  // Extract the city parameter from the pathParameters
  const city = event.pathParameters?.city;
  if (!city) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'City parameter is required' }),
    };
  }

  // Extract the api_key from environment variable
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing weather api key in environment' }),
    };
  }

  try {
    const coordinate = await getCoordinates(city, apiKey);
    if (!coordinate) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'invoke coordinate api error.' }),
      };
    }

    const weather = await getCurrentWeather(coordinate, apiKey);
    if (!weather) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'invoke current weather api error.' }),
      };
    }

    const responseBody = {
      data: weather,
    };

    // Store the response in an S3 bucket
    const bucketName = process.env.BUCKET_NAME;
    const key = `responses/${city}-${Date.now()}.json`;

    const putObjectParams = {
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(responseBody),
      ContentType: 'application/json',
    };

    await s3.send(new PutObjectCommand(putObjectParams));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error('Error occurred:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
