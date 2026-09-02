import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Send, 
  DollarSign, 
  Search, 
  Check, 
  CheckCheck, 
  ShieldCheck, 
  CreditCard 
} from 'lucide-react';
import { ChatMessage } from '../types';

export const MessagingView: React.FC = () => {
  const { 
    currentUser, 
    conversations, 
    activeConversationId, 
    openInvoiceDetail, 
    refreshData 
  } = useApp();

  const [selectedConvId, setSelectedConvId] = useState<string | null>(activeConversationId || (conversations[0]?.id ?? null));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState<boolean>(false);

  // Quick invoice creation inside chat
  const [invAmount, setInvAmount] = useState<string>('50000');
  const [invDescription, setInvDescription] = useState<string>('Professional service fee');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync selected conversation
  useEffect(() => {
    if (activeConversationId) {
      setSelectedConvId(activeConversationId);
    } else if (!selectedConvId && conversations.length > 0) {
      setSelectedConvId(conversations[0].id);
    }
  }, [activeConversationId, conversations, selectedConvId]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConvId) return;
    fetch(`/api/conversations/${selectedConvId}/messages`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setMessages(res.messages);
          scrollToBottom();
        }
      })
      .catch(err => console.error('Failed to fetch messages:', err));
  }, [selectedConvId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const currentConv = conversations.find(c => c.id === selectedConvId);
  const otherParticipant = currentConv?.participantDetails.find(p => p.id !== currentUser.id) || currentConv?.participantDetails[0];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConvId) return;

    setIsSending(true);
    const textToSend = inputText.trim();
    setInputText('');

    try {
      const res = await fetch('/api/conversations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConvId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatarUrl,
          text: textToSend
        })
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
        refreshData();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!selectedConvId || !otherParticipant) return;
    const amount = Number(invAmount) || 10000;
    
    try {
      const invRes = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentUser.businessId || 'biz_real_boosters',
          customerId: otherParticipant.id,
          customerName: otherParticipant.name,
          customerEmail: 'customer@gmail.com',
          description: invDescription,
          items: [{ description: invDescription, quantity: 1, unitPrice: amount, amount }],
          currency: 'NGN'
        })
      });
      const invData = await invRes.json();

      if (invData.success && invData.invoice) {
        const msgRes = await fetch('/api/conversations/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: selectedConvId,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatarUrl,
            text: `I have issued an official invoice (${invData.invoice.invoiceNumber}) for ₦${amount.toLocaleString()}.`,
            invoiceRef: invData.invoice
          })
        });
        const msgData = await msgRes.json();
        if (msgData.success && msgData.message) {
          setMessages(prev => [...prev, msgData.message]);
          setIsCreateInvoiceModalOpen(false);
          scrollToBottom();
          refreshData();
        }
      }
    } catch (err) {
      console.error('Failed to send invoice in chat:', err);
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchTerm) return true;
    return c.participantDetails.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div id="messaging-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-8rem)]">
      <div className="bg-white border border-gray-200 rounded-xl h-full overflow-hidden shadow-xs flex flex-col md:flex-row">
        
        {/* Left Sidebar: Conversations List */}
        <div className="w-full md:w-80 border-r border-gray-200 flex flex-col bg-gray-50/50 flex-shrink-0">
          <div className="p-3.5 border-b border-gray-200 bg-white">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Messages</h2>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">
                No active conversations.
              </div>
            ) : (
              filteredConversations.map(conv => {
                const other = conv.participantDetails.find(p => p.id !== currentUser.id) || conv.participantDetails[0];
                const isSelected = conv.id === selectedConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-3 flex items-start gap-2.5 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/80 border-l-2 border-blue-600' : 'hover:bg-gray-100/70'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={other?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                        alt={other?.name}
                        className="w-9 h-9 rounded-lg object-cover bg-gray-200"
                      />
                      {other?.online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900 truncate">
                          {other?.businessName || other?.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {conv.lastMessage?.text || 'No messages'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Panel: Active Chat Room */}
        {selectedConvId && currentConv ? (
          <div className="flex-1 flex flex-col bg-white justify-between min-w-0">
            
            {/* Chat Top Header */}
            <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <img
                  src={otherParticipant?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                  alt={otherParticipant?.name}
                  className="w-8 h-8 rounded-lg object-cover bg-gray-200"
                />
                <div>
                  <div className="flex items-center gap-1">
                    <h2 className="text-xs font-semibold text-gray-900">
                      {otherParticipant?.businessName || otherParticipant?.name}
                    </h2>
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-[11px] text-green-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>Online</span>
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <button
                onClick={() => setIsCreateInvoiceModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Send Invoice</span>
              </button>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-gray-50/40">
              {messages.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-md rounded-xl p-3 text-xs leading-relaxed ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-br-xs'
                          : 'bg-white text-gray-900 rounded-bl-xs border border-gray-200 shadow-xs'
                      }`}
                    >
                      {/* Attached Ad Reference */}
                      {msg.adRef && (
                        <div className={`mb-2 p-2 rounded-lg border flex items-center gap-2 ${isMe ? 'bg-blue-700 border-blue-500' : 'bg-gray-50 border-gray-200'}`}>
                          <img src={msg.adRef.mediaUrls[0]} alt={msg.adRef.title} className="w-9 h-9 rounded object-cover" />
                          <div className="min-w-0 text-[11px]">
                            <span className="font-semibold block truncate">{msg.adRef.title}</span>
                          </div>
                        </div>
                      )}

                      {/* Attached Invoice Reference */}
                      {msg.invoiceRef && (
                        <div className={`mb-2 p-2.5 rounded-lg border ${isMe ? 'bg-blue-700 border-blue-500 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                          <div className="flex items-center justify-between border-b border-white/20 pb-1 mb-1 font-semibold text-xs">
                            <span>Invoice {msg.invoiceRef.invoiceNumber}</span>
                            <span>₦{msg.invoiceRef.total.toLocaleString()}</span>
                          </div>
                          <p className="text-[11px] opacity-90">{msg.invoiceRef.description}</p>
                          <button
                            onClick={() => openInvoiceDetail(msg.invoiceRef!.id)}
                            className="mt-2 w-full py-1 rounded bg-white text-blue-700 hover:bg-gray-100 font-semibold text-[11px] cursor-pointer"
                          >
                            {msg.invoiceRef.status === 'paid' ? 'View Paid Receipt' : 'Pay Invoice'}
                          </button>
                        </div>
                      )}

                      <p className="whitespace-pre-line">{msg.text}</p>

                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-75">
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && (
                          msg.deliveryStatus === 'read' ? <CheckCheck className="w-3 h-3 text-cyan-200" /> : <Check className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateInvoiceModalOpen(true)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                title="Create Invoice"
              >
                <DollarSign className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder="Type your message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600"
              />

              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-400 text-xs">
            Select a conversation to start messaging.
          </div>
        )}

      </div>

      {/* Quick Invoice Creation Modal */}
      {isCreateInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl max-w-sm w-full p-5 shadow-xl">
            <h2 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Send Invoice</span>
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Request payment from {otherParticipant?.name}.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={invDescription}
                  onChange={(e) => setInvDescription(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Amount (NGN)</label>
                <input
                  type="number"
                  value={invAmount}
                  onChange={(e) => setInvAmount(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateInvoiceModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSendInvoice}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs cursor-pointer"
              >
                Send Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
