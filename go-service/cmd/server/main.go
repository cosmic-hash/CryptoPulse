package main

import (
    "io/ioutil"
    "log"
    "net/http"
    "os"
    "strings"

    "github.com/joho/godotenv"

    "github.com/cosmic-hash/CryptoPulse/pkg/config"
    "github.com/cosmic-hash/CryptoPulse/pkg/db"
    "github.com/cosmic-hash/CryptoPulse/pkg/firebase"
    handlers "github.com/cosmic-hash/CryptoPulse/pkg/handler"
    openai "github.com/cosmic-hash/CryptoPulse/pkg/openai"
)

// withCORS wraps your handler to support CORS
func withCORS(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // allow your frontend origin (or "*" for all)
        w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-User-ID")

        // preflight
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusOK)
            return
        }
        next.ServeHTTP(w, r)
    })
}

func main() {
    // 1) Load .env if present
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found, falling back to env vars")
    }

    // 1.a) Initialize OpenAI client
    openai.InitClient()

    // 2) Init Database & Firebase
    db.InitDB()
    firebase.Init()

    // 3) Load question mapping
    mappingPath := os.Getenv("QUESTION_MAPPING_FILE")
    if mappingPath == "" {
        mappingPath = "mapping.json"
    }
    data, err := ioutil.ReadFile(mappingPath)
    if err != nil {
        log.Fatalf("Error reading mapping file %q: %v", mappingPath, err)
    }
    if err := config.LoadQuestionMapping(data); err != nil {
        log.Fatalf("Error parsing mapping file: %v", err)
    }

    // 4) Wire up routes on a new mux
    mux := http.NewServeMux()

    // 4.a) /alerts → list & create
    mux.HandleFunc("/alerts", func(w http.ResponseWriter, r *http.Request) {
        switch r.Method {
        case http.MethodGet:
            handlers.ListAlertsHandler(w, r)
        case http.MethodPost:
            handlers.CreateAlertHandler(w, r)
        default:
            http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
        }
    })

    // 4.b) /alerts/{id} → update & delete
    mux.HandleFunc("/alerts/", func(w http.ResponseWriter, r *http.Request) {
        // strip the prefix to get the alert doc ID
        id := strings.TrimPrefix(r.URL.Path, "/alerts/")
        if id == "" {
            http.Error(w, "Missing alert ID", http.StatusBadRequest)
            return
        }
        // inject into query for handlers to read
        q := r.URL.Query()
        q.Set("id", id)
        r.URL.RawQuery = q.Encode()

        switch r.Method {
        case http.MethodPut:
            handlers.UpdateAlertHandler(w, r)
        case http.MethodDelete:
            handlers.DeleteAlertHandler(w, r)
        default:
            http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
        }
    })

    // 4.c) Other core endpoints
    mux.HandleFunc("/", handlers.HelloHandler)
    mux.HandleFunc("/sentiment", handlers.SentimentHandler)
    mux.HandleFunc("/ws", handlers.WSHandler)
    mux.HandleFunc("/aggregate", handlers.AggregateHandler)
    mux.HandleFunc("/explain", handlers.ExplainSentimentHandler)

    // 5) Wrap with CORS and start server
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    log.Printf("🟢 Server listening on port %s", port)
    handler := withCORS(mux)
    log.Fatal(http.ListenAndServe(":"+port, handler))
}