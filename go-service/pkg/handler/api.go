package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/cosmic-hash/CryptoPulse/pkg/config"
    "github.com/cosmic-hash/CryptoPulse/pkg/db"
	"github.com/cosmic-hash/CryptoPulse/pkg/model"
)

// for test injection
var (
    fetchRawMessagesBetween   = db.FetchRawMessagesBetween
    fetchInitialLastSentiments = db.FetchInitialLastSentiments
    insertAggregatedBatch     = db.InsertAggregatedSentimentBatch
    fetchMessageScores        = db.FetchMessageScoresFromDB
)

type CoinInfo struct {
    ID        int
    Code      string
    Subreddit string
}

var coinsList = []CoinInfo{
    {91,  "BTC",  "Bitcoin"},
    {92,  "ETH",  "ethereum"},
    {93,  "USDT", "Tether+CryptoCurrency"},
    {97,  "XRP",  "Ripple"},
    {95,  "BNB",  "binance"},
    {99,  "SOL",  "solana"},
    {94,  "USDC", "CryptoCurrency"},
    {103,  "TRX",  "Tronix"},
    {100,  "DOGE", "dogecoin"},
    {96, "ADA",  "cardano"},
}

// AggregateRequest lets caller override the window.
type AggregateRequest struct {
    StartTime string `json:"start_time"` // RFC3339
    EndTime   string `json:"end_time"`   // RFC3339
}

// AggregateHandler handles POST /aggregate
func AggregateHandler(w http.ResponseWriter, r *http.Request) {
    type AggregateRequest struct {
        StartTime string `json:"start_time"` // RFC3339
        EndTime   string `json:"end_time"`   // RFC3339
    }
    var req AggregateRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid JSON", http.StatusBadRequest)
        return
    }

    // 1) Determine window
    now := time.Now().UTC()
    end := now
    start := now.Add(-1 * time.Hour)
    if req.EndTime != "" {
        if t, err := time.Parse(time.RFC3339, req.EndTime); err == nil {
            end = t.UTC()
        }
    }
    if req.StartTime != "" {
        if t, err := time.Parse(time.RFC3339, req.StartTime); err == nil {
            start = t.UTC()
        }
    }

    // 2) Fetch raw messages
    raw, err := fetchRawMessagesBetween(start, end)
    if err != nil {
        log.Printf("[Aggregate] fetch raw error: %v", err)
        http.Error(w, "db fetch failed", http.StatusInternalServerError)
        return
    }

    // 3) Build buckets
    window := 5 * time.Minute
    start = start.Truncate(window)
    var buckets []time.Time
    for t := start; !t.After(end); t = t.Add(window) {
        buckets = append(buckets, t)
    }
    grouped := make(map[time.Time]map[int][]db.MessageScore, len(buckets))
    for _, t := range buckets {
        grouped[t] = make(map[int][]db.MessageScore)
    }
    for _, m := range raw {
        b := m.CreatedAt.UTC().Truncate(window)
        if b.Before(start) {
            b = start
        }
        if b.After(end) {
            continue
        }
        grouped[b][m.CurrencyID] = append(grouped[b][m.CurrencyID], m)
    }

    // 4) Prefetch last-known sentiments
    var coinIDs []int
    for _, c := range coinsList {
        coinIDs = append(coinIDs, c.ID)
    }
    lastSent, err := fetchInitialLastSentiments(coinIDs, start)
    if err != nil {
        log.Printf("[Aggregate] fetch initial error: %v", err)
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }

    // 5) Compute & collect
    type bucketEntry struct {
        Time  string             `json:"time"`
        Coins map[string]float64 `json:"coins"`
    }
    var (
        resp     []bucketEntry
        toInsert []struct {
            CoinID    int
            Window    time.Time
            Sentiment float64
        }
    )

    for _, t := range buckets {
        coinsOut := make(map[string]float64, len(coinsList))

        for _, coin := range coinsList {
            msgs := grouped[t][coin.ID]
            var sent float64

            if len(msgs) > 0 {
                // fresh compute
                qScores := map[string][]float64{}
                for _, m := range msgs {
                    if name, ok := config.QuestionMapping[m.QuestionID]; ok {
                        qScores[name] = append(qScores[name], m.SentimentScore)
                    }
                }
                sent = model.CalculateFinalSentiment(model.DefaultWeights, qScores)
                lastSent[coin.ID] = sent

            } else {
                // carry-forward or backfill
                if prev, ok := lastSent[coin.ID]; ok {
                    sent = prev
                } else {
                    hist, err := db.FetchLastAggregatedSentiment(coin.ID, t)
                    if err != nil {
                        log.Printf("[Aggregate] backfill error for coin %d: %v", coin.ID, err)
                    }
                    sent = hist
                    lastSent[coin.ID] = sent
                }
            }

            //  Always schedule an insert, fresh or carried
            toInsert = append(toInsert, struct {
                CoinID    int
                Window    time.Time
                Sentiment float64
            }{coin.ID, t, sent})

            coinsOut[coin.Code] = sent
        }

        resp = append(resp, bucketEntry{
            Time:  t.Format(time.RFC3339),
            Coins: coinsOut,
        })
    }

    // 6) Bulk insert everything (duplicates noop)
    if err := insertAggregatedBatch(toInsert); err != nil {
        log.Printf("[Aggregate] Bulk insert error: %v", err)
    } else {
        log.Printf("[Aggregate] Bulk insert OK: %d records", len(toInsert))
    }

    // 7) Return JSON
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(resp); err != nil {
        log.Printf("[Aggregate] JSON encode error: %v", err)
    }
}
// HelloHandler serves GET /
func HelloHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Write([]byte("Hello"))
}

// SentimentHandler serves POST /sentiment
func SentimentHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    // 1) Fetch data from DB
    samples, err := fetchMessageScores()
    if err != nil {
        log.Printf("DB fetch error: %v", err)
        http.Error(w, "Internal server error", http.StatusInternalServerError)
        return
    }
    log.Printf("Fetched %d samples", len(samples))

    // 2) Prepare three 5‑minute buckets ending now, now‑5min, now‑10min
    now := time.Now()
    bucketEnds := []time.Time{
        now.Add(-10 * time.Minute),
        now.Add(-5 * time.Minute),
        now,
    }

    // 3) Build response array
    response := make([]map[string]interface{}, 0, len(bucketEnds))
    for _, end := range bucketEnds {
        start := end.Add(-5 * time.Minute)
        entry := map[string]interface{}{
            "time": end.Format("02-January-2006 15:04"),
        }

        // sum & count per currency
        sums := map[int]float64{}
        counts := map[int]int{}
        for _, m := range samples {
            if m.CreatedAt.After(start) && !m.CreatedAt.After(end) {
                sums[m.CurrencyID] += m.SentimentScore
                counts[m.CurrencyID]++
            }
        }

        // compute averages
        for cid, sum := range sums {
            avg := sum / float64(counts[cid])
            entry[strconv.Itoa(cid)] = avg
        }
        response = append(response, entry)
    }

    // 4) Return JSON
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(response); err != nil {
        log.Printf("Encode error: %v", err)
    }
}