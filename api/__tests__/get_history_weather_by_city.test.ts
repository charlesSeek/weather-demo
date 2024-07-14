import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../src/get_history_weather_by_city';
import { getCoordinates, getHistoryWeather } from '../src/utils';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

jest.mock('../src/utils');
const mockedGetCoordinates = getCoordinates as jest.Mock;
const mockedGetHisttoryWeather = getHistoryWeather as jest.Mock;

jest.mock('@aws-sdk/client-s3');
const mockedS3Client = S3Client as jest.MockedClass<typeof S3Client>;
const mockedPutObjectCommand = PutObjectCommand as unknown as jest.Mock;

describe('get_history_weather_by_city Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BUCKET_NAME = 'test-bucket';
    process.env.API_KEY = 'test-api-key';
  });

  it('should return 400 if city is not provided', async () => {
    const event = {
      pathParameters: {},
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event, {} as Context, () => null) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toContain('City parameter is required');
  });

  it('should return 400 if API_KEY is not provided', async () => {
    delete process.env.API_KEY;

    const event = {
      pathParameters: {
        city: 'test-city',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event, {} as Context, () => null) as APIGatewayProxyResult;;

    expect(result.statusCode).toBe(400);
    expect(result.body).toContain('Missing weather api key in environment');
  });

  it('should return 500 if getCoordinates fails', async () => {
    mockedGetCoordinates.mockResolvedValue(null);

    const event = {
      pathParameters: {
        city: 'test-city',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event, {} as Context, () => null) as APIGatewayProxyResult;;

    expect(result.statusCode).toBe(500);
    expect(result.body).toContain('invoke coordinate api error.');
  });

  it('should return 500 if getHisttoryWeather fails', async () => {
    mockedGetCoordinates.mockResolvedValue({ lat: -37.8136, lon: 144.9631 });
    mockedGetHisttoryWeather.mockResolvedValue(null);

    const event = {
      pathParameters: {
        city: 'test-city',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event, {} as Context, () => null) as APIGatewayProxyResult;;

    expect(result.statusCode).toBe(500);
    expect(result.body).toContain('invoke history weather api error.');
  });

  it('should store response in S3 and return 200', async () => {
    mockedGetCoordinates.mockResolvedValue({ lat: 0, lon: 0 });
    mockedGetHisttoryWeather.mockResolvedValue({ temperature: 20 });

    const event = {
      pathParameters: {
        city: 'test-city',
      },
      queryStringParameters: {
        dt: '1643803200',
      },
    } as unknown as APIGatewayProxyEvent;

    const mockSend = jest.fn();
    mockedS3Client.prototype.send = mockSend;

    const result = await handler(event, {} as Context, () => null) as APIGatewayProxyResult;;

    expect(result.statusCode).toBe(200);
  });
});
