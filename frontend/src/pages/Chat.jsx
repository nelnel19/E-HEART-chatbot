// frontend/src/pages/Chat.jsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API } from "../config";
import { useNavigate } from "react-router-dom";
import "../styles/chat.css";

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [editingSession, setEditingSession] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [showExamples, setShowExamples] = useState(true);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const navigate = useNavigate();

  // Professional example prompts for PRULIFE UK
  const examplePrompts = [
    {
      text: "What insurance products does PRULIFE UK offer?",
      category: "Products"
    },
    {
      text: "How much does life insurance typically cost?",
      category: "Pricing"
    },
    {
      text: "What is the process for filing a claim?",
      category: "Claims"
    },
    {
      text: "Can you explain the benefits of VUL insurance?",
      category: "Products"
    },
    {
      text: "What are the available payment methods for premiums?",
      category: "Payments"
    },
    {
      text: "How do I contact PRULIFE UK customer service?",
      category: "Contact"
    },
    {
      text: "What health insurance options are available for families?",
      category: "Health"
    },
    {
      text: "How does the investment component of VUL work?",
      category: "Investments"
    },
    {
      text: "What documents are required for insurance application?",
      category: "Requirements"
    },
    {
      text: "What sets PRULIFE UK apart from other insurers?",
      category: "Company"
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load sessions and check auth
  useEffect(() => {
    const token = localStorage.getItem("token");
    const name = localStorage.getItem("name");
    
    if (!token) {
      navigate("/");
      return;
    }
    
    setUserName(name || "User");
    loadSessions();
  }, [navigate]);

  const loadSessions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(res.data);
      
      // If there are sessions, load the most recent one
      if (res.data.length > 0) {
        loadSessionMessages(res.data[0].session_id);
      } else {
        // Create a new session if none exist
        createNewSession();
      }
    } catch (err) {
      console.error("Error loading sessions:", err);
    }
  };

  const loadSessionMessages = async (sessionId) => {
    try {
      setCurrentSession(sessionId);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/chat_history/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
      
      // Hide examples if there are messages
      if (res.data.length > 0) {
        setShowExamples(false);
      } else {
        setShowExamples(true);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  const createNewSession = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API}/sessions/create`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSessions(prev => [res.data, ...prev]);
      setCurrentSession(res.data.session_id);
      setMessages([]);
      setShowExamples(true);
    } catch (err) {
      console.error("Error creating session:", err);
    }
  };

  const renameSession = async (sessionId, newTitle) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/sessions/${sessionId}/rename`, 
        { title: newTitle },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSessions(prev => prev.map(s => 
        s.session_id === sessionId ? { ...s, title: newTitle } : s
      ));
      setEditingSession(null);
    } catch (err) {
      console.error("Error renaming session:", err);
    }
  };

  const deleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
      
      // If current session was deleted, switch to another session
      if (currentSession === sessionId) {
        const remainingSessions = sessions.filter(s => s.session_id !== sessionId);
        if (remainingSessions.length > 0) {
          loadSessionMessages(remainingSessions[0].session_id);
        } else {
          createNewSession();
        }
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    navigate("/");
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleExampleClick = (promptText) => {
    setMessage(promptText);
    setShowExamples(false);
    // Focus on input
    document.querySelector('.message-input')?.focus();
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const token = localStorage.getItem("token");
    
    if (!token) {
      navigate("/");
      return;
    }

    const userMessage = { sender: "You", text: message };
    setMessages(prev => [...prev, userMessage]);
    const currentMessage = message;
    setMessage("");
    setIsLoading(true);
    setError("");
    setShowExamples(false);

    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      setError("Request is taking too long. Please try again.");
      setMessages(prev => prev.filter(msg => msg.text !== currentMessage));
    }, 35000);

    try {
      console.log("Sending message:", currentMessage);
      
      const res = await axios.post(
        `${API}/chat`,
        { 
          message: currentMessage,
          session_id: currentSession 
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      clearTimeout(timeoutId);

      console.log("Chat response:", res.data);

      // If this is a new session, update the session list
      if (!currentSession) {
        setCurrentSession(res.data.session_id);
        loadSessions();
      }

      // Add AI response to UI
      const aiMessage = { sender: "AI", text: res.data.response };
      setMessages(prev => [...prev, aiMessage]);
      
      // Refresh sessions to update message count and timestamp
      loadSessions();
      
    } catch (err) {
      clearTimeout(timeoutId);
      
      console.error("Error sending message:", err);
      
      setMessages(prev => prev.filter(msg => msg.text !== currentMessage));
      
      if (err.code === 'ECONNABORTED') {
        setError("Request timed out. Please try again with a shorter question.");
      } else if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("name");
        navigate("/");
      } else if (err.response) {
        setError(`Error: ${err.response.data.detail || "Failed to send message"}`);
      } else if (err.request) {
        setError("No response from server. Please check if backend is running.");
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUserInitials = () => {
    if (!userName) return "U";
    return userName
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Function to format message text naturally like ChatGPT
  const formatMessageText = (text) => {
    if (!text) return null;

    // First, clean up the text by removing any markdown artifacts
    let cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/`{3}.*?`{3}/gs, '')
      .replace(/`([^`]+)`/g, '$1')
      .trim();

    // Split into paragraphs (double line breaks)
    const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
    
    if (paragraphs.length === 0) {
      const lines = cleanText.split('\n').filter(line => line.trim());
      return lines.map((line, idx) => (
        <p key={idx} style={{ margin: '0.5em 0' }}>
          {line}
        </p>
      ));
    }

    return paragraphs.map((paragraph, idx) => {
      if (paragraph.includes('\n•') || paragraph.includes('\n-') || paragraph.includes('\n*')) {
        const listItems = paragraph.split('\n').filter(item => item.trim());
        return (
          <div key={idx} style={{ margin: '0.5em 0' }}>
            {listItems.map((item, i) => {
              const cleanItem = item.replace(/^[•\-*]\s/, '').trim();
              return (
                <div key={i} style={{ display: 'flex', marginBottom: '0.25em' }}>
                  <span style={{ marginRight: '0.5em' }}>•</span>
                  <span>{cleanItem}</span>
                </div>
              );
            })}
          </div>
        );
      }

      if (paragraph.match(/^\d+\./m)) {
        const listItems = paragraph.split('\n').filter(item => item.trim());
        return (
          <div key={idx} style={{ margin: '0.5em 0' }}>
            {listItems.map((item, i) => {
              const match = item.match(/^(\d+)\.\s*(.*)/);
              if (match) {
                return (
                  <div key={i} style={{ display: 'flex', marginBottom: '0.25em' }}>
                    <span style={{ marginRight: '0.5em', minWidth: '1.5em' }}>{match[1]}.</span>
                    <span>{match[2]}</span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        );
      }

      return (
        <p key={idx} style={{ margin: '0.75em 0', lineHeight: '1.6' }}>
          {paragraph}
        </p>
      );
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Group example prompts by category
  const groupedExamples = examplePrompts.reduce((acc, prompt) => {
    if (!acc[prompt.category]) {
      acc[prompt.category] = [];
    }
    acc[prompt.category].push(prompt);
    return acc;
  }, {});

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <div className={`sidebar ${showSidebar ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={createNewSession}>
            <span>+</span> New Chat
          </button>
          <button className="toggle-sidebar" onClick={() => setShowSidebar(!showSidebar)}>
            {showSidebar ? '◀' : '▶'}
          </button>
        </div>
        
        <div className="sessions-list">
          {sessions.map(session => (
            <div
              key={session.session_id}
              className={`session-item ${currentSession === session.session_id ? 'active' : ''}`}
              onClick={() => loadSessionMessages(session.session_id)}
            >
              {editingSession === session.session_id ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => renameSession(session.session_id, editTitle)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      renameSession(session.session_id, editTitle);
                    }
                  }}
                  autoFocus
                  className="session-edit-input"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <div className="session-icon">💬</div>
                  <div className="session-info">
                    <div className="session-title">{session.title}</div>
                    <div className="session-meta">
                      <span>{formatDate(session.updated_at)}</span>
                      <span>•</span>
                      <span>{session.message_count} messages</span>
                    </div>
                  </div>
                  <div className="session-actions">
                    <button
                      className="session-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSession(session.session_id);
                        setEditTitle(session.title);
                      }}
                    >
                      ✎
                    </button>
                    <button
                      className="session-action delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.session_id);
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`main-content ${showSidebar ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Fixed Header */}
        <header className="chat-header">
          <div className="header-content">
            <div className="header-left">
              <button className="menu-btn" onClick={() => setShowSidebar(!showSidebar)}>
                ☰
              </button>
              <span className="brand">PRU LIFE AI</span>
            </div>
            <div className="user-menu">
              <div className="user-avatar">
                {getUserInitials()}
              </div>
              <span className="user-name">{userName}</span>
              <button onClick={handleLogoutClick} className="logout-btn">
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="modal-overlay">
            <div className="modal">
              <h3 className="modal-title">Sign out</h3>
              <p className="modal-message">Are you sure you want to sign out?</p>
              <div className="modal-actions">
                <button onClick={cancelLogout} className="modal-btn modal-btn-secondary">
                  Cancel
                </button>
                <button onClick={confirmLogout} className="modal-btn modal-btn-primary">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <main className="chat-main">
          <div className="chat-container">
            {/* Error Banner */}
            {error && (
              <div className="error-banner">
                <span className="error-message">{error}</span>
                <button onClick={() => setError("")} className="error-close">×</button>
              </div>
            )}

            {/* Messages Container */}
            <div className="messages-container" ref={messagesContainerRef}>
              {messages.length === 0 && !error && showExamples ? (
                <div className="examples-container">
                  <div className="examples-header">
                    <h2>Welcome to PRU LIFE AI Assistant</h2>
                    <p>How can I help you today? Here are some questions you might have:</p>
                  </div>
                  
                  <div className="examples-grid">
                    {Object.entries(groupedExamples).map(([category, prompts]) => (
                      <div key={category} className="example-category">
                        <h3 className="category-title">{category}</h3>
                        <div className="category-prompts">
                          {prompts.map((prompt, index) => (
                            <button
                              key={index}
                              className="example-prompt"
                              onClick={() => handleExampleClick(prompt.text)}
                            >
                              {prompt.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`message-wrapper ${msg.sender === "You" ? "user-wrapper" : "ai-wrapper"}`}
                    >
                      <div className={`message-group ${msg.sender === "You" ? "user" : "ai"}`}>
                        <div className="message-avatar">
                          {msg.sender === "You" ? getUserInitials() : "PRU"}
                        </div>
                        <div className="message-content">
                          <div className="message-sender">
                            {msg.sender === "You" ? userName : "Assistant"}
                          </div>
                          <div className="message-bubble">
                            {formatMessageText(msg.text)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="message-wrapper ai-wrapper">
                      <div className="message-group ai">
                        <div className="message-avatar">PRU</div>
                        <div className="message-content">
                          <div className="message-sender">Assistant</div>
                          <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="input-area">
              <div className="input-wrapper">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Send a message..."
                  disabled={isLoading}
                  className="message-input"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !message.trim()}
                  className="send-btn"
                >
                  {isLoading ? "..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Chat;