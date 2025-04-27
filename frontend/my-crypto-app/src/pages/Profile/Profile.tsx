import React, { useEffect, useState } from 'react';
import { Bell, Edit, Trash2 } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function CryptoProfilePage() {
  const [darkMode] = useState(true);

  const [profileData, setProfileData] = useState<{
    name: string;
    email: string;
    profilePic: string;
    lastLogin: string;
    createdAt: string;
    userId: string;
  } | null>(null);

  const allCoins = ['BTC', 'ETH', 'USDT', 'XRP', 'BNB', 'SOL', 'USDC', 'TRX', 'DOGE', 'ADA'];
  const [originalCoins, setOriginalCoins] = useState<string[]>([]);
  const [savingCoins, setSavingCoins] = useState(false);
  const [selectedCoins, setSelectedCoins] = useState<string[]>([]);
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

  const coinNameToId: Record<string, number> = {
    BTC: 1, ETH: 2, USDT: 3, XRP: 4, BNB: 5,
    SOL: 6, USDC: 7, TRX: 8, DOGE: 9, ADA: 10,
  };

  const coinIdToName = (id: number) =>
      Object.entries(coinNameToId).find(([, val]) => val === id)?.[0] ?? '';

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profileData?.userId) {
      fetchSentimentAlerts();
    }
  }, [profileData?.userId]);

  const toggleCoin = (code: string) => {
    setSelectedCoins((prev) =>
        prev.includes(code)
            ? prev.filter(c => c !== code)
            : [...prev, code]
    );
  };

  const coinsChanged = () => {
    if (selectedCoins.length !== originalCoins.length) return true;

    const selectedSet = new Set(selectedCoins);
    const originalSet = new Set(originalCoins);

    if (selectedSet.size !== originalSet.size) return true;

    for (let coin of selectedSet) {
      if (!originalSet.has(coin)) return true;
    }

    return false;
  };



  const saveSelectedCoins = async () => {
    const token = localStorage.getItem('backendToken');
    if (!token) return;

    try {
      setSavingCoins(true);
      const res = await fetch('https://auth-app-877042335787.us-central1.run.app/api/users/coins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({ coins: selectedCoins }),
      });
      const data = await res.json();
      if (data.success) {
        setOriginalCoins([...selectedCoins]);
        toast.success('Coins updated successfully!');
      } else {
        toast.error('Failed to update coins.');
      }
    } catch (err) {
      console.error('Error updating coins', err);
      toast.error('Error updating coins.');
    } finally {
      setSavingCoins(false);
    }
  };


  const fetchProfile = async () => {
    const token = localStorage.getItem('backendToken');
    if (!token) return;

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
      toast.error('Please enter a valid threshold between -1.0 and 1.0');
      return;
    }

    const payload = {
      coinId: coinNameToId[formCoinAlert],
      threshold: thresholdNum,
      email: profileData.email,
    };

    try {
      if (sentimentModalMode === 'add') {
        await fetch('https://crypto-pulse-1-546660857332.us-central1.run.app/alerts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': profileData.userId,
          },
          body: JSON.stringify(payload),
        });
        toast.success('Sentiment alert created!');
      } else if (sentimentModalMode === 'edit' && currentEditSentiment) {
        await fetch(`https://crypto-pulse-1-546660857332.us-central1.run.app/alerts/${currentEditSentiment}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': profileData.userId,
          },
          body: JSON.stringify(payload),
        });
        toast.success('Sentiment alert updated!');
      }
      fetchSentimentAlerts();
    } catch (err) {
      console.error('Failed to save alert', err);
      toast.error('Failed to save alert.');
    }
    setIsSentimentModalOpen(false);
  };


  const handleDeleteAlert = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) return;
    try {
      await fetch(`https://crypto-pulse-1-546660857332.us-central1.run.app/alerts/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-ID': profileData!.userId },
      });
      toast.success('Alert deleted successfully!');
      fetchSentimentAlerts();
    } catch (err) {
      console.error('Failed to delete alert', err);
    }
  };

  return (
      <div className={`min-h-screen ${darkMode ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'}`}>
        <div className="container mx-auto px-4 py-10 max-w-7xl">
          <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
          {/* Profile Section */}
          {profileData && (
              <div className="mb-10 p-8 rounded-2xl bg-gray-900 border border-gray-700 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="flex justify-center">
                    <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-blue-400">
                      <img src={profileData.profilePic} alt="Profile" className="w-full h-full object-cover"/>
                    </div>
                  </div>

                  <div className="col-span-2 text-center md:text-left">
                    <h1 className="text-2xl font-bold mb-2">{profileData.name}</h1>
                    <p className="text-sm text-gray-400 mb-4">{profileData.email}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-gray-800">
                        <div className="text-xs text-gray-400 mb-1">Last Login</div>
                        <div className="text-lg font-bold text-white">{profileData.lastLogin}</div>
                      </div>
                      <div className="p-4 rounded-lg bg-gray-800">
                        <div className="text-xs text-gray-400 mb-1">Created At</div>
                        <div className="text-lg font-bold text-white">{profileData.createdAt}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          )}

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

          {/* Sentiment Alerts */}
          <div className="p-8 rounded-2xl bg-gray-900 border border-gray-700 shadow-lg">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Bell/> Sentiment Alerts
            </h2>

            <div className="space-y-4">
              {sentimentAlerts.map((alert) => (
                  <div key={alert.id}
                       className="p-4 flex justify-between items-center rounded-lg bg-gray-800 hover:bg-gray-700 transition">
                    <div>
                      <h3 className="text-md font-semibold text-white">{coinIdToName(alert.coinId)} @ {alert.threshold.toFixed(2)}</h3>
                      <p className="text-xs text-gray-400">Triggers when sentiment hits {alert.threshold}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditAlertModal(alert)}
                              className="p-2 rounded bg-gray-700 hover:bg-blue-500 transition">
                        <Edit size={16} className="text-white"/>
                      </button>
                      <button onClick={() => handleDeleteAlert(alert.id)}
                              className="p-2 rounded bg-red-500 hover:bg-red-600">
                        <Trash2 size={16} className="text-white"/>
                      </button>
                    </div>
                  </div>
              ))}
              <button onClick={openAddAlertModal}
                      className="w-full mt-6 p-3 border-2 border-dashed rounded-xl border-blue-400 text-blue-400 hover:bg-blue-500 hover:text-black transition">
                + Create New Alert
              </button>
            </div>
          </div>

          {/* Modal */}
          {isSentimentModalOpen && (
              <div className="fixed inset-0 bg-black/70 flex justify-center items-center p-4 z-50">
                <div className="bg-gray-900 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                  <h2 className="text-xl font-bold mb-4">{sentimentModalMode === 'add' ? 'Create Alert' : 'Edit Alert'}</h2>

                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-1">Select Coin</label>
                    <select value={formCoinAlert} onChange={(e) => setFormCoinAlert(e.target.value)}
                            className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white">
                      <option value="">-- Select Coin --</option>
                      {allCoins.map((c) => (
                          <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm text-gray-400 mb-1">Threshold (-1.0 to 1.0)</label>
                    <input type="number" min="-1" max="1" step="0.01" value={formThresholdAlert}
                           onChange={(e) => setFormThresholdAlert(e.target.value)}
                           className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white"/>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button onClick={() => setIsSentimentModalOpen(false)}
                            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white">
                      Cancel
                    </button>
                    <button onClick={handleSaveAlert}
                            className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-black font-bold">
                      Save
                    </button>
                  </div>
                </div>
              </div>
          )}
        </div>
      </div>
  );
}
