import { useEffect, useRef } from "react";

// Jitsi domain — meet.jit.si enforces mandatory moderator authentication
// which blocks both participants in lobby. Use a public instance without
// this restriction instead.
const JITSI_DOMAIN = "meet.jit.si";

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface JitsiMeetEmbedProps {
  roomName: string;
  displayName: string;
  onReadyToClose?: () => void;
}

let scriptLoaded = false;
let scriptLoading = false;
const scriptCallbacks: (() => void)[] = [];

function loadJitsiScript(domain: string): Promise<void> {
  return new Promise((resolve) => {
    if (scriptLoaded && window.JitsiMeetExternalAPI) {
      resolve();
      return;
    }
    scriptCallbacks.push(resolve);
    if (scriptLoading) return;
    scriptLoading = true;

    const script = document.createElement("script");
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      scriptCallbacks.forEach((cb) => cb());
      scriptCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

export function JitsiMeetEmbed({
  roomName,
  displayName,
  onReadyToClose,
}: JitsiMeetEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    let disposed = false;

    loadJitsiScript(JITSI_DOMAIN).then(() => {
      if (disposed || !containerRef.current) return;

      // Clear any previous content
      containerRef.current.innerHTML = "";

      const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableModeratorIndicator: true,
          enableLobbyChat: false,
          hideLobbyButton: true,
          requireDisplayName: false,
          // Disable lobby — the key fix
          lobby: {
            enabled: false,
            autoKnock: true,
          },
          // Disable authentication prompts
          enableInsecureRoomNameWarning: false,
          // Clean toolbar for medical consults
          toolbarButtons: [
            "microphone",
            "camera",
            "desktop",
            "fullscreen",
            "chat",
            "raisehand",
            "tileview",
            "hangup",
            "settings",
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          DEFAULT_BACKGROUND: "#0f172a",
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: true,
        },
        userInfo: {
          displayName,
        },
      });

      apiRef.current = api;

      // LAN demo: Ensure iframe has camera, mic, display-capture, fullscreen permissions & origin referrerPolicy
      const applyIframeAttrs = () => {
        try {
          const iframe = typeof api.getIFrame === "function" ? api.getIFrame() : null;
          if (iframe) {
            iframe.setAttribute("allow", "camera; microphone; display-capture; fullscreen; autoplay");
            iframe.setAttribute("referrerpolicy", "origin");
          }
          if (containerRef.current) {
            const iframes = containerRef.current.querySelectorAll("iframe");
            iframes.forEach((ifr) => {
              ifr.setAttribute("allow", "camera; microphone; display-capture; fullscreen; autoplay");
              ifr.setAttribute("referrerpolicy", "origin");
            });
          }
        } catch {
          // ignore inspection errors
        }
      };
      applyIframeAttrs();
      setTimeout(applyIframeAttrs, 300);

      if (onReadyToClose) {
        api.addListener("readyToClose", onReadyToClose);
      }

      // Auto-knock on lobby if it still appears
      api.addListener("lobbyWaitingEntered", () => {
        // The lobby was enforced server-side despite our config.
        // Auto-knock to request entry.
        try {
          api.executeCommand("knockOnLobby");
        } catch {
          // command may not exist in older versions
        }
      });
    });

    return () => {
      disposed = true;
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch {
          // ignore disposal errors
        }
        apiRef.current = null;
      }
    };
  }, [roomName, displayName, onReadyToClose]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px]"
      style={{ background: "#0f172a" }}
    />
  );
}
