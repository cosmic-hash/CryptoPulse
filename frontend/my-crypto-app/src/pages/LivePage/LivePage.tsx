import React, { useEffect, useRef, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { Checkbox, Typography, message, Spin } from 'antd';
import dayjs from 'dayjs';
import './LivePage.css';

const { Title } = Typography;

const SOCKET_URL = 'wss://crypto-pulse-1-546660857332.us-central1.run.app/ws';

const fullCoinNames = [
    'Bitcoin', 'Ethereum', 'Tether', 'XRP', 'BNB',
    'Solana', 'USD Coin', 'TRON', 'Dogecoin', 'Cardano'
];

const coinNameToSymbol: Record<string, string> = {
    Bitcoin: 'BTC',
    Ethereum: 'ETH',
    Tether: 'USDT',
    XRP: 'XRP',
    BNB: 'BNB',
    Solana: 'SOL',
    'USD Coin': 'USDC',
    TRON: 'TRX',
    Dogecoin: 'DOGE',
    Cardano: 'ADA',
};

const coinSymbolToName: Record<string, string> = Object.fromEntries(
    Object.entries(coinNameToSymbol).map(([name, symbol]) => [symbol, name])
);

const coinColors = [
    '#e6194b', '#3cb44b', '#ffe119', '#0082c8', '#f58231',
    '#911eb4', '#46f0f0', '#f032e6', '#d2f53c', '#fabebe'
];

type SentimentPoint = {
    time: string;
    [coin: string]: number | string;
};

const LivePage: React.FC = () => {
    const [selectedCoins, setSelectedCoins] = useState<string[]>([]);
    const [selectedRange, setSelectedRange] = useState<string>('1h');
    const [data, setData] = useState<SentimentPoint[]>([]);
    const [connecting, setConnecting] = useState(true);
    const [hasFailed, setHasFailed] = useState(false);
    const [readyToConnect, setReadyToConnect] = useState(false);

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
                    const newPoint: SentimentPoint = { time: dayjs(point.time).format('YYYY-MM-DD HH:mm') };
                    for (const coin of Object.keys(point.coins)) {
                        newPoint[coin] = point.coins[coin];
                    }
                    return newPoint;
                });
                setData(prev => {
                    const merged = [...prev, ...formatted];
                    const dedupedMap = new Map<string, SentimentPoint>();
                    merged.forEach(point => dedupedMap.set(point.time, point));
                    return Array.from(dedupedMap.values()).sort((a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf()).slice(-300);
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
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    };

    const sendInitialSubscription = () => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

        if (!selectedCoins.length) {
            console.log('No coins selected. Waiting for user selection.');
            return;
        }

        const now = dayjs();
        const hoursBack = parseInt(selectedRange.replace('h', ''), 10);
        const startTime = now.subtract(hoursBack, 'hour');
        const endTime = now;

        lastEndTimeRef.current = endTime;

        const payload = {
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            tokens: selectedCoins.map(name => coinNameToSymbol[name]),
        };

        console.log('Sending initial subscription:', payload);
        socketRef.current.send(JSON.stringify(payload));

        intervalRef.current = setInterval(sendRollingSubscription, 60 * 1000);
    };


    const sendRollingSubscription = () => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN || !lastEndTimeRef.current) return;
        if (!selectedCoins.length) return;

        const prevEndTime = lastEndTimeRef.current;
        const newEndTime = dayjs();

        const payload = {
            start_time: prevEndTime.toISOString(),
            end_time: newEndTime.toISOString(),
            tokens: selectedCoins.map(name => coinNameToSymbol[name]),
        };

        console.log('Sending rolling subscription:', payload);
        socketRef.current.send(JSON.stringify(payload));

        lastEndTimeRef.current = newEndTime;
    };

    useEffect(() => {
        const fetchUserCoins = async () => {
            const token = localStorage.getItem('backendToken');
            if (!token){
                // setHasFailed(true);
                setReadyToConnect(true);
                return;
            }

            try {
                const res = await fetch('https://auth-app-877042335787.us-central1.run.app/api/users/profile', {
                    headers: { Authorization: token },
                });
                const data = await res.json();

                if (data.success || data.user.coins) {
                    const userCoins: string[] = data.user.coins || [];
                    const mappedCoins = userCoins
                        .map(symbol => coinSymbolToName[symbol])
                        .filter(name => !!name) as string[];
                    setSelectedCoins(mappedCoins);
                }
            } catch (error) {
                console.error('Failed to fetch user coins', error);
                setSelectedCoins([]);
            } finally {
                setReadyToConnect(true);
            }
        };

        fetchUserCoins();
    }, []);


    useEffect(() => {
        if (!readyToConnect) return;

        createWebSocket();

        return () => {
            if (socketRef.current) socketRef.current.close();
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [readyToConnect]);

    useEffect(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            setData([]);
            if (intervalRef.current) clearInterval(intervalRef.current);
            sendInitialSubscription();
        }
    }, [selectedCoins, selectedRange]);

    const handleCoinChange = (values: string[]) => setSelectedCoins(values);

    const handleRangeChange = (range: string) => setSelectedRange(range);

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
                            {['1h', '2h', '5h', '10h', '24h'].map(label => (
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
                                <XAxis dataKey="time" tickFormatter={tick => dayjs(tick, 'YYYY-MM-DD HH:mm').format('HH:mm')} interval={calculateInterval(data.length)} />
                                <YAxis domain={[-1, 1]} />
                                <Tooltip />
                                <Legend />
                                {selectedCoins.map((coin, index) => (
                                    <Line
                                        key={coin}
                                        type="monotone"
                                        dataKey={coinNameToSymbol[coin]}
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
                                options={fullCoinNames}
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
