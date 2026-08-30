import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bell, 
  X, 
  Check, 
  CreditCard, 
  MessageSquare, 
  Flame, 
  ShieldCheck, 
  CheckCheck 
} from 'lucide-react';
import { NotificationItem } from '../types';

export const NotificationDrawer: React.FC = () => {
  const { 
    notifications, 
    isNotificationDrawerOpen, 
    setIsNotificationDrawerOpen, 
    markNotificationAsRead,
    openInvoiceDetail,
    setActiveView 
  } = useApp();

  if (!isNotificationDrawerOpen) return null;

  const handleNotificationClick = (notif: NotificationItem) => {
    markNotificationAsRead(notif.id);
    if (notif.actionUrl) {
      if (notif.actionUrl.startsWith('invoice:')) {
        const invId = notif.actionUrl.replace('invoice:', '');
        openInvoiceDetail(invId);
      } else if (notif.actionUrl === 'messages') {
        setActiveView('messages');
      } else if (notif.actionUrl === 'admin_panel') {
        setActiveView('admin_panel');
      }
    }
    setIsNotificationDrawerOpen(false);
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'payment_received':
      case 'invoice_issued':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'new_inquiry':
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      case 'boost_activated':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'verification_approved':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Push & In-App Notifications</h2>
          </div>
          <button
            onClick={() => setIsNotificationDrawerOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              You're all caught up! No new notifications.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  n.read
                    ? 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-white shadow-md'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold truncate">{n.title}</h4>
                      <span className="text-[10px] text-slate-400">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">{n.message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <span className="text-slate-500">Real Boosters Instant Push Engine</span>
          <button
            onClick={() => notifications.forEach(n => markNotificationAsRead(n.id))}
            className="text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            Mark all as read
          </button>
        </div>

      </div>
    </div>
  );
};
