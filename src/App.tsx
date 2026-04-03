/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Send, User, Bot, Loader2, Info, ShoppingBag, MessageSquare } from "lucide-react";
import ReactMarkdown from 'react-markdown';

// System Instruction provided by the user
const SYSTEM_INSTRUCTION = `
你是一位專業且親切的「永利紙料 (Veng Lei Laboratory)」訂製小助手。你的任務是引導顧客完成「手繪符咒」的訂製流程，並確保收集到所有必要的資訊。

視覺描述與報價邏輯：
1. 款式描述 (參考款式圖)：
   - A 款（書籤款）：書籤尺寸，字數限制 7-8 個中文字內（建議 6-7 字視覺效果最佳）。
   - B 款（名片款）：名片尺寸，可放手機後，字數限制 5 個中文字內。
   - 公仔/插圖：可隨意、提供來圖或描述（例如：有貓，很開心）。插圖會由小畫家以品牌風格二次創作。

2. 加購價格描述 (參考外殼圖)：
   - 外殼加購統一為 ¥12/個。
   - A 款配「軟套」：只能放一張，具備防水功能。
   - B 款配「硬套」：可以正反放兩張符咒，或是放置地鐵卡。

3. 收款引導 (參考收款碼)：
   - 當用戶準備結帳、詢問如何付款或訂單彙整完成後，必須明確說出：「請參考對話中提供的支付寶收款碼完成付款」。

Service Logic (服務邏輯流程)
第一階段：確認取貨方式與條款告知
詢問顧客：「請問您選擇哪種取貨方式？（自取 / 郵寄）」。
根據選擇，必須告知以下規則並詢問是否同意：
【選擇郵寄】：每張 ¥40，需時約 3 週發貨。內地「順豐到付」，香港「京東到付」。
【選擇自取】：每張 ¥40，需提前 7-10 天預約（自付款日起算）。地點為澳門店。
共同規則：訂製產品不退不換、不會提前發回傳圖（發貨前不看圖）、所有插圖由小畫家以品牌風格二次創作。

第二階段：詳細規格收集（逐張詢問）
若顧客要訂製多張，請逐一引導填寫以下內容：
尺寸款式 (A/B)：引導顧客選擇 A 款或 B 款。
文字內容：請顧客提供想寫的字（提醒不可超過對應款式的字數）。
插圖/公仔描述：可描述動作（不超過 2 個）或明確品種/性別。
加購外殼：詢問是否需要加購保護殼（每個 ¥12）。

第三階段：聯絡資料收集
郵寄者：請提供收件人姓名、聯絡電話、詳細地址。
自取者：請提供姓名、完整電話（提醒取件時報手機末 4 碼）。

第四階段：訂單總結與支付
彙整訂單：條列出所有訂製詳情（款式、文字、插圖描述、外殼、總金額）。
金額計算：
符咒：張數 × ¥40
外殼：數量 × ¥12
線上結算統一收取人民幣 (RMB)，匯率 1:1。
支付引導：明確告知「請參考對話中提供的支付寶收款碼完成付款」。

重要最終步驟：
「請在完成付款後，將本對話的訂單彙整截圖以及支付成功的截圖，一併發送至我們的微信 (WeChat) 帳號，以便我們正式將訂單轉交給小畫家製作！感謝您的耐心等待與支持。」

Constraints & Tone (約束與語氣)
語氣：親切、專業、有耐心。
準確性：嚴格檢查用戶提供的字數。若 A 款超過 8 字或 B 款超過 5 字，請立即提醒修正。
簡明扼要：一次只問一個或一組相關問題，避免讓顧客感到資訊過載。
`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  // Initialize Chat
  useEffect(() => {
    const initChat = async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });
      chatRef.current = chat;

      // Initial greeting
      setIsLoading(true);
      try {
        const response: GenerateContentResponse = await chat.sendMessage({ message: "你好，請開始引導我訂製符咒。" });
        setMessages([{ role: 'assistant', content: response.text || "您好！我是永利紙料的訂製小助手。請問您選擇哪種取貨方式？（自取 / 郵寄）" }]);
      } catch (error) {
        console.error("Error initializing chat:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initChat();
  }, []);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      if (chatRef.current) {
        const response: GenerateContentResponse = await chatRef.current.sendMessage({ message: userMessage });
        setMessages(prev => [...prev, { role: 'assistant', content: response.text || "抱歉，我現在無法回應。" }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "發生了一些錯誤，請稍後再試。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f5f2] flex flex-col font-sans text-gray-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#d44b3d] rounded-full flex items-center justify-center text-white shadow-md">
            <ShoppingBag size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">永利紙料 Veng Lei Laboratory</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">手繪符咒訂製助手</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Info size={14} />
            <span>¥40/張</span>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col max-w-4xl mx-auto w-full">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth"
        >
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${
                    msg.role === 'user' ? 'bg-gray-800 text-white' : 'bg-[#d44b3d] text-white'
                  }`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-gray-800 text-white rounded-tr-none' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                  }`}>
                    <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex gap-3 items-center text-gray-400 ml-11">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs font-medium">正在輸入...</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="max-w-3xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="輸入您的訊息..."
                className="w-full bg-gray-50 border border-gray-200 rounded-full px-5 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[#d44b3d]/20 focus:border-[#d44b3d] transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#d44b3d] text-white rounded-full flex items-center justify-center hover:bg-[#b83d31] disabled:opacity-50 disabled:hover:bg-[#d44b3d] transition-colors shadow-sm"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-center text-gray-400 mt-3 font-medium uppercase tracking-widest">
            Veng Lei Laboratory © 2026
          </p>
        </div>
      </main>

      {/* Sidebar / Info Panel (Optional, hidden on mobile) */}
      <aside className="hidden lg:block fixed right-8 top-24 w-72 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)] pb-8 pr-2">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <MessageSquare size={16} className="text-[#d44b3d]" />
            訂製須知
          </h3>
          <ul className="text-xs space-y-3 text-gray-600">
            <li className="flex gap-2">
              <span className="text-[#d44b3d] font-bold">•</span>
              <span>訂製產品不退不換</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#d44b3d] font-bold">•</span>
              <span>發貨前不提供預覽圖</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#d44b3d] font-bold">•</span>
              <span>插圖為品牌風格二次創作</span>
            </li>
          </ul>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-2 px-1">
            <Info size={16} className="text-[#d44b3d]" />
            參考圖示
          </h3>
          
          <div className="space-y-4">
            <div className="group relative">
              <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">款式說明 (A/B 款)</p>
              <img 
                src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=400" 
                alt="款式說明" 
                className="rounded-xl border border-gray-100 shadow-sm group-hover:shadow-md transition-shadow cursor-zoom-in"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="group relative">
              <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">加購外殼 (¥12/個)</p>
              <img 
                src="https://images.unsplash.com/photo-1618331835717-801e976710b2?auto=format&fit=crop&q=80&w=400" 
                alt="外殼說明" 
                className="rounded-xl border border-gray-100 shadow-sm group-hover:shadow-md transition-shadow cursor-zoom-in"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="group relative">
              <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">支付寶收款碼</p>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex flex-col items-center gap-2">
                <img 
                  src="https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&q=80&w=400" 
                  alt="收款碼" 
                  className="rounded-lg shadow-sm w-32 h-32 object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="text-[10px] text-blue-600 font-bold">請掃碼完成付款</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
