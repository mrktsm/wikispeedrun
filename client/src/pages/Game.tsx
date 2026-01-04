import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaMousePointer, FaICursor, FaHandPointer } from "react-icons/fa";
import SpeedrunWidget from "../components/SpeedrunWidget";
import type {
  SpeedrunWidgetRef,
  SegmentData,
} from "../components/SpeedrunWidget";
import WikipediaViewer from "../components/WikipediaViewer";
import VictoryModal, { type ChatMessage } from "../components/VictoryModal";
import Scoreboard from "../components/Scoreboard";
import GameNotification, { type NotificationType } from "../components/GameNotification";
import CountdownNotification from "../components/CountdownNotification";
import { useMultiplayer, type Player, type CursorUpdate } from "../hooks/useMultiplayer";
import "../App.css";
import "./Game.css";

interface MultiplayerFinishData {
  playerId: string;
  playerName: string;
  time: number;
  clicks: number;
  path: string[];
}



// Module-level cached icon HTML (persists across re-renders)
let cachedPointerIconHTML: string | null = null;
let cachedTextIconHTML: string | null = null;
let cachedHandIconHTML: string | null = null;

const Game = () => {
  const [searchParams] = useSearchParams();
  const [hudVisible, setHudVisible] = useState(false);
  const [articleLoaded, setArticleLoaded] = useState(false);
  const [routeCompleted, setRouteCompleted] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [gameStats, setGameStats] = useState<{
    finalTime: string;
    segments: SegmentData[];
  } | null>(null);
  const [finishedPlayers, setFinishedPlayers] = useState<MultiplayerFinishData[]>([]);
  const [raceStartTime] = useState(() => Date.now());
  const [raceEndedAt, setRaceEndedAt] = useState<number | null>(null); // Timestamp when first player finished
  const [endGameCountdown, setEndGameCountdown] = useState(30); // Countdown for other players
  const [currentArticle, setCurrentArticle] = useState("");
  const [localClicks, setLocalClicks] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState<NotificationType>("same-page");
  const [notificationPlayerName, setNotificationPlayerName] = useState("");
  const [notificationPlayerColor, setNotificationPlayerColor] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mockPlayers, _setMockPlayers] = useState<Player[]>([]);

  // Notification tracking: Map of playerId -> Set of articles where we already met them
  // This tracks the actual "meeting location" so we don't re-notify for the same meeting
  const seenMeetingsRef = useRef<Map<string, Set<string>>>(new Map());

  // Track current article in ref for use in callbacks
  const currentArticleRef = useRef<string>("");

  // Reset notification state after it finishes showing
  // This allows the notification to be triggered again
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(false);
        // Clear player name/color after a brief delay to allow new notification
        setTimeout(() => {
          setNotificationPlayerName("");
          setNotificationPlayerColor("");
        }, 100);
      }, 3000); // Match the notification component's duration
      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  // Countdown state - used by both the end-game countdown and any other countdown notifications
  const [showCountdown, setShowCountdown] = useState(false);



  // Use ref for cursor data to avoid React re-renders on every cursor update
  const cursorDataRef = useRef<Map<string, CursorUpdate>>(new Map());
  const cursorContainerRef = useRef<HTMLDivElement>(null);
  const playersRef = useRef<Player[]>([]); // Store players for use in callbacks
  const highlightedElementsRef = useRef<Map<string, HTMLElement>>(new Map()); // Track highlighted elements by player ID

  const speedrunWidgetRef = useRef<SpeedrunWidgetRef>(null);
  const hasFinishedRef = useRef(false);
  const lastCursorSendRef = useRef(0);
  const navigate = useNavigate();

  const startArticle = searchParams.get("start") || "React_(JavaScript_library)";
  const endArticle = searchParams.get("end") || "End Article";
  const gameMode = searchParams.get("mode") || "solo";
  const lobbyCode = searchParams.get("lobby") || "";
  const playerName = searchParams.get("player") || "";
  const isMultiplayer = !!(gameMode === "race" && lobbyCode);

  // Handle other player finishing
  const handlePlayerFinish = useCallback((data: MultiplayerFinishData) => {
    setFinishedPlayers(prev => {
      if (prev.some(p => p.playerId === data.playerId)) return prev;
      return [...prev, data];
    });

    // Set raceEndedAt on first finish (triggers countdown for other players)
    setRaceEndedAt(prevEnded => prevEnded === null ? Date.now() : prevEnded);

    // Show finish notification (only for other players)
    if (data.playerId !== currentPlayerIdRef.current) {
      const playerColor = CURSOR_COLORS[hashStringToIndex(data.playerName)];
      setShowNotification(false);
      setTimeout(() => {
        setNotificationPlayerName(data.playerName);
        setNotificationPlayerColor(playerColor);
        setNotificationType("finish");
        setShowNotification(true);
      }, 50);
    }
  }, []);

  // Cache icon HTML to avoid re-rendering
  const pointerIconCacheRef = useRef<HTMLDivElement>(null);
  const textIconCacheRef = useRef<HTMLDivElement>(null);
  const handIconCacheRef = useRef<HTMLDivElement>(null);

  // Cache icon HTML on mount
  useEffect(() => {
    const cacheIcons = () => {
      if (pointerIconCacheRef.current && !cachedPointerIconHTML) {
        const iconElement = pointerIconCacheRef.current.querySelector('svg');
        if (iconElement) {
          cachedPointerIconHTML = iconElement.outerHTML;
        }
      }
      if (textIconCacheRef.current && !cachedTextIconHTML) {
        const iconElement = textIconCacheRef.current.querySelector('svg');
        if (iconElement) {
          cachedTextIconHTML = iconElement.outerHTML;
        }
      }
      if (handIconCacheRef.current && !cachedHandIconHTML) {
        const iconElement = handIconCacheRef.current.querySelector('svg');
        if (iconElement) {
          cachedHandIconHTML = iconElement.outerHTML;
        }
      }

      if ((!cachedPointerIconHTML && pointerIconCacheRef.current) ||
        (!cachedTextIconHTML && textIconCacheRef.current) ||
        (!cachedHandIconHTML && handIconCacheRef.current)) {
        setTimeout(cacheIcons, 50);
      }
    };
    setTimeout(cacheIcons, 100);
  }, []);

  // Cursor colors matching Scoreboard - drastically different colors
  const CURSOR_COLORS = [
    "rgba(255, 71, 87, 1)",   // Red/Pink
    "rgba(52, 152, 219, 1)",  // Blue
    "rgba(46, 204, 113, 1)",  // Green
    "rgba(241, 196, 15, 1)",  // Yellow
    "rgba(155, 89, 182, 1)",  // Purple
    "rgba(230, 126, 34, 1)",  // Orange
    "rgba(26, 188, 156, 1)",  // Turquoise
    "rgba(231, 76, 60, 1)",   // Red
  ];

  // Hash function to get consistent color index from player name
  // Same function used in Scoreboard.tsx - ensures matching colors
  const hashStringToIndex = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % CURSOR_COLORS.length;
  };

  // Find surrounding anchors (heading above and heading below) for section interpolation
  // This solves the "vertical stretching" issue where sections have different heights on different screens
  const findSurroundingAnchors = (cursorY: number): {
    anchorId: string | null;
    nextAnchorId: string | null;
    sectionRatio: number;
  } => {
    const articleContainer = document.querySelector('.wikipedia-viewer');
    if (!articleContainer) {
      return { anchorId: null, nextAnchorId: null, sectionRatio: 0 };
    }

    // Get all headings and sort them by top position
    // Use getRelativeTop for consistency with resolveSectionPosition
    const headings = Array.from(document.querySelectorAll('.wiki-content h2, .wiki-content h3, .wiki-content h4'))
      .map(heading => {
        const headlineSpan = heading.querySelector('.mw-headline');
        const anchorId = headlineSpan?.id || (heading as HTMLElement).id;
        const top = getRelativeTop(heading as HTMLElement, articleContainer);
        return { anchorId, top };
      })
      .filter(h => h.anchorId) // Filter out headings without IDs
      .sort((a, b) => a.top - b.top);

    // Find the interval containing the cursor
    // [prev] ... cursor ... [next]
    let prevIndex = -1;

    for (let i = 0; i < headings.length; i++) {
      if (headings[i].top <= cursorY) {
        prevIndex = i;
      } else {
        break; // Found the first heading below cursor
      }
    }

    // Calculate boundaries of the current section
    const prev = prevIndex >= 0 ? headings[prevIndex] : null;
    const next = prevIndex + 1 < headings.length ? headings[prevIndex + 1] : null;

    const articleBottom = (articleContainer as HTMLElement).offsetHeight;

    // Define the Y range of this section
    const sectionTop = prev ? prev.top : 0; // Top of article if no prev anchor
    const sectionBottom = next ? next.top : articleBottom; // Bottom of article if no next anchor
    const sectionHeight = sectionBottom - sectionTop;

    // Avoid division by zero
    const sectionRatio = sectionHeight > 0 ? (cursorY - sectionTop) / sectionHeight : 0;

    return {
      anchorId: prev?.anchorId || null,
      nextAnchorId: next?.anchorId || null,
      sectionRatio: Math.max(0, Math.min(1, sectionRatio)) // Clamp 0-1
    };
  };

  // Resolve interpolated position from section anchors
  // Helper to get element top relative to container safely
  const getRelativeTop = (element: HTMLElement, container: Element): number => {
    let current: HTMLElement | null = element;
    let top = 0;
    while (current && current !== container) {
      top += current.offsetTop;
      current = current.offsetParent as HTMLElement;
    }
    return top;
  };

  const resolveSectionPosition = (
    anchorId: string | null,
    nextAnchorId: string | null,
    sectionRatio: number,
    fallbackQy: number,
    articleContainer: Element
  ): number => {
    // Helper to get heading top relative to article using layout offset
    // This is much more stable than getBoundingClientRect regarding scroll/sticky headers
    const getHeadingTop = (id: string, container: Element): number | null => {
      // Try exact ID match first
      let anchor = document.getElementById(id);

      // If not found, try finding by mw-headline span with matching ID
      if (!anchor) {
        const headlineSpan = container.querySelector(`.mw-headline[id="${id}"]`);
        if (headlineSpan) {
          anchor = headlineSpan as HTMLElement;
        }
      }

      // If still not found, try case-insensitive search (some IDs may have different casing)
      if (!anchor) {
        const allHeadings = container.querySelectorAll('.wiki-content h2, .wiki-content h3, .wiki-content h4');
        for (const heading of allHeadings) {
          const headlineSpan = heading.querySelector('.mw-headline');
          const headingId = headlineSpan?.id || (heading as HTMLElement).id;
          if (headingId && headingId.toLowerCase() === id.toLowerCase()) {
            anchor = (headlineSpan || heading) as HTMLElement;
            break;
          }
        }
      }

      if (!anchor) {
        console.warn(`[Cursor] Heading anchor not found: ${id}`);
        return null;
      }

      const heading = anchor.closest('h2, h3, h4') || anchor;
      return getRelativeTop(heading as HTMLElement, container);
    };

    // Use offsetHeight for stable layout height
    const articleBottom = (articleContainer as HTMLElement).offsetHeight;

    const startTop = anchorId ? getHeadingTop(anchorId, articleContainer) : 0;
    const endTop = nextAnchorId ? getHeadingTop(nextAnchorId, articleContainer) : articleBottom;

    // PRIORITY 1: Both anchors found - use precise interpolation
    if (startTop !== null && endTop !== null) {
      return startTop + (endTop - startTop) * sectionRatio;
    }

    // PRIORITY 2: Start anchor found but end is missing - interpolate to article bottom
    if (startTop !== null && endTop === null) {
      console.warn(`[Cursor] Using partial section positioning (start anchor found, end missing)`);
      return startTop + (articleBottom - startTop) * sectionRatio;
    }

    // PRIORITY 3: End anchor found but start is missing - interpolate from article top
    if (startTop === null && endTop !== null) {
      console.warn(`[Cursor] Using partial section positioning (end anchor found, start missing)`);
      return endTop * sectionRatio;
    }

    // PRIORITY 4: No anchors found - use percentage fallback (least accurate)
    console.warn(`[Cursor] Using percentage fallback positioning (no anchors found)`);
    return fallbackQy * articleBottom;
  };



  // Handle cursor updates from other players - direct DOM manipulation (no re-render)
  const handleCursorUpdate = useCallback((data: CursorUpdate) => {
    // Only process cursor updates if the player is on the same page as the current player
    // Use ref to avoid stale closure issues
    const isOnSamePage = data.article === currentArticleRef.current;

    // If not on the same page, fade out the cursor if it exists
    if (!isOnSamePage) {
      const container = cursorContainerRef.current;
      if (container) {
        const cursorEl = container.querySelector(`[data-player-id="${data.playerId}"]`) as HTMLElement;
        if (cursorEl && !cursorEl.classList.contains('fading')) {
          // Start fade-out animation
          cursorEl.classList.add('fading');
          // After animation completes, hide fully
          setTimeout(() => {
            cursorEl.classList.add('hidden-cursor');
          }, 500);
        }
      }
      return;
    }

    cursorDataRef.current.set(data.playerId, data);

    // Direct DOM update - bypasses React for performance
    const container = cursorContainerRef.current;
    if (!container) return;

    let cursorEl = container.querySelector(`[data-player-id="${data.playerId}"]`) as HTMLElement;

    // Create cursor element if it doesn't exist
    if (!cursorEl) {
      cursorEl = document.createElement('div');
      cursorEl.className = 'other-player-cursor';
      cursorEl.setAttribute('data-player-id', data.playerId);

      // Get color based on player name hash (consistent across all components)
      const color = CURSOR_COLORS[hashStringToIndex(data.playerName)];

      // Use default pointer icon initially
      const iconHTML = cachedPointerIconHTML || '';
      cursorEl.innerHTML = `
        <div class="cursor-pointer">
          ${iconHTML}
        </div>
        <span class="cursor-name">${data.playerName}</span>
      `;

      // Store color on element for later use
      cursorEl.setAttribute('data-player-color', color);

      // Apply color to cursor and name
      const cursorPointer = cursorEl.querySelector('.cursor-pointer') as HTMLElement;
      const cursorName = cursorEl.querySelector('.cursor-name') as HTMLElement;
      if (cursorPointer) {
        cursorPointer.style.color = color;
        // Apply color to all SVG shape elements (polygon, path, rect, circle, etc.)
        const svg = cursorPointer.querySelector('svg');
        if (svg) {
          const shapes = svg.querySelectorAll('polygon, path, rect, circle, ellipse, line, polyline');
          shapes.forEach(shape => {
            (shape as SVGElement).setAttribute('fill', color);
            (shape as SVGElement).style.fill = color;
          });
        }
      }
      if (cursorName) {
        cursorName.style.background = color;
      }

      container.appendChild(cursorEl);
    } else {
      // Show cursor if it was previously hidden/fading
      cursorEl.classList.remove('fading', 'hidden-cursor');
      cursorEl.style.display = '';
    }

    // Note: Same-page notifications are handled separately via player updates

    // Store article-relative coordinates on the element for RAF updates
    cursorEl.setAttribute('data-x', String(data.x));
    cursorEl.setAttribute('data-y', String(data.y));
    cursorEl.setAttribute('data-article', data.article);
    cursorEl.setAttribute('data-anchor-id', data.anchorId || '');
    cursorEl.setAttribute('data-next-anchor-id', data.nextAnchorId || '');
    cursorEl.setAttribute('data-section-ratio', String(data.sectionRatio || 0));

    // Calculate screen position from article-relative coordinates
    const articleContainer = document.querySelector('.wikipedia-viewer');
    if (!articleContainer) return;
    const articleRect = articleContainer.getBoundingClientRect();

    // Convert article-relative to screen position
    // (Actual rendering is handled by the RAF loop in updateAllCursorPositions)
    // const screenX = articleRect.left + data.x;
    // const screenY = articleRect.top + data.y;

    // Position cursor at screen position (using fixed positioning)
    // cursorEl.style.transform = `translate(${screenX}px, ${screenY}px)`;

    // Highlight links hovered by other players
    const articleWidth = (articleContainer as HTMLElement).offsetWidth;
    const rx = data.x * articleWidth;
    const ry = resolveSectionPosition(
      data.anchorId || null,
      data.nextAnchorId || null,
      data.sectionRatio || 0,
      data.y,
      articleContainer
    );

    const screenX = articleRect.left + rx;
    const screenY = articleRect.top + ry;

    // Check for element at position
    const element = document.elementFromPoint(screenX, screenY);
    let targetLink: HTMLElement | null = null;

    if (element) {
      if (element.tagName === 'A') {
        targetLink = element as HTMLElement;
      } else {
        targetLink = element.closest('a') as HTMLElement;
      }
    }

    const prevHighlight = highlightedElementsRef.current.get(data.playerId);
    // Remove previous highlight if it's different or if we're not over a link anymore
    if (prevHighlight && prevHighlight !== targetLink) {
      prevHighlight.classList.remove('remote-hover');
      highlightedElementsRef.current.delete(data.playerId);
    }

    // Apply new highlight
    if (targetLink && targetLink !== prevHighlight) {
      targetLink.classList.add('remote-hover');
      highlightedElementsRef.current.set(data.playerId, targetLink);
    }

    // Use cursorType from server if available (most accurate as it's from sender's side)
    // Fallback to local hit-testing only if server didn't provide it
    let cursorType = data.cursorType || 'pointer';

    if (!data.cursorType) {
      // Reuse calculated position for fallback hit-testing
      if (element) {
        const target = element as HTMLElement;
        const computedStyle = window.getComputedStyle(target);
        const cursor = computedStyle.cursor;

        if (target.tagName === 'A' || target.closest('a')) {
          cursorType = 'hand';
        } else if (target.tagName === 'IMG' || target.closest('img')) {
          cursorType = 'hand';
        } else if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          cursorType = 'text';
        } else if (cursor === 'text') {
          cursorType = 'text';
        } else if (cursor === 'pointer' || cursor === 'grab' || cursor === 'grabbing') {
          cursorType = 'pointer';
        } else if (cursor === 'auto' || cursor === 'default') {
          let currentEl: HTMLElement | null = target;
          while (currentEl) {
            const style = window.getComputedStyle(currentEl);
            if (style.cursor === 'text') {
              cursorType = 'text';
              break;
            }
            if (currentEl.classList.contains('wiki-content')) break;
            currentEl = currentEl.parentElement;
          }
        }
      }
    }

    // Update icon based on cursor type - always update to ensure it's correct
    const previousCursorType = cursorEl.getAttribute('data-cursor-type');

    // Always update if type changed, or if we don't have an icon yet
    if (previousCursorType !== cursorType || !cursorEl.querySelector('.cursor-pointer')?.innerHTML.trim()) {
      let iconHTML: string | null = null;
      if (cursorType === 'text' && cachedTextIconHTML) {
        iconHTML = cachedTextIconHTML;
      } else if (cursorType === 'hand' && cachedHandIconHTML) {
        iconHTML = cachedHandIconHTML;
      } else if (cachedPointerIconHTML) {
        iconHTML = cachedPointerIconHTML;
      }

      if (iconHTML) {
        const cursorPointerDiv = cursorEl.querySelector('.cursor-pointer') as HTMLElement;
        if (cursorPointerDiv) {
          cursorPointerDiv.innerHTML = iconHTML;

          // Reapply player color after icon update
          const storedColor = cursorEl.getAttribute('data-player-color');
          if (storedColor) {
            cursorPointerDiv.style.color = storedColor;
            // Apply color to all SVG shape elements (polygon, path, rect, circle, etc.)
            const svg = cursorPointerDiv.querySelector('svg');
            if (svg) {
              const shapes = svg.querySelectorAll('polygon, path, rect, circle, ellipse, line, polyline');
              shapes.forEach(shape => {
                (shape as SVGElement).setAttribute('fill', storedColor);
                (shape as SVGElement).style.fill = storedColor;
              });
            }
          }
        }
      }

      cursorEl.setAttribute('data-cursor-type', cursorType);
    }

    // Apply cursor type styling via classes
    cursorEl.classList.remove('cursor-pointer-type', 'cursor-text-type', 'cursor-hand-type');
    if (cursorType === 'pointer') {
      cursorEl.classList.add('cursor-pointer-type');
    } else if (cursorType === 'text') {
      cursorEl.classList.add('cursor-text-type');
    } else if (cursorType === 'hand') {
      cursorEl.classList.add('cursor-hand-type');
    }
  }, [startArticle]);

  // Track current player ID for syncing clicks
  const currentPlayerIdRef = useRef<string | null>(null);

  // Track player names by ID for notifications
  const playerNamesRef = useRef<Map<string, string>>(new Map());

  // Initialize multiplayer if needed
  const {
    isConnected,
    players,
    connect,
    disconnect,
    rejoinRoom,
    sendNavigate,
    sendFinish,
    sendCursor,
  } = useMultiplayer({
    onPlayerFinish: handlePlayerFinish,
    onCursorUpdate: handleCursorUpdate,
    onPlayerUpdate: (data) => {
      // Sync local clicks with server when our own player is updated
      if (data.playerId === currentPlayerIdRef.current) {
        setLocalClicks(data.clicks);
        return;
      }

      const myArticle = currentArticleRef.current;
      if (myArticle && myArticle !== startArticle && data.currentArticle === myArticle) {
        // Notification logic is handled in the robust useEffect at line ~680
      }
    },
  });

  // Update current player ID when players list changes
  useEffect(() => {
    // Update ref for use in callbacks
    playersRef.current = players;

    // Update player names map
    players.forEach(player => {
      playerNamesRef.current.set(player.id, player.name);
    });

    const currentPlayer = players.find(p => p.name === playerName);
    if (currentPlayer) {
      currentPlayerIdRef.current = currentPlayer.id;
      // Sync local clicks with server value if available
      if (currentPlayer.clicks > localClicks) {
        setLocalClicks(currentPlayer.clicks);
      }
    }
  }, [players, playerName, localClicks]);

  // Track previous article to detect when WE navigate (not just when others do)
  const prevArticleRef = useRef<string | null>(null);

  // ROBUST NOTIFICATION SYSTEM: Handle both "I arrived" and "they arrived" cases
  useEffect(() => {
    if (!isMultiplayer || !currentArticle || currentArticle === startArticle) return;
    if (!currentPlayerIdRef.current) return;

    const myArticle = currentArticleRef.current;
    const didNavigate = prevArticleRef.current !== null && prevArticleRef.current !== myArticle;
    prevArticleRef.current = myArticle;

    // Find other players on the same article as us


    const playersOnSamePage = players.filter(p =>
      p.id !== currentPlayerIdRef.current &&
      p.currentArticle === myArticle
    );

    // Show notification for the first player we haven't met at this article yet
    for (const player of playersOnSamePage) {
      // Get or create the set of articles where we've met this player
      let meetingLocations = seenMeetingsRef.current.get(player.id);
      if (!meetingLocations) {
        meetingLocations = new Set<string>();
        seenMeetingsRef.current.set(player.id, meetingLocations);
      }

      // Show notification if we haven't met this player at this article yet
      // AND we are not on the end article (don't show "same page" when finishing)
      if (!meetingLocations.has(myArticle) && myArticle !== endArticle) {
        console.log(`[Notification] Meeting ${player.name} at ${myArticle} (didNavigate: ${didNavigate})`);

        // Mark that we've met this player at this article
        meetingLocations.add(myArticle);

        // Show the notification
        const playerColor = CURSOR_COLORS[hashStringToIndex(player.name)];
        setShowNotification(false);
        setTimeout(() => {
          setNotificationPlayerName(player.name);
          setNotificationPlayerColor(playerColor);
          setNotificationType("same-page");
          setShowNotification(true);
        }, 50);

        // Only show one notification at a time
        break;
      }
    }
  }, [players, currentArticle, startArticle, isMultiplayer]);

  // Countdown timer for non-finished players after someone finishes
  // Countdown timer for non-finished players after someone finishes
  useEffect(() => {
    // Only run for multiplayer games when race has ended and current player hasn't finished
    if (!isMultiplayer || !raceEndedAt || showVictoryModal || hasFinishedRef.current) {
      return;
    }

    const notificationDelay = 3500; // Time to wait for notification to fade
    const countdownDuration = 30; // 30 seconds

    const updateCountdown = () => {
      // Offset start time by notification delay so countdown effectively starts AFTER notification
      const effectiveStartTime = raceEndedAt + notificationDelay;
      const elapsed = (Date.now() - effectiveStartTime) / 1000;
      const remaining = Math.max(0, countdownDuration - Math.floor(elapsed));
      setEndGameCountdown(remaining);

      // When countdown reaches 0, force show victory modal even if we haven't finished
      if (remaining <= 0) {
        setShowVictoryModal(true);
        setShowCountdown(false);
      }
    };

    // Show countdown notification (after finish notification fades)
    const showCountdownTimer = setTimeout(() => {
      updateCountdown(); // Initial update when showing
      setShowCountdown(true);
    }, notificationDelay);

    // Update countdown every second
    const interval = setInterval(updateCountdown, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(showCountdownTimer);
    };
  }, [isMultiplayer, raceEndedAt, showVictoryModal]);

  // Connect to multiplayer
  useEffect(() => {
    if (!isMultiplayer || !lobbyCode || !playerName) {
      return;
    }

    console.log("Multiplayer game detected, connecting...");
    connect();

    // Cleanup connection on unmount
    return () => {
      console.log("Cleaning up multiplayer connection");
      disconnect();
    };
  }, [isMultiplayer, lobbyCode, playerName, connect, disconnect]);

  // Rejoin the room after connecting to continue the race
  useEffect(() => {
    if (!isMultiplayer || !isConnected || !lobbyCode || !playerName) {
      return;
    }

    console.log("Rejoining room:", lobbyCode, "as", playerName);
    rejoinRoom(lobbyCode, playerName);
  }, [isMultiplayer, isConnected, lobbyCode, playerName, rejoinRoom]);

  // Always enable dark mode for Wikipedia content - run immediately and unconditionally
  useEffect(() => {
    // Add immediately on mount
    document.documentElement.classList.add("wiki-dark-mode");

    // Also ensure it's set (in case of re-renders)
    const checkDarkMode = setInterval(() => {
      if (!document.documentElement.classList.contains("wiki-dark-mode")) {
        document.documentElement.classList.add("wiki-dark-mode");
      }
    }, 100);

    return () => {
      clearInterval(checkDarkMode);
      document.documentElement.classList.remove("wiki-dark-mode");
    };
  }, []);

  // Show HUD immediately and track article loading
  useEffect(() => {
    setHudVisible(true);
    setArticleLoaded(false);
    // Initialize current article to start article
    setCurrentArticle(startArticle);
    currentArticleRef.current = startArticle;
  }, [startArticle]);

  // Clear cursors and same-page tracking when current article changes
  useEffect(() => {
    if (!isMultiplayer) return;

    const container = cursorContainerRef.current;
    if (container) {
      // Hide all cursors that are not on the current page
      const cursors = container.querySelectorAll('.other-player-cursor');
      cursors.forEach((cursor) => {
        const cursorEl = cursor as HTMLElement;
        const cursorArticle = cursorEl.getAttribute('data-article') || '';
        if (cursorArticle !== currentArticle) {
          cursorEl.style.display = 'none';
        }
      });
    }
  }, [currentArticle, isMultiplayer]);

  // Show victory modal when route is completed
  useEffect(() => {
    if (routeCompleted && speedrunWidgetRef.current && !hasFinishedRef.current) {
      hasFinishedRef.current = true;

      const finalTime = speedrunWidgetRef.current.getCurrentTime();
      const segments = speedrunWidgetRef.current.getSegments();

      // Send finish to server if multiplayer
      if (isMultiplayer) {
        const elapsedMs = Date.now() - raceStartTime;
        sendFinish(elapsedMs);
      }

      // Small delay before showing modal for dramatic effect
      const timer = setTimeout(() => {
        setGameStats({ finalTime, segments });
        setShowVictoryModal(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [routeCompleted, isMultiplayer, raceStartTime, sendFinish]);

  const handleArticleNavigate = (articleName: string) => {
    if (speedrunWidgetRef.current) {
      speedrunWidgetRef.current.addSegment(articleName);
    }

    // Update current article for cursor sharing
    setCurrentArticle(articleName);
    currentArticleRef.current = articleName;

    // Send navigation to server if multiplayer
    if (isMultiplayer) {
      // Track clicks locally (will be synced with server response)
      setLocalClicks(prev => prev + 1);
      sendNavigate(articleName);
    }
    // Note: Notifications are automatically handled by the useEffect watching players array
  };

  // Track mouse movement for cursor sharing (adaptive throttling)
  // Use article-relative coordinates so cursor position is accurate regardless of screen size
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const lastMouseClientRef = useRef({ clientX: 0, clientY: 0 }); // Store last mouse screen position for scroll updates

  useEffect(() => {
    if (!isMultiplayer || !isConnected) return;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();

      // Store last mouse screen position for scroll updates
      lastMouseClientRef.current = { clientX: e.clientX, clientY: e.clientY };

      // Find the article container to calculate relative position
      const articleContainer = document.querySelector('.wikipedia-viewer');
      if (!articleContainer) return;

      const rect = articleContainer.getBoundingClientRect();

      // Calculate position relative to article container
      // x: pixels from article left edge
      // y: position within the article content (rect.top already accounts for scroll)
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate percentages for cross-device consistency
      // y = clientY - rect.top already gives absolute position within article
      // because rect.top becomes negative when scrolled, effectively adding scroll offset
      const articleHeight = (articleContainer as HTMLElement).offsetHeight;
      const articleWidth = (articleContainer as HTMLElement).offsetWidth;
      const qx = x / articleWidth; // Use offsetWidth consistently (same as receiver)
      const qy = y / articleHeight;

      // Calculate movement distance since last send (in pixels)
      const dx = x - lastPositionRef.current.x;
      const dy = y - lastPositionRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Adaptive throttling: faster updates when moving more
      // Fast movement (distance > 20px): 16ms (~60fps)
      // Medium movement (distance > 5px): 25ms (~40fps)
      // Slow movement: 50ms (~20fps)
      let minInterval = 50;
      if (distance > 20) {
        minInterval = 16;
      } else if (distance > 5) {
        minInterval = 25;
      }

      if (now - lastCursorSendRef.current < minInterval) return;

      lastCursorSendRef.current = now;
      lastPositionRef.current = { x, y };

      // Detect cursor type from element under mouse
      const target = e.target as HTMLElement;
      let cursorType: string | undefined;

      if (target.tagName === 'A' || target.closest('a')) {
        cursorType = 'hand'; // Hand cursor for links (user request)
      } else if (target.tagName === 'IMG' || target.closest('img')) {
        cursorType = 'hand'; // Hand cursor for images
      } else if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        cursorType = 'text'; // Text cursor for inputs
      } else {
        const computedStyle = window.getComputedStyle(target);
        const cursor = computedStyle.cursor;

        // Check computed cursor style - browser already does precise hit-testing!
        if (cursor === 'text') {
          cursorType = 'text';
        } else if (cursor === 'pointer' || cursor === 'grab' || cursor === 'grabbing') {
          cursorType = 'pointer';
        } else if (cursor === 'auto' || cursor === 'default') {
          // Walk up the DOM tree to find an element with text cursor
          let currentEl: HTMLElement | null = target;
          while (currentEl) {
            const style = window.getComputedStyle(currentEl);
            if (style.cursor === 'text') {
              cursorType = 'text';
              break;
            }
            // Stop at wiki-content boundary
            if (currentEl.classList.contains('wiki-content')) {
              break;
            }
            currentEl = currentEl.parentElement;
          }
        }
      }
      // Find surrounding anchors for accurate cross-device positioning
      const { anchorId, nextAnchorId, sectionRatio } = findSurroundingAnchors(y);

      sendCursor(qx, qy, currentArticle || startArticle, cursorType, anchorId || undefined, nextAnchorId || undefined, sectionRatio);
    };

    // Use RAF to continuously monitor position changes (more reliable than scroll events)
    // This catches scroll, resize, and any other position changes
    let rafId: number;
    let lastRectTop = 0;

    const checkPositionChange = () => {
      const { clientX, clientY } = lastMouseClientRef.current;

      // Only check if we have a mouse position
      if (clientX !== 0 || clientY !== 0) {
        const articleContainer = document.querySelector('.wikipedia-viewer');
        if (articleContainer) {
          const rect = articleContainer.getBoundingClientRect();

          // Check if article position changed (indicates scroll)
          if (Math.abs(rect.top - lastRectTop) > 1) {
            lastRectTop = rect.top;

            const now = Date.now();
            // Throttle to 30fps max for scroll updates
            if (now - lastCursorSendRef.current >= 33) {
              const x = clientX - rect.left;
              const y = clientY - rect.top;

              // Only send if position actually changed significantly
              const dx = Math.abs(x - lastPositionRef.current.x);
              const dy = Math.abs(y - lastPositionRef.current.y);

              if (dx > 1 || dy > 1) {
                const articleHeight = (articleContainer as HTMLElement).offsetHeight;
                const articleWidth = (articleContainer as HTMLElement).offsetWidth;
                const qx = x / articleWidth; // Use offsetWidth consistently (same as receiver)
                const qy = y / articleHeight;
                const { anchorId, nextAnchorId, sectionRatio } = findSurroundingAnchors(y);

                lastCursorSendRef.current = now;
                lastPositionRef.current = { x, y };
                sendCursor(qx, qy, currentArticle || startArticle, undefined, anchorId || undefined, nextAnchorId || undefined, sectionRatio);
              }
            }
          }
        }
      }

      rafId = requestAnimationFrame(checkPositionChange);
    };

    rafId = requestAnimationFrame(checkPositionChange);

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [isMultiplayer, isConnected, currentArticle, startArticle, sendCursor]);

  // Update cursor container position on scroll/resize
  // Cursors are positioned relative to the container, so they scroll with the article
  useEffect(() => {
    if (!isMultiplayer) return;

    // Continuously update cursor positions using RAF with smooth interpolation
    let rafId: number;

    // Store current rendered positions for smooth interpolation
    // We store article-relative coordinates so the cursor stays pinned during scroll
    const cursorPositions = new Map<string, { rx: number; ry: number }>();

    // Track last article width to detect resize
    let lastArticleWidth = 0;

    const updateAllCursorPositions = () => {
      const container = cursorContainerRef.current;
      if (container) {
        const articleContainer = document.querySelector('.wikipedia-viewer');
        if (articleContainer) {
          const currentArticleWidth = (articleContainer as HTMLElement).offsetWidth;

          // Detect window resize - reset cursor positions to prevent "traveling"
          if (lastArticleWidth > 0 && Math.abs(currentArticleWidth - lastArticleWidth) > 1) {
            // Clear interpolated positions to force immediate snap to new positions
            cursorPositions.clear();
          }
          lastArticleWidth = currentArticleWidth;

          // Update each cursor's screen position based on stored article-relative coordinates
          const cursors = container.querySelectorAll('.other-player-cursor');
          cursors.forEach((cursor) => {
            const cursorEl = cursor as HTMLElement;
            const playerId = cursorEl.getAttribute('data-player-id') || '';
            const cursorArticle = cursorEl.getAttribute('data-article') || '';

            // Only show cursor if it's on the same page
            if (cursorArticle !== currentArticle) {
              cursorEl.style.display = 'none';
              return;
            }

            cursorEl.style.display = '';

            const pqx = parseFloat(cursorEl.getAttribute('data-x') || '0');
            const pqy = parseFloat(cursorEl.getAttribute('data-y') || '0');
            const anchorId = cursorEl.getAttribute('data-anchor-id') || null;
            const nextAnchorId = cursorEl.getAttribute('data-next-anchor-id') || null;
            const sectionRatio = parseFloat(cursorEl.getAttribute('data-section-ratio') || '0');

            // Convert to target pixel positions using section interpolation
            const targetRx = pqx * currentArticleWidth;
            const targetRy = resolveSectionPosition(anchorId, nextAnchorId, sectionRatio, pqy, articleContainer);

            // Get current position or initialize to target
            let pos = cursorPositions.get(playerId);
            if (!pos) {
              pos = { rx: targetRx, ry: targetRy };
              cursorPositions.set(playerId, pos);
            }

            // Smooth interpolation on relative coordinates (lerp factor 0.3 = responsive but smooth)
            pos.rx += (targetRx - pos.rx) * 0.3;
            pos.ry += (targetRy - pos.ry) * 0.3;

            // Apply coordinates directly as absolute transform
            cursorEl.style.transform = `translate(${pos.rx}px, ${pos.ry}px)`;
          });
        }
      }

      rafId = requestAnimationFrame(updateAllCursorPositions);
    };

    rafId = requestAnimationFrame(updateAllCursorPositions);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isMultiplayer, currentArticle]);

  // Clean up cursor elements for players who have disconnected
  useEffect(() => {
    if (!isMultiplayer) return;

    const container = cursorContainerRef.current;
    if (!container) return;

    // Get all cursor elements
    const cursorElements = container.querySelectorAll('.other-player-cursor');
    const activePlayerIds = new Set(players.map(p => p.id));

    // Remove cursors for players no longer in the room
    cursorElements.forEach((cursorEl) => {
      const playerId = (cursorEl as HTMLElement).getAttribute('data-player-id');
      if (playerId && !activePlayerIds.has(playerId)) {
        console.log('Removing cursor for disconnected player:', playerId);
        cursorEl.remove();
        // Clean up related data
        cursorDataRef.current.delete(playerId);
        highlightedElementsRef.current.delete(playerId);
      }
    });
  }, [players, isMultiplayer]);

  const handlePlayAgain = () => {
    if (isMultiplayer && lobbyCode) {
      // Navigate back to the same lobby
      sessionStorage.removeItem("wiki-race-started-at");
      sessionStorage.removeItem("wiki-race-player-name");
      disconnect();
      navigate(`/lobby?code=${lobbyCode}&player=${encodeURIComponent(playerName)}`);
    } else {
      // Solo mode: restart with same route
      window.location.reload();
    }
  };

  const handleNewRoute = () => {
    // Clear race state when leaving the game
    sessionStorage.removeItem("wiki-race-started-at");
    sessionStorage.removeItem("wiki-race-player-name");

    // Disconnect from WebSocket
    disconnect();

    // Go back to menu or lobby browser
    if (isMultiplayer) {
      navigate("/lobby-browser", { state: { direction: "back" } });
    } else {
      navigate("/", { state: { direction: "back" } });
    }
  };

  // Get cursors on the same article

  return (
    <div className="game-page">
      {/* Hidden icon cache for extracting HTML */}
      <div ref={pointerIconCacheRef} style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
        <FaMousePointer />
      </div>
      <div ref={textIconCacheRef} style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
        <FaICursor />
      </div>
      <div ref={handIconCacheRef} style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
        <FaHandPointer />
      </div>
      <div className="game-article-container">
        <WikipediaViewer
          initialTitle={startArticle}
          hideControls={true}
          onArticleLoaded={() => setArticleLoaded(true)}
          onArticleNavigate={(articleName) => {
            handleArticleNavigate(articleName);
          }}
          endArticle={endArticle}
          onDestinationReached={() => setRouteCompleted(true)}
        >
          {/* Other players' cursors - rendered via direct DOM manipulation for performance */}
          {isMultiplayer && <div ref={cursorContainerRef} className="cursor-container" />}
        </WikipediaViewer>
      </div>
      <div className={`game-hud ${hudVisible ? "visible" : ""}`}>
        {/* Scoreboard */}
        {isMultiplayer && (
          <Scoreboard
            players={players.filter(p => !p.finished)}
            currentPlayerClicks={players.find(p =>
              currentPlayerIdRef.current ? p.id === currentPlayerIdRef.current : p.name === playerName
            )?.clicks || localClicks}
            currentPlayerName={players.find(p =>
              currentPlayerIdRef.current ? p.id === currentPlayerIdRef.current : p.name === playerName
            )?.name || playerName || "You"}
          />
        )}
        {/* Finished players indicator - commented out per user request */}
        {/* {isMultiplayer && finishedPlayers.length > 0 && (
          <div className="multiplayer-finished">
            <div className="multiplayer-finished-header">Finished</div>
            {finishedPlayers.map((p, i) => (
              <div key={p.playerId} className="multiplayer-finish-row">
                <span className="mp-finish-rank">#{i + 1}</span>
                <span className="mp-finish-name">{p.playerName} {p.playerName === playerName && <span className="me-label">(You)</span>}</span>
                <span className="mp-finish-time">{(p.time / 1000).toFixed(2)}s</span>
              </div>
            ))}
          </div>
        )} */}
        <SpeedrunWidget
          ref={speedrunWidgetRef}
          gameMode={isMultiplayer ? "Race" : "Single Player"}
          startArticle={startArticle}
          endArticle={endArticle}
          isRunning={articleLoaded && hudVisible}
          isStopped={routeCompleted}
          isMultiplayer={isMultiplayer}
        />
        <CountdownNotification
          secondsLeft={endGameCountdown}
          visible={showCountdown}
        />
      </div>
      {showVictoryModal && (gameStats || isMultiplayer) && (
        <VictoryModal
          finalTime={gameStats?.finalTime || "DNF"}
          segments={gameStats?.segments || []}
          startArticle={startArticle}
          endArticle={endArticle}
          players={mockPlayers.length > 0 ? mockPlayers : (
            players.length > 0 ? players : [{
              id: 'local-player',
              name: playerName || "You",
              currentArticle: currentArticle,
              clicks: localClicks,
              path: [], // No path data if we didn't finish
              finished: false,
              finishTime: 0
            }]
          )}
          messages={messages}
          currentPlayerClicks={gameStats ? localClicks : localClicks}
          currentPlayerName={mockPlayers.length > 0 ? (playerName || "SwiftRunner42") : (players.find(p =>
            currentPlayerIdRef.current ? p.id === currentPlayerIdRef.current : p.name === playerName
          )?.name || playerName || "You")}
          onPlayAgain={handlePlayAgain}
          onNewRoute={handleNewRoute}
          onSendMessage={(text: string) => {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              type: 'chat',
              playerName: playerName || "You",
              text,
              timestamp: new Date()
            }]);
          }}
          rank={gameStats ? (finishedPlayers.findIndex(p => p.playerId === (currentPlayerIdRef.current || 'local-player')) + 1) : undefined}
          didFinish={!!gameStats}
          totalPlayers={players.length}
        />
      )}
      <GameNotification
        playerName={notificationPlayerName}
        playerColor={notificationPlayerColor}
        type={notificationType}
        visible={showNotification}
      />

      {/* Test button to toggle menu */}
      {/* Test button to toggle menu */}
      {/* <button
        className="same-page-test-button same-page-test-button-menu"
        onClick={handleToggleMenu}
      >
        Show Menu
      </button> */}
    </div>
  );
};

export default Game;
