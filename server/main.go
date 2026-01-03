package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/markotsymbaluk/wiki-racing/internal/hub"
)

func main() {
	h := hub.New()
	go h.Run()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		hub.ServeWs(h, w, r)
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// Lobbies endpoint - returns list of available lobbies
	http.HandleFunc("/lobbies", func(w http.ResponseWriter, r *http.Request) {
		// CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		lobbies := h.GetLobbies()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(lobbies)
	})

	// Get port from environment variable (Railway provides this)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Racing server starting on :%s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal("ListenAndServe:", err)
	}
}







