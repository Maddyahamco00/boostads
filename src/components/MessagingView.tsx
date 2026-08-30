import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Send, 
  Paperclip, 
  DollarSign, 
  FileText, 
  Search, 
  Check, 
  CheckCheck, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  CreditCard, 
  Tag, 
  ArrowLeft,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Conversation, ChatMessage, Invoice } from '../types';

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
  const [invDescription, setInvDescription] = useState<string>('Professional service fee & project milestone');

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
      // 1. Create Invoice on Backend
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
        // 2. Send in chat as structured message
        const msgRes = await fetch('/api/conversations/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: selectedConvId,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatarUrl,
            text: `I have issued an official invoice (${invData.invoice.invoiceNumber}) for ₦${amount.toLocaleString()}. You can review and pay securely below.`,
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
    const match = c.participantDetails.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return match;
  });

  return (
    <div id="messaging-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-8rem)]">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl h-full overflow-hidden shadow-2xl flex flex-col md:flex-row">
        
        {/* Left Sidebar: Conversations List */}
        <div className="w-full md:w-80 border-r border-slate-800 flex flex-col bg-slate-950/60 flex-shrink-0">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white mb-2">Direct Messages & Inquiries</h2>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active conversations yet.
              </div>
            ) : (
              filteredConversations.map(conv => {
                const other = conv.participantDetails.find(p => p.id !== currentUser.id) || conv.participantDetails[0];
                const isSelected = conv.id === selectedConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-500/10 border-l-4 border-emerald-500' : 'hover:bg-slate-850'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={other?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                        alt={other?.name}
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                      {other?.online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">
                          {other?.businessName || other?.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {conv.lastMessage?.text || 'No messages yet'}
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
          <div className="flex-1 flex flex-col bg-slate-900 justify-between min-w-0">
            
            {/* Chat Top Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <img
                  src={otherParticipant?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                  alt={otherParticipant?.name}
                  className="w-9 h-9 rounded-xl object-cover"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">
                      {otherParticipant?.businessName || otherParticipant?.name}
                    </span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active Now on Boost Market</span>
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreateInvoiceModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Send Invoice / Payment</span>
                </button>
              </div>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/40">
              {messages.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-md rounded-2xl p-3.5 text-xs shadow-md leading-relaxed ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                      }`}
                    >
                      {/* Attached Ad Reference */}
                      {msg.adRef && (
                        <div className="mb-2 p-2 rounded-xl bg-slate-950/60 border border-slate-700 flex items-center gap-2">
                          <img src={msg.adRef.mediaUrls[0]} alt={msg.adRef.title} className="w-10 h-10 rounded-lg object-cover" />
                          <div className="min-w-0">
                            <span className="text-[10px] text-emerald-400 font-bold block">Ad Inquiry</span>
                            <span className="text-xs font-bold text-white truncate block">{msg.adRef.title}</span>
                          </div>
                        </div>
                      )}

                      {/* Attached Invoice Reference */}
                      {msg.invoiceRef && (
                        <div className="mb-2 p-3 rounded-xl bg-slate-950 border border-emerald-500/40 text-white">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                            <span className="text-[10px] uppercase font-bold text-emerald-400">Official Invoice</span>
                            <span className="text-xs font-black">₦{msg.invoiceRef.total.toLocaleString()}</span>
                          </div>
                          <p className="text-[11px] text-slate-300">{msg.invoiceRef.description}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">Ref: {msg.invoiceRef.invoiceNumber}</span>
                            <button
                              onClick={() => openInvoiceDetail(msg.invoiceRef!.id)}
                              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center gap-1"
                            >
                              <span>{msg.invoiceRef.status === 'paid' ? 'View Paid Receipt' : 'Pay Invoice'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <p className="whitespace-pre-line">{msg.text}</p>

                      <div className="mt-1 flex items-center justify-end gap-1 text-[9px] opacity-75">
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && (
                          msg.deliveryStatus === 'read' ? <CheckCheck className="w-3 h-3 text-cyan-300" /> : <Check className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateInvoiceModalOpen(true)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors"
                title="Create Invoice"
              >
                <DollarSign className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder="Type your message, ask a question, or discuss terms..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />

              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold transition-all shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
            Select a conversation from the left to start messaging.
          </div>
        )}

      </div>

      {/* Quick Invoice Creation Modal */}
      {isCreateInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Send Invoice in Chat</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Send an instant payment request to {otherParticipant?.name}. Settled in NGN via Flutterwave / Paystack.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Invoice Description</label>
                <input
                  type="text"
                  value={invDescription}
                  onChange={(e) => setInvDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Amount (NGN)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₦</span>
                  <input
                    type="number"
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-slate-100 font-bold text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateInvoiceModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSendInvoice}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow"
              >
                Send Invoice to Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
