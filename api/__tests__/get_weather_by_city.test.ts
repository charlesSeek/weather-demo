import { 
  APIGatewayProxyEvent, 
  Context,
  APIGatewayProxyResult
} from 'aws-lambda';
import { handler } from '../src/get_weather_by_city';
import * as utils from '../src/utils';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

jest.mock('../src/utils');
jest.mock('@aws-sdk/client-s3');
const mockedS3Client = S3Client as jest.MockedClass<typeof S3Client>;
const mockedPutObjectCommand = PutObjectCommand as unknown as jest.Mock;

const mockedGetCoordinates = utils.getCoordinates as jest.Mock;
const mockedGetCurrentWeather = utils.getCurrentWeather as jest.Mock;

describe('get_weather_by_city Lambda function', () => {
  const mockEvent: Partial<APIGatewayProxyEvent> = {
    pathParameters: {
      city: 'melbourne',
    },
  };

  const mockContext: Partial<Context> = {};

  beforeEach(() => {
    process.env.API_KEY = 'fake-api-key';
    process.env.BUCKET_NAME = 'test-bucket';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.API_KEY;
  });

  it('should return 400 if city parameter is missing', async () => {
    const event: APIGatewayProxyEvent = {
      ...mockEvent,
      pathParameters: {},
    } as any;

    const result = await handler(event, mockContext as Context, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify({ error: 'City parameter is required' }));
  });

  it('should return 400 if API_KEY is missing', async () => {
    delete process.env.API_KEY;

    const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext as Context, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify({ error: 'Missing weather api key in environment' }));
  });

  it('should return 500 if getCoordinates fails', async () => {
    mockedGetCoordinates.mockResolvedValue(null);

    const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext as Context, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    expect(result.body).toBe(JSON.stringify({ error: 'invoke coordinate api error.' }));
  });

  it('should return 500 if getCurrentWeather fails', async () => {
    mockedGetCoordinates.mockResolvedValue({ lat: -37.8136, lon: 144.9631 });
    mockedGetCurrentWeather.mockResolvedValue(null);

    const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext as Context, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    expect(result.body).toBe(JSON.stringify({ error: 'invoke current weather api error.' }));
  });

  it('should return 200 with current weather information', async () => {
    const mockWeather = { main: 'Sunny', description: 'Sunny' };
    const mockSend = jest.fn();
    mockedS3Client.prototype.send = mockSend;

    mockedGetCoordinates.mockResolvedValue({ lat: -37.8136, lon: 144.9631 });
    mockedGetCurrentWeather.mockResolvedValue(mockWeather);

    const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext as Context, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify({ data: mockWeather}));
  });
});
