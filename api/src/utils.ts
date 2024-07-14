import axios from 'axios';

interface Coordinates {
  lat: number;
  lon: number;
}

interface WeatherOption {
  id: string;
  main: string;
  description: string;
  icon: string;
}

interface Weather {
  "dt": number;
  "sunrise":  number;
  "sunset": number;
  "temp": number;
  "feels_like": number;
  "pressure": number;
  "humidity": number;
  "dew_point": number;
  "uvi": number;
  "clouds": number;
  "visibility": number;
  "wind_speed": number;
  "wind_deg": number;
  "wind_gust": number;
  "weather": WeatherOption[];
}

const GEO_API_URI = 'http://api.openweathermap.org/geo/1.0/direct'
const WEATHER_API_URI = 'https://api.openweathermap.org/data/3.0/onecall';

export const getCoordinates = async (city: string, apiKey: string): Promise<Coordinates | null> => {
  const url = `${GEO_API_URI}?q=${city}&limit=1&appid=${apiKey}`;
  try {
    const response = await axios.get(url);
    const data = response.data[0];
    const coordinates: Coordinates = {
      lat: data.lat,
      lon: data.lon
    };
    return coordinates;
  } catch (error) {
    console.error('Error fetching coordinates:', error);
    return null;
  }
}

export const getCurrentWeather = async (coorinate: Coordinates, apiKey: string): Promise<Weather | null> => {
  const {
    lat,
    lon
  } = coorinate
  const url = `${WEATHER_API_URI}?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  try {
    const response = await axios.get(url);
    const data = response.data;
    return data.current;
  } catch (error) {
    console.error('Error fetching current weather:', error);
    return null;
  }
}

export const getHistoryWeather = async (coorinate: Coordinates, dt: number,apiKey: string): Promise<Weather | null> => {
  const {
    lat,
    lon
  } = coorinate
  const url = `${WEATHER_API_URI}/timemachine?lat=${lat}&lon=${lon}&dt=${dt}&appid=${apiKey}`;
  try {
    const response = await axios.get(url);
    const data = response.data;
    return data.data[0];
    
  } catch (error) {
    console.error('Error fetching history weather:', error);
    return null;
  }
}