import React, { useEffect, useState } from 'react';
import { Bell, Edit, Trash2 } from 'lucide-react';

export default function CryptoProfilePage() {
  const [darkMode] = useState(true);

  // Profile Data
  const [profileData, setProfileData] = useState<{
    name: string;
    email: string;
    profilePic: string;
    lastLogin: string;
    createdAt: string;
    userId: string;
  } | null>(null);

  // Coins
  const allCoins = ['BTC', 'ETH', 'USDT', 'XRP', 'BNB', 'SOL', 'USDC', 'TRX', 'DOGE', 'ADA'];
  const [selectedCoins, setSelectedCoins] = useState<string[]>([]);
  const [originalCoins, setOriginalCoins] = useState<string[]>([]);
  const [savingCoins, setSavingCoins] = useState(false);

  // Questions
  const [questions, setQuestions] = useState<{ id: number; question: string; answers: number }[]>([
    { id: 1, question: "What's your take on the next BTC halving?", answers: 23 },
    { id: 2, question: "Is ETH 2.0 the future of DeFi?", answers: 47 },
  ]);
  const [askModalOpen, setAskModalOpen] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<string[]>([]);
  const [selectedNewQuestion, setSelectedNewQuestion] = useState('');
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Sentiment Alerts
  const [sentimentAlerts, setSentimentAlerts] = useState<{
    id: string;
    coinId: number;
    threshold: number;
    email: string;
  }[]>([]);
  const [isSentimentModalOpen, setIsSentimentModalOpen] = useState(false);
  const [sentimentModalMode, setSentimentModalMode] = useState<'add' | 'edit'>('add');
  const [currentEditSentiment, setCurrentEditSentiment] = useState<string | null>(null);
  const [formCoinAlert, setFormCoinAlert] = useState('');
  const [formThresholdAlert, setFormThresholdAlert] = useState('');

  // Coin mappings
  const coinNameToId: Record<string, number> = {
    BTC: 1, ETH: 2, USDT: 3, XRP: 4, BNB: 5,
    SOL: 6, USDC: 7, TRX: 8, DOGE: 9, ADA: 10,
  };
  const coinIdToName = (id: number) =>
      Object.entries(coinNameToId).find(([, val]) => val === id)?.[0] ?? '';

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);


  useEffect(() => {
    if (profileData?.userId) {
      fetchSentimentAlerts();
    }
  }, [profileData?.userId]);

  const fetchProfile = async () => {
    const token = localStorage.getItem('backendToken');
    if (!token) {
      console.error("No token found");
      return;
    }

    try {
      const res = await fetch('https://auth-app-877042335787.us-central1.run.app/api/users/profile', {
        headers: { Authorization: token },
      });
      const data = await res.json();
      if (data.success && data.user) {
        setProfileData({
          name: data.user.name,
          email: data.user.email,
          profilePic: data.user.picture,
          lastLogin: data.user.last_login,
          createdAt: data.user.created_at,
          userId: data.user.uid,
        });

        const coinsData = typeof data.user.coins === 'string'
            ? data.user.coins.split(',').map((c: string) => c.trim())
            : Array.isArray(data.user.coins)
                ? data.user.coins
                : [];

        setSelectedCoins(coinsData);
        setOriginalCoins(coinsData);
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const toggleCoin = (code: string) => {
    setSelectedCoins((prev) =>
        prev.includes(code)
            ? prev.filter(c => c !== code)
            : [...prev, code]
    );
  };

  const coinsChanged = () => {
    if (selectedCoins.length !== originalCoins.length) return true;
    const set1 = new Set(selectedCoins);
    const set2 = new Set(originalCoins);
    for (let coin of set1) if (!set2.has(coin)) return true;
    return false;
  };

  const saveSelectedCoins = async () => {
    const token = localStorage.getItem('backendToken');
    if (!token) return;

    try {
      setSavingCoins(true);
      const res = await fetch('https://auth-app-877042335787.us-central1.run.app/api/users/update-coins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({ coins: selectedCoins.join(',') }),
      });
      const data = await res.json();
      if (data.success) {
        setOriginalCoins([...selectedCoins]);
        alert('Coins updated successfully!');
      } else {
        alert('Failed to update coins.');
      }
    } catch (err) {
      console.error('Error updating coins', err);
      alert('Error updating coins.');
    } finally {
      setSavingCoins(false);
    }
  };

  const fetchAvailableQuestions = async () => {
    setLoadingQuestions(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // simulate delay
      const fetchedQuestions = [
        "What is Bitcoin Lightning Network?",
        "Best strategies for holding ETH?",
        "Future of Solana staking?",
        "Impact of ETF approval on BTC price?",
      ];
      setAvailableQuestions(fetchedQuestions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const submitNewQuestion = async () => {
    if (!selectedNewQuestion) return;
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // simulate API
      setQuestions(prev => [
        ...prev,
        { id: prev.length + 1, question: selectedNewQuestion, answers: 0 }
      ]);
      setAskModalOpen(false);
      setSelectedNewQuestion('');
      alert('Question added successfully!');
    } catch (err) {
      console.error(err);
    }
  };
  const fetchSentimentAlerts = async () => {
    try {
      const res = await fetch('https://crypto-pulse-1-546660857332.us-central1.run.app/alerts', {
        headers: { 'X-User-ID': profileData!.userId },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSentimentAlerts(data.map((alert: any) => ({
          id: alert.ID,
          coinId: alert.CoinID,
          threshold: alert.Threshold,
          email: alert.Email,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    }
  };

  const openAddAlertModal = () => {
    setSentimentModalMode('add');
    setFormCoinAlert('');
    setFormThresholdAlert('');
    setIsSentimentModalOpen(true);
  };

  const openEditAlertModal = (alert: { id: string; coinId: number; threshold: number }) => {
    setSentimentModalMode('edit');
    setCurrentEditSentiment(alert.id);
    setFormCoinAlert(coinIdToName(alert.coinId));
    setFormThresholdAlert(alert.threshold.toString());
    setIsSentimentModalOpen(true);
  };

  const handleSaveAlert = async () => {
    if (!profileData) return;
    const thresholdNum = parseFloat(formThresholdAlert);
    if (!formCoinAlert || isNaN(thresholdNum) || thresholdNum < -1 || thresholdNum > 1) {
      alert('Please enter a valid threshold between -1.0 and 1.0');
      return;
    }

    const payload = {
      coinId: coinNameToId[formCoinAlert],
      threshold: thresholdNum,
      email: profileData.email,
    };

    if (sentimentModalMode === 'add') {
      try {
        const res = await fetch('https://crypto-pulse-1-546660857332.us-central1.run.app/alerts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': profileData.userId,
          },
          body: JSON.stringify(payload),
        });
        await res.json();
        alert('Sentiment alert created!');
        fetchSentimentAlerts();
      } catch (err) {
        console.error('Failed to create alert', err);
      }
    } else if (sentimentModalMode === 'edit' && currentEditSentiment) {
      const res = await fetch(`https://crypto-pulse-1-546660857332.us-central1.run.app/alerts/${currentEditSentiment}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': profileData.userId,
        },
        body: JSON.stringify(payload),
      });
      await res.json();
      alert('Sentiment alert updated!');
    }
    fetchSentimentAlerts();
    setIsSentimentModalOpen(false);
  };

  const handleDeleteAlert = async (id: string, confirmPopup = true) => {
    if (confirmPopup) {
      const confirm = window.confirm('Are you sure you want to delete this alert?');
      if (!confirm) return;
    }
    try {
      await fetch(`https://crypto-pulse-1-546660857332.us-central1.run.app/alerts/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-ID': profileData!.userId },
      });
      alert('Alert deleted successfully!');
      fetchSentimentAlerts();
    } catch (err) {
      console.error('Failed to delete alert', err);
    }
  };

// 🚀 Part 2 will continue after this!
  return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-pink-300' : 'bg-gray-200 text-pink-600'}`}>
        <div className="container mx-auto px-4 py-8">

          {/* Profile Section */}
          {profileData && (
              <div className="mb-8 p-6 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-800">
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-pink-500">
                    <img src={profileData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-2xl font-bold mb-2 text-pink-300">{profileData.name}</div>
                  <div className="mb-4 text-gray-400">{profileData.email}</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded bg-gray-700">
                      <div className="text-sm text-gray-400">Last Login</div>
                      <div className="text-xl font-bold text-pink-300">{profileData.lastLogin}</div>
                    </div>
                    <div className="p-4 rounded bg-gray-700">
                      <div className="text-sm text-gray-400">Created At</div>
                      <div className="text-xl font-bold text-pink-300">{profileData.createdAt}</div>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* Selected Coins Section */}
          <div className="mb-8 p-6 rounded-lg bg-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-pink-300">SELECTED COINS</h2>
              <button
                  onClick={saveSelectedCoins}
                  disabled={!coinsChanged() || savingCoins}
                  className={`px-6 py-2 rounded-lg font-bold ${
                      coinsChanged() && !savingCoins
                          ? 'bg-pink-500 hover:bg-pink-600 text-black'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {savingCoins ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {allCoins.map((coin) => (
                  <button
                      key={coin}
                      onClick={() => toggleCoin(coin)}
                      className={`px-4 py-2 rounded-t border-2 text-sm font-bold ${
                          selectedCoins.includes(coin)
                              ? 'bg-pink-900 border-pink-500 text-pink-300'
                              : 'bg-gray-700 border-gray-600 text-gray-400'
                      }`}
                  >
                    {coin}
                  </button>
              ))}
            </div>
          </div>

          {/* Questions Section */}
          <div className="mb-8 p-6 rounded-lg bg-gray-800">
            <h2 className="text-xl font-bold mb-4 text-pink-300">YOUR QUESTIONS</h2>

            <div className="space-y-4">
              {questions.map(q => (
                  <div key={q.id} className="p-4 rounded border-l-4 bg-gray-700 border-pink-500">
                    <div className="text-lg font-bold text-pink-300">{q.question}</div>
                    <div className="text-sm text-gray-400">{q.answers} answers</div>
                  </div>
              ))}

              <button
                  onClick={() => {
                    setAskModalOpen(true);
                    fetchAvailableQuestions();
                  }}
                  className="w-full p-3 mt-3 border-2 border-dashed flex items-center justify-center border-gray-600 text-gray-400 hover:border-pink-500 hover:text-pink-300"
              >
                + ASK NEW QUESTION
              </button>
            </div>
          </div>

          {/* Ask New Question Modal */}
          {askModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md relative">
                  <h2 className="text-xl font-bold mb-4 text-pink-300">Select a Question</h2>

                  {loadingQuestions ? (
                      <div className="text-gray-400">Loading questions...</div>
                  ) : (
                      <select
                          value={selectedNewQuestion}
                          onChange={(e) => setSelectedNewQuestion(e.target.value)}
                          className="w-full p-3 rounded bg-gray-700 text-pink-300 border border-pink-500"
                      >
                        <option value="">-- Select a question --</option>
                        {availableQuestions.map((q, idx) => (
                            <option key={idx} value={q}>{q}</option>
                        ))}
                      </select>
                  )}

                  <div className="flex justify-end gap-4 mt-6">
                    <button
                        onClick={() => setAskModalOpen(false)}
                        className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                        onClick={submitNewQuestion}
                        disabled={!selectedNewQuestion}
                        className={`px-4 py-2 rounded font-bold ${
                            selectedNewQuestion
                                ? 'bg-pink-500 hover:bg-pink-600 text-black'
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                      Add
                    </button>
                  </div>

                  <button
                      onClick={() => setAskModalOpen(false)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-pink-300"
                  >
                    ✖
                  </button>
                </div>
              </div>
          )}

          {/* Sentiment Alerts Section */}
          <div className="p-6 rounded-lg bg-gray-800">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-pink-300">
              <Bell />
              SENTIMENT ALERTS
            </h2>

            <div className="space-y-4">
              {sentimentAlerts.map(alert => (
                  <div key={alert.id} className="p-4 rounded flex justify-between items-center bg-gray-700">
                    <div>
                      <div className="text-lg font-bold text-pink-300">
                        {coinIdToName(alert.coinId)} alert at {alert.threshold.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-400">
                        Triggers when sentiment exactly hits {alert.threshold}
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <button
                          onClick={() => openEditAlertModal(alert)}
                          className="p-2 rounded bg-gray-600 hover:bg-gray-500"
                          title="Edit Alert"
                      >
                        <Edit size={16} className="text-gray-300" />
                      </button>
                      <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="p-2 rounded bg-red-600 hover:bg-red-700"
                          title="Delete Alert"
                      >
                        <Trash2 size={16} className="text-white" />
                      </button>
                    </div>
                  </div>
              ))}

              <button
                  onClick={openAddAlertModal}
                  className="w-full p-3 mt-3 border-2 border-dashed flex items-center justify-center border-gray-600 text-gray-400 hover:border-pink-500 hover:text-pink-300"
              >
                + CREATE NEW ALERT
              </button>
            </div>
          </div>

          {/* Add/Edit Sentiment Alert Modal */}
          {isSentimentModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md relative">
                  <h2 className="text-xl font-bold mb-4 text-pink-300">
                    {sentimentModalMode === 'add' ? 'Create Sentiment Alert' : 'Edit Sentiment Alert'}
                  </h2>

                  <div className="mb-4">
                    <label className="block mb-2 text-gray-400">Select Coin</label>
                    <select
                        value={formCoinAlert}
                        onChange={(e) => setFormCoinAlert(e.target.value)}
                        className="w-full p-3 rounded bg-gray-700 text-pink-300 border border-pink-500"
                    >
                      <option value="">-- Select Coin --</option>
                      {allCoins.map((c) => (
                          <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-6">
                    <label className="block mb-2 text-gray-400">Threshold (-1.0 to 1.0)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="-1"
                        max="1"
                        value={formThresholdAlert}
                        onChange={(e) => setFormThresholdAlert(e.target.value)}
                        placeholder="Enter threshold value"
                        className="w-full p-3 rounded bg-gray-700 text-pink-300 border border-pink-500"
                    />
                  </div>

                  <div className="flex justify-end gap-4">
                    <button
                        onClick={() => setIsSentimentModalOpen(false)}
                        className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                        onClick={handleSaveAlert}
                        className="px-4 py-2 rounded bg-pink-500 hover:bg-pink-600 font-bold text-black"
                    >
                      Save
                    </button>
                  </div>

                  <button
                      onClick={() => setIsSentimentModalOpen(false)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-pink-300"
                  >
                    ✖
                  </button>
                </div>
              </div>
          )}
        </div>
      </div>
  );
}
