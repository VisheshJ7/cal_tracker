import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Send, Bot, Sparkles, User } from 'lucide-react';
import Navbar from '../components/Navbar';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const SYSTEM_INSTRUCTION = `You are CalorAI, an expert nutrition and calorie tracking assistant. 
Help users understand: calorie counts of foods, macronutrients (protein, carbs, fats), meal planning, 
healthy eating tips, and weight management advice. When asked about food, provide accurate calorie 
estimates and nutritional info. Format responses clearly using bold text for key figures.`;

export default function ChatBot() {
    const [messages, setMessages] = useState([{
        role: 'bot',
        content: "Hello! I'm **CalorAI**, your nutrition assistant 🥗\n\nI can help you with:\n- **Calorie counts** for any food\n- **Meal planning** and nutrition advice\n- **Macronutrient** breakdowns\n- **Healthy eating** tips\n\nWhat food would you like to know about?",
    }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatSession, setChatSession] = useState(null);

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        const initChat = async () => {
            if (!genAI) return;
            try {
                const model = genAI.getGenerativeModel({
                    model: 'gemini-2.5-flash',
                    systemInstruction: SYSTEM_INSTRUCTION,
                });
                setChatSession(model.startChat());
            } catch (e) { console.error(e); }
        };
        initChat();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleInput = (e) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isLoading) handleSend();
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !chatSession || isLoading) return;
        const userMessage = input.trim();
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);
        try {
            const result = await chatSession.sendMessage(userMessage);
            setMessages((prev) => [...prev, { role: 'bot', content: result.response.text() }]);
        } catch (e) {
            setMessages((prev) => [...prev, { role: 'bot', content: '⚠️ Error communicating with AI. Please check your connection.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const formatMessage = (content) => {
        if (!content) return { __html: '' };
        let f = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const blocks = [];
        f = f.replace(/```([\s\S]*?)```/g, (_, code) => { blocks.push(code); return `__CB_${blocks.length - 1}__`; });
        f = f.replace(/`([^`]+)`/g, '<code>$1</code>');
        f = f.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        f = f.replace(/\n/g, '<br/>');
        f = f.replace(/__CB_(\d+)__/g, (_, i) => `<pre><code>${blocks[i]}</code></pre>`);
        return { __html: f };
    };

    const quickPrompts = [
        'How many calories in a banana?',
        'Calories in 100g of chicken breast?',
        "What's a healthy 1500 calorie meal plan?",
        'How many calories should I eat per day?',
    ];

    return (
        <div className="app-layout">
            <Navbar />
            <main className="main-content chat-layout">
                <div className="chat-page-container">
                    <header className="chat-header">
                        <div className="chat-header-left">
                            <div className="header-icon"><Sparkles size={24} /></div>
                            <div>
                                <h1 className="chat-page-title">Nutrition AI</h1>
                                <p className="chat-page-sub">Powered by Gemini</p>
                            </div>
                        </div>

                        <div className="quick-prompts">
                            {quickPrompts.map((p, i) => (
                                <button key={i} className="quick-btn" onClick={() => { setInput(p); textareaRef.current?.focus(); }}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </header>

                    <div className="chat-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`message-wrapper ${msg.role}`}>
                                <div style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: '12px', alignItems: 'flex-start', maxWidth: '100%' }}>
                                    <div className={`msg-avatar ${msg.role}`}>
                                        {msg.role === 'user' ? <User size={18} color="white" /> : <Bot size={20} color="var(--primary)" />}
                                    </div>
                                    <div className={`message ${msg.role}`}>
                                        <div className="message-markdown" dangerouslySetInnerHTML={formatMessage(msg.content)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message-wrapper bot">
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <div className="msg-avatar bot"><Bot size={20} color="var(--primary)" /></div>
                                    <div className="message bot typing-indicator">
                                        <div className="dot" /><div className="dot" /><div className="dot" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="input-area">
                        <div className="input-container">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={handleInput}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about any food's calories..."
                                rows={1}
                                id="chat-input"
                            />
                            <button className="send-button" onClick={handleSend} disabled={!input.trim() || isLoading} id="chat-send">
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
