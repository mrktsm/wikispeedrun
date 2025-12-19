import { useState, useEffect, useCallback, useRef } from "react";

// Message types matching server
export const MessageTypes = {
  JOIN_ROOM: "join_room",
  REJOIN_ROOM: "rejoin_room",
  LEAVE_ROOM: "leave_room",
  START_RACE: "start_race",
  NAVIGATE: "navigate",
  FINISH: "finish",
  CURSOR: "cursor",
  ROOM_STATE: "room_state",
  PLAYER_JOINED: "player_joined",
  PLAYER_LEFT: "player_left",
  RACE_STARTED: "race_started",
  PLAYER_UPDATE: "player_update",
  PLAYER_FINISH: "player_finish",
  CURSOR_UPDATE: "cursor_update",
  ERROR: "error",
} as const;

export interface Player {
  id: string;
  name: string;
  currentArticle: string;
  clicks: number;
  path: string[];
  finished: boolean;
  finishTime?: number;
}

export interface RoomState {
  id: string;
  players: Record<string, Player>;
  startArticle: string;
  endArticle: string;
  started: boolean;
}

interface WebSocketMessage {
  type: string;
  payload: unknown;
}

export interface CursorUpdate {
  playerId: string;
  playerName: string;
  x: number;
  y: number;
  article: string;
  cursorType?: string;
}

interface UseMultiplayerOptions {
  onRaceStarted?: (data: { startArticle: string; endArticle: string }) => void;
  onPlayerUpdate?: (data: { playerId: string; currentArticle: string; clicks: number }) => void;
  onPlayerFinish?: (data: { playerId: string; playerName: string; time: number; clicks: number; path: string[] }) => void;
  onCursorUpdate?: (data: CursorUpdate) => void;
  onError?: (error: string) => void;
}

const WS_URL = "ws://localhost:8080/ws";

export function useMultiplayer(options: UseMultiplayerOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef(options);
  const handleMessageRef = useRef<(message: WebSocketMessage) => void>();
  
  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Message handler - uses refs to avoid stale closures
  const handleMessage = useCallback((message: WebSocketMessage) => {
    const { type, payload } = message;
    console.log("Received message:", type, payload);
    
    switch (type) {
      case MessageTypes.ROOM_STATE: {
        const state = payload as RoomState;
        console.log("Room state received:", state);
        setRoomState(state);
        const playerList = Object.values(state.players);
        console.log("Setting players:", playerList);
        setPlayers(playerList);
        break;
      }
      
      case MessageTypes.PLAYER_JOINED: {
        const player = payload as Player;
        console.log("Player joined:", player);
        setPlayers(prev => [...prev.filter(p => p.id !== player.id), player]);
        setRoomState(prev => prev ? {
          ...prev,
          players: { ...prev.players, [player.id]: player }
        } : null);
        break;
      }
      
      case MessageTypes.PLAYER_LEFT: {
        const { playerId } = payload as { playerId: string };
        console.log("Player left:", playerId);
        setPlayers(prev => prev.filter(p => p.id !== playerId));
        setRoomState(prev => {
          if (!prev) return null;
          const { [playerId]: _, ...remaining } = prev.players;
          return { ...prev, players: remaining };
        });
        break;
      }
      
      case MessageTypes.RACE_STARTED: {
        const data = payload as { startArticle: string; endArticle: string };
        console.log("Race started:", data);
        setRoomState(prev => prev ? { ...prev, started: true } : null);
        optionsRef.current.onRaceStarted?.(data);
        break;
      }
      
      case MessageTypes.PLAYER_UPDATE: {
        const data = payload as { playerId: string; currentArticle: string; clicks: number };
        setPlayers(prev => prev.map(p => 
          p.id === data.playerId 
            ? { ...p, currentArticle: data.currentArticle, clicks: data.clicks }
            : p
        ));
        optionsRef.current.onPlayerUpdate?.(data);
        break;
      }
      
      case MessageTypes.PLAYER_FINISH: {
        const data = payload as { playerId: string; playerName: string; time: number; clicks: number; path: string[] };
        setPlayers(prev => prev.map(p => 
          p.id === data.playerId 
            ? { ...p, finished: true, finishTime: data.time }
            : p
        ));
        optionsRef.current.onPlayerFinish?.(data);
        break;
      }
      
      case MessageTypes.CURSOR_UPDATE: {
        const data = payload as CursorUpdate;
        optionsRef.current.onCursorUpdate?.(data);
        break;
      }
      
      case MessageTypes.ERROR: {
        const { error: errorMsg } = payload as { error: string };
        console.error("Server error:", errorMsg);
        setError(errorMsg);
        optionsRef.current.onError?.(errorMsg);
        break;
      }
    }
  }, []);

  // Keep handleMessage ref updated
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log("WebSocket already connected/connecting, skipping");
      return;
    }

    console.log("Connecting to WebSocket:", WS_URL);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setError(null);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      // Don't null out immediately - let pending operations complete
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      }, 100);
      
      // Don't auto-reconnect - let the component handle reconnection
      // This prevents multiple connections fighting each other
    };

    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      setError("Connection error");
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        handleMessageRef.current?.(message);
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    };
  }, []);

  const sendMessage = useCallback((type: string, payload: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log("Sending message:", type, payload);
      ws.send(JSON.stringify({ type, payload }));
      return true;
    } else {
      console.warn("WebSocket not connected, message not sent:", type, "readyState:", ws?.readyState);
      return false;
    }
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string, startArticle: string, endArticle: string) => {
    sendMessage(MessageTypes.JOIN_ROOM, {
      roomId,
      playerName,
      startArticle,
      endArticle,
    });
  }, [sendMessage]);

  const rejoinRoom = useCallback((roomId: string, playerName: string) => {
    sendMessage(MessageTypes.REJOIN_ROOM, {
      roomId,
      playerName,
    });
  }, [sendMessage]);

  const leaveRoom = useCallback(() => {
    // Only send leave message if actually connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendMessage(MessageTypes.LEAVE_ROOM, {});
    }
    setRoomState(null);
    setPlayers([]);
  }, [sendMessage]);

  const startRace = useCallback(() => {
    sendMessage(MessageTypes.START_RACE, {});
  }, [sendMessage]);

  const sendNavigate = useCallback((article: string) => {
    sendMessage(MessageTypes.NAVIGATE, { article });
  }, [sendMessage]);

  const sendFinish = useCallback((time: number) => {
    sendMessage(MessageTypes.FINISH, { time });
  }, [sendMessage]);

  const sendCursor = useCallback((x: number, y: number, article: string, cursorType?: string) => {
    sendMessage(MessageTypes.CURSOR, { x, y, article, cursorType });
  }, [sendMessage]);

  const disconnect = useCallback((sendLeave = false) => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    // Only send leave_room if explicitly requested (e.g., user clicks Leave button)
    // Don't send when just navigating between pages
    if (sendLeave && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: MessageTypes.LEAVE_ROOM, payload: {} }));
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setRoomState(null);
    setPlayers([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    isConnected,
    roomState,
    players,
    myPlayerId,
    error,
    isHost: players.length > 0 && players[0]?.id === myPlayerId,
    
    // Actions
    connect,
    disconnect,
    joinRoom,
    rejoinRoom,
    leaveRoom,
    startRace,
    sendNavigate,
    sendFinish,
    sendCursor,
  };
}

export default useMultiplayer;

