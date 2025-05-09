import React, { useEffect, useRef, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
    ResponsiveContainer,
} from 'recharts';
import { Checkbox, Typography, message, Spin } from 'antd';
import dayjs from 'dayjs';
import './LivePage.css';

const { Title } = Typography;

const SOCKET_URL = 'ws://crypto-pulse-1-546660857332.us-central1.run.app/ws';

const allCoins = ['BTC', 'ETH', 'USDT', 'XRP', 'BNB', 'SOL', 'USDC', 'TRX', 'DOGE', 'ADA'];

const coinColors = [
    '#e6194b', '#3cb44b', '#ffe119', '#0082c8', '#f58231',
    '#911eb4', '#46f0f0', '#f032e6', '#d2f53c', '#fabebe'
];

type SentimentPoint = {
    time: string;
    [coin: string]: number | string;
};

const LivePage: React.FC = () => {
    const [selectedCoins, setSelectedCoins] = useState<string[]>(allCoins.slice(0, 5));
    const [selectedRange, setSelectedRange] = useState<string>('1h');
    const [data, setData] = useState<SentimentPoint[]>([]);
    const [connecting, setConnecting] = useState(true);
    const [hasFailed, setHasFailed] = useState(false);

    const socketRef = useRef<WebSocket | null>(null);
    const lastEndTimeRef = useRef<dayjs.Dayjs | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const calculateInterval = (dataLength: number) => {
        if (dataLength <= 20) return 0;
        if (dataLength <= 50) return 2;
        if (dataLength <= 100) return 5;
        if (dataLength <= 200) return 10;
        if (dataLength <= 400) return 20;
        return 30;
    };

    const createWebSocket = () => {
        const ws = new WebSocket(SOCKET_URL);
        socketRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket connected');
            setConnecting(false);
            sendInitialSubscription();
        };

        ws.onmessage = (event) => {
            const incoming = JSON.parse(event.data);

            if (Array.isArray(incoming)) {
                const formatted = incoming.map((point: any) => {
                    const newPoint: SentimentPoint = {
                        time: dayjs(point.time).format('YYYY-MM-DD HH:mm'),
                    };
                    for (const coin of Object.keys(point.coins)) {
                        newPoint[coin] = point.coins[coin];
                    }
                    return newPoint;
                });

                setData(prev => {
                    const merged = [...prev, ...formatted];

                    // De-duplicate by 'time'
                    const dedupedMap = new Map<string, SentimentPoint>();
                    for (const point of merged) {
                        dedupedMap.set(point.time, point);
                    }

                    const dedupedArray = Array.from(dedupedMap.values());
                    dedupedArray.sort((a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf());

                    return dedupedArray.slice(-300); // Keep last 300 points
                });
            }
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
            message.error('WebSocket connection failed.');
            setHasFailed(true);
            setConnecting(false);
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setHasFailed(true);
            setConnecting(false);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    };

    const sendInitialSubscription = () => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

        const now = dayjs();
        const hoursBack = parseInt(selectedRange.replace('h', ''), 10);
        const startTime = now.subtract(hoursBack, 'hour');
        const endTime = now;

        lastEndTimeRef.current = endTime;

        const payload = {
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            tokens: selectedCoins,
        };

        socketRef.current.send(JSON.stringify(payload));

        intervalRef.current = setInterval(() => {
            sendRollingSubscription();
        }, 1 * 60 * 1000);
    };

    const sendRollingSubscription = () => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN || !lastEndTimeRef.current) return;

        const prevEndTime = lastEndTimeRef.current;
        const newEndTime = dayjs(); // Current time

        const payload = {
            start_time: prevEndTime.toISOString(),
            end_time: newEndTime.toISOString(),
            tokens: selectedCoins,
        };

        console.log('Sending rolling subscription:', payload);

        socketRef.current.send(JSON.stringify(payload));

        lastEndTimeRef.current = newEndTime;
    };

    useEffect(() => {
        createWebSocket();

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            setData([]);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            sendInitialSubscription();
        }
    }, [selectedCoins, selectedRange]);

    const handleCoinChange = (values: string[]) => {
        setSelectedCoins(values);
    };

    const handleRangeChange = (range: string) => {
        setSelectedRange(range);
    };

    return (
        <div className="chart-container">
            <Spin spinning={connecting && !hasFailed} tip="Connecting to live sentiment feed...">
                {hasFailed ? (
                    <div style={{ textAlign: 'center', color: 'red', margin: '2rem 0' }}>
                        Failed to connect to the server.
                    </div>
                ) : (
                    <>
                        <Title level={3}>Live Crypto Sentiment</Title>

                        <div className="time-range-buttons">
                            {['1h', '2h', '5h', '10h', '24h'].map((label) => (
                                <button
                                    key={label}
                                    className={`time-btn ${selectedRange === label ? 'active' : ''}`}
                                    onClick={() => handleRangeChange(label)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="time"
                                    tickFormatter={(tick) => dayjs(tick, 'YYYY-MM-DD HH:mm').format('HH:mm')}
                                    interval={calculateInterval(data.length)}
                                    minTickGap={20}
                                />
                                <YAxis domain={[-1, 1]} />
                                <Tooltip />
                                <Legend />
                                {selectedCoins.map((coin, index) => (
                                    <Line
                                        key={coin}
                                        type="monotone"
                                        dataKey={coin}
                                        stroke={coinColors[index % coinColors.length]}
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>

                        <div className="control-group">
                            <label>Select Coins:</label>
                            <Checkbox.Group
                                options={allCoins}
                                value={selectedCoins}
                                onChange={handleCoinChange}
                                style={{ marginBottom: 16 }}
                            />
                        </div>
                    </>
                )}
            </Spin>
        </div>
    );
};

export default LivePage;
