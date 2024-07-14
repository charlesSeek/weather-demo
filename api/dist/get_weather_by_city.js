"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const utils_1 = require("./utils");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3 = new client_s3_1.S3Client({ region: 'ap-southeast-2' });
const handler = async (event) => {
    var _a;
    console.log('Received event:', JSON.stringify(event, null, 2));
    const bucketName = process.env.BUCKET_NAME;
    // Extract the city parameter from the pathParameters
    const city = (_a = event.pathParameters) === null || _a === void 0 ? void 0 : _a.city;
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
    try {
        const coordinate = await (0, utils_1.getCoordinates)(city, apiKey);
        if (!coordinate) {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ error: 'invoke coordinate api error.' }),
            };
        }
        const weather = await (0, utils_1.getCurrentWeather)(coordinate, apiKey);
        if (!weather) {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
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
        await s3.send(new client_s3_1.PutObjectCommand(putObjectParams));
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(responseBody),
        };
    }
    catch (error) {
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
exports.handler = handler;
