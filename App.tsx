
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Settings, 
  Clock, 
  ShoppingCart, 
  MapPin,
  ExternalLink,
  Pause,
  Play,
  Cloud,
  Github,
  Mail,
  Copy,
  X,
  Send
} from 'lucide-react';
import { fetchInventory } from './services/bestBuyService';
import { Availability } from './types';
import { DEFAULT_LOCATIONS, DEFAULT_POSTAL_CODE, DEFAULT_SKUS } from './constants';
import { InventoryCard } from './components/InventoryCard';

const App: React.FC = () => {
  const [skus, setSkus] = useState<string[]>(DEFAULT_SKUS);
  const [postalCode, setPostalCode] = useState<string>(DEFAULT_POSTAL_CODE);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(30); // Seconds
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showCloudModal, setShowCloudModal] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInventory(skus, postalCode, DEFAULT_LOCATIONS);
      setAvailabilities(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [skus, postalCode]);

  // Initial load
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh) {
      setTimer(0);
      return;
    }

    setTimer(refreshInterval);
    
    const countdown = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          loadData();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [autoRefresh, refreshInterval, loadData]);

  const handleSkuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSkus(val.split(',').map(s => s.trim()).filter(s => s.length > 0));
  };

  const handleSendEmail = () => {
    const subject = `BestBuy Stock Report - ${new Date().toLocaleTimeString()}`;
    const bodyLines = availabilities.map(item => {
      const hasStock = item.pickup.purchasable || item.shipping.purchasable || item.pickup.locations.some(l => l.hasInventory);
      return `SKU: ${item.sku}
Status: ${hasStock ? '✅ IN STOCK' : '❌ Out of Stock'}
Link: https://www.bestbuy.ca/en-ca/product/${item.sku}
`;
    });

    const body = `Current Inventory Status (${new Date().toLocaleString()}):\n\n${bodyLines.join('\n--------------------------------\n\n')}`;
    
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const hasAnyStock = availabilities.some(item => 
    item.shipping.purchasable || 
    item.pickup.purchasable || 
    item.pickup.locations.some(loc => loc.hasInventory)
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
              BestBuy Tracker
            </h1>
            <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Postal Code: {postalCode}
              <span className="text-gray-600">|</span>
              <span className="flex items-center gap-1">
                 Monitoring {skus.length} SKUs
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCloudModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 border border-purple-800"
            >
              <Cloud className="w-4 h-4" />
              Cloud Monitoring (Free)
            </button>
            
            <button
              onClick={handleSendEmail}
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
              title="Generate email report"
            >
              <Mail className="w-4 h-4" />
              Email Report
            </button>

            <div className="flex items-center gap-2 bg-gray-900 rounded-full px-4 py-2 border border-gray-800">
               {autoRefresh ? (
                 <>
                   <span className="animate-pulse w-2 h-2 rounded-full bg-green-500"></span>
                   <span className="text-xs text-gray-400 font-mono">Next update: {timer}s</span>
                 </>
               ) : (
                 <span className="text-xs text-gray-500">Auto-refresh paused</span>
               )}
            </div>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors border ${
                autoRefresh 
                  ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 hover:bg-blue-500/20' 
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
              }`}
              title={autoRefresh ? "Pause Auto-Refresh" : "Start Auto-Refresh"}
            >
              {autoRefresh ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                loading 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh Now'}
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg border border-gray-800 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Global Status Banner */}
        {hasAnyStock && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3 animate-pulse">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            <div>
              <h3 className="font-bold text-green-400">Stock Detected!</h3>
              <p className="text-sm text-green-300/80">One or more items are currently available for shipping or pickup.</p>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 animate-in slide-in-from-top-4 fade-in duration-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" /> Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Monitored SKUs (comma separated)</label>
                <input 
                  type="text" 
                  value={skus.join(', ')}
                  onChange={handleSkuChange}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Postal Code</label>
                <input 
                  type="text" 
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Refresh Interval (seconds)</label>
                <input 
                  type="number" 
                  min="5"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to fetch inventory</p>
              <p className="text-sm opacity-80 mt-1">{error}</p>
              <p className="text-xs mt-2 text-gray-500">Note: This app uses a CORS proxy to bypass browser restrictions. If the proxy is down or Best Buy blocks it, requests will fail.</p>
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {availabilities.length === 0 && !loading && !error && (
             <div className="col-span-full text-center py-20 text-gray-500">
                No data loaded. Click Refresh.
             </div>
           )}
           
           {availabilities.map((item) => (
             <InventoryCard key={item.sku} availability={item} />
           ))}
        </div>

        {/* Cloud Monitoring Modal */}
        {showCloudModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900 z-10">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-purple-400" /> 
                  Free 24/7 Cloud Monitoring
                </h2>
                <button onClick={() => setShowCloudModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 text-purple-200 text-sm">
                  Run this checker every 5 minutes for FREE using <strong>GitHub Actions</strong>. You don't need a server.
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold text-gray-400">1</div>
                    <div>
                      <h3 className="font-bold text-white">Create a GitHub Repository</h3>
                      <p className="text-sm text-gray-400 mt-1">Upload this entire project to a new <strong>private</strong> GitHub repository.</p>
                      <p className="text-xs text-gray-500 mt-2">I have already added the necessary files for you:</p>
                      <ul className="text-xs text-gray-400 list-disc list-inside mt-1 font-mono">
                        <li>scripts/monitor.mjs</li>
                        <li>.github/workflows/inventory-check.yml</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold text-gray-400">2</div>
                    <div>
                      <h3 className="font-bold text-white">Setup Email Secrets</h3>
                      <p className="text-sm text-gray-400 mt-1">Go to your Repo Settings &rarr; Secrets and variables &rarr; Actions &rarr; "New repository secret". Add these keys:</p>
                      <div className="mt-2 space-y-2">
                        <div className="bg-gray-950 p-3 rounded border border-gray-800 flex justify-between items-center">
                          <code className="text-yellow-400 text-xs">EMAIL_USER</code>
                          <span className="text-xs text-gray-500">Your Gmail address (e.g. user@gmail.com)</span>
                        </div>
                        <div className="bg-gray-950 p-3 rounded border border-gray-800 flex justify-between items-center">
                          <code className="text-yellow-400 text-xs">EMAIL_PASS</code>
                          <span className="text-xs text-gray-500">Your Gmail <strong>App Password</strong> (Not your login password!)</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        * To get an App Password: Go to Google Account &rarr; Security &rarr; 2-Step Verification &rarr; App passwords.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold text-gray-400">3</div>
                    <div>
                      <h3 className="font-bold text-white">Enable & Test</h3>
                      <p className="text-sm text-gray-400 mt-1">Go to the "Actions" tab in your repo. You should see "BestBuy Inventory Check". It will run automatically every 5 minutes.</p>
                      <p className="text-sm text-gray-400 mt-2"><strong>To test the Cloud Email:</strong> Click on the "BestBuy Inventory Check" workflow in the sidebar, then click the "Run workflow" button manually.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-800 bg-gray-900/50">
                <button 
                  onClick={() => setShowCloudModal(false)}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 mt-12 pb-8">
           <p>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}</p>
           <p className="mt-2">Data retrieved from Best Buy Canada via Public API</p>
        </div>

      </div>
    </div>
  );
};

export default App;
