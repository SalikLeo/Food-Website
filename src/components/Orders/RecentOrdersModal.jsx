import React, { useEffect } from 'react';
import { X, Clock, Repeat, ShoppingBag, CheckCircle, Truck, ChefHat, AlertCircle, ArrowRight } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export default function RecentOrdersModal() {
  const { 
    ordersModalOpen, 
    setOrdersModalOpen, 
    orders, 
    loadingOrders, 
    fetchOrders, 
    reorder, 
    isLoggedIn, 
    setAuthModalOpen 
  } = useCustomerAuth();

  useEffect(() => {
    if (ordersModalOpen) {
      fetchOrders();
    }
  }, [ordersModalOpen, fetchOrders]);

  if (!ordersModalOpen) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Delivered':
        return { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle };
      case 'Out for Delivery':
        return { bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Truck };
      case 'Preparing':
        return { bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: ChefHat };
      case 'Cancelled':
        return { bg: 'bg-red-500/15 text-red-400 border-red-500/30', icon: AlertCircle };
      default:
        return { bg: 'bg-orange-500/15 text-orange-400 border-orange-500/30', icon: Clock };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div 
        onClick={() => setOrdersModalOpen(false)} 
        className="fixed inset-0" 
      />

      <div className="relative w-full max-w-lg bg-[#16161b] text-white border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 max-h-[90vh] flex flex-col animate-scale-in">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-600/20 text-orange-500 flex items-center justify-center border border-orange-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-display uppercase tracking-wide font-bold text-white leading-tight">
                Recent Orders
              </h3>
              <span className="text-[11px] text-zinc-400">
                {orders.length} past order{orders.length === 1 ? '' : 's'} recorded
              </span>
            </div>
          </div>

          <button
            onClick={() => setOrdersModalOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Not Logged In Banner */}
        {!isLoggedIn && (
          <div className="my-3 p-3.5 rounded-2xl bg-orange-600/10 border border-orange-500/30 flex items-center justify-between gap-2 flex-shrink-0">
            <span className="text-xs text-orange-300 font-medium">
              Sign in with your phone to view all previous orders
            </span>
            <button
              onClick={() => {
                setOrdersModalOpen(false);
                setAuthModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-1 cursor-pointer flex-shrink-0"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Orders List Container */}
        <div className="flex-1 overflow-y-auto space-y-3.5 my-3 pr-1">
          {loadingOrders && orders.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-sm">
              Loading recent orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <p className="text-white font-bold text-base">No recent orders yet</p>
                <p className="text-zinc-400 text-xs mt-1">
                  Place an order and it will appear here for fast one-tap reordering!
                </p>
              </div>
            </div>
          ) : (
            orders.map((order) => {
              const badge = getStatusBadge(order.status);
              const BadgeIcon = badge.icon;
              const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={order.id}
                  className="bg-[#1b1b22] border border-white/10 rounded-2xl p-4 space-y-3 shadow-md transition-all hover:border-white/20"
                >
                  {/* Order Top Meta */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-orange-400 block">
                        {order.id}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {orderDate}
                      </span>
                    </div>

                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${badge.bg}`}>
                      <BadgeIcon className="w-3.5 h-3.5" />
                      <span>{order.status || 'Pending'}</span>
                    </div>
                  </div>

                  {/* Items Breakdown */}
                  <div className="bg-black/30 rounded-xl p-3 border border-white/5 space-y-1.5 text-xs text-zinc-300">
                    {(order.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-orange-400">{item.quantity}x</span>
                          <span className="truncate">{item.name}</span>
                          {item.size && (
                            <span className="text-[10px] text-zinc-400">({item.size})</span>
                          )}
                        </div>
                        <span className="font-sans font-bold text-white ml-2 flex-shrink-0">
                          Rs. {((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total & Reorder Button */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                        Total Amount
                      </span>
                      <span className="text-base font-extrabold text-white font-sans">
                        Rs. {(Number(order.total) || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* REORDER BUTTON */}
                    <button
                      onClick={() => reorder(order)}
                      className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Add all items from this order to cart"
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      <span>Reorder</span>
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-white/10 text-center flex-shrink-0">
          <p className="text-[11px] text-zinc-400">
            Need help with an order? Call us at <a href="tel:03095369472" className="text-orange-400 font-bold hover:underline">0309-5369472</a>
          </p>
        </div>

      </div>
    </div>
  );
}
