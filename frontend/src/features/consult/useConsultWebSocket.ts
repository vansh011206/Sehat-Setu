import { useEffect, useRef, useState, useCallback } from "react";
import { getWsBaseUrl } from "../../api/client";
import type { ChatMessage, PresenceUser } from "./api";

interface UseConsultWebSocketOptions {
  appointmentId: number;
  token: string | null;
  onNewMessage?: (msg: ChatMessage) => void;
  onSessionStatusChange?: (status: "WAITING" | "ACTIVE" | "ENDED") => void;
}

export function useConsultWebSocket({
  appointmentId,
  token,
  onNewMessage,
  onSessionStatusChange,
}: UseConsultWebSocketOptions) {
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [typingUser, setTypingUser] = useState<PresenceUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"WAITING" | "ACTIVE" | "ENDED" | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const lastTypingSentRef = useRef(0);

  const connect = useCallback(() => {
    if (!token || !appointmentId) return;

    // LAN demo: Use dynamic WebSocket helper
    const wsUrl = `${getWsBaseUrl(`/consult/${appointmentId}/`)}?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "message") {
            const newMsg: ChatMessage = {
              id: data.id || Date.now(),
              appointment: appointmentId,
              sender: {
                id: data.sender.id,
                full_name: data.sender.name || data.sender.full_name || "User",
                role: data.sender.role,
                profile_picture: data.sender.profile_picture,
              },
              text: data.text,
              created_at: data.sent_at || new Date().toISOString(),
            };
            onNewMessage?.(newMsg);
          } else if (data.type === "typing") {
            if (data.user) {
              setTypingUser(data.user);
              if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
              }
              typingTimerRef.current = window.setTimeout(() => {
                setTypingUser(null);
              }, 3500);
            }
          } else if (data.type === "join" || data.type === "leave") {
            if (Array.isArray(data.presence)) {
              setPresence(data.presence);
            }
          } else if (data.type === "session") {
            if (data.status) {
              setSessionStatus(data.status);
              onSessionStatusChange?.(data.status);
            }
          }
        } catch {
          // Ignore invalid JSON payloads
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        // Do not auto-reconnect if rejected by server with 4004 (Forbidden / Invalid membership)
        if (event.code === 4004) {
          return;
        }

        // Exponential backoff reconnect
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            10000
          );
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    } catch {
      setIsConnected(false);
    }
  }, [appointmentId, token, onNewMessage, onSessionStatusChange]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((text: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "message",
          text: text.trim(),
        })
      );
      return true;
    }
    return false;
  }, []);

  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2500) return;
    lastTypingSentRef.current = now;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "typing",
        })
      );
    }
  }, []);

  const sendSessionStatus = useCallback((status: "WAITING" | "ACTIVE" | "ENDED") => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "session",
          status,
        })
      );
    }
  }, []);

  return {
    presence,
    typingUser,
    isConnected,
    sessionStatus,
    sendMessage,
    sendTyping,
    sendSessionStatus,
  };
}
