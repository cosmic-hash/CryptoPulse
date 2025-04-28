import React, { useState } from 'react';
import SentimentChart from '../SentimentChart/SentimentChart';
import LivePage from '../LivePage/LivePage';
import './SentimentDashboard.css';

const SentimentDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'historical' | 'live'>('live');

    return (
        <div className="dashboard-container">
            <div className="tabs">
                <button
                    className={activeTab === 'live' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('live')}
                >
                    Live
                </button>
                <button
                    className={activeTab === 'historical' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('historical')}
                >
                    Historical
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'historical' && <SentimentChart />}
                {activeTab === 'live' && <LivePage />}
            </div>
        </div>
    );
};

export default SentimentDashboard;