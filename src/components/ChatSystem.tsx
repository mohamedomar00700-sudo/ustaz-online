import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, User } from '../types';
import { getDb, saveDb } from '../mockData';
import { Paperclip, Send, AlertCircle, ShieldAlert, FileText, CheckCheck } from 'lucide-react';

interface ChatSystemProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'teacher' | 'student';
}

export const ChatSystem: React.FC<ChatSystemProps> = ({ currentUserId, currentUserName, currentUserRole }) => {
  const [db, setDb] = useState(() => getDb());
  const [activeContact, setActiveContact] = useState<User | null>(() => {
    const initialDb = getDb();
    const initialContacts = initialDb.users.filter(u => 
      currentUserRole === 'teacher' ? u.role === 'student' : u.role === 'teacher'
    );
    return initialContacts.length > 0 ? initialContacts[0] : null;
  });
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Filter contacts based on who the user can chat with
  // If user is teacher, contacts are students. If user is student, contacts are teachers.
  const contacts = db.users.filter(u => 
    currentUserRole === 'teacher' ? u.role === 'student' : u.role === 'teacher'
  );


  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [db.messages, activeContact]);

  // Tab synchronization and real-time database listener
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ustaz_messages' || e.key === 'ustaz_logs') {
        setDb(getDb());
      }
    };
    window.addEventListener('storage', handleStorageChange);

    let channel: any = null;
    import('../supabaseClient').then(({ isSupabaseConfigured, supabase }) => {
      if (isSupabaseConfigured) {
        channel = supabase
          .channel('messages-channel')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload) => {
              const newMsg = payload.new;
              const mappedMsg: ChatMessage = {
                id: newMsg.id,
                senderId: newMsg.sender_id,
                senderName: newMsg.sender_name || 'طالب/معلم',
                receiverId: newMsg.receiver_id,
                receiverName: newMsg.receiver_name || 'مستقبل',
                text: newMsg.text,
                timestamp: newMsg.timestamp ? new Date(newMsg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
                fileUrl: newMsg.file_url || undefined,
                fileName: newMsg.file_name || undefined,
                isBlocked: newMsg.is_blocked || false
              };
              
              setDb(prevDb => {
                if (prevDb.messages.some(m => m.id === mappedMsg.id)) return prevDb;
                const updatedMessages = [...prevDb.messages, mappedMsg];
                saveDb({ ...prevDb, messages: updatedMessages });
                return { ...prevDb, messages: updatedMessages };
              });
            }
          )
          .subscribe();
      }
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (channel) {
        import('../supabaseClient').then(({ supabase }) => {
          supabase.removeChannel(channel);
        });
      }
    };
  }, []);

  if (!activeContact) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد جهات اتصال متاحة للمحادثة.</div>;
  }

  // Retrieve messages between current user and active contact
  const chatMessages = db.messages.filter(m => 
    (m.senderId === currentUserId && m.receiverId === activeContact.id) ||
    (m.senderId === activeContact.id && m.receiverId === currentUserId)
  );

  // Security Filter Check (Censorship Logic)
  const checkSecurityViolation = (text: string): boolean => {
    // Regex for:
    // 1. Emails: contains @
    // 2. Phone numbers/digits (English or Arabic/Indic numbers): e.g. 010..., ٠١٠...
    // 3. Arabic phonetic digits: زيرو واحد, رقمي, هاتف, موبايل, تواصل, gmail, email
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
    const phoneRegex = /(?:\+?\d{8,15})|(?:[0-9]{8,15})|(?:[\u0660-\u0669]{8,15})/;
    const keywords = [
      'زيرو', 'واحد', 'اتنين', 'تلاتة', 'اربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
      'رقمي', 'تلفون', 'تليفون', 'هاتف', 'موبايل', 'واتس', 'واتساب', 'gmail', 'email', 'البريد',
      'اتصل', 'تواصل معي', 'رقم الهاتف'
    ];

    if (emailRegex.test(text) || phoneRegex.test(text)) return true;
    
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && attachments.length === 0) return;

    let textToSend = inputText.trim();
    let isBlocked = false;

    // Check security filter
    if (checkSecurityViolation(textToSend)) {
      textToSend = 'تم حجب رسالة مخالفة لسياسة التواصل داخل المنصة.';
      isBlocked = true;
    }

    const newMessage: ChatMessage = {
      id: 'm_' + Date.now(),
      senderId: currentUserId,
      senderName: currentUserName,
      receiverId: activeContact.id,
      receiverName: activeContact.name,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + ' ' + (new Date().getHours() >= 12 ? 'م' : 'ص'),
      isBlocked
    };

    if (attachments.length > 0) {
      newMessage.fileName = attachments[0].name;
      newMessage.fileUrl = attachments[0].url;
    }

    // Update messages database
    const updatedMessages = [...db.messages, newMessage];
    const updatedDb = { ...db, messages: updatedMessages };

    // If blocked, write an entry to the Supervisor's Activity Log!
    if (isBlocked) {
      const newLog = {
        id: 'l_' + Date.now(),
        type: 'contact_block' as const,
        timestamp: new Date().toLocaleString('ar-EG'),
        user: currentUserName,
        detail: `محاولة تواصل خارج المنصة (محجوبة) - بواسطة ${currentUserName} (${inputText.trim().substring(0, 30)}...)`
      };
      updatedDb.logs = [newLog, ...db.logs];
    }

    // Save changes
    saveDb(updatedDb);
    setDb(updatedDb);
    
    // Clear input states
    setInputText('');
    setAttachments([]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('حجم الملف كبير جداً! الحد الأقصى هو 10 ميجابايت.');
      return;
    }

    try {
      const { isSupabaseConfigured, supabase } = await import('../supabaseClient');
      
      if (isSupabaseConfigured) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `chat/${currentUserId}/${fileName}`;
        
        const { error } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);

        setAttachments([{ name: file.name, url: urlData.publicUrl }]);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setAttachments([{ name: file.name, url: event.target.result as string }]);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('File upload failed, falling back to base64:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAttachments([{ name: file.name, url: event.target.result as string }]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Get last message in chat for contacts pane display
  const getLastMessageText = (contactId: string) => {
    const contactMsgs = db.messages.filter(m => 
      (m.senderId === currentUserId && m.receiverId === contactId) ||
      (m.senderId === contactId && m.receiverId === currentUserId)
    );
    if (contactMsgs.length === 0) return 'ابدأ المحادثة الآن...';
    const last = contactMsgs[contactMsgs.length - 1];
    return last.text;
  };

  const getContactLastMsgTime = (contactId: string) => {
    const contactMsgs = db.messages.filter(m => 
      (m.senderId === currentUserId && m.receiverId === contactId) ||
      (m.senderId === contactId && m.receiverId === currentUserId)
    );
    if (contactMsgs.length === 0) return '';
    return contactMsgs[contactMsgs.length - 1].timestamp.split(' ').pop() || '';
  };

  return (
    <div className="chat-container">
      
      {/* Contacts List Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <span>المحادثات المفتوحة</span>
        </div>
        <div className="chat-contacts-list">
          {contacts.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveContact(c)}
              className={`chat-contact-item ${activeContact.id === c.id ? 'active' : ''}`}
            >
              <div className="avatar-fallback" style={{ width: '38px', height: '38px' }}>
                {c.name.charAt(0)}
              </div>
              <div className="contact-details">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div className="contact-name">{c.name}</div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{getContactLastMsgTime(c.id)}</span>
                </div>
                <div className="contact-last-msg">{getLastMessageText(c.id)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Conversation Area */}
      <div className="chat-main">
        <div className="chat-header">
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{activeContact.name}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
              <AlertCircle size={12} />
              <span>محادثة مراقبة — داخل المنصة فقط</span>
            </span>
          </div>
        </div>

        {/* Messages List scroll window */}
        <div className="chat-messages-area">
          {chatMessages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              لا توجد رسائل بينكم بعد. ابدأ المحادثة الآن بارسال رسالة ترحيبية.
            </div>
          ) : (
            chatMessages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              
              if (msg.isBlocked) {
                return (
                  <div key={msg.id} className="message-bubble blocked">
                    <ShieldAlert size={14} style={{ display: 'inline', marginLeft: '0.35rem', verticalAlign: 'middle' }} />
                    <span>تم حجب رسالة مخالفة لسياسة التواصل داخل المنصة (مشاركة معلومات الاتصال محظورة).</span>
                    <span className="message-time">{msg.timestamp}</span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`message-bubble ${isMe ? 'outgoing' : 'incoming'}`}
                >
                  <div>{msg.text}</div>
                  
                  {msg.fileName && (
                    <a
                      href={msg.fileUrl}
                      download={msg.fileName}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        marginTop: '0.5rem',
                        fontSize: '0.8rem',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        textDecoration: 'none'
                      }}
                    >
                      <FileText size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ textDecoration: 'underline' }}>{msg.fileName}</span>
                    </a>
                  )}

                  <span className="message-time">
                    {msg.timestamp}
                    {isMe && <CheckCheck size={12} style={{ display: 'inline', marginRight: '0.25rem', color: 'var(--primary)', verticalAlign: 'middle' }} />}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area with block warning indicators */}
        <div className="chat-input-area">
          {attachments.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              marginBottom: '0.75rem',
              fontSize: '0.8rem',
              border: '1px solid var(--border-color-glow)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={14} />
                <span>مرفق: {attachments[0].name}</span>
              </div>
              <button onClick={() => setAttachments([])} style={{ color: 'var(--danger)', fontWeight: 700 }}>حذف</button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="chat-input-form">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
              style={{ padding: '0.75rem', borderRadius: '10px' }}
              title="إرفاق ملف"
            >
              <Paperclip size={18} />
            </button>
            <input
              type="text"
              className="form-input"
              placeholder="اكتب رسالتك..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.25rem', borderRadius: '10px' }}>
              <Send size={18} style={{ transform: 'rotate(180deg)' }} />
            </button>
          </form>
          
          <div className="chat-warning-text">
            <ShieldAlert size={14} style={{ color: 'var(--warning)' }} />
            <span>🔒 محظور: أرقام/بريد/روابط/أرقام بالحروف. الملفات المسموحة: صور وPDF/Word حتى 10MB.</span>
          </div>
        </div>

      </div>

    </div>
  );
};
