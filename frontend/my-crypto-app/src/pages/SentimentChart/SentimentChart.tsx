import React, { useEffect, useState } from 'react';
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
import {
    DatePicker,
    message,
    Checkbox,
    Typography,
    Spin,
    Button,
    Modal,
} from 'antd';
import dayjs from 'dayjs';
import './SentimentChart.css';

const { Title } = Typography;

const allCoins = [
    'Bitcoin', 'Ethereum', 'Tether', 'Ripple', 'Binance',
    'Solana', 'CryptoCurrency', 'Tronix', 'Dogecoin', 'Cardano'
];

const coinColors = [
    '#e6194b', '#3cb44b', '#ffe119', '#0082c8', '#f58231',
    '#911eb4', '#46f0f0', '#f032e6', '#d2f53c', '#fabebe'
];

type SentimentPoint = {
    time: string;
    sentiment: Record<string, number>;
    title: Record<string, string>;
    url: Record<string, string>;
};

const fetchSentimentData = async (
    start: Date,
    end: Date,
    coins: string[]
): Promise<SentimentPoint[]> => {
    try {
        const response = await fetch('https://stream-app-877042335787.us-central1.run.app/news', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                start_date: start.toISOString(),
                end_date: end.toISOString(),
                currency_codes: coins,
            }),
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const newsData: {
            currency_code: string;
            id: number;
            newsdatetime: string;
            score: number;
            title: string;
            url: string;
        }[] = await response.json();

        const grouped: Record<string, SentimentPoint> = {};

        newsData.forEach(item => {
            const timeKey = dayjs(item.newsdatetime).format('DD-MMMM-YYYY HH:mm');

            if (!grouped[timeKey]) {
                grouped[timeKey] = {
                    time: timeKey,
                    sentiment: {},
                    title: {},
                    url: {},
                };
            }

            grouped[timeKey].sentiment[item.currency_code] = item.score;
            grouped[timeKey].title[item.currency_code] = item.title;
            grouped[timeKey].url[item.currency_code] = item.url;
        });

        const sortedData = Object.values(grouped).sort((a, b) =>
            dayjs(a.time, 'DD-MMMM-YYYY HH:mm').toDate().getTime() -
            dayjs(b.time, 'DD-MMMM-YYYY HH:mm').toDate().getTime()
        );

        return sortedData;
    } catch (error) {
        console.error('Error fetching sentiment data:', error);
        throw error;
    }
};

const SentimentChart: React.FC = () => {
    const [timeRange, setTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(() => {
        const start = dayjs('2025-01-01T00:00:00');
        const end = dayjs('2025-01-02T23:59:59');
        return [start, end];
    });

    const [selectedCoins, setSelectedCoins] = useState<string[]>([]);
    const [chartData, setChartData] = useState<SentimentPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // State for news modal
    const [modalVisible, setModalVisible] = useState(false);
    const [currentNewsUrl, setCurrentNewsUrl] = useState("");
    const [currentNewsTitle, setCurrentNewsTitle] = useState("");

    // New state to track active line/coin
    const [activeCoin, setActiveCoin] = useState<string | null>(null);

    const coinSymbolToName: Record<string, string> = {
        BTC: "Bitcoin",
        ETH: "Ethereum",
        USDT: "Tether",
        XRP: "Ripple",
        BNB: "Binance",
        SOL: "Solana",
        USDC: "CryptoCurrency",
        TRX: "Tronix",
        DOGE: "Dogecoin",
        ADA: "Cardano",
    };

    const coinNameToSymbol: Record<string, string> = Object.fromEntries(
        Object.entries(coinSymbolToName).map(([k, v]) => [v, k])
    );

    // Handler for opening news in modal
    const openNewsModal = (url: string, title: string) => {
        setCurrentNewsUrl(url);
        setCurrentNewsTitle(title);
        setModalVisible(true);
    };

    // Direct handler for opening news in new tab (without modal)
    const openNewsInNewTab = (url?: string) => {
        const urlToOpen = url || currentNewsUrl;
        if (urlToOpen) {
            window.open(urlToOpen, '_blank', 'noopener,noreferrer');
        }
        setModalVisible(false);
    };

    // NEW: Handle data point click
    const handlePointClick = (data: any) => {
        if (!data || !data.activeLabel) return;

        // Get the clicked time
        const clickedTime = data.activeLabel;

        // Find the corresponding data point
        const dataPoint = chartData.find(point => point.time === clickedTime);
        if (!dataPoint) return;

        // Use the active coin if available, otherwise use the first selected coin
        const coinSymbol = activeCoin ||
            (selectedCoins.length > 0 ? coinNameToSymbol[selectedCoins[0]] : null);

        if (!coinSymbol) {
            message.warning('Please select a coin first');
            return;
        }

        const url = dataPoint.url[coinSymbol];
        const title = dataPoint.title[coinSymbol] || 'News';

        if (url) {
            // Directly open in new tab
            openNewsInNewTab(url);
        } else {
            message.info('No news URL available for this data point');
        }
    };

    // NEW: Handle line mouse enter to track active coin
    const handleLineMouseEnter = (dataKey: string) => {
        const coinSymbol = dataKey.split('.')[1];
        setActiveCoin(coinSymbol);
    };

    const fetchAndUpdateChart = async () => {
        setLoading(true);
        try {
            const coinsToSend = selectedCoins.map((coinName) => {
                const symbol = Object.entries(coinSymbolToName).find(([, name]) => name === coinName)?.[0];
                return symbol || coinName;
            });

            const data = await fetchSentimentData(
                timeRange[0].toDate(),
                timeRange[1].toDate(),
                coinsToSend
            );
            setChartData(data);
            message.success('Sentiment data loaded');
        } catch (error) {
            message.error('Failed to fetch sentiment data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchUserCoins = async () => {
            const token = localStorage.getItem('backendToken');
            if (!token) {
                setSelectedCoins(allCoins); // Default to all coins if no token
                return;
            }

            try {
                const res = await fetch('https://auth-app-877042335787.us-central1.run.app/api/users/profile', {
                    headers: { Authorization: token },
                });
                const data = await res.json();

                if (data.success || data.user?.coins) {
                    const userCoins: string[] = data.user.coins || [];

                    const mappedCoins = userCoins
                        .map(symbol => coinSymbolToName[symbol])
                        .filter(name => !!name);

                    setSelectedCoins(mappedCoins.length > 0 ? mappedCoins : allCoins);
                } else {
                    setSelectedCoins(allCoins); // Default to all coins
                }
            } catch (error) {
                console.error('Failed to fetch user coins', error);
                setSelectedCoins(allCoins); // Default to all coins on error
            }
        };

        fetchUserCoins();
    }, []);

    // Auto-submit on initial load once coins are loaded
    useEffect(() => {
        if (isInitialLoad && selectedCoins.length > 0) {
            fetchAndUpdateChart();
            setIsInitialLoad(false);
        }
    }, [selectedCoins, isInitialLoad]);

    const handleCoinChange = (checkedValues: string[]) => {
        setSelectedCoins(checkedValues);
    };

    return (
        <div className="chart-container">
            <Spin spinning={loading} tip="Loading sentiment data...">
                <div className="chart-controls">
                    <Title level={3}>Crypto Sentiment Chart</Title>

                    <div className="date-submit-row">
                        <div className="control-group">
                            <label>Start Time:</label>
                            <DatePicker
                                showTime
                                value={timeRange[0]}
                                format="YYYY/MM/DD HH:mm"
                                onChange={(value) => {
                                    if (value) {
                                        setTimeRange([value, timeRange[1]]);
                                    }
                                }}
                            />
                        </div>

                        <div className="control-group">
                            <label>End Time:</label>
                            <DatePicker
                                showTime
                                value={timeRange[1]}
                                format="YYYY/MM/DD HH:mm"
                                onChange={(value) => {
                                    if (value) {
                                        setTimeRange([timeRange[0], value]);
                                    }
                                }}
                            />
                        </div>

                        <div className="submit-button-wrapper">
                            <Button type="primary" onClick={fetchAndUpdateChart}>
                                Submit
                            </Button>
                        </div>
                    </div>

                    <div className="control-group">
                        <label>Select Coins:</label>
                        <Checkbox.Group
                            options={allCoins}
                            value={selectedCoins}
                            onChange={handleCoinChange}
                        />
                    </div>
                </div>

                <div className="chart-instructions">
                    Click on a data point to open the related news article in a new tab
                </div>

                <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                        data={chartData}
                        onClick={handlePointClick} // NEW: Add click handler
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="time"
                            tickFormatter={(v) =>
                                dayjs(v, 'DD-MMMM-YYYY HH:mm').format('DD/MM HH:mm')
                            }
                            interval="preserveStartEnd"
                            angle={-10}
                            textAnchor="end"
                        />
                        <YAxis domain={[-1, 1]} tickFormatter={(v) => v.toFixed(3)} />
                        <Tooltip
                            wrapperStyle={{
                                pointerEvents: 'auto',
                                maxHeight: 300,
                                overflowY: 'auto',
                                backgroundColor: '#1A1F2C',
                                zIndex: 999
                            }}
                            content={({ active, payload, label }) => {
                                if (!active || !payload || payload.length === 0) return null;

                                return (
                                    <div className="custom-tooltip">
                                        <div className="custom-tooltip-header">{label}</div>
                                        <div className="custom-tooltip-body">
                                            {payload.map((entry) => {
                                                const dataKey = entry.dataKey as string;
                                                const symbol = dataKey.split('.')[1];
                                                const coin = coinSymbolToName[symbol] || symbol;
                                                const value = entry.value;
                                                const fullData = entry.payload as any;
                                                const title = fullData.title?.[symbol];
                                                const url = fullData.url?.[symbol];
                                                const isActive = symbol === activeCoin;

                                                return (
                                                    <div
                                                        key={symbol}
                                                        className="custom-tooltip-item"
                                                        style={{
                                                            fontWeight: isActive ? 'bold' : 'normal',
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => {
                                                            setActiveCoin(symbol);
                                                            if (url) {
                                                                openNewsInNewTab(url);
                                                            }
                                                        }}
                                                    >
                                                        <strong>
                                                            {coin}: {Number(value).toFixed(3)}
                                                            {isActive && ' (selected)'}
                                                        </strong>
                                                        {title && <small>{title}</small>}
                                                        {url && (
                                                            <Button
                                                                size="small"
                                                                className="news-link-button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openNewsModal(url, title || 'News');
                                                                }}
                                                            >
                                                                Read News
                                                            </Button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="tooltip-hint">Click on a coin name above or a data point to open the news article</p>
                                    </div>
                                );
                            }}
                        />
                        <Legend
                            formatter={(value) => {
                                const coin = value.split('.')[1];
                                return <span style={{ color: '#ffffff' }}>{coin}</span>;
                            }}
                            onClick={(entry) => {
                                if (typeof entry.dataKey === 'string') {
                                    const coinSymbol = entry.dataKey.split('.')[1];
                                    setActiveCoin(coinSymbol);
                                }
                            }}
                        />
                        {selectedCoins.map((coin, index) => {
                            const symbol = coinNameToSymbol[coin];
                            const dataKey = `sentiment.${symbol}`;
                            const isActive = symbol === activeCoin;

                            return (
                                <Line
                                    key={coin}
                                    type="monotone"
                                    dataKey={dataKey}
                                    strokeWidth={isActive ? 3 : 2}
                                    stroke={coinColors[index % coinColors.length]}
                                    dot={{
                                        r: isActive ? 5 : 3,
                                        stroke: '#fff',
                                        strokeWidth: isActive ? 2 : 1,
                                        cursor: 'pointer'
                                    }}
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
            </Spin>

            {/* News URL Modal */}
            <Modal
                title={currentNewsTitle}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setModalVisible(false)}>
                        Close
                    </Button>,
                    <Button key="open" type="primary" onClick={() => openNewsInNewTab()}>
                        Open in New Tab
                    </Button>
                ]}
            >
                <p>Would you like to visit this news article?</p>
                <p className="news-url">{currentNewsUrl}</p>
            </Modal>
        </div>
    );
};

export default SentimentChart;