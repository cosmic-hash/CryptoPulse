import React, { useEffect, useRef, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { Checkbox, Typography, message, Spin, Modal } from 'antd';
import dayjs from 'dayjs';
import './LivePage.css';

const { Title } = Typography;

const SOCKET_URL = 'wss://crypto-pulse-1-546660857332.us-central1.run.app/ws';
const EXPLAIN_API_URL = 'https://crypto-pulse-1-546660857332.us-central1.run.app/explain';

const fullCoinNames = [
    'Bitcoin', 'Ethereum', 'Tether', 'Ripple', 'Binance',
    'Solana', 'CryptoCurrency', 'Tronix', 'Dogecoin', 'Cardano'
];

const coinNameToSymbol: Record<string, string> = {
    Bitcoin: 'BTC',
    Ethereum: 'ETH',
    Tether: 'USDT',
    Ripple: 'XRP',
    Binance: 'BNB',
    Solana: 'SOL',
    CryptoCurrency: 'USDC',
    Tronix: 'TRX',
    Dogecoin: 'DOGE',
    Cardano: 'ADA',
};

const coinSymbolToName: Record<string, string> = Object.fromEntries(
    Object.entries(coinNameToSymbol).map(([name, symbol]) => [symbol, name])
);

// Map of coin symbols to their IDs for the explain API
const coinSymbolToId: Record<string, number> = {
    BTC: 91,
    ETH: 92,
    USDT: 93,
    XRP: 97,
    BNB: 95,
    SOL: 99,
    USDC: 94,
    TRX: 103,
    DOGE: 100,
    ADA: 96,
};

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

    // States for explanation modal
    const [isExplanationModalVisible, setIsExplanationModalVisible] = useState(false);
    const [selectedPoint, setSelectedPoint] = useState<{time: string, coin: string} | null>(null);
    const [explanation, setExplanation] = useState<string>('');
    const [loadingExplanation, setLoadingExplanation] = useState(false);

    const socketRef = useRef<WebSocket | null>(null);
    const lastEndTimeRef = useRef<dayjs.Dayjs | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Track which coin's line was last interacted with
    const [activeLineKey, setActiveLineKey] = useState<string | null>(null);

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

    // Fetch sentiment explanation from API
    const fetchExplanation = async (time: string, coin: string) => {
        try {
            setLoadingExplanation(true);

            const pointTime = dayjs(time, 'YYYY-MM-DD HH:mm');
            const startTime = pointTime.subtract(5, 'minute').toISOString();
            const endTime = pointTime.toISOString();

            const coinSymbol = coin;
            const coinId = coinSymbolToId[coinSymbol];

            if (!coinId) {
                throw new Error(`Coin ID not found for symbol: ${coinSymbol}`);
            }

            console.log('Fetching explanation for:', {
                coin_id: coinId,
                start_time: startTime,
                end_time: endTime
            });

            const response = await fetch(EXPLAIN_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    coin_id: coinId,
                    start_time: startTime,
                    end_time: endTime
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status: ${response.status}`);
            }

            const data = await response.json();
            setExplanation(data.explanation || 'No explanation available.');
        } catch (error) {
            console.error('Failed to fetch explanation:', error);
            setExplanation('Failed to load explanation. Please try again later.');
            message.error('Failed to fetch sentiment explanation');
        } finally {
            setLoadingExplanation(false);
        }
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

    // Handle line mouse enter to track which line is active
    const handleLineMouseEnter = (dataKey: string) => {
        setActiveLineKey(dataKey);
    };

    // Handle point click for explanation
    const handlePointClick = (payload: any) => {
        if (!payload || !payload.activeLabel) return;

        // Get the time from the clicked point
        const time = payload.activeLabel;

        // Use the active line dataKey if available, otherwise fallback to first coin
        const coin = activeLineKey || (selectedCoins.length > 0 ? coinNameToSymbol[selectedCoins[0]] : null);

        if (!coin) {
            message.warning('Please select a coin first');
            return;
        }

        console.log('Point clicked:', {time, coin});

        // Set the selected point and open the modal
        setSelectedPoint({time, coin});
        setIsExplanationModalVisible(true);

        // Fetch the explanation
        fetchExplanation(time, coin);
    };

    // Custom tooltip for the chart
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip">
                    <p className="tooltip-time">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p
                            key={index}
                            style={{
                                color: entry.color,
                                fontWeight: entry.dataKey === activeLineKey ? 'bold' : 'normal',
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                setActiveLineKey(entry.dataKey);
                                handlePointClick({activeLabel: label});
                            }}
                        >
                            {coinSymbolToName[entry.dataKey] || entry.name}: {entry.value.toFixed(2)}
                            {entry.dataKey === activeLineKey && ' (selected)'}
                        </p>
                    ))}
                    <p className="tooltip-hint">Click on a coin name above to see its sentiment explanation</p>
                </div>
            );
        }
        return null;
    };

    // Get the active line color for displaying in the modal
    const getActiveCoinColor = () => {
        if (!activeLineKey) return '#000';
        const coinName = coinSymbolToName[activeLineKey];
        const index = selectedCoins.indexOf(coinName);
        return index >= 0 ? coinColors[index % coinColors.length] : '#000';
    };

    return (
        <div className="chart-container">
            <Spin spinning={connecting && !hasFailed} tip="Connecting to live sentiment feed...">
                {hasFailed ? (
                    <div className="connection-error">
                        Failed to connect to the server.
                    </div>
                ) : (
                    <>
                        <Title level={3} style={{ color: '#fff' }}>
                            Live Crypto Sentiment
                        </Title>
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
                            <LineChart
                                data={data}
                                onClick={handlePointClick}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="time"
                                    tickFormatter={tick => dayjs(tick, 'YYYY-MM-DD HH:mm').format('HH:mm')}
                                    interval={calculateInterval(data.length)}
                                />
                                <YAxis domain={[-1, 1]} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    onClick={(e) => {
                                        const key = e.dataKey;
                                        if (typeof key === 'string') {
                                            setActiveLineKey(key);
                                        }
                                    }}
                                />
                                {selectedCoins.map((coin, index) => {
                                    const dataKey = coinNameToSymbol[coin];
                                    const isActive = dataKey === activeLineKey;

                                    return (
                                        <Line
                                            key={coin}
                                            type="monotone"
                                            dataKey={dataKey}
                                            stroke={coinColors[index % coinColors.length]}
                                            strokeWidth={isActive ? 3 : 2}
                                            dot={false}
                                            activeDot={{
                                                r: isActive ? 7 : 5,
                                                stroke: '#fff',
                                                strokeWidth: 2,
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={() => handleLineMouseEnter(dataKey)}
                                        />
                                    );
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                        <div className="chart-instructions">
                            Select a data point to see sentiment explanation
                        </div>
                        <div className="control-group">
                            <label>Select Coins:</label>
                            <Checkbox.Group
                                options={fullCoinNames}
                                value={selectedCoins}
                                onChange={handleCoinChange}
                                style={{ marginBottom: 16 }}
                            />
                        </div>

                        {/* Explanation Modal */}
                        <Modal
                            title={
                                selectedPoint ? (
                                    <div style={{
                                        color: getActiveCoinColor(),
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>Sentiment Explanation for {coinSymbolToName[selectedPoint.coin] || selectedPoint.coin}</span>
                                        <span style={{ color: '#666', fontWeight: 'normal', fontSize: '14px' }}>
                                            at {selectedPoint.time}
                                        </span>
                                    </div>
                                ) : 'Sentiment Explanation'
                            }
                            open={isExplanationModalVisible}
                            onCancel={() => setIsExplanationModalVisible(false)}
                            footer={[
                                <button key="close" className="modal-close-btn" onClick={() => setIsExplanationModalVisible(false)}>
                                    Close
                                </button>
                            ]}
                            width={700}
                        >
                            <Spin spinning={loadingExplanation}>
                                <div className="explanation-content">
                                    {explanation ? (
                                        explanation.split('\n').map((paragraph, index) => (
                                            <p key={index}>{paragraph}</p>
                                        ))
                                    ) : (
                                        <p>Loading explanation...</p>
                                    )}
                                </div>
                            </Spin>
                        </Modal>
                    </>
                )}
            </Spin>
        </div>
    );
};

export default LivePage;
