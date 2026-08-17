import { useState } from "react";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { AppLayout } from "../layouts/AppLayout";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

interface ChatMessage {
  id: number;
  sender: string;
  isDoctor: boolean;
  text: string;
  time: string;
}

export function ConsultationsPage() {
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: "Dr. Rajesh Sharma",
      isDoctor: true,
      text: "Hello Aarav, I can see your previous ECG reading. How are you feeling today?",
      time: "10:02 AM",
    },
    {
      id: 2,
      sender: "Aarav Kumar",
      isDoctor: false,
      text: "Doctor, I had mild chest heaviness yesterday evening after climbing stairs.",
      time: "10:03 AM",
    },
  ]);
  const [inputMsg, setInputMsg] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now(),
      sender: "Aarav Kumar",
      isDoctor: false,
      text: inputMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputMsg("");
  };

  return (
    <AppLayout showSidebar={true}>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-heading text-slate-900">
                Live Telehealth Consultation Room
              </h1>
              <Badge variant="success" size="sm">
                Encrypted Session
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Consulting Dr. Rajesh Sharma (Cardiology) • Session ID: #ST-8XK2P3
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-teal-800 font-semibold bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200">
            <ShieldCheck size={14} className="text-teal-700" /> ABDM & HIPAA Secure WebRTC Stream
          </div>
        </div>

        {/* ─── Video & Chat Stage ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Screen */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video rounded-3xl bg-slate-950 overflow-hidden shadow-2xl flex flex-col justify-between p-4 sm:p-6 border border-slate-800">
              {/* Remote Stream Video Mock */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <div className="w-24 h-24 rounded-full bg-teal-900/60 border-2 border-teal-500/40 text-teal-300 flex items-center justify-center font-bold text-3xl mb-3 shadow-lg backdrop-blur-sm">
                  RS
                </div>
                <h3 className="text-base font-bold text-white">Dr. Rajesh Sharma</h3>
                <p className="text-xs text-teal-300">Senior Consultant Cardiologist</p>
                <div className="flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  1080p HD Audio & Video Active
                </div>
              </div>

              {/* Top Stream Info */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>REC • 08:42</span>
                </div>

                {/* Self PIP View */}
                <div className="w-28 sm:w-36 aspect-video rounded-2xl bg-slate-800 border-2 border-teal-500/50 shadow-xl overflow-hidden relative flex items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-300">You (Patient)</span>
                </div>
              </div>

              {/* Bottom In-Call Controls */}
              <div className="relative z-10 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setMicActive(!micActive)}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                    micActive
                      ? "bg-slate-800/90 text-white hover:bg-slate-700"
                      : "bg-red-600 text-white hover:bg-red-700 shadow-md"
                  }`}
                >
                  {micActive ? <Mic size={18} /> : <MicOff size={18} />}
                </button>

                <button
                  type="button"
                  onClick={() => setVideoActive(!videoActive)}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                    videoActive
                      ? "bg-slate-800/90 text-white hover:bg-slate-700"
                      : "bg-red-600 text-white hover:bg-red-700 shadow-md"
                  }`}
                >
                  {videoActive ? <Camera size={18} /> : <CameraOff size={18} />}
                </button>

                <button
                  type="button"
                  onClick={() => window.open("/appointments", "_self")}
                  className="px-5 h-11 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <PhoneOff size={16} /> End Call
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Consultation Chat */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col h-[420px] lg:h-auto">
            {/* Chat header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Stethoscope size={16} className="text-teal-700" /> In-Call Medical Notes & Chat
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                Live
              </span>
            </div>

            {/* Message Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.isDoctor ? "items-start" : "items-end"
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-400 mb-0.5">
                    {m.sender} • {m.time}
                  </span>
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      m.isDoctor
                        ? "bg-teal-50 text-slate-900 border border-teal-100 rounded-tl-none"
                        : "bg-teal-800 text-white rounded-tr-none shadow-xs"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSend}
              className="p-3 border-t border-slate-100 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Type medical note or question..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700 bg-slate-50"
              />
              <Button type="submit" variant="primary" size="sm" icon={Send}>
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
