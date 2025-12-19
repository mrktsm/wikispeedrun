package hub

import (
	"encoding/json"
	"log"
	"sync"
)

// Message types
const (
	MsgTypeJoinRoom      = "join_room"
	MsgTypeRejoinRoom    = "rejoin_room"
	MsgTypeLeaveRoom     = "leave_room"
	MsgTypeStartRace     = "start_race"
	MsgTypeNavigate      = "navigate"
	MsgTypeFinish        = "finish"
	MsgTypeCursor        = "cursor"
	MsgTypeRoomState     = "room_state"
	MsgTypePlayerJoined  = "player_joined"
	MsgTypePlayerLeft    = "player_left"
	MsgTypeRaceStarted   = "race_started"
	MsgTypePlayerUpdate  = "player_update"
	MsgTypePlayerFinish  = "player_finish"
	MsgTypeCursorUpdate  = "cursor_update"
	MsgTypeError         = "error"
)

// Message is the base structure for all WebSocket messages
type Message struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// Room represents a racing room
type Room struct {
	ID           string             `json:"id"`
	Players      map[string]*Player `json:"players"`
	StartArticle string             `json:"startArticle"`
	EndArticle   string             `json:"endArticle"`
	Started      bool               `json:"started"`
	mu           sync.RWMutex
}

// Player represents a player in a room
type Player struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	CurrentArticle string   `json:"currentArticle"`
	Clicks         int      `json:"clicks"`
	Path           []string `json:"path"`
	Finished       bool     `json:"finished"`
	FinishTime     int64    `json:"finishTime,omitempty"`
	client         *Client
}

// Hub maintains the set of active clients and rooms
type Hub struct {
	clients    map[*Client]bool
	rooms      map[string]*Room
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

// New creates a new Hub
func New() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		rooms:      make(map[string]*Room),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client connected: %s", client.id)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				h.removeClientFromRoom(client)
			}
			h.mu.Unlock()
			log.Printf("Client disconnected: %s", client.id)
		}
	}
}

// HandleMessage processes incoming messages from clients
func (h *Hub) HandleMessage(client *Client, msg Message) {
	switch msg.Type {
	case MsgTypeJoinRoom:
		h.handleJoinRoom(client, msg.Payload)
	case MsgTypeRejoinRoom:
		h.handleRejoinRoom(client, msg.Payload)
	case MsgTypeLeaveRoom:
		h.handleLeaveRoom(client)
	case MsgTypeStartRace:
		h.handleStartRace(client)
	case MsgTypeNavigate:
		h.handleNavigate(client, msg.Payload)
	case MsgTypeFinish:
		h.handleFinish(client, msg.Payload)
	case MsgTypeCursor:
		h.handleCursor(client, msg.Payload)
	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

type JoinRoomPayload struct {
	RoomID       string `json:"roomId"`
	PlayerName   string `json:"playerName"`
	StartArticle string `json:"startArticle"`
	EndArticle   string `json:"endArticle"`
}

func (h *Hub) handleJoinRoom(client *Client, payload json.RawMessage) {
	var p JoinRoomPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		client.sendError("Invalid join payload")
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	room, exists := h.rooms[p.RoomID]
	if !exists {
		// Create new room
		room = &Room{
			ID:           p.RoomID,
			Players:      make(map[string]*Player),
			StartArticle: p.StartArticle,
			EndArticle:   p.EndArticle,
			Started:      false,
		}
		h.rooms[p.RoomID] = room
	}

	if room.Started {
		client.sendError("Race already started")
		return
	}

	player := &Player{
		ID:             client.id,
		Name:           p.PlayerName,
		CurrentArticle: p.StartArticle,
		Clicks:         0,
		Path:           []string{p.StartArticle},
		Finished:       false,
		client:         client,
	}

	room.mu.Lock()
	room.Players[client.id] = player
	room.mu.Unlock()

	client.roomID = p.RoomID

	// Notify other players
	h.broadcastToRoom(room, Message{
		Type:    MsgTypePlayerJoined,
		Payload: mustMarshal(player),
	}, client)

	// Send room state to new player
	client.sendMessage(Message{
		Type:    MsgTypeRoomState,
		Payload: mustMarshal(room),
	})
}

func (h *Hub) handleLeaveRoom(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.removeClientFromRoom(client)
}

type RejoinRoomPayload struct {
	RoomID     string `json:"roomId"`
	PlayerName string `json:"playerName"`
}

// handleRejoinRoom allows a player to reconnect to an in-progress race
func (h *Hub) handleRejoinRoom(client *Client, payload json.RawMessage) {
	var p RejoinRoomPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		client.sendError("Invalid rejoin payload")
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	room, exists := h.rooms[p.RoomID]
	if !exists {
		client.sendError("Room not found")
		return
	}

	room.mu.Lock()
	defer room.mu.Unlock()

	// Find the player by name and update their client reference
	var existingPlayer *Player
	var oldClientID string
	for id, player := range room.Players {
		if player.Name == p.PlayerName {
			existingPlayer = player
			oldClientID = id
			break
		}
	}

	if existingPlayer != nil {
		// Update the player's client and ID
		delete(room.Players, oldClientID)
		existingPlayer.ID = client.id
		existingPlayer.client = client
		room.Players[client.id] = existingPlayer
		client.roomID = p.RoomID

		log.Printf("Player %s rejoined room %s", p.PlayerName, p.RoomID)

		// Send current room state to the rejoining player
		client.sendMessage(Message{
			Type:    MsgTypeRoomState,
			Payload: mustMarshal(room),
		})
		return
	}

	// If player not found and race is started, they can't join
	if room.Started {
		client.sendError("Race already started and you're not a participant")
		return
	}

	// Otherwise, add as new player (race not started yet)
	player := &Player{
		ID:             client.id,
		Name:           p.PlayerName,
		CurrentArticle: room.StartArticle,
		Clicks:         0,
		Path:           []string{room.StartArticle},
		Finished:       false,
		client:         client,
	}
	room.Players[client.id] = player
	client.roomID = p.RoomID

	// Send room state
	client.sendMessage(Message{
		Type:    MsgTypeRoomState,
		Payload: mustMarshal(room),
	})
}

func (h *Hub) handleStartRace(client *Client) {
	h.mu.RLock()
	room, exists := h.rooms[client.roomID]
	h.mu.RUnlock()

	if !exists {
		client.sendError("Room not found")
		return
	}

	room.mu.Lock()
	if room.Started {
		room.mu.Unlock()
		client.sendError("Race already started")
		return
	}
	room.Started = true
	room.mu.Unlock()

	h.broadcastToRoom(room, Message{
		Type:    MsgTypeRaceStarted,
		Payload: mustMarshal(map[string]interface{}{
			"startArticle": room.StartArticle,
			"endArticle":   room.EndArticle,
		}),
	}, nil)
}

type NavigatePayload struct {
	Article string `json:"article"`
}

func (h *Hub) handleNavigate(client *Client, payload json.RawMessage) {
	var p NavigatePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return
	}

	h.mu.RLock()
	room, exists := h.rooms[client.roomID]
	h.mu.RUnlock()

	if !exists {
		return
	}

	room.mu.Lock()
	player, exists := room.Players[client.id]
	if exists && !player.Finished {
		player.CurrentArticle = p.Article
		player.Clicks++
		player.Path = append(player.Path, p.Article)
	}
	room.mu.Unlock()

	if exists {
		h.broadcastToRoom(room, Message{
			Type: MsgTypePlayerUpdate,
			Payload: mustMarshal(map[string]interface{}{
				"playerId":       client.id,
				"currentArticle": p.Article,
				"clicks":         player.Clicks,
			}),
		}, nil)
	}
}

type FinishPayload struct {
	Time int64 `json:"time"`
}

func (h *Hub) handleFinish(client *Client, payload json.RawMessage) {
	var p FinishPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return
	}

	h.mu.RLock()
	room, exists := h.rooms[client.roomID]
	h.mu.RUnlock()

	if !exists {
		return
	}

	room.mu.Lock()
	player, exists := room.Players[client.id]
	if exists && !player.Finished {
		player.Finished = true
		player.FinishTime = p.Time
	}
	room.mu.Unlock()

	if exists {
		h.broadcastToRoom(room, Message{
			Type: MsgTypePlayerFinish,
			Payload: mustMarshal(map[string]interface{}{
				"playerId":   client.id,
				"playerName": player.Name,
				"time":       p.Time,
				"clicks":     player.Clicks,
				"path":       player.Path,
			}),
		}, nil)
	}
}

func (h *Hub) removeClientFromRoom(client *Client) {
	if client.roomID == "" {
		return
	}

	room, exists := h.rooms[client.roomID]
	if !exists {
		return
	}

	room.mu.Lock()
	// Don't remove player if race has started - they're just transitioning to game page
	// and will rejoin with a new WebSocket connection
	if room.Started {
		// Just clear the client reference, keep the player in the room
		if player, ok := room.Players[client.id]; ok {
			player.client = nil
			log.Printf("Player %s disconnected from started race, keeping in room", player.Name)
		}
		room.mu.Unlock()
		client.roomID = ""
		return
	}

	delete(room.Players, client.id)
	playerCount := len(room.Players)
	room.mu.Unlock()

	// Notify others
	h.broadcastToRoom(room, Message{
		Type: MsgTypePlayerLeft,
		Payload: mustMarshal(map[string]string{
			"playerId": client.id,
		}),
	}, client)

	// Clean up empty rooms only if race hasn't started
	if playerCount == 0 {
		delete(h.rooms, client.roomID)
		log.Printf("Room deleted: %s", client.roomID)
	}

	client.roomID = ""
}

type CursorPayload struct {
	X          float64 `json:"x"`
	Y          float64 `json:"y"`
	Article    string  `json:"article"`
	CursorType string  `json:"cursorType,omitempty"`
}

func (h *Hub) handleCursor(client *Client, payload json.RawMessage) {
	var p CursorPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return
	}

	h.mu.RLock()
	room, exists := h.rooms[client.roomID]
	h.mu.RUnlock()

	if !exists {
		return
	}

	room.mu.RLock()
	player, exists := room.Players[client.id]
	room.mu.RUnlock()

	if !exists {
		return
	}

	// Broadcast cursor position to other players (exclude sender)
	h.broadcastToRoom(room, Message{
		Type: MsgTypeCursorUpdate,
		Payload: mustMarshal(map[string]interface{}{
			"playerId":   client.id,
			"playerName": player.Name,
			"x":          p.X,
			"y":          p.Y,
			"article":    p.Article,
			"cursorType": p.CursorType,
		}),
	}, client)
}

func (h *Hub) broadcastToRoom(room *Room, msg Message, exclude *Client) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	room.mu.RLock()
	defer room.mu.RUnlock()

	for _, player := range room.Players {
		// Skip if player has no client (disconnected, waiting to rejoin)
		if player.client == nil {
			continue
		}
		if player.client != exclude {
			select {
			case player.client.send <- data:
			default:
				// Client buffer full, skip
			}
		}
	}
}

func mustMarshal(v interface{}) json.RawMessage {
	data, _ := json.Marshal(v)
	return data
}

