import React, { useState, useEffect, useMemo, useDeferredValue, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Star, Trophy, MapPin, Mail, Phone, Clock, FileText, Ban, Bot,
  Landmark, Trash, ShieldCheck, ChevronRight, CircleCheckBig, CircleX,
  Activity, IndianRupee, LoaderCircle, Award, Terminal, TrendingDown,
  TrendingUp, TriangleAlert, User, Users, Video, Wallet, X, ChevronLeft,
  Moon, Sun, RefreshCw, Send, HelpCircle, Check, Paperclip, Volume2, VolumeX, Smartphone, Bell
} from "lucide-react";
import {
  BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip,
  Legend, Bar, ResponsiveContainer, ScatterChart, Scatter, Cell, Tooltip
} from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

declare global {
  interface Window {
    GEMINI_API_KEY?: string;
  }
}

const firebaseConfig = {
  databaseURL: "https://sbo-database-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// WhatsApp Custom Message launcher helper
function getWhatsAppLink(phone: string, userName: string) {
  const cleanPhone = phone ? phone.replace(/\D/g, "") : "";
  const text = encodeURIComponent(`Hi ${userName}, this is SBO Administration. We had a look at your database profile and...`);
  return `https://wa.me/${cleanPhone}?text=${text}`;
}

// Convert amount strings ("₹1,500", "1200") to raw floats
function parseAmount(amtStr: any): number {
  if (amtStr === undefined || amtStr === null) return 0;
  if (typeof amtStr === "number") return amtStr;
  const str = String(amtStr);
  const clean = str.replace(/[^\d.-]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Map task records to streamlined formats
function mapHistoryItem(item: any, type: string, userName: string) {
  return {
    sourceType: type,
    originalDate: item.Date || item["Request Date"] || "Unknown",
    description: item.Product || item["Social Media Link"] || item["Video URL"] || item.ID || "No Description",
    amount: item.Amount || item["Amount"] || "₹0",
    status: item.Status || "Unknown",
    user: userName
  };
}

// Accumulate all tasks from a staff profile
function getAllUserTasks(user: any, name: string) {
  const reviews = user["📝 Content Review History"] ? Object.values(user["📝 Content Review History"]) : [];
  const sharing = user["🔗 Content Sharing History"] ? Object.values(user["🔗 Content Sharing History"]) : [];
  const media = user["🚀 Media Booster History"] ? Object.values(user["🚀 Media Booster History"]) : [];
  
  return [
    ...reviews.map(item => mapHistoryItem(item, "Review", name)),
    ...sharing.map(item => mapHistoryItem(item, "Sharing", name)),
    ...media.map(item => mapHistoryItem(item, "Media", name))
  ];
}

// --- KANBAN BOARD SYSTEM ---
const KanbanCard = ({ taskKey, item, category, onVerifyTask }: any) => {
  const isWithdrawal = category === "📋 Withdrawal History";
  const status = (item.Status || "").toLowerCase();
  const isPending = status.includes("pending");

  const handleApprove = () => {
    onVerifyTask(taskKey, isWithdrawal ? "Success Withdraw" : "Approved SUCCESS", item.Amount || "₹0");
  };
  const handleReject = () => {
    onVerifyTask(taskKey, isWithdrawal ? "Fail Withdraw" : "Reject Review", item.Amount || "₹0");
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-white border text-left border-slate-200 p-3 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow cursor-default flex flex-col gap-2">
      <div className="flex items-center justify-between">
         <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.Date || item["Request Date"] || "Unknown"}</span>
         <StatusBadge status={item.Status} />
      </div>

      {isWithdrawal && (
         <div className="flex flex-col gap-1 mt-1">
           <div className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1 w-full flex justify-between items-center">
              <span className="text-slate-500 font-mono text-xs">{item.ID || "N/A"}</span>
              <span className="text-indigo-600 text-base">{item.Amount || "₹0"}</span>
           </div>
         </div>
      )}

      {category === "📝 Content Review History" && (
         <div className="flex flex-col gap-1 mt-1">
             <div className="text-xs font-semibold text-slate-800 line-clamp-2">
                 {item.Product ? item.Product.replace(/\|/g, " • ") : "N/A"}
             </div>
             <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-50">
               <span className="text-amber-500 font-bold text-xs flex items-center gap-1"><Star className="w-3 h-3 fill-amber-500" /> {item.Rating || "-"}</span>
               <span className="text-indigo-600 font-bold text-xs">{item.Amount || "₹0"}</span>
             </div>
         </div>
      )}

      {category === "🔗 Content Sharing History" && (
         <div className="flex flex-col gap-1 mt-1">
             {item["Social Media Link"] ? (
                <a href={item["Social Media Link"]} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all text-[11px] bg-blue-50/50 p-2 rounded-md border border-blue-100 transition-colors hover:bg-blue-50">
                  {item["Social Media Link"]}
                </a>
             ) : <span className="text-xs text-slate-400">N/A</span>}
             <div className="text-right text-emerald-600 font-bold text-xs mt-1">{item.Amount || "₹0"}</div>
         </div>
      )}

      {category === "🚀 Media Booster History" && (
         <div className="flex flex-col gap-1 mt-1">
             {item["Video URL"] ? (
                <a href={item["Video URL"]} target="_blank" rel="noreferrer" className="text-red-500 hover:text-red-600 hover:underline break-all text-[11px] bg-red-50/50 p-2 rounded-md border border-red-100 flex items-center gap-1.5 transition-colors hover:bg-red-50">
                  <Video className="w-3.5 h-3.5 flex-shrink-0" /> {item["Video URL"]}
                </a>
             ) : <span className="text-xs text-slate-400">N/A</span>}
             <div className="text-right text-indigo-600 font-bold text-xs mt-1">{item.Amount || "₹0"}</div>
         </div>
      )}

      {isPending && (
         <div className="flex items-center gap-2 mt-2 border-t border-slate-100 pt-2.5">
           <button onClick={handleApprove} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 hover:border-emerald-500 transition-colors py-1.5 rounded text-[10px] font-bold uppercase cursor-pointer shadow-sm">
             <Check className="w-3.5 h-3.5" /> Approve
           </button>
           <button onClick={handleReject} className="flex flex-1 items-center justify-center gap-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border border-red-200 hover:border-red-500 transition-colors py-1.5 rounded text-[10px] font-bold uppercase cursor-pointer shadow-sm">
             <X className="w-3.5 h-3.5" /> Reject
           </button>
         </div>
      )}
    </motion.div>
  );
};

const KanbanColumn = ({ title, items, category, emptyMessage, onVerifyTask }: any) => {
  return (
    <div className="flex flex-col flex-1 bg-slate-100/50 border border-slate-200 rounded-xl p-3 shadow-inner">
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="font-bold text-slate-700 uppercase tracking-widest text-xs flex items-center gap-2">
          {title === "Pending" && <Clock className="w-4 h-4 text-amber-500" />}
          {title === "Approved" && <CircleCheckBig className="w-4 h-4 text-emerald-500" />}
          {title === "Rejected" && <CircleX className="w-4 h-4 text-red-500" />}
          {title}
        </h4>
        <span className="bg-white text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[350px] max-h-[600px] pb-2 custom-scrollbar pr-1">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50 mt-2">
             <p className="text-center text-slate-400 font-medium text-xs leading-relaxed">{emptyMessage}</p>
          </div>
        ) : items.map(([taskKey, item]: any) => (
          <KanbanCard key={taskKey} taskKey={taskKey} item={item} category={category} onVerifyTask={onVerifyTask} />
        ))}
      </div>
    </div>
  );
};

const KanbanBoard = ({ items, category, emptyMessage, onVerifyTask }: any) => {
  const pending = items.filter(([_, item]: any) => (item.Status || "").toLowerCase().includes("pending"));
  const approved = items.filter(([_, item]: any) => {
    const s = (item.Status || "").toLowerCase();
    return s.includes("approved") || s.includes("success");
  });
  const rejected = items.filter(([_, item]: any) => {
    const s = (item.Status || "").toLowerCase();
    return s.includes("reject") || s.includes("fail") || s.includes("decline");
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 md:p-8 bg-slate-50/30 rounded-b-2xl border-t border-slate-100">
      <KanbanColumn title="Pending" items={pending} category={category} emptyMessage={emptyMessage} onVerifyTask={onVerifyTask} />
      <KanbanColumn title="Approved" items={approved} category={category} emptyMessage={`No approved items`} onVerifyTask={onVerifyTask} />
      <KanbanColumn title="Rejected" items={rejected} category={category} emptyMessage={`No rejected items`} onVerifyTask={onVerifyTask} />
    </div>
  );
};
// --- END KANBAN BOARD SYSTEM ---

export default function App() {
  const [sboData, setSboData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [bootSequence, setBootComplete] = useState(false);
  const [theme, setTheme] = useState<"light" | "terminal">("light");

  // Dynamic action notification states
  const [notify, setNotify] = useState<{ id: string; type: "success" | "reject"; message: string } | null>(null);
  // Live updates feed
  const [liveUpdates, setLiveUpdates] = useState<Array<{ id: string; message: string; timestamp: number }>>([]);

  // Image / Vision
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
  // Voice output toggle
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

  // Fleet & Wallet Filter states
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [hasInitializedFilters, setHasInitializedFilters] = useState(false);

  // PWA generation
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swCode = `self.addEventListener('install', (e) => self.skipWaiting()); self.addEventListener('fetch', (e) => {});`;
      const blob = new Blob([swCode], { type: 'application/javascript' });
      navigator.serviceWorker.register(URL.createObjectURL(blob)).catch(() => {});
    }
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifest = {
        name: "SBO Administrator Hub",
        short_name: "SBO",
        display: "standalone",
        background_color: "#f8fafc",
        theme_color: "#4f46e5",
        icons: [{ src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzRmNDZlNSIvPjwvc3ZnPg==", sizes: "512x512", type: "image/svg+xml" }]
      };
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = URL.createObjectURL(blob);
      document.head.appendChild(link);
    }
  }, []);

  // Initialize selected users exactly once when data loads
  useEffect(() => {
    if (sboData && !hasInitializedFilters) {
      setSelectedUsers(new Set(Object.keys(sboData)));
      setHasInitializedFilters(true);
    }
  }, [sboData, hasInitializedFilters]);

  // Auto-dismiss notification toast
  useEffect(() => {
    if (notify) {
      const timer = setTimeout(() => {
        setNotify(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notify]);

  // Handle live admin task approval/rejection task modifier
  const verifyTask = (userId: string, category: string, taskKey: string, newStatus: string, amountStr: string) => {
    setSboData((prev: any) => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (updated[userId] && updated[userId][category] && updated[userId][category][taskKey]) {
        const userCopy = { ...updated[userId] };
        const categoryCopy = { ...userCopy[category] };
        
        const taskCopy = { ...categoryCopy[taskKey], Status: newStatus };
        categoryCopy[taskKey] = taskCopy;
        userCopy[category] = categoryCopy;
        
        const isApproved = newStatus.toLowerCase().includes("approved") || newStatus.toLowerCase().includes("success");
        if (isApproved) {
          const wallets = { ...userCopy["💰 Wallets"] };
          const amount = parseFloat(amountStr.replace(/[^\d.]/g, "")) || 0;
          
          if (category.includes("Withdrawal")) {
            // Withdrawal success is handled within status
          } else {
            const currentAffiliate = parseAmount(wallets["Affiliate Balance"]);
            const currentTotalCredited = parseAmount(wallets["Total Credited"]);
            const currentTaskEarned = parseAmount(wallets["Task Earned"]);
            
            wallets["Affiliate Balance"] = `₹${(currentAffiliate + amount).toLocaleString("en-IN")}`;
            wallets["Total Credited"] = `₹${(currentTotalCredited + amount).toLocaleString("en-IN")}`;
            wallets["Task Earned"] = `₹${(currentTaskEarned + amount).toLocaleString("en-IN")}`;
          }
          userCopy["💰 Wallets"] = wallets;
        }
        
        updated[userId] = userCopy;
        
        setNotify({
          id: Date.now().toString(),
          type: isApproved ? "success" : "reject",
          message: isApproved 
            ? `Verified & Approved successfully! +₹${amountStr} added to staff wallet.`
            : `Task marked as Rejected successfully.`
        });
      }
      return updated;
    });
  };
  
  // Filtering and searching states
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState<"All" | "Staff" | "Affiliates">("All");

  // Overlay Modals
  const [taskOverlay, setTaskOverlay] = useState<{ isOpen: boolean; type: "Approved" | "Pending" | "Rejected" | null }>({
    isOpen: false,
    type: null
  });
  const [userOverlay, setUserOverlay] = useState<{ isOpen: boolean; type: string | null }>({
    isOpen: false,
    type: null
  });

  // AI Assistant side-drawer states
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ id: string; role: "user" | "model"; text: string }>>([
    {
      id: "1",
      role: "model",
      text: "Vanakkam! Naan SBO smart AI assistant. Direct database records vachu en kitta bathil keti ungala overview panna mudiyum. Ask me anything in English, Tamil, or Tanglish! (e.g. 'Rajik balance evlo?' or 'Who is the nominee of SBOAFP3350?')"
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch SBO database from firebase real-time listener
  const prevSboDataRef = useRef<any>(null);

  useEffect(() => {
    setLoading(true);
    const dbRef = ref(db, 'sbo_data');
    
    // Add to live feed helper
    const addLiveUpdate = (message: string) => {
      const id = Date.now().toString();
      setLiveUpdates(prev => [
        { id, message, timestamp: Date.now() },
        ...prev.slice(0, 4)
      ]);
      
      // Auto remove after 5 seconds
      setTimeout(() => {
          setLiveUpdates(prev => prev.filter(u => u.id !== id));
      }, 5000);
    };

    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      const prevData = prevSboDataRef.current;
      
      setSboData(data);
      setLoading(false);
      setError(null);
      
      let message = "Database updated.";
      
      if (prevData && data) {
        // Find which user/data changed
        for (const [userId, userData] of Object.entries(data as Record<string, any>)) {
          const prevUser = prevData[userId];
          if (!prevUser || JSON.stringify(userData) !== JSON.stringify(prevUser)) {
            const name = userData["👤 Profile"]?.Name || userId;
            
            // Try to find if a task was recently added/changed
            const prevReviewHistory = prevUser?.["📝 Content Review History"] || {};
            const currReviewHistory = userData["📝 Content Review History"] || {};
            
            const prevKeys = Object.keys(prevReviewHistory);
            const currKeys = Object.keys(currReviewHistory);
            
            const addedKey = currKeys.find(k => !prevKeys.includes(k));
            
            if (addedKey) {
                const newTask = currReviewHistory[addedKey];
                message = `${name} updated: ${newTask.description || 'Task'} - ${newTask.amount || 'N/A'}`;
            } else {
                message = `${name} data was updated.`;
            }
            break;
          }
        }
      }
      
      addLiveUpdate(message);
      
      prevSboDataRef.current = data;
      
      // Request permission and show notification
      if (typeof Notification !== "undefined") {
        if (Notification.permission === "granted") {
          new Notification("SBO Data Updated", { body: message });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }
    }, (error) => {
      setError(error.message || "Failed to establish database connection.");
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Update theme class on body
  useEffect(() => {
    if (theme === "terminal") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
    return () => document.body.classList.remove("dark-theme");
  }, [theme]);

  // Scroll chat window to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, aiTyping]);

  // Handle AI question submission
  const sendAIMessage = async () => {
    if (!aiInput.trim() && !imageBase64) return;
    const userText = aiInput.trim();
    const newUserMsg = { id: Date.now().toString(), role: "user" as const, text: userText || "[Image Attached]" };
    setAiMessages(prev => [...prev, newUserMsg]);
    setAiInput("");
    setAiTyping(true);

    const history = aiMessages
      .filter(m => m.id !== "1")
      .map(m => ({ role: m.role, text: m.text }));
      
    const payload = { message: userText, history, imageBase64 };
    setImageBase64(null);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history,
          sboData,
          imageBase64: payload.imageBase64
        })
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error (Status ${resp.status})`);
      }

      const responseData = await resp.json();
      const replyText = responseData.text || "No response received.";

      if (isAudioEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(replyText || "Error occurred.");
        window.speechSynthesis.speak(utterance);
      }

      setAiMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "model" as const,
        text: replyText || "Bathil kedaikala, system error. Please try again."
      }]);
    } catch (err: any) {
      setAiMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "model" as const,
        text: err.message || "Network clearance failure. Machine logic exception occurred."
      }]);
    } finally {
      setAiTyping(false);
    }
  };

  // Skip boot sequence or wait 4s
  useEffect(() => {
    const timer = setTimeout(() => {
      setBootComplete(true);
    }, 4100);
    return () => clearTimeout(timer);
  }, []);

  // Compute stats across database
  const statistics = useMemo(() => {
    if (!sboData) return null;
    const items = Object.entries(sboData);
    let totalAffiliate = 0;
    let totalTask = 0;
    let totalCredited = 0;
    let totalPending = 0;
    let totalApproved = 0;
    let totalRejected = 0;

    const filteredKeys = statusFilter === "All"
      ? items
      : statusFilter === "Staff"
      ? items.filter(([k]) => k.startsWith("SBOVDPN"))
      : items.filter(([k]) => k.startsWith("SBOAFP"));

    const chartData = filteredKeys.map(([id, val]: any) => {
      const affiliateBalance = parseAmount(val["💰 Wallets"]?.["Affiliate Balance"]);
      const taskEarned = parseAmount(val["💰 Wallets"]?.["Task Earned"]);
      const credited = parseAmount(val["💰 Wallets"]?.["Total Credited"]);
      const name = val["👤 Profile"]?.Name || id;

      totalAffiliate += affiliateBalance;
      totalTask += taskEarned;
      totalCredited += credited;

      // Extract all histories to compute status metrics
      const reviews = val["📝 Content Review History"] ? Object.values(val["📝 Content Review History"]) : [];
      const sharing = val["🔗 Content Sharing History"] ? Object.values(val["🔗 Content Sharing History"]) : [];
      const media = val["🚀 Media Booster History"] ? Object.values(val["🚀 Media Booster History"]) : [];

      [...reviews, ...sharing, ...media].forEach((task: any) => {
        const stat = (task.Status || "").toLowerCase();
        if (stat.includes("pending")) totalPending++;
        else if (stat.includes("approved") || stat.includes("success")) totalApproved++;
        else if (stat.includes("reject") || stat.includes("fail")) totalRejected++;
      });

      const withdrawals = val["📋 Withdrawal History"] ? Object.values(val["📋 Withdrawal History"]) : [];

      return {
        id,
        name,
        affiliate: affiliateBalance,
        task: taskEarned,
        totalEarnings: affiliateBalance + taskEarned,
        credited,
        withdrawalCount: withdrawals.length,
        lastLogin: val["🏷️ Metadata"]?.["Last Login"] || val["🏷️ Metadata"]?.["Last Check"] || "N/A"
      };
    });

    const topAffiliates = [...chartData].sort((a, b) => b.affiliate - a.affiliate).slice(0, 5);
    const topTaskEarners = [...chartData].sort((a, b) => b.task - a.task).slice(0, 5);
    const topCredited = [...chartData].sort((a, b) => b.credited - a.credited).slice(0, 5);
    const topWithdrawals = [...chartData].sort((a, b) => b.withdrawalCount - a.withdrawalCount).slice(0, 5);

    return {
      affiliate: totalAffiliate,
      task: totalTask,
      credited: totalCredited,
      chartData,
      topAffiliates,
      topTaskEarners,
      topCredited,
      topWithdrawals,
      totalPending,
      totalApproved,
      totalRejected
    };
  }, [sboData, statusFilter]);

  // Tasks mapped for global overlays
  const listTasksForOverlay = useMemo(() => {
    if (!sboData || !taskOverlay.type) return [];
    const targetStatus = taskOverlay.type.toLowerCase();
    let accumulated: any[] = [];
    
    Object.entries(sboData).forEach(([id, val]: any) => {
      const name = val["👤 Profile"]?.Name || id;
      const tasks = getAllUserTasks(val, name);
      accumulated = accumulated.concat(tasks);
    });

    return accumulated.filter(task => {
      const s = task.status.toLowerCase();
      if (targetStatus === "pending") return s.includes("pending");
      if (targetStatus === "approved") return s.includes("approved") || s.includes("success");
      if (targetStatus === "rejected") return s.includes("reject") || s.includes("fail");
      return false;
    });
  }, [sboData, taskOverlay.type]);

  // List users for specific list overlay
  const listUsersForOverlay = useMemo(() => {
    if (!statistics || !userOverlay.type) return [];
    const list = [...statistics.chartData];
    if (userOverlay.type === "Net Credited") {
      return list.sort((a, b) => b.credited - a.credited);
    } else if (userOverlay.type === "Task Earnings") {
      return list.sort((a, b) => b.task - a.task);
    } else if (userOverlay.type === "Affiliate Balance") {
      return list.sort((a, b) => b.affiliate - a.affiliate);
    } else {
      return list.sort((a, b) => a.id.localeCompare(b.id));
    }
  }, [statistics, userOverlay.type]);

  // Analytics & Fleet calculation
  const { grandTotalCalculated, fleetCards, fleetData } = useMemo(() => {
    if (!sboData) return { grandTotalCalculated: 0, fleetCards: [], fleetData: [] };
    
    let gTotal = 0;
    const filteredUsers = Object.entries(sboData).filter(([id]) => selectedUsers.has(id));
    
    const fData: any[] = [];

    const cards = filteredUsers.map(([id, val]: any) => {
      const task = parseAmount(val["💰 Wallets"]?.["Task Earned"]);
      const ref = parseAmount(val["💰 Wallets"]?.["Referral Earned"]);
      const aff = parseAmount(val["💰 Wallets"]?.["Affiliate Balance"]);
      const intro = parseAmount(val["💰 Wallets"]?.["Intro Commission"]);
      
      const totalRaw = task + ref + aff + intro;
      const deducted = totalRaw * 0.8;
      gTotal += deducted;
      
      const lastLoginStr = val["🏷️ Metadata"]?.["Last Login"] || val["🏷️ Metadata"]?.["Last Check"] || "";
      const lastLoginTs = lastLoginStr ? new Date(lastLoginStr.replace(/,/g, '')).getTime() : NaN;
      const isOnline = !isNaN(lastLoginTs) && (Date.now() - lastLoginTs < 3600000); // within 1 hour
      const deviceModel = val["🏷️ Metadata"]?.["Device Model"] || "Unknown Device";
      const name = val["👤 Profile"]?.Name || id;

      const lastTaskStr = val["🏆 Last Task"]?.Timestamp || "";
      const parseDateLoose = (str: string) => {
        if (!str) return NaN;
        if (str.includes('-') && str.split('-')[0].length === 2) {
          const [datePart, timePart] = str.split(' ');
          const [day, month, year] = datePart.split('-');
          return new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}`).getTime();
        }
        return new Date(str.replace(/,/g, '')).getTime();
      };
      const lastTaskTs = parseDateLoose(lastTaskStr);
      const isMissingTaskAlert = !isNaN(lastTaskTs) && (Date.now() - lastTaskTs > 86400000);

      const isAffiliate = id.includes("AFP");
      const isMain = id.includes("MA");

      const borderGlow = isMissingTaskAlert ? "ring-2 ring-red-400/50 shadow-[0_0_15px_rgba(248,113,113,0.15)] border-red-200" 
                       : isAffiliate ? "border-purple-200 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] border-l-4 border-l-purple-400" 
                       : isMain ? "border-blue-200 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] border-l-4 border-l-blue-400" 
                       : "border-slate-200";

      const headerBorder = isMissingTaskAlert ? "bg-red-50/50 border-red-100" 
                         : isAffiliate ? "bg-purple-50/30 border-purple-100"
                         : isMain ? "bg-blue-50/30 border-blue-100"
                         : "bg-slate-50 border-slate-100";

      fData.push({ id, name, deviceModel, task, ref, aff, intro, deducted });

      return (
        <div key={id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-all relative ${borderGlow}`}>
          {isMissingTaskAlert && (
             <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-bl-lg shadow-sm z-10 flex items-center gap-1">
               <TriangleAlert className="w-3 h-3" /> Overdue
             </div>
          )}
          <div className={`px-4 py-3 border-b flex items-center justify-between ${headerBorder}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-300 shadow-sm'} ring-2 ring-white`} title={isOnline ? "Active within 1 hour" : "Offline"}></div>
              <h4 className="font-bold text-sm text-slate-800 truncate max-w-[120px]" title={name}>{name}</h4>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono bg-white/80 px-2 py-0.5 rounded border border-slate-200 backdrop-blur-sm" title={deviceModel}>
                <Smartphone className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="truncate max-w-[90px]">{deviceModel}</span>
              </div>
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3 flex-1 bg-white">
            <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
              <div className="text-[10px] uppercase font-bold text-blue-400 mb-0.5 tracking-wider">Task Earned</div>
              <div className="text-xs text-slate-400 line-through decoration-slate-300">₹{task.toLocaleString('en-IN')}</div>
              <div className="text-sm font-bold text-blue-700">₹{(task * 0.8).toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50">
              <div className="text-[10px] uppercase font-bold text-emerald-400 mb-0.5 tracking-wider">Affiliate Bal</div>
              <div className="text-xs text-slate-400 line-through decoration-slate-300">₹{aff.toLocaleString('en-IN')}</div>
              <div className="text-sm font-bold text-emerald-700">₹{(aff * 0.8).toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/50">
              <div className="text-[10px] uppercase font-bold text-amber-400 mb-0.5 tracking-wider">Referral Earned</div>
              <div className="text-xs text-slate-400 line-through decoration-slate-300">₹{ref.toLocaleString('en-IN')}</div>
              <div className="text-sm font-bold text-amber-700">₹{(ref * 0.8).toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-purple-50/50 p-2.5 rounded-xl border border-purple-100/50">
              <div className="text-[10px] uppercase font-bold text-purple-400 mb-0.5 tracking-wider">Intro Comm</div>
              <div className="text-xs text-slate-400 line-through decoration-slate-300">₹{intro.toLocaleString('en-IN')}</div>
              <div className="text-sm font-bold text-purple-700">₹{(intro * 0.8).toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="bg-slate-900 border-t border-slate-800 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Net (80%)</div>
              {isMissingTaskAlert && (
                 <button className="text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors px-2 py-0.5 rounded border border-red-500/30 cursor-pointer">
                   Send Reminder
                 </button>
              )}
            </div>
            <div className="text-lg font-black tracking-tight text-white">₹{deducted.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          </div>
        </div>
      );
    });
    
    return { grandTotalCalculated: gTotal, fleetCards: cards, fleetData: fData };
  }, [sboData, selectedUsers]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Fleet Wallet Report", 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text(`Grand Total (80% Deducted): Rs. ${grandTotalCalculated.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 14, 40);

    const tableData = fleetData.map(c => [
      c.name,
      c.id,
      c.deviceModel,
      `Rs. ${c.task.toLocaleString('en-IN')}`,
      `Rs. ${c.ref.toLocaleString('en-IN')}`,
      `Rs. ${c.aff.toLocaleString('en-IN')}`,
      `Rs. ${c.intro.toLocaleString('en-IN')}`,
      `Rs. ${c.deducted.toLocaleString('en-IN')}`
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Name', 'ID', 'Device', 'Task', 'Referral', 'Affiliate', 'Intro', 'Net (80%)']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save("Fleet_Wallet_Report.pdf");
  };

  // User detail data computed dynamically
  const activeUserData = useMemo(() => {
    if (!sboData || !activeUserId) return null;
    const user = sboData[activeUserId];
    const name = user["👤 Profile"]?.Name || activeUserId;
    const tasks = getAllUserTasks(user, name);

    // Compute active user analytics stats
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    tasks.forEach(t => {
      const stat = t.status.toLowerCase();
      if (stat.includes("pending")) pendingCount++;
      else if (stat.includes("approved") || stat.includes("success")) approvedCount++;
      else if (stat.includes("reject") || stat.includes("fail")) rejectedCount++;
    });

    // Generate contribution scatter plot/heatmap intensity points
    const contributionIntensityPoints = () => {
      const timestamps = tasks.map(t => {
        if (!t.originalDate || t.originalDate === "Unknown") return null;
        // String date like "14 Jun 26"
        const match = t.originalDate.match(/(\d+)\s+([A-Za-z]+)\s+(\d+)/);
        if (match) {
          return new Date(`${match[1]} ${match[2]} 20${match[3]}`).getTime();
        }
        return new Date(t.originalDate).getTime();
      }).filter((t): t is number => !!t && !isNaN(t));

      if (!timestamps.length) return [];
      const maximum = new Date(Math.max(...timestamps));
      maximum.setHours(23, 59, 59, 999);

      const startTime = new Date(maximum.getTime() - (30 * 24 * 60 * 60 * 1000));
      const countsByDay: Record<string, number> = {};

      timestamps.forEach(t => {
        if (t >= startTime.getTime() && t <= maximum.getTime()) {
          const key = new Date(t).toISOString().split("T")[0];
          countsByDay[key] = (countsByDay[key] || 0) + 1;
        }
      });

      const listCoords = [];
      for (let offset = 29; offset >= 0; offset--) {
        const currentDate = new Date(maximum.getTime() - (offset * 24 * 60 * 60 * 1000));
        const key = currentDate.toISOString().split("T")[0];
        const count = countsByDay[key] || 0;
        const weekCol = Math.floor((29 - offset) / 7);
        const dayRow = currentDate.getDay();

        listCoords.push({
          dateKey: key,
          label: currentDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          x: weekCol, // week block on X axis
          y: dayRow,  // day index on Y axis
          count
        });
      }
      return listCoords;
    };

    return {
      user,
      tasks,
      approvedCount,
      pendingCount,
      rejectedCount,
      intensityMatrix: contributionIntensityPoints()
    };
  }, [sboData, activeUserId]);

  const [activeTab, setActiveTab] = useState<"profile" | "reviews" | "sharing" | "media" | "withdrawals">("profile");

  // Native History Navigation Integration for Overlays
  const pushModalState = () => {
    window.history.pushState({ isSboModal: true }, "", window.location.pathname);
  };

  const closeCurrentModal = () => {
    window.history.back();
  };

  useEffect(() => {
    // Initial root history state mapping
    window.history.replaceState({ isSboRoot: true }, "", window.location.pathname);

    const handlePopState = () => {
      // Topmost priority logic to securely close nested overlays individually based on mobile device back action
      if (aiOpen) {
        setAiOpen(false);
      } else if (taskOverlay.isOpen) {
        setTaskOverlay({ isOpen: false, type: null });
      } else if (userOverlay.isOpen) {
        setUserOverlay({ isOpen: false, type: null });
      } else if (activeUserId) {
        setActiveUserId(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [aiOpen, taskOverlay.isOpen, userOverlay.isOpen, activeUserId]);

  // Fetch or view loading sequence
  if (loading || sboData === null) {
    return <BootSequencer onSkip={() => setBootComplete(true)} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 px-4 text-center select-none font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800 text-white p-8 rounded-2xl shadow-2xl border border-red-500/20 max-w-md w-full"
        >
          <TriangleAlert className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold tracking-tight mb-2">Clearance Authorization Interrupted</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-sm font-semibold hover:bg-blue-500 text-white py-3 px-4 rounded-xl transition-all shadow-md shadow-blue-900/40"
          >
            Reconnect Terminal
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 transition-colors duration-300">
      
      {/* GLOBAL BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-50 z-0"></div>

      {/* Dynamic Toast Notification */}
      <AnimatePresence>
        {notify && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 left-6 z-[999] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border ${
              notify.type === "success" 
                ? "bg-slate-900 border-emerald-500/30 text-emerald-400" 
                : "bg-slate-900 border-red-500/30 text-red-400"
            }`}
          >
            {notify.type === "success" ? (
              <CircleCheckBig className="w-5 h-5 text-emerald-500 flex-shrink-0 animate-bounce" />
            ) : (
              <CircleX className="w-5 h-5 text-red-500 flex-shrink-0 animate-pulse" />
            )}
            <div className="text-sm font-medium pr-2 text-slate-100">{notify.message}</div>
            <button onClick={() => setNotify(null)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer text-xs font-bold font-mono">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Live Update Notification Bubble */}
      <div className="fixed bottom-6 left-6 z-[990] pointer-events-none">
        <AnimatePresence>
          {liveUpdates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              className="bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl border border-indigo-500/30 backdrop-blur-md pointer-events-auto flex items-center gap-3"
            >
              <div className="relative">
                <Bell className="w-5 h-5 text-indigo-400" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
              </div>
              <p className="text-sm font-medium">{liveUpdates[0].message}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Live Update Feed (Hidden from UI based on new requirement) */}
      <div className="fixed top-6 right-6 z-[990] flex flex-col gap-2 pointer-events-none hidden">
        <AnimatePresence>
          {liveUpdates.map(update => (
            <motion.div
              key={update.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="bg-indigo-900/90 text-white px-4 py-2 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 backdrop-blur-sm pointer-events-auto border border-indigo-500/30"
            >
              <Activity className="w-3 h-3 text-indigo-400 animate-pulse" />
              {update.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* AI Bot Launcher */}
      <AnimatePresence>
        {!aiOpen && (
          <motion.button
            initial={{ scale: 0, boxShadow: "none" }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { pushModalState(); setAiOpen(true); }}
            className="fixed bottom-6 right-6 z-40 bg-gradient-to-tr from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white p-4 rounded-full shadow-[0_12px_24px_rgba(79,70,229,0.35),_0_4px_8px_rgba(0,0,0,0.1),_inset_0_2px_4px_rgba(255,255,255,0.4)] border border-indigo-400/50 flex items-center gap-2 font-bold select-none cursor-pointer"
          >
            <Bot className="w-6 h-6 animate-pulse" />
            <span className="hidden sm:inline-block pr-1 text-sm tracking-wide">Ask AI Assistant</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* AI Assistant Chat side-drawer */}
      <AnimatePresence>
        {aiOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
            {/* Overlay background block to close chat */}
            <div className="absolute inset-0 bg-transparent pointer-events-auto" onClick={closeCurrentModal}></div>
            <motion.div
              initial={{ x: "100%", opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[#efeae2] shadow-2xl border-l border-slate-200 pointer-events-auto flex flex-col z-[60]"
            >
              <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-inner relative">
                    <Bot className="w-5 h-5 text-white" />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-slate-900 rounded-full animate-ping"></span>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full"></span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight text-white">SBO AI Assistant</h3>
                    <p className="text-[10px] text-green-400 font-semibold tracking-wide">Connected • Database Concierge</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                    className={`p-2 hover:bg-slate-800 rounded-full transition-colors cursor-pointer ${isAudioEnabled ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white"}`}
                    title={isAudioEnabled ? "Disable Voice" : "Enable Voice"}
                  >
                    {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  {aiMessages.length > 1 && (
                    <button
                      onClick={() => setAiMessages([aiMessages[0]])}
                      className="text-[11px] font-bold text-indigo-300 hover:text-white px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      title="Clear history"
                    >
                      <RefreshCw className="w-3 h-3 animate-spin-slow" />
                      <span>Reset</span>
                    </button>
                  )}
                  <button
                    onClick={closeCurrentModal}
                    className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat Message Box */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-4"
                style={{ backgroundImage: `url('https://transparenttextures.com/patterns/cubes.png')` }}
              >
                {aiMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm leading-relaxed overflow-hidden ${
                        msg.role === "user"
                          ? "bg-emerald-100 text-slate-900 rounded-tr-none border border-emerald-200"
                          : "bg-white text-slate-900 rounded-tl-none border border-slate-200"
                      }`}
                    >
                      {msg.role === "model" ? (
                        <div className="prose prose-sm prose-slate max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}
                    </div>
                  </div>
                ))}

                {aiMessages.length === 1 && (
                  <div className="pt-2 pb-4 space-y-2">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Suggested queries:</p>
                    <div className="flex flex-col gap-2">
                      {[
                        "Yaruku balance athigama iruku?",
                        "SBOAFP3350 nominee rathinam yaaru?",
                        "Review tasks summary check pannu",
                        "Brief overview of SBOAFP2209"
                      ].map((promptText, promptIdx) => (
                        <button
                          key={promptIdx}
                          onClick={() => {
                            setAiInput(promptText);
                          }}
                          className="w-full text-left bg-white hover:bg-slate-50 text-xs text-indigo-700 font-semibold px-3 py-2 rounded-xl border border-indigo-100 hover:border-indigo-300 transition-all shadow-sm flex items-center justify-between cursor-pointer group"
                        >
                          <span>{promptText}</span>
                          <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Select &rarr;</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {aiTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl rounded-tl-none border border-slate-200 px-4 py-3 shadow-sm flex items-center gap-2">
                      <LoaderCircle className="w-4 h-4 text-indigo-500 animate-spin" />
                      <span className="text-xs text-slate-500 font-medium">SBO logic processing...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input section */}
              {imageBase64 && (
                <div className="px-4 py-3 bg-slate-100 border-t border-slate-200 flex items-center">
                  <div className="relative inline-block border-2 border-slate-300 rounded-lg shadow-sm">
                    <img src={imageBase64} className="w-14 h-14 object-cover rounded-md" />
                    <button onClick={() => setImageBase64(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-0.5 rounded-full shadow cursor-pointer hover:bg-red-600 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-end gap-2">
                <input
                  type="file"
                  id="ai-attach"
                  hidden
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = ev => setImageBase64(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label
                  htmlFor="ai-attach"
                  className="w-11 h-11 bg-white border border-slate-300 rounded-full flex items-center justify-center flex-shrink-0 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm cursor-pointer"
                  title="Upload Image for Vision"
                >
                  <Paperclip className="w-5 h-5" />
                </label>
                <textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendAIMessage();
                    }
                  }}
                  placeholder="Ask and locate data..."
                  className="flex-1 max-h-24 min-h-[44px] bg-white rounded-xl px-4 py-3 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-inner text-slate-800"
                  rows={1}
                />
                <button
                  onClick={sendAIMessage}
                  disabled={!aiInput.trim() || aiTyping}
                  className="w-11 h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:bg-slate-400 transition-colors shadow-md cursor-pointer"
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Task overlay list Modal */}
      <AnimatePresence>
        {taskOverlay.isOpen && taskOverlay.type && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className={`px-6 py-4 flex items-center justify-between text-white ${
                taskOverlay.type === "Approved" ? "bg-emerald-600" : taskOverlay.type === "Pending" ? "bg-amber-500" : "bg-red-500"
              }`}>
                <h3 className="font-bold text-lg tracking-wide uppercase">
                  Global {taskOverlay.type} Records ({listTasksForOverlay.length})
                </h3>
                <button
                  onClick={closeCurrentModal}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-slate-50">
                {listTasksForOverlay.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-medium">No records found.</div>
                ) : (
                  listTasksForOverlay.map((task, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white hover:shadow-md transition-shadow ${
                        taskOverlay.type === "Approved" ? "border-emerald-100 hover:border-emerald-300" : taskOverlay.type === "Pending" ? "border-amber-100 hover:border-amber-300" : "border-red-100 hover:border-red-300"
                      }`}
                    >
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {task.sourceType}
                          </span>
                          <span className="text-xs text-slate-500 font-mono font-medium">{task.originalDate}</span>
                        </div>
                        <h4 className="font-semibold text-slate-800 text-sm truncate">{task.description}</h4>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Staff Owner: <span className="font-semibold text-slate-700">{task.user}</span></span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex md:block items-center justify-between pt-3 md:pt-0 border-t md:border-0 border-slate-100">
                        <div className="text-lg font-bold text-slate-900 text-left md:text-right">{task.amount}</div>
                        <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded inline-block mt-1 ${
                          taskOverlay.type === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : taskOverlay.type === "Pending" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global general User count lists Overlay */}
      <AnimatePresence>
        {userOverlay.isOpen && userOverlay.type && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className={`px-6 py-4 flex items-center justify-between text-white ${
                userOverlay.type === "Net Credited" ? "bg-amber-600" : userOverlay.type === "Task Earnings" ? "bg-blue-600" : userOverlay.type === "Affiliate Balance" ? "bg-emerald-600" : "bg-slate-800"
              }`}>
                <h3 className="font-bold text-lg tracking-wide uppercase">
                  Global staff directory ordered by: {userOverlay.type} ({listUsersForOverlay.length})
                </h3>
                <button
                  onClick={closeCurrentModal}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 bg-slate-50">
                {listUsersForOverlay.map((u, i) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      setUserOverlay({ isOpen: false, type: null });
                      setActiveUserId(u.id);
                      setActiveTab("profile");
                    }}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-blue-400 group transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="w-7 h-7 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 group-hover:underline truncate">{u.name}</h4>
                        <span className="text-xs font-mono text-slate-400">{u.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <span className={`text-base font-bold ${
                          userOverlay.type === "Net Credited" ? "text-amber-600" : userOverlay.type === "Task Earnings" ? "text-blue-600" : "text-emerald-600"
                        }`}>
                          {userOverlay.type === "Net Credited" ? `₹${u.credited.toLocaleString()}` : userOverlay.type === "Task Earnings" ? `₹${u.task.toLocaleString()}` : userOverlay.type === "Affiliate Balance" ? `₹${u.affiliate.toLocaleString()}` : "Active"}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="relative z-10">
        
        {/* VIEW CONDITIONAL: Overview Dashboard vs User Detail Deep dive */}
        {activeUserId && activeUserData ? (() => {
          const c = activeUserData.user["📝 Content Review History"] ? Object.entries(activeUserData.user["📝 Content Review History"]) : [];
          const d = activeUserData.user["🔗 Content Sharing History"] ? Object.entries(activeUserData.user["🔗 Content Sharing History"]) : [];
          const h = activeUserData.user["🚀 Media Booster History"] ? Object.entries(activeUserData.user["🚀 Media Booster History"]) : [];
          const m = activeUserData.user["📋 Withdrawal History"] ? Object.entries(activeUserData.user["📋 Withdrawal History"]) : [];
          const j = [
            { id: "profile", label: "Identity & Info", icon: <User className="w-5 h-5" /> },
            { id: "reviews", label: "Reviews", count: c.length, icon: <FileText className="w-5 h-5" /> },
            { id: "sharing", label: "Sharing", count: d.length, icon: <Send className="w-5 h-5" /> },
            { id: "media", label: "Media", count: h.length, icon: <Video className="w-5 h-5" /> },
            { id: "withdrawals", label: "Withdrawals", count: m.length, icon: <Wallet className="w-5 h-5" /> }
          ];

          return (
            /* VIEW 1: STAFF MEMBER DETAIL DEEP DIVE */
            <div className="max-w-7xl mx-auto p-4 sm:p-8">
            
            {/* Nav Header breadcrumb */}
            <motion.button
              whileHover={{ x: -2 }}
              onClick={closeCurrentModal}
              className="mt-2 mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors cursor-pointer select-none"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Global Directory Dashboard</span>
            </motion.button>

            {/* Profile Overview Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 bg-gradient-to-br from-white to-slate-50 mb-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-black text-blue-600 shadow-md border-[4px] border-white ring-1 ring-slate-100 flex-shrink-0">
                  {activeUserData.user["👤 Profile"]?.Name?.charAt(0) || "U"}
                </div>
                
                <div className="flex-1 text-center md:text-left min-w-0">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">{activeUserData.user["👤 Profile"]?.Name || "Anonymous Staff"}</h1>
                  <p className="text-sm font-mono text-slate-400 mb-4">{activeUserId}</p>
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    <span className="px-3 py-1 bg-slate-100 border border-slate-200 font-mono text-xs rounded-lg text-slate-600 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>BuyMote ID: <span className="font-semibold">{activeUserData.user["👤 Profile"]?.["BuyMote ID"] || "N/A"}</span></span>
                    </span>
                    {activeUserData.user["🏆 Last Task"]?.Timestamp && (
                      <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 font-medium text-xs rounded-lg text-emerald-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                        <span>Latest Task Type: <span className="font-bold">{activeUserData.user["🏆 Last Task"].Type}</span></span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-4 w-full md:w-auto">
                  <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center md:text-right min-w-[140px]">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Total Credited</div>
                    <div className="text-2xl font-black text-slate-900">₹{activeUserData.user["💰 Wallets"]?.["Total Credited"] || "0"}</div>
                  </div>
                  <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center md:text-right min-w-[140px]">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Affiliate Balance</div>
                    <div className="text-2xl font-black text-emerald-600">₹{activeUserData.user["💰 Wallets"]?.["Affiliate Balance"] || "0"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Micro counters for user specific review results */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Verified Tasks</div>
                  <h4 className="text-2xl font-extrabold text-emerald-600">{activeUserData.approvedCount}</h4>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-500 rounded-lg">
                  <CircleCheckBig className="w-5 h-5" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Pending Review</div>
                  <h4 className="text-2xl font-extrabold text-amber-500">{activeUserData.pendingCount}</h4>
                </div>
                <div className="p-3 bg-amber-50 text-amber-500 rounded-lg">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Rejected Tasks</div>
                  <h4 className="text-2xl font-extrabold text-red-500">{activeUserData.rejectedCount}</h4>
                </div>
                <div className="p-3 bg-red-50 text-red-500 rounded-lg">
                  <Ban className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Calendar Heatmap Intensity grid */}
            {activeUserData.intensityMatrix.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                      <Activity className="w-4 h-4 text-blue-500" />
                      <span>Activity Heatmap Matrix</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Individual task submission frequencies over the last 30 active days</p>
                  </div>
                  
                  {/* Legend guide */}
                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                    <span className="uppercase tracking-wider">Less</span>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-200"></span>
                      <span className="w-2.5 h-2.5 rounded bg-blue-200"></span>
                      <span className="w-2.5 h-2.5 rounded bg-blue-400"></span>
                      <span className="w-2.5 h-2.5 rounded bg-blue-600"></span>
                      <span className="w-2.5 h-2.5 rounded bg-indigo-900"></span>
                    </div>
                    <span className="uppercase tracking-wider">More</span>
                  </div>
                </div>

                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <XAxis type="number" dataKey="x" tick={false} axisLine={false} tickLine={false} domain={[-0.5, 4.5]} />
                      <YAxis type="number" dataKey="y" tick={false} axisLine={false} tickLine={false} domain={[-0.5, 6.5]} reversed />
                      <Tooltip
                        cursor={false}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white px-3 py-2 rounded-xl border border-slate-700 shadow-xl text-xs font-medium">
                                <p className="font-bold mb-0.5">{data.label}</p>
                                <p className="text-slate-300">{data.count} tasks verified</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter data={activeUserData.intensityMatrix} shape={<GridUnit />}>
                        {activeUserData.intensityMatrix.map((pt, i) => {
                          let color = "#e2e8f0"; // Less
                          if (pt.count > 0) {
                            if (pt.count < 3) color = "#bfdbfe";
                            else if (pt.count < 6) color = "#60a5fa";
                            else if (pt.count < 10) color = "#2563eb";
                            else color = "#1e3a8a"; // More
                          }
                          return <Cell key={i} fill={color} />;
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Profile Tab Section Row */}
            <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 mb-6 p-1 overflow-x-auto no-scrollbar select-none">
              {j.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 whitespace-nowrap px-5 py-3 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {"count" in tab && tab.count !== undefined && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab rendering space */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
              
              {/* TAB 1: IDENTITY & INFORMATION SECTION */}
              {activeTab === "profile" && (
                <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {/* Category 1: Contact info */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-500" />
                      <span>Contact Profile Link</span>
                    </h3>
                    <div className="space-y-1">
                      <AnnyItem icon={<Mail className="w-4 h-4" />} label="E-mail Address" value={activeUserData.user["👤 Profile"]?.Email} isLink href={`mailto:${activeUserData.user["👤 Profile"]?.Email}`} />
                      <AnnyItem icon={<Phone className="w-4 h-4" />} label="Calling Number" value={activeUserData.user["👤 Profile"]?.Phone} isLink href={`tel:${activeUserData.user["👤 Profile"]?.Phone}`} />
                      <AnnyItem
                        icon={<Users className="w-4 h-4 text-emerald-500" />}
                        label="WhatsApp Messenger"
                        value={activeUserData.user["👤 Profile"]?.WhatsApp}
                        isLink
                        href={getWhatsAppLink(activeUserData.user["👤 Profile"]?.WhatsApp || "", activeUserData.user["👤 Profile"]?.Name || "")}
                      />
                      <AnnyItem icon={<Clock className="w-4 h-4" />} label="Date of Birth" value={activeUserData.user["👤 Profile"]?.["Date of Birth"]} />
                      <AnnyItem icon={<MapPin className="w-4 h-4" />} label="Address Location" value={activeUserData.user["👤 Profile"]?.Address} />
                    </div>
                  </div>

                  {/* Category 2: Banking KYC */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-amber-500" />
                      <span>Banking & Financial KYC</span>
                    </h3>
                    <div className="space-y-1">
                      <AnnyItem icon={<Landmark className="w-4 h-4" />} label="Bank Name" value={activeUserData.user["🏦 Bank & PAN"]?.["Bank Name"]} />
                      <AnnyItem icon={<User className="w-4 h-4" />} label="Account Holder" value={activeUserData.user["🏦 Bank & PAN"]?.["Account Holder"]} />
                      <AnnyItem icon={<FileText className="w-4 h-4" />} label="Account Number" value={activeUserData.user["🏦 Bank & PAN"]?.["Account Number"]} />
                      <AnnyItem icon={<Award className="w-4 h-4" />} label="IFSC Code" value={activeUserData.user["🏦 Bank & PAN"]?.["IFSC Code"]} />
                      <AnnyItem icon={<MapPin className="w-4 h-4" />} label="Branch Name" value={activeUserData.user["🏦 Bank & PAN"]?.Branch} />
                      <AnnyItem icon={<FileText className="w-4 h-4 text-slate-500" />} label="PAN Number Card" value={activeUserData.user["🏦 Bank & PAN"]?.["PAN Number"]} />
                    </div>
                  </div>

                  {/* Category 3: Nominee info */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-500" />
                      <span>Authorized Nominee Records</span>
                    </h3>
                    <div className="space-y-1">
                      <AnnyItem icon={<User className="w-4 h-4" />} label="Nominee Name" value={activeUserData.user["👥 Nominee"]?.["Nominee Name"]} />
                      <AnnyItem icon={<Mail className="w-4 h-4" />} label="Nominee Email" value={activeUserData.user["👥 Nominee"]?.["Nominee Email"]} isLink href={`mailto:${activeUserData.user["👥 Nominee"]?.["Nominee Email"]}`} />
                      <AnnyItem icon={<Phone className="w-4 h-4" />} label="Nominee Phone" value={activeUserData.user["👥 Nominee"]?.["Nominee Phone"]} isLink href={`tel:${activeUserData.user["👥 Nominee"]?.["Nominee Phone"]}`} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONTENT REVIEW LOGS */}
              {activeTab === "reviews" && (
                <KanbanBoard 
                   items={c} 
                   category="📝 Content Review History" 
                   emptyMessage="No review tasks logged for this staff." 
                   onVerifyTask={(taskKey: string, newStatus: string, amount: string) => verifyTask(activeUserId, "📝 Content Review History", taskKey, newStatus, amount)}
                />
              )}

              {/* TAB 3: SOCIAL SHARING LOGS */}
              {activeTab === "sharing" && (
                <KanbanBoard 
                   items={d} 
                   category="🔗 Content Sharing History" 
                   emptyMessage="No social content sharing logged for this staff." 
                   onVerifyTask={(taskKey: string, newStatus: string, amount: string) => verifyTask(activeUserId, "🔗 Content Sharing History", taskKey, newStatus, amount)}
                />
              )}

              {/* TAB 4: MEDIA BOOSTER LOGS */}
              {activeTab === "media" && (
                <KanbanBoard 
                   items={h} 
                   category="🚀 Media Booster History" 
                   emptyMessage="No media booster records logged for this staff." 
                   onVerifyTask={(taskKey: string, newStatus: string, amount: string) => verifyTask(activeUserId, "🚀 Media Booster History", taskKey, newStatus, amount)}
                />
              )}

              {/* TAB 5: WITHDRAWAL REQUESTS */}
              {activeTab === "withdrawals" && (
                <KanbanBoard 
                   items={m} 
                   category="📋 Withdrawal History" 
                   emptyMessage="No withdrawal histories found for this staff." 
                   onVerifyTask={(taskKey: string, newStatus: string, amount: string) => verifyTask(activeUserId, "📋 Withdrawal History", taskKey, newStatus, amount)}
                />
              )}

            </div>
          </div>
          );
        })() : (
          
          /* VIEW 2: GLOBAL DIRECTORY AND ADMIN HUB OVERVIEW */
          <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
            
            {/* Header section with pulsating live active banner */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4 border-b border-slate-200">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">SBO Administrator Hub</h1>
                <p className="text-slate-500 text-sm mt-1">
                  Pristine database management center mapping real-time staff ledgers, tasks and wallet credits.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Theme Controller button */}
                <button
                  onClick={() => setTheme(prev => prev === "light" ? "terminal" : "light")}
                  className="p-2 border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-colors bg-white shadow-sm flex items-center gap-2 text-slate-500 font-semibold text-xs select-none cursor-pointer"
                >
                  {theme === "light" ? (
                    <>
                      <Moon className="w-4 h-4 text-indigo-500" />
                      <span>Terminal Theme</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Classic Theme</span>
                    </>
                  )}
                </button>

                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-200 shadow-sm leading-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                  <span className="text-xs font-bold uppercase tracking-wider">Live System Active</span>
                </div>
              </div>
            </header>

            {/* Quick status overlays controller cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <motion.div
                whileHover={{ y: -3, scale: 1.01 }}
                onClick={() => { pushModalState(); setTaskOverlay({ isOpen: true, type: "Approved" }); }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all group"
              >
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-600 mb-1 transition-colors">Approved Tasks</h4>
                  <p className="text-3xl font-black text-emerald-600">{statistics?.totalApproved || 0}</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">Completed & Invoiced</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 text-emerald-500 border border-emerald-100 group-hover:scale-105 transition-transform flex-shrink-0">
                  <CircleCheckBig className="w-8 h-8" />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -3, scale: 1.01 }}
                onClick={() => { pushModalState(); setTaskOverlay({ isOpen: true, type: "Pending" }); }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-amber-300 transition-all group"
              >
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-amber-600 mb-1 transition-colors">Pending Tasks</h4>
                  <p className="text-3xl font-black text-amber-500">{statistics?.totalPending || 0}</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">Awaiting Review Queue</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 text-amber-500 border border-amber-100 group-hover:scale-105 transition-transform flex-shrink-0">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -3, scale: 1.01 }}
                onClick={() => { pushModalState(); setTaskOverlay({ isOpen: true, type: "Rejected" }); }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-red-300 transition-all group"
              >
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-red-500 mb-1 transition-colors">Rejected Tasks</h4>
                  <p className="text-3xl font-black text-red-500">{statistics?.totalRejected || 0}</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">Requires Support Intervention</p>
                </div>
                <div className="p-4 rounded-xl bg-red-50 text-red-500 border border-red-100 group-hover:scale-105 transition-transform flex-shrink-0">
                  <Ban className="w-8 h-8" />
                </div>
              </motion.div>
            </div>

            {/* Financial Ledger aggregate summary widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <LedgerCard
                title="Active Directory Count"
                value={statistics?.chartData.length || 0}
                metric="Staff Members"
                icon={<Users className="w-5 h-5 text-blue-600" />}
                badgeColor="bg-blue-50 text-blue-700 border-blue-100"
                hoverBorder="hover:border-blue-300 hover:shadow-blue-100"
                onClick={() => { pushModalState(); setUserOverlay({ isOpen: true, type: "Staff Members" }); }}
              />

              <LedgerCard
                title="Affiliate Balance Pot"
                value={`₹${statistics?.affiliate.toLocaleString() || "0"}`}
                metric="Combined Referral"
                icon={<Wallet className="w-5 h-5 text-emerald-600" />}
                badgeColor="bg-emerald-50 text-emerald-700 border-emerald-100"
                hoverBorder="hover:border-emerald-300 hover:shadow-emerald-100"
                onClick={() => { pushModalState(); setUserOverlay({ isOpen: true, type: "Affiliate Balance" }); }}
              />

              <LedgerCard
                title="Staff Earned Commission"
                value={`₹${statistics?.task.toLocaleString() || "0"}`}
                metric="Task Submissions"
                icon={<Activity className="w-5 h-5 text-purple-600" />}
                badgeColor="bg-purple-50 text-purple-700 border-purple-100"
                hoverBorder="hover:border-purple-300 hover:shadow-purple-100"
                onClick={() => { pushModalState(); setUserOverlay({ isOpen: true, type: "Task Earnings" }); }}
              />

              <LedgerCard
                title="Total Net Credited"
                value={`₹${statistics?.credited.toLocaleString() || "0"}`}
                metric="Disbursed Banking"
                icon={<Landmark className="w-5 h-5 text-amber-600" />}
                badgeColor="bg-amber-50 text-amber-700 border-amber-100"
                hoverBorder="hover:border-amber-300 hover:shadow-amber-100"
                onClick={() => { pushModalState(); setUserOverlay({ isOpen: true, type: "Net Credited" }); }}
              />

            </div>

            {/* Leadership tables cards column */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <LeaderboardBox
                title="Top Affiliates"
                list={statistics?.topAffiliates || []}
                metricKey="affiliate"
                themeColor="text-emerald-600"
                badgeStyle="bg-emerald-50 text-emerald-700"
                onSelectUser={setActiveUserId}
              />

              <LeaderboardBox
                title="Top Task Earners"
                list={statistics?.topTaskEarners || []}
                metricKey="task"
                themeColor="text-blue-600"
                badgeStyle="bg-blue-50 text-blue-700"
                onSelectUser={setActiveUserId}
              />

              <LeaderboardBox
                title="Top Credited"
                list={statistics?.topCredited || []}
                metricKey="credited"
                themeColor="text-slate-900"
                badgeStyle="bg-slate-100 text-slate-700"
                onSelectUser={setActiveUserId}
              />

              <LeaderboardBox
                title="Top Withdrawal Requesters"
                list={statistics?.topWithdrawals || []}
                metricKey="withdrawalCount"
                suffix=" requests"
                themeColor="text-purple-600"
                badgeStyle="bg-purple-50 text-purple-700"
                onSelectUser={setActiveUserId}
              />

            </div>

            {/* Wallet Analytics & Fleet Management Full Width Inject */}
            <div className="mt-12 border-t border-slate-200 pt-8" id="fleet-analytics">
              <div className="flex flex-col xl:flex-row gap-8">
                <div className="w-full xl:w-80 flex-shrink-0">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sticky top-6 max-h-[85vh] flex flex-col">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4" /> User Filter UI
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      <button 
                        onClick={() => setSelectedUsers(new Set(Object.keys(sboData || {})))}
                        className="text-xs font-semibold px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors w-full cursor-pointer">
                        Select All
                      </button>
                      <button 
                        onClick={() => setSelectedUsers(new Set())}
                        className="text-xs font-semibold px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors w-full cursor-pointer">
                        Clear All
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                       {Object.entries(sboData || {}).map(([id, val]: any) => (
                         <label key={id} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                           <input type="checkbox" checked={selectedUsers.has(id)} onChange={(e) => {
                              const newSet = new Set(selectedUsers);
                              if (e.target.checked) newSet.add(id); else newSet.delete(id);
                              setSelectedUsers(newSet);
                           }} className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"/>
                           <div className="min-w-0 flex-1">
                             <div className="text-sm font-bold text-slate-700 truncate">{val["👤 Profile"]?.Name || id}</div>
                             <div className="text-[10px] font-mono text-slate-400 truncate">{id}</div>
                           </div>
                         </label>
                       ))}
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-6">
                  {/* Sticky Header with Dynamic Grand Total */}
                  <div className="sticky top-6 z-20 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-500/20 p-6 sm:p-8 flex flex-col xl:flex-row xl:items-center justify-between border border-indigo-400/50 backdrop-blur-md gap-4">
                    <div>
                       <h2 className="text-sm uppercase tracking-widest font-bold text-indigo-200 mb-1 flex items-center gap-2">
                         <Wallet className="w-5 h-5" /> Calculated Grand Total
                       </h2>
                       <p className="text-xs text-indigo-300 font-medium mb-3 xl:mb-0">Automatic 20% aggregate deduction based on User Filter UI</p>
                       <button
                         onClick={exportToPDF}
                         className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white text-indigo-600 px-3 py-1.5 rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all w-fit cursor-pointer"
                       >
                         <FileText className="w-3.5 h-3.5" /> Download Report
                       </button>
                    </div>
                    <div className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight drop-shadow-sm flex-shrink-0">
                       ₹{grandTotalCalculated.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Wallet Cards Response grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     {fleetCards.length > 0 ? fleetCards : (
                       <div className="col-span-full py-16 text-center content-center text-slate-500 bg-white rounded-2xl border-2 border-slate-200 border-dashed">
                         <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                         <p className="font-semibold text-slate-600">No users selected</p>
                         <p className="text-sm">Tick the boxes on the left to analyze fleet wallets.</p>
                       </div>
                     )}
                  </div>
                </div>
              </div>
            </div>

            {/* Horizontal analytics bar breakdown chart */}
            {statistics && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <TrendingUp className="text-indigo-500 w-5 h-5" />
                    <span>Top Earners Comparative Breakdown</span>
                  </h3>
                  <p className="text-sm text-slate-500">
                    A responsive horizontal breakdown of Affiliate Balance vs Task Earnings across SBO staff registry. Click any bar to deep dive.
                  </p>
                </div>

                <div className="w-full overflow-x-auto">
                  <div style={{ height: Math.max(450, statistics.chartData.length * 40) }} className="min-w-[600px] pr-2 chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={[...statistics.chartData].sort((a, b) => b.totalEarnings - a.totalEarnings)}
                        margin={{ top: 0, right: 30, bottom: 0, left: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" tickFormatter={val => `₹${val}`} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} width={120} tick={{ fontWeight: 600 }} />
                        <RechartsTooltip
                          cursor={{ fill: "#f8fafc" }}
                          contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0; 0; 0; / 0.1)" }}
                          formatter={(value: any, name: string) => [`₹${value.toLocaleString()}`, name === "affiliate" ? "Affiliate Balance" : "Task Earned"]}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                        <Bar
                          dataKey="affiliate"
                          stackId="a"
                          fill="#10b981"
                          name="Affiliate Balance"
                          maxBarSize={28}
                          onClick={pt => { if(pt && pt.id) { pushModalState(); setActiveUserId(pt.id); setActiveTab("profile"); } }}
                          className="cursor-pointer hover:opacity-85 transition-opacity"
                        />
                        <Bar
                          dataKey="task"
                          stackId="a"
                          fill="#3b82f6"
                          name="Task Earned"
                          radius={[0, 4, 4, 0]}
                          maxBarSize={28}
                          onClick={pt => { if(pt && pt.id) { pushModalState(); setActiveUserId(pt.id); setActiveTab("profile"); } }}
                          className="cursor-pointer hover:opacity-85 transition-opacity"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Dense, responsive Staff Directory table database with comprehensive search */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Detailed Staff Registry Directory</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Filter, search, or select any ledger index to view staff deep-dive records.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search staff Name or ID..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium rounded-lg placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                  </div>

                  <div className="bg-slate-100 border border-slate-200 p-0.5 rounded-lg flex shadow-inner gap-0.5 text-xs font-bold text-slate-500 self-start sm:self-auto select-none">
                    <button
                      onClick={() => setStatusFilter("All")}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${statusFilter === "All" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "hover:text-slate-700"}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStatusFilter("Staff")}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${statusFilter === "Staff" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "hover:text-slate-700"}`}
                    >
                      VDPN
                    </button>
                    <button
                      onClick={() => setStatusFilter("Affiliates")}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${statusFilter === "Affiliates" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "hover:text-slate-700"}`}
                    >
                      AFP
                    </button>
                  </div>
                </div>
              </div>

              {/* Data directory Table view */}
              <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                <table className="w-full text-left border-collapse relative">
                  <thead className="sticky top-0 bg-slate-50 shadow-sm border-b border-slate-200 z-10">
                    <tr className="text-slate-600 text-[10px] uppercase font-bold tracking-widest leading-none">
                      <th className="px-6 py-4">SBO Staff ID</th>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4 text-right">Affiliate Balance</th>
                      <th className="px-6 py-4 text-right">Task Earned</th>
                      <th className="px-6 py-4 text-right">Total Credited</th>
                      <th className="px-6 py-4">Last Logged Action</th>
                      <th className="px-6 py-4 text-right">Ledger Options</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {statistics?.chartData
                      .filter(u => u.name.toLowerCase().includes(deferredSearch.toLowerCase()) || u.id.toLowerCase().includes(deferredSearch.toLowerCase()))
                      .map((u) => (
                        <tr
                          key={u.id}
                          onClick={() => { pushModalState(); setActiveUserId(u.id); setActiveTab("profile"); }}
                          className="hover:bg-blue-50/70 cursor-pointer group transition-colors"
                        >
                          <td className="px-6 py-4 font-mono text-xs text-blue-600 group-hover:underline">{u.id}</td>
                          <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-blue-700 group-hover:underline">{u.name}</td>
                          <td className="px-6 py-4 text-right font-semibold text-emerald-600">₹{u.affiliate.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-semibold text-blue-600">₹{u.task.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-800">₹{u.credited.toLocaleString()}</td>
                          <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate max-w-[140px] inline-block font-mono font-medium">{u.lastLogin}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-blue-600 hover:text-blue-800 font-bold hover:underline inline-flex items-center gap-1 text-xs">
                              <span>Detail Ledger</span>
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

// Sub-components designed with strict scope modular architecture
function GridUnit(props: any) {
  const { cx, cy, fill } = props;
  const size = 16;
  return (
    <rect
      x={cx - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      fill={fill}
      rx={4}
      ry={4}
      className="transition-all duration-150 hover:opacity-85 cursor-pointer"
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
  const s = status.toLowerCase();
  
  if (s.includes("pending")) {
    return <span className="bg-amber-100 border border-amber-200 text-amber-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Pending</span>;
  }
  if (s.includes("success") || s.includes("approved") || s.includes("sent")) {
    return <span className="bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">{status}</span>;
  }
  if (s.includes("reject") || s.includes("fail") || s.includes("cancel")) {
    return <span className="bg-red-100 border border-red-200 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">{status}</span>;
  }
  return <span className="bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">{status}</span>;
}

function LedgerCard({ title, value, metric, icon, badgeColor, hoverBorder, onClick }: any) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      onClick={onClick}
      className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between gap-4 cursor-pointer group transition-all ${hoverBorder}`}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className={`p-3 rounded-xl bg-slate-50 border border-slate-100 group-hover:scale-105 transition-transform flex-shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors uppercase tracking-widest mb-1 truncate">{title}</p>
          <div className="flex items-baseline gap-2 flex-wrap min-w-0">
            <h3 className="text-2xl font-black text-slate-900 truncate">{value}</h3>
            {metric && (
              <span className={`text-[9px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-full border leading-tight ${badgeColor}`}>
                {metric}
              </span>
            )}
          </div>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
    </motion.div>
  );
}

function LeaderboardBox({ title, list, metricKey, suffix = "", themeColor, badgeStyle, onSelectUser }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between min-h-[300px]">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5 pb-2 border-b border-slate-100">
          <Award className="w-4 h-4 text-indigo-500" />
          <span>{title}</span>
        </h4>
        <div className="space-y-4">
          {list.map((u: any, idx: number) => (
            <div
              key={u.id}
              onClick={() => onSelectUser(u.id)}
              className="flex items-center justify-between cursor-pointer group gap-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
                  idx === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {idx + 1}
                </span>
                <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 group-hover:underline truncate">
                  {u.name}
                </span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border border-black/5 font-mono flex-shrink-0 ${themeColor} ${badgeStyle}`}>
                {typeof u[metricKey] === "number" && metricKey !== "withdrawalCount" ? `₹${u[metricKey].toLocaleString()}` : `${u[metricKey]}${suffix}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnnyItem({ icon, label, value, mono, isLink, href }: { icon: React.ReactNode; label: string; value: string; mono?: boolean; isLink?: boolean; href?: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 px-2 rounded-lg transition-colors group">
      <div className="text-slate-400 mt-0.5 group-hover:text-blue-500 transition-colors flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-grow">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 leading-none">{label}</div>
        {isLink && value ? (
          <a href={href} className={`text-sm text-blue-600 hover:text-blue-800 hover:underline break-all font-semibold leading-normal ${mono ? "font-mono" : ""}`}>
            {value}
          </a>
        ) : (
          <p className={`text-sm text-slate-800 font-semibold leading-normal break-words ${mono ? "font-mono" : ""}`}>{value || "N/A"}</p>
        )}
      </div>
    </div>
  );
}

const BOOT_LOGS = [
  "LAUNCHING SBO SECURE LINK PROTOCOL...",
  "ESTABLISHING 256-BIT CRYPTO END-TO-END UPLINK...",
  "LOCATING ACTIVE SBO REALTIME CLUSTERS...",
  "SYNCING INTENSITY CONTRIBUTIONS HEATMAP METRICS...",
  "PARSING REVIEWS SHEETS & AFFILIATE TRANSACTION LEDGERS...",
  "DECRYPTING SECURE PIN IDENTITIES FOR KYC VERIFICATION...",
  "AUTHENTICATING SBO ADMINISTRATOR CREDENTIALS...",
  "CONNECTION CONFIRMED. ACCESS GRANTED."
];

function BootSequencer({ onSkip }: { onSkip: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < BOOT_LOGS.length) {
        setLogs(prev => [...prev, BOOT_LOGS[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 450);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#030305] p-6 font-mono text-cyan-400 select-none">
      <div className="w-full max-w-2xl bg-black border border-cyan-500/20 rounded-2xl p-6 md:p-8 shadow-[0_0_50px_rgba(0,243,255,0.1)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-900/30">
          <div className="h-full bg-cyan-400 w-1/4 animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
        
        <div className="flex items-center justify-between mb-6 border-b border-cyan-900/40 pb-4">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h2 className="text-sm font-bold tracking-widest uppercase text-cyan-300">System Initialization Sequence</h2>
          </div>
          <button
            onClick={onSkip}
            className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-cyan-900/30 text-cyan-400 hover:bg-cyan-400 hover:text-black rounded border border-cyan-500/30 transition-colors cursor-pointer"
          >
            Skip Boot
          </button>
        </div>

        <div className="space-y-2 text-xs md:text-sm min-h-[200px]">
          {logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className="text-cyan-700">[{new Date().toISOString().split("T")[1].substring(0, 8)}]</span>
              <span className="text-cyan-400 [text-shadow:0_0_8px_currentColor]">{log}</span>
            </div>
          ))}
          {logs.length < BOOT_LOGS.length && (
            <div className="flex items-start gap-3">
              <span className="text-cyan-700">[{new Date().toISOString().split("T")[1].substring(0, 8)}]</span>
              <span className="w-2.5 h-4 bg-cyan-400 animate-pulse inline-block" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
