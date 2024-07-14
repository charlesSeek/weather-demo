"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHistoryWeather = exports.getCurrentWeather = exports.getCoordinates = void 0;
const axios_1 = __importDefault(require("axios"));
const GEO_API_URI = 'http://api.openweathermap.org/geo/1.0/direct';
const WEATHER_API_URI = 'https://api.openweathermap.org/data/3.0/onecall';
const getCoordinates = async (city, apiKey) => {
    const url = `${GEO_API_URI}?q=${city}&limit=1&appid=${apiKey}`;
    try {
        const response = await axios_1.default.get(url);
        const data = response.data[0];
        const coordinates = {
            lat: data.lat,
            lon: data.lon
        };
        return coordinates;
    }
    catch (error) {
        console.error('Error fetching coordinates:', error);
        return null;
    }
};
exports.getCoordinates = getCoordinates;
const getCurrentWeather = async (coorinate, apiKey) => {
    const { lat, lon } = coorinate;
    const url = `${WEATHER_API_URI}?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    try {
        const response = await axios_1.default.get(url);
        const data = response.data;
        return data.current;
    }
    catch (error) {
        console.error('Error fetching current weather:', error);
        return null;
    }
};
exports.getCurrentWeather = getCurrentWeather;
const getHistoryWeather = async (coorinate, dt, apiKey) => {
    const { lat, lon } = coorinate;
    const url = `${WEATHER_API_URI}/timemachine?lat=${lat}&lon=${lon}&dt=${dt}&appid=${apiKey}`;
    try {
        const response = await axios_1.default.get(url);
        const data = response.data;
        return data.data[0];
    }
    catch (error) {
        console.error('Error fetching history weather:', error);
        return null;
    }
};
exports.getHistoryWeather = getHistoryWeather;
