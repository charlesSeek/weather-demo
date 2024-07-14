import React, { useState } from 'react';
import { 
  Tabs, 
  Input,
  DatePicker,
  Layout,
  Row,
  Col,
  Button,
  message,
  Collapse,
  Spin,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import axios from 'axios';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

const { TabPane } = Tabs;
const { Content } = Layout;
const { Panel } = Collapse;

const dateFormat = 'YYYY-MM-DD'
const API_URL = process.env.REACT_APP_API_URL;

const yesterday = dayjs().subtract(1, 'day');

const Home: React.FC = () => {
  const [city, setCity] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [historyWeatherData, setHistoryWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState('1');
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  

  const handleTabChange = (key: string) => {
    setActiveTabKey(key);
    setCity('');
    setWeatherData(null);
    setHistoryWeatherData(null);
  };

  const handleCurrentWeatherSearch = async () => {
    if (!city) {
      message.error('Please enter a city name.');
      return;
    }
    setWeatherData(null);
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/weather/${city}`);
      setWeatherData(response.data);
      message.success('Weather data fetched successfully.');
    } catch (error) {
      console.error('Error fetching weather data:', error);
      message.error('Failed to fetch weather data.');
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryWeatherSearch = async () => {
    if (!city || !selectedDate) {
      message.error('Please enter a city name and select date.');
      return;
    }
    setHistoryWeatherData(null);
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/weather/history/${city}?dt=${selectedDate.utc().unix()}`);
      setHistoryWeatherData(response.data.data);
      message.success('History Weather data fetched successfully.');
    } catch (error) {
      console.error('Error fetching history weather data:', error);
      message.error('Failed to fetch history weather data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: Dayjs, dateString: string) => {
    setSelectedDate(date);
  };
  
  if (loading) {
    return (<div style={{ width: '100%', marginTop: '80px', textAlign: 'center'}}>
      <Spin />
    </div>)
  }
  return (
    <Layout style={{ minHeight: '100vh', padding: '80px' }}>
      <Content className="content">
        <Tabs defaultActiveKey="1" activeKey={activeTabKey} onChange={handleTabChange}>
          <TabPane tab="Search Current Weather" key="1">
            <Row gutter={16}>
              <Col>
                <Input placeholder="Input city" 
                value={city}
                onChange={(event) => setCity(event.target.value)}
                />
              </Col>
              <Col>
                <Button type="primary" onClick={handleCurrentWeatherSearch}>Search</Button>
              </Col>
            </Row>
            <Collapse defaultActiveKey={['1']} style={{ marginTop: '60px'}}>
              <Panel header="Current Weather" key="1">
                <pre>{JSON.stringify(weatherData, null, 2)}</pre>
              </Panel>
            </Collapse>
          </TabPane>
          <TabPane tab="Search History Weather" key="2">
            <Row gutter={16} style={{ marginBottom: '20px', marginLeft: '2px'}}>
              <DatePicker 
                minDate={dayjs('1979-01-01', dateFormat)}
                maxDate={yesterday}
                onChange={(date) => handleDateChange(date, '')}
                value={selectedDate}
              />
            </Row>
            <Row gutter={16}>
              <Col>
                <Input placeholder="Input city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                />
              </Col>
              <Col>
                <Button type="primary" onClick={handleHistoryWeatherSearch}>Search</Button>
              </Col>
            </Row>
            <Collapse defaultActiveKey={['1']} style={{ marginTop: '60px'}}>
              <Panel header="History Weather" key="1">
                <pre>{JSON.stringify(historyWeatherData, null, 2)}</pre>
              </Panel>
            </Collapse>
          </TabPane>
        </Tabs>
      </Content>
    </Layout>
  )
}

export default Home;