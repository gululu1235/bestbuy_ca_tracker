import React from 'react';
import { Availability, Location } from '../types';
import { Truck, Store, Package, ShoppingCart, ExternalLink } from 'lucide-react';

interface Props {
  availability: Availability;
}

export const InventoryCard: React.FC<Props> = ({ availability }) => {
  const { sku, shipping, pickup } = availability;

  // Filter for stores that actually have stock
  const storesWithStock = pickup.locations.filter(
    (loc: Location) => loc.quantityOnHand > 0 || loc.hasInventory
  );

  const isShippingAvailable = shipping.purchasable || shipping.status === 'InStock';
  const isPickupAvailable = pickup.purchasable || storesWithStock.length > 0;
  const isTotallyOutOfStock = !isShippingAvailable && !isPickupAvailable;

  const getStatusColor = (active: boolean) => active ? 'text-green-400' : 'text-gray-500';
  const getStatusBg = (active: boolean) => active ? 'bg-green-500/20 border-green-500/50' : 'bg-gray-800/50 border-gray-700';

  // Updated URL format as requested
  const productUrl = `https://www.bestbuy.ca/en-ca/product/${sku}`;

  return (
    <div className={`relative rounded-xl border p-5 transition-all duration-300 hover:shadow-xl ${
      !isTotallyOutOfStock 
        ? 'bg-gray-900 border-gray-600 shadow-lg shadow-green-900/10' 
        : 'bg-gray-900/50 border-gray-800'
    }`}>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">SKU</span>
          <a 
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Product Page"
            className="block text-2xl font-bold font-mono text-white tracking-tight hover:text-blue-400 transition-colors underline decoration-blue-500/30 hover:decoration-blue-500 cursor-pointer"
          >
            {sku}
          </a>
        </div>
        <a 
          href={productUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          title="View on BestBuy.ca"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Main Statuses */}
      <div className="space-y-4">
        
        {/* Shipping Status */}
        <div className={`p-4 rounded-lg border flex items-center justify-between ${getStatusBg(isShippingAvailable)}`}>
          <div className="flex items-center gap-3">
            <Truck className={`w-5 h-5 ${getStatusColor(isShippingAvailable)}`} />
            <div>
              <p className="text-sm font-medium text-gray-300">Shipping</p>
              <p className={`text-lg font-bold ${isShippingAvailable ? 'text-green-400' : 'text-red-400'}`}>
                {shipping.status === 'SoldOutOnline' ? 'Sold Out' : shipping.status}
              </p>
            </div>
          </div>
          {shipping.quantityRemaining > 0 && (
            <div className="text-right">
              <span className="text-xs text-gray-400 uppercase">Qty</span>
              <p className="text-xl font-bold text-white">{shipping.quantityRemaining}</p>
            </div>
          )}
        </div>

        {/* Pickup Status */}
        <div className={`p-4 rounded-lg border ${getStatusBg(isPickupAvailable)}`}>
          <div className="flex items-center gap-3 mb-2">
            <Store className={`w-5 h-5 ${getStatusColor(isPickupAvailable)}`} />
            <div>
              <p className="text-sm font-medium text-gray-300">Store Pickup</p>
              <p className={`text-lg font-bold ${isPickupAvailable ? 'text-green-400' : 'text-red-400'}`}>
                {pickup.status === 'OutOfStock' ? 'Out of Stock' : pickup.status}
              </p>
            </div>
          </div>
          
          {/* List of Available Stores */}
          {storesWithStock.length > 0 ? (
            <div className="mt-4 pt-3 border-t border-gray-700/50 space-y-2">
              <p className="text-xs text-gray-400 uppercase font-semibold">Available Locations:</p>
              <ul className="space-y-2">
                {storesWithStock.map((loc) => (
                  <li key={loc.locationKey} className="flex justify-between items-center text-sm bg-gray-950/30 p-2 rounded">
                    <span className="text-gray-300 truncate pr-2">{loc.name}</span>
                    <span className="flex items-center gap-1 font-mono font-bold text-green-400 bg-green-900/20 px-2 py-0.5 rounded text-xs border border-green-900/50">
                      {loc.quantityOnHand} <span className="text-[10px] font-normal opacity-70">avail</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-2">
               <p className="text-xs text-gray-500">No stores available in selected region.</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      {(isShippingAvailable || isPickupAvailable) && (
        <div className="mt-6">
          <a 
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors shadow-lg shadow-yellow-500/20"
          >
            <ShoppingCart className="w-5 h-5" />
            Buy Now
          </a>
        </div>
      )}
      
      {/* Decorative Glow for in-stock items */}
      {!isTotallyOutOfStock && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl blur opacity-10 pointer-events-none"></div>
      )}
    </div>
  );
};