'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, Heart, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { formatINR } from '@/utils/format';

import { LogOut } from 'lucide-react';
import { logout } from '../login/actions';
import { PlacedOrder } from '@/types';

type AccountTab = 'orders' | 'addresses';

interface AccountClientProps {
  userEmail?: string;
  userId?: string;
  userName?: string;
  serverOrders?: PlacedOrder[] | null;
}


function reconcileOrders(serverOrders?: PlacedOrder[] | null, userId?: string): PlacedOrder[] {
  const orderMap = new Map<string, PlacedOrder>();

  // 1. Add server orders first (server state is authoritative for status / timestamps)
  if (serverOrders && Array.isArray(serverOrders)) {
    for (const order of serverOrders) {
      const key = order.orderNumber || order.id;
      if (key) {
        orderMap.set(key, order);
      }
    }
  }

  // 2. Reconcile with client user-scoped orders (so checkout-confirmed or offline orders are never masked by empty query results)
  if (typeof window !== 'undefined' && userId) {
    try {
      const scopedKey = `palluvo_orders_${userId}`;
      const saved = localStorage.getItem(scopedKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          for (const order of parsed) {
            const key = order.orderNumber || order.id;
            if (key && !orderMap.has(key)) {
              orderMap.set(key, order);
            }
          }
        }
      }
    } catch {}
  }

  return Array.from(orderMap.values());
}

export default function AccountClient({ userEmail, userId, userName, serverOrders }: AccountClientProps): React.JSX.Element {
  const { wishlist } = useStore();
  const [activeTab, setActiveTab] = useState<AccountTab>('orders');

  // Hydration-safe initial state: initialize strictly from server data for deterministic SSR/hydration, then reconcile with client-scoped localStorage in useEffect
  const [userOrders, setUserOrders] = useState<PlacedOrder[]>(() => {
    return serverOrders && Array.isArray(serverOrders) ? serverOrders : [];
  });

  // Reconcile server orders with client-scoped localStorage after hydration
  React.useEffect(() => {
    const reconciled = reconcileOrders(serverOrders, userId);
    setUserOrders(reconciled);
  }, [serverOrders, userId]);

  const customerName = userName || 'PALLUVO Guest';
  const customerEmail = userEmail || 'guest@example.com';
  const customerPhone = '+91 98765 43210';
  const customerAddress = {
    street: 'Add a new address to place orders',
    cityStatePin: ''
  };


  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-8 border-b border-[#EDE3D5] gap-4">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] text-[#641C2D] font-semibold block mb-1">
            Member Privileges
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D]">
            My Atelier Account
          </h1>
          <p className="text-xs text-[#665E57] mt-1">{customerName} • {customerEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#B08D57]/15 text-[#8C6A35] text-xs font-bold px-3 py-1.5 rounded-full border border-[#B08D57]/30 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> PALLUVO Silk Circle Gold
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-8">
        
        {/* Navigation Sidebar */}
        <div className="space-y-1 bg-white p-4 rounded-xl border border-[#EDE3D5] shadow-xs h-fit">
          <div role="tablist" aria-label="Account Views" className="space-y-1">
            <button
              id="tab-orders"
              role="tab"
              aria-selected={activeTab === 'orders'}
              aria-controls="panel-orders"
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === 'orders' ? 'bg-[#641C2D] text-white' : 'text-[#6D625D] hover:bg-[#F8F5EF]'
              }`}
            >
              <Package className="w-4 h-4" /> My Orders ({userOrders.length})
            </button>
            <button
              id="tab-addresses"
              role="tab"
              aria-selected={activeTab === 'addresses'}
              aria-controls="panel-addresses"
              onClick={() => setActiveTab('addresses')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === 'addresses' ? 'bg-[#641C2D] text-white' : 'text-[#6D625D] hover:bg-[#F8F5EF]'
              }`}
            >
              <MapPin className="w-4 h-4" /> Saved Addresses
            </button>
          </div>
            <div className="pt-2 mt-2 border-t border-[#EDE3D5] flex flex-col gap-1">
              <Link
                href="/wishlist"
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-[#6D625D] hover:bg-[#F8F5EF] transition"
              >
                <span className="flex items-center gap-2.5"><Heart className="w-4 h-4" /> Wishlist</span>
                <span className="bg-[#B08D57] text-[#1C1613] text-[10px] font-bold px-1.5 py-0.5 rounded-full">{wishlist.length}</span>
              </Link>
              
              <button
                onClick={async () => {
                  try {
                    localStorage.removeItem('palluvo_orders');
                    if (userId) {
                      localStorage.removeItem(`palluvo_orders_${userId}`);
                    }
                  } catch {}
                  await logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-red-700 hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
        </div>

        {/* Content View */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'orders' && (
            <div id="panel-orders" role="tabpanel" aria-labelledby="tab-orders" className="space-y-4">
              <h2 className="font-serif text-xl font-bold text-[#2B211D]">Recent Orders</h2>
              
              {userOrders.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-[#EDE3D5] text-center space-y-3">
                  <Package className="w-10 h-10 text-[#B08D57] mx-auto opacity-70" />
                  <h3 className="font-serif text-lg font-bold text-[#2B211D]">No Orders Placed Yet</h3>
                  <p className="text-xs text-[#665E57]">Adorn your wardrobe with India&apos;s finest handloom silks.</p>
                  <Link
                    href="/sarees"
                    className="inline-flex items-center gap-2 bg-[#641C2D] text-white px-6 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase hover:bg-[#4E1422] transition mt-2 shadow-md"
                  >
                    Explore All Sarees <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                userOrders.map((order) => (
                  <div key={order.id} className="bg-white p-6 rounded-xl border border-[#EDE3D5] shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between text-xs pb-3 border-b border-[#EDE3D5] gap-2">
                      <div>
                        <span className="text-[#665E57]">Order #</span>
                        <strong className="text-[#2B211D] font-mono ml-1">{order.orderNumber}</strong>
                      </div>
                      <div>
                        <span className="text-[#665E57]">Placed On: </span>
                        <span className="text-[#2B211D] font-medium">{order.date}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          order.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex gap-4 items-center">
                          <div className="relative w-16 h-20 bg-[#EDE3D5] rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={item.image.startsWith('/') ? item.image : `/${item.image}`}
                              alt={item.name}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 text-xs">
                            <h4 className="font-serif text-base font-bold text-[#2B211D]">{item.name}</h4>
                            <p className="text-[#665E57]">
                              {item.selectedColor ? `${item.selectedColor} • ` : ''}
                              {item.blouseOptionName || 'Unstitched Blouse'}
                              {item.qty > 1 ? ` • Qty: ${item.qty}` : ''}
                            </p>
                            <p className="font-bold text-[#641C2D] mt-1">
                              {formatINR((item.price + (item.blousePrice || 0)) * item.qty)}
                            </p>
                          </div>
                          <Link
                            href="/sarees"
                            className="border border-[#EDE3D5] px-4 py-2 rounded-full text-xs font-semibold text-[#2B211D] hover:bg-[#F8F5EF] transition"
                          >
                            Buy Again
                          </Link>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-[#EDE3D5] flex flex-wrap items-center justify-between text-xs text-[#665E57] gap-2">
                      <span>Payment: <strong className="text-[#2B211D] uppercase">{order.paymentMethod}</strong></span>
                      <span>Total: <strong className="text-[#641C2D] text-sm">{formatINR(order.grandTotal)}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'addresses' && (
            <div id="panel-addresses" role="tabpanel" aria-labelledby="tab-addresses" className="space-y-4">
              <h2 className="font-serif text-xl font-bold text-[#2B211D]">Saved Delivery Addresses</h2>
              <div className="bg-white p-6 rounded-xl border border-[#EDE3D5] shadow-xs text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#641C2D] uppercase tracking-wider">Home (Default)</span>
                </div>
                <p className="font-medium text-[#2B211D]">{customerName} • {customerPhone}</p>
                <p className="text-[#6D625D]">{customerAddress.street}</p>
                <p className="text-[#6D625D]">{customerAddress.cityStatePin}</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
