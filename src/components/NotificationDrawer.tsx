import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bell, 
  X, 
  CreditCard, 
  MessageSquare, 
  Flame, 
  ShieldCheck 
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
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'new_inquiry':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'boost_activated':
        return <Flame className="w-4 h-4 text-amber-500" />;
      case 'verification_approved':
        return <ShieldCheck className="w-4 h-4 text-green-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-sm bg-white border-l border-gray-200 h-full flex flex-col shadow-xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900">Notifications</h2>
          </div>
          <button
            onClick={() => setIsNotificationDrawerOpen(false)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-400">
              No notifications.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  n.read
                    ? 'bg-white border-gray-200 text-gray-600'
                    : 'bg-blue-50/60 border-blue-200 text-gray-900 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-md bg-white border border-gray-200 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold truncate text-gray-900">{n.title}</h4>
                      <span className="text-[10px] text-gray-400">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
          <span className="text-gray-400 text-[11px]">{notifications.filter(n => !n.read).length} unread</span>
          <button
            onClick={() => notifications.forEach(n => markNotificationAsRead(n.id))}
            className="text-blue-600 hover:text-blue-700 font-medium text-[11px] cursor-pointer"
          >
            Mark all read
          </button>
        </div>

      </div>
    </div>
  );
};
