package handlers

import (
    "log"
    "net/http"
    "sort"
    "strconv"
    "strings"
    "time"

    "github.com/gorilla/websocket"
    "github.com/cosmic-hash/CryptoPulse/pkg/db"
)

// upgrader allows HTTP → WebSocket upgrade
var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true },
}

// build a fast lookup from your global coinsList in api.go
var currencyCodeMap = func() map[int]string {
    m := make(map[int]string, len(coinsList))
    for _, c := range coinsList {
        m[c.ID] = c.Code
    }
    return m
}()

// WSHandler streams pre-aggregated sentiment in 5-minute buckets.
// Defaults to last 1h on connect, can override window & tokens via JSON frames,
// and also handles ping/pong.
func WSHandler(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println("[WS] upgrade error:", err)
        return
    }
    defer conn.Close()
    log.Println("[WS] connection established")

    // — ping/pong at protocol level —
    conn.SetPingHandler(func(appData string) error {
        log.Println("[WS] received PING, replying PONG")
        return conn.WriteMessage(websocket.PongMessage, []byte(appData))
    })
    conn.SetPongHandler(func(appData string) error {
        log.Println("[WS] received PONG:", appData)
        return nil
    })

    // — initial tokens filter from query-param —
    var (
        filterCodes []string
        useFilter   bool
    )
    if tok := r.URL.Query().Get("tokens"); tok != "" {
        filterCodes = strings.Split(tok, ",")
        useFilter   = true
        log.Printf("[WS] initial token filter: %v", filterCodes)
    }

    // Reader loop: each JSON frame triggers one send
    for {
        var msg struct {
            StartTime string    `json:"start_time"`
            EndTime   string    `json:"end_time"`
            Tokens    *[]string `json:"tokens"`
        }
        if err := conn.ReadJSON(&msg); err != nil {
            log.Println("[WS] read JSON error or closed:", err)
            return
        }
        // Parse window
        start, err1 := time.Parse(time.RFC3339, msg.StartTime)
        end,   err2 := time.Parse(time.RFC3339, msg.EndTime)
        if err1 != nil || err2 != nil || !start.Before(end) {
            log.Printf("[WS] invalid window: %q → %q", msg.StartTime, msg.EndTime)
            conn.WriteJSON(map[string]string{"error": "invalid start_time or end_time"})
            continue
        }
        log.Printf("[WS] window overridden: %s → %s", start, end)

        // Tokens override
        if msg.Tokens != nil {
            filterCodes = *msg.Tokens
            useFilter   = true
            log.Printf("[WS] tokens overridden: %v", filterCodes)
        }

        // Fetch aggregates
        aggs, err := db.FetchAggregatedSentimentsBetween(start.UTC(), end.UTC())
        if err != nil {
            log.Printf("[WS] db fetch error: %v", err)
            conn.WriteJSON(map[string]string{"error": "db fetch failed"})
            continue
        }

        // Bucket by minute
        buckets := make(map[time.Time]map[string]float64)
        for _, a := range aggs {
            ts := a.WindowStart.UTC().Truncate(time.Minute)
            if buckets[ts] == nil {
                buckets[ts] = make(map[string]float64)
            }
            code := strconv.Itoa(a.CurrencyID)
            if c, ok := currencyCodeMap[a.CurrencyID]; ok {
                code = c
            }
            buckets[ts][code] = a.SentimentScore
        }

        // Decide which coins to include
        var codes []string
        if useFilter {
            codes = filterCodes
        } else {
            for _, c := range coinsList {
                codes = append(codes, c.Code)
            }
        }
        sort.Strings(codes)

        // Build 5-min timeline
        timeline := []time.Time{}
        t0 := start.Truncate(5 * time.Minute)
        for t := t0; !t.After(end); t = t.Add(5 * time.Minute) {
            timeline = append(timeline, t)
        }

        // Assemble payload
        resp := make([]map[string]interface{}, 0, len(timeline))
        for _, ts := range timeline {
            data := make(map[string]float64, len(codes))
            bucket := buckets[ts]
            for _, code := range codes {
                data[code] = bucket[code] // zero if missing
            }
            resp = append(resp, map[string]interface{}{
                "time":  ts.Format("2006-01-02T15:04Z"),
                "coins": data,
            })
        }

        // Send back
        if err := conn.WriteJSON(resp); err != nil {
            log.Println("[WS] write error:", err)
            return
        }
        log.Printf("[WS] sent %d buckets", len(resp))
    }
}