import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  MessageSquare,
  PhoneOff,
  Send,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useAuthStore } from "../../stores/authStore";
import { bookingsApi } from "../bookings/api";
import {
  consultApi,
  type ChatMessage,
  type StartConsultResponse,
} from "./api";
import { useConsultWebSocket } from "./useConsultWebSocket";
import { JitsiMeetEmbed } from "./JitsiMeetEmbed";

function format12HourTime(dateString: string | Date): string {
  const d = new Date(dateString);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ConsultPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const idNum = Number(appointmentId);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuthStore();

  const isDoctor = user?.role === "DOCTOR";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [sessionData, setSessionData] = useState<StartConsultResponse | null>(null);
  const [activeSessionStatus, setActiveSessionStatus] = useState<
    "WAITING" | "ACTIVE" | "ENDED"
  >("WAITING");

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch appointment details
  const {
    data: appointment,
    isLoading: apptLoading,
    error: apptError,
  } = useQuery({
    queryKey: ["appointment-detail", idNum],
    queryFn: () => bookingsApi.getAppointmentDetail(idNum),
    enabled: !isNaN(idNum),
  });

  // 2. Fetch past message history
  const { data: initialMessages } = useQuery({
    queryKey: ["consult-messages", idNum],
    queryFn: () => consultApi.getMessages(idNum),
    enabled: !isNaN(idNum),
  });

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. Initiate / Start Telehealth Consult Session
  const startConsultMutation = useMutation({
    mutationFn: () => consultApi.startConsult(idNum),
    onSuccess: (data) => {
      setSessionData(data);
      setActiveSessionStatus(data.status);
      queryClient.invalidateQueries({ queryKey: ["appointment-detail", idNum] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-doctor"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-patient"] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.detail ||
        "Unable to start consultation. Please ensure you are within the scheduled appointment window.";
      toast({
        title: "Access Restricted",
        description: msg,
        variant: "warning",
      });
    },
  });

  // Automatically attempt room start on load
  useEffect(() => {
    if (!isNaN(idNum) && appointment && !sessionData && !startConsultMutation.isPending) {
      startConsultMutation.mutate();
    }
  }, [idNum, appointment]);

  // 4. End Consult Mutation
  const endConsultMutation = useMutation({
    mutationFn: () => consultApi.endConsult(idNum),
    onSuccess: () => {
      setActiveSessionStatus("ENDED");
      setEndModalOpen(false);
      sendSessionStatus("ENDED");
      toast({
        title: "Consultation Completed",
        description: "Session has ended and appointment is marked completed.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["appointment-detail", idNum] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-doctor"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-patient"] });
    },
    onError: (err: any) => {
      toast({
        title: "Action Failed",
        description: err?.response?.data?.detail || "Unable to end consultation.",
        variant: "danger",
      });
    },
  });

  // 5. Elapsed Timer
  useEffect(() => {
    if (activeSessionStatus !== "ACTIVE") return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSessionStatus]);

  // 6. WebSocket Hook for Real-time chat & presence
  const {
    presence,
    typingUser,
    isConnected,
    sendMessage,
    sendTyping,
    sendSessionStatus,
  } = useConsultWebSocket({
    appointmentId: idNum,
    token: accessToken,
    onNewMessage: (newMsg) => {
      setMessages((prev) => {
        const existingIdx = prev.findIndex(
          (m) =>
            m.id === newMsg.id ||
            (m.sender.id === newMsg.sender.id &&
              m.text === newMsg.text &&
              Math.abs(
                new Date(m.created_at).getTime() -
                  new Date(newMsg.created_at).getTime()
              ) < 6000)
        );
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = newMsg;
          return updated;
        }
        return [...prev, newMsg];
      });
    },
    onSessionStatusChange: (status) => {
      setActiveSessionStatus(status);
    },
  });

  // mobile: visualViewport listener to prevent software keyboard from hiding chat input
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [mobileTab, setMobileTab] = useState<"video" | "chat">("video");

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const updateHeight = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };
    window.visualViewport.addEventListener("resize", updateHeight);
    window.visualViewport.addEventListener("scroll", updateHeight);
    updateHeight();
    return () => {
      window.visualViewport?.removeEventListener("resize", updateHeight);
      window.visualViewport?.removeEventListener("scroll", updateHeight);
    };
  }, []);

  // Handle message sending
  const handleSendMessage = () => {
    const text = inputText.trim();
    if (!text) return;

    // Optimistic message append
    const tempMsg: ChatMessage = {
      id: Date.now(),
      appointment: idNum,
      sender: {
        id: user?.id || 0,
        full_name: user?.full_name || "Me",
        role: user?.role || "PATIENT",
        profile_picture: user?.profile_picture,
      },
      text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);
    setInputText("");

    // Send via WebSocket
    const sent = sendMessage(text);
    if (!sent) {
      toast({
        title: "Connection Offline",
        description: "Message will be synced once connection is restored.",
        variant: "warning",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else {
      sendTyping();
    }
  };

  // Build Jitsi Embed URL (Deterministic room name across Doctor and Patient)
  const displayName = sessionData?.jitsi_config?.display_name || user?.full_name || "User";
  const jitsiRoom =
    sessionData?.jitsi_config?.room_name ||
    (appointment
      ? `SehatSetu-appt-${appointment.id}-${appointment.booking_code.toLowerCase()}`
      : `SehatSetu-appt-${idNum}`);

  // LAN demo: Detect insecure HTTP origin (e.g. 192.168.x.x over HTTP) where Chrome disables WebRTC
  const isSecure = typeof window !== "undefined" ? window.isSecureContext : true;
  const isLanHost = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
  const showWebRtcNotice = !isSecure && isLanHost;

  if (apptLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md w-full">
          <Skeleton className="w-16 h-16 rounded-full mx-auto" variant="circle" />
          <Skeleton className="w-3/4 h-6 mx-auto" />
          <Skeleton className="w-1/2 h-4 mx-auto" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            Connecting to encrypted consultation channel...
          </p>
        </div>
      </div>
    );
  }

  if (apptError || !appointment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl border border-border max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold font-heading text-ink">
            Consultation Not Available
          </h2>
          <p className="text-xs text-muted">
            The requested consultation session could not be found or you do not have permission to access it.
          </p>
          <Link to="/dashboard">
            <Button variant="primary" size="sm" icon={ArrowLeft}>
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ height: viewportHeight ? `${viewportHeight}px` : "100dvh" }}
      className="bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden"
    >
      {/* ─── Top Telehealth Header Bar ─── */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2.5 shrink-0 flex items-center justify-between gap-2 sm:gap-4 z-20 pt-[max(10px,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-11 h-11 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title="Exit to Dashboard"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-bold font-heading text-white truncate max-w-[130px] sm:max-w-xs">
                {isDoctor ? appointment.patient.full_name : `Dr. ${appointment.doctor.name}`}
              </h1>
              <Badge
                variant={
                  activeSessionStatus === "ACTIVE"
                    ? "teal"
                    : activeSessionStatus === "WAITING"
                    ? "warning"
                    : "neutral"
                }
                size="sm"
                className="shrink-0 text-[10px] sm:text-xs"
              >
                {activeSessionStatus === "ACTIVE" ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                    Live
                  </span>
                ) : activeSessionStatus === "WAITING" ? (
                  "Lobby"
                ) : (
                  "Ended"
                )}
              </Badge>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              {appointment.doctor.specialty.name} • Ref: {appointment.booking_code}
            </p>
          </div>
        </div>

        {/* Center: Live Timer (visible on all viewports) */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold tabular-nums text-teal-300 shrink-0">
          <Clock size={13} className="text-teal-400" />
          <span>{formatElapsed(elapsedSeconds)}</span>
        </div>

        {/* Right: Presence, Rx, Jitsi & End Call Button */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Presence Avatars (hidden on small phone) */}
          <div className="hidden sm:flex items-center -space-x-2">
            {presence.map((p) => (
              <div
                key={p.id}
                title={`${p.name} (${p.role}) is online`}
                className="relative"
              >
                <Avatar name={p.name} size="sm" className="ring-2 ring-teal-500" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-teal-400 ring-2 ring-slate-900" />
              </div>
            ))}
          </div>

          {isDoctor && (
            <Link to={`/consult/${idNum}/prescription`}>
              <button
                className="w-11 h-11 sm:w-auto sm:px-3 sm:py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                title="Write Prescription"
              >
                <FileText size={16} />
                <span className="hidden sm:inline">Write Rx</span>
              </button>
            </Link>
          )}

          {/* Fallback button "Open in Jitsi" */}
          <a
            href={`https://meet.jit.si/${jitsiRoom.startsWith("SehatSetu-") ? jitsiRoom : `SehatSetu-${jitsiRoom}`}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 hover:text-white text-xs font-bold border border-teal-500/30 transition-colors cursor-pointer"
            title="Open consultation directly on HTTPS Jitsi Meet"
          >
            <ExternalLink size={13} />
            <span className="hidden md:inline">Open in Jitsi</span>
          </a>

          {activeSessionStatus !== "ENDED" && (
            <button
              onClick={() => setEndModalOpen(true)}
              className="min-h-[44px] px-3 sm:px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="End consultation session"
            >
              <PhoneOff size={15} />
              <span className="hidden sm:inline">End</span>
            </button>
          )}
        </div>
      </header>

      {/* ─── Mobile Portrait Tab Switcher ([Video Stage | Live Chat]) ─── */}
      <div className="lg:hidden landscape:hidden flex border-b border-slate-800 bg-slate-900/95 shrink-0 px-2">
        <button
          onClick={() => setMobileTab("video")}
          className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors min-h-[44px] ${
            mobileTab === "video"
              ? "border-teal-400 text-teal-300"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Video size={16} />
          <span>Video Stage</span>
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors min-h-[44px] relative ${
            mobileTab === "chat"
              ? "border-teal-400 text-teal-300"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare size={16} />
          <span>Live Chat</span>
          {messages.length > 0 && (
            <span className="bg-teal-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── Main Stage & Chat Split Layout (Landscape & Desktop Side-by-Side, Portrait Tabbed) ─── */}
      <div className="flex-1 flex flex-col lg:flex-row landscape:flex-row min-h-0 overflow-hidden relative">
        {/* Left Stage: Video or Waiting/Ended Stage */}
        <div
          className={`flex-1 flex flex-col min-h-0 overflow-y-auto ${
            mobileTab === "video"
              ? "flex p-2 sm:p-4 lg:p-6"
              : "hidden lg:flex landscape:flex p-2 sm:p-4 lg:p-6"
          }`}
        >
          {activeSessionStatus === "ACTIVE" ? (
            <div className="w-full flex-1 flex flex-col h-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl relative min-h-[280px]">
              {/* LAN demo: Insecure context notice */}
              {showWebRtcNotice && (
                <div className="bg-amber-950/90 border-b border-amber-600/50 px-3 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-200 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                    <span className="text-[11px]">
                      Chrome blocks camera on HTTP. Tap <strong>Open in Jitsi</strong> to join with video & mic over HTTPS:
                    </span>
                  </div>
                  <a
                    href={`https://meet.jit.si/${jitsiRoom.startsWith("SehatSetu-") ? jitsiRoom : `SehatSetu-${jitsiRoom}`}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shrink-0 transition-colors shadow-xs"
                  >
                    <ExternalLink size={12} />
                    <span>Open HTTPS</span>
                  </a>
                </div>
              )}

              {/* Video stage action bar with Open in Jitsi fallback */}
              <div className="bg-slate-800/90 border-b border-slate-700/60 px-3 py-1.5 flex items-center justify-between text-xs text-slate-300 shrink-0">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck size={13} className="text-teal-400" />
                  Live Encrypted Stage
                </span>
                <a
                  href={`https://meet.jit.si/${jitsiRoom.startsWith("SehatSetu-") ? jitsiRoom : `SehatSetu-${jitsiRoom}`}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 hover:text-white font-medium text-[11px] transition-colors"
                  title="Open directly on HTTPS Jitsi Meet"
                >
                  <ExternalLink size={12} />
                  <span>Open Jitsi</span>
                </a>
              </div>

              {/* Jitsi Video Frame */}
              <div className="flex-1 w-full h-full min-h-[240px] relative">
                <JitsiMeetEmbed
                  roomName={jitsiRoom}
                  displayName={displayName}
                />

                {/* Overlay semi-transparent controls on bottom of stage */}
                <div className="absolute bottom-3 inset-x-0 mx-auto w-fit flex items-center gap-2 px-3.5 py-1.5 bg-slate-950/80 backdrop-blur-md rounded-full border border-slate-700/60 shadow-xl z-10 pointer-events-auto">
                  <button
                    onClick={() => setMobileTab("chat")}
                    className="lg:hidden landscape:hidden p-2 rounded-full bg-slate-800 text-teal-300 hover:text-white transition-colors relative min-w-[44px] min-h-[44px] flex items-center justify-center"
                    title="Open Live Chat"
                  >
                    <MessageSquare size={16} />
                    {messages.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-teal-500 text-slate-950 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {messages.length}
                      </span>
                    )}
                  </button>
                  <a
                    href={`https://meet.jit.si/${jitsiRoom.startsWith("SehatSetu-") ? jitsiRoom : `SehatSetu-${jitsiRoom}`}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-teal-600/30 text-teal-300 hover:bg-teal-600/50 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center text-xs font-semibold"
                    title="External Fullscreen Stream"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <button
                    onClick={() => setEndModalOpen(true)}
                    className="px-3.5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors min-w-[48px] min-h-[44px] shadow-sm cursor-pointer"
                    title="End Consultation"
                  >
                    <PhoneOff size={15} />
                    <span>End</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeSessionStatus === "WAITING" ? (
            <div className="w-full flex-1 min-h-[360px] rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 sm:space-y-6 shadow-xl">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 animate-pulse">
                <Video size={32} />
              </div>

              <div className="space-y-2 max-w-md">
                <h2 className="text-lg sm:text-xl font-bold font-heading text-white">
                  Consultation Waiting Lobby
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  {isDoctor
                    ? `You are in the consultation room for ${appointment.patient.full_name}. Press start to launch video stage.`
                    : `Ready to consult with Dr. ${appointment.doctor.name}. Enter the room below.`}
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 p-3.5 sm:p-4 rounded-xl text-xs space-y-1.5 text-slate-300 max-w-sm w-full text-left font-medium">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Appointment Slot:</span>
                  <span className="font-bold text-white tabular-nums">
                    {format12HourTime(appointment.start_time)} - {format12HourTime(appointment.end_time)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Booking Reference:</span>
                  <span className="font-bold text-teal-300">{appointment.booking_code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Encrypted Room:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck size={13} /> Active E2EE
                  </span>
                </div>
              </div>

              {/* Single Device Testing Tip Banner */}
              <div className="bg-teal-950/60 border border-teal-800/60 p-3 rounded-xl text-[11px] text-teal-200 max-w-sm w-full text-left space-y-1 shadow-xs">
                <span className="font-bold flex items-center gap-1 text-teal-300">
                  <Sparkles size={13} /> Single Device Testing Tip:
                </span>
                <p className="text-slate-300 leading-normal">
                  Doctor in Normal Chrome • Patient in Incognito (<code className="text-teal-300">Ctrl+Shift+N</code>). Mute one microphone to prevent audio feedback.
                </p>
              </div>

              {/* Action Buttons: Stacked full-width on mobile */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full max-w-sm sm:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  icon={Video}
                  loading={startConsultMutation.isPending}
                  onClick={() => {
                    setActiveSessionStatus("ACTIVE");
                    startConsultMutation.mutate();
                  }}
                  className="font-bold w-full sm:w-auto min-h-[44px]"
                >
                  Enter Video Room
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => navigate("/dashboard")}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white w-full sm:w-auto min-h-[44px]"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full flex-1 min-h-[360px] rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 sm:space-y-6 shadow-xl">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={28} />
              </div>

              <div className="space-y-2 max-w-md">
                <h2 className="text-lg sm:text-xl font-bold font-heading text-white">
                  Consultation Session
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  This consultation is active on SehatSetu. You can launch or re-enter the live video stage anytime.
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 p-3.5 sm:p-4 rounded-xl text-xs space-y-2 text-slate-300 max-w-sm w-full text-left font-medium">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Doctor:</span>
                  <span className="font-bold text-white">Dr. {appointment.doctor.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Patient:</span>
                  <span className="font-bold text-white">{appointment.patient.full_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Booking Reference:</span>
                  <span className="font-bold text-teal-300">{appointment.booking_code}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 w-full max-w-sm sm:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  icon={Video}
                  loading={startConsultMutation.isPending}
                  onClick={() => {
                    setActiveSessionStatus("ACTIVE");
                    startConsultMutation.mutate();
                  }}
                  className="font-bold w-full sm:w-auto min-h-[44px]"
                >
                  Start / Rejoin Video
                </Button>
                <Link to="/prescriptions" className="w-full sm:w-auto">
                  <Button variant="secondary" size="md" icon={FileText} className="w-full sm:w-auto min-h-[44px]">
                    Prescriptions
                  </Button>
                </Link>
                <Link to="/dashboard" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="md"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white w-full sm:w-auto min-h-[44px]"
                  >
                    Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel / Mobile Chat Tab: Real-Time Chat Panel */}
        <div
          className={`lg:w-96 landscape:w-80 shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-10 ${
            mobileTab === "chat"
              ? "flex flex-1 lg:flex-none landscape:flex-none"
              : "hidden lg:flex landscape:flex"
          }`}
        >
          {/* Chat Header */}
          <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
            <div className="flex items-center gap-2.5">
              <MessageSquare size={18} className="text-teal-400" />
              <div>
                <h3 className="text-sm font-bold text-white font-heading">
                  Consultation Chat
                </h3>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? "bg-teal-400" : "bg-rose-500"
                    }`}
                  />
                  {isConnected ? "Live Connected" : "Connecting..."}
                </span>
              </div>
            </div>

            {/* Mobile switch back to video stage */}
            <button
              onClick={() => setMobileTab("video")}
              className="lg:hidden landscape:hidden px-2.5 py-1 rounded-lg text-teal-300 hover:text-white bg-slate-800 text-xs font-bold flex items-center gap-1 min-h-[44px] cursor-pointer"
            >
              <Video size={14} />
              <span>Back to Video</span>
            </button>
          </div>

          {/* Messages List Area */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 min-h-0 bg-slate-950/40">
            {messages.length > 0 ? (
              messages.map((msg) => {
                const isOwn = msg.sender.id === user?.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isOwn ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] break-words ${
                        isOwn
                          ? "bg-teal-700 text-white rounded-tr-xs shadow-xs"
                          : "bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-xs shadow-xs"
                      }`}
                    >
                      {msg.text}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1 tabular-nums font-medium">
                      {!isOwn && (
                        <span className="font-bold text-slate-300">
                          {msg.sender.full_name} •
                        </span>
                      )}
                      <span>{format12HourTime(msg.created_at)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                <MessageSquare size={28} className="text-slate-700" />
                <p className="text-xs font-medium">
                  No messages yet. Start the consultation chat below.
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator */}
          {typingUser && (
            <div className="px-4 py-1.5 text-[11px] text-teal-400 bg-slate-900/90 flex items-center gap-1.5 border-t border-slate-800 font-medium shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1">{typingUser.name} is typing...</span>
            </div>
          )}

          {/* Chat Input - with safe-area padding for mobile */}
          <div className="p-2.5 sm:p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2 shrink-0 pb-[max(10px,env(safe-area-inset-bottom))]">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={activeSessionStatus === "ENDED"}
              placeholder={
                activeSessionStatus === "ENDED"
                  ? "Session ended. Chat is closed."
                  : "Type a medical note or message..."
              }
              className="flex-1 bg-slate-950 border border-slate-800 text-white text-base sm:text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-500 disabled:opacity-50 min-h-[44px]"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || activeSessionStatus === "ENDED"}
              className="w-11 h-11 rounded-xl bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40 disabled:hover:bg-teal-600 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              title="Send message (Enter)"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── End Consultation Modal ─── */}
      <Modal
        open={endModalOpen}
        onClose={() => setEndModalOpen(false)}
        title="End Telehealth Consultation"
        size="md"
      >
        <div className="space-y-4 text-ink">
          <p className="text-xs sm:text-sm text-muted">
            Are you sure you want to end this live consultation? The room will close and the appointment will be marked as <strong>COMPLETED</strong>.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEndModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={PhoneOff}
              loading={endConsultMutation.isPending}
              onClick={() => endConsultMutation.mutate()}
            >
              Confirm End Session
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
