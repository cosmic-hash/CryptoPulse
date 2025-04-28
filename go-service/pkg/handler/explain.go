package handlers

import (
    // "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "sort"
    "strings"
    "time"

    gpt "github.com/openai/openai-go"
    "github.com/cosmic-hash/CryptoPulse/pkg/db"
    oai "github.com/cosmic-hash/CryptoPulse/pkg/openai"
)

type explainRequest struct {
    CoinID    int    `json:"coin_id"`
    StartTime string `json:"start_time"` // RFC3339
    EndTime   string `json:"end_time"`
}

type explainResponse struct {
    Explanation string `json:"explanation"`
}

// ExplainSentimentHandler handles POST /explain
// Body: { "coin_id":99, "start_time":"2025-04-21T15:00:00Z", "end_time":"2025-04-21T16:00:00Z" }
func ExplainSentimentHandler(w http.ResponseWriter, r *http.Request) {
    // 1) Decode request
    var req explainRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(explainResponse{Explanation: "Invalid request"})
        return
    }

    // 2) Parse times
    start, err := time.Parse(time.RFC3339, req.StartTime)
    if err != nil {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(explainResponse{Explanation: "Bad start time"})
        return
    }
    end, err := time.Parse(time.RFC3339, req.EndTime)
    if err != nil {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(explainResponse{Explanation: "Bad end time"})
        return
    }

    // 3) Fetch raw messages for that coin and window
    ctx := r.Context()
    raws, err := db.FetchRawMessagesForCoinBetween(ctx, req.CoinID, start, end)
    if err != nil {
        log.Printf("[Explain] DB error: %v", err)
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(explainResponse{Explanation: "Database error"})
        return
    }
    if len(raws) == 0 {
        log.Printf("[Explain] no messages in window, fetching last 2 months")
        fallbackStart := end.AddDate(0, -2, 0)
        alt, err := db.FetchRawMessagesForCoinBetween(ctx, req.CoinID, fallbackStart, end)
        if err != nil {
            log.Printf("[Explain] DB fallback error: %v", err)
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(explainResponse{Explanation: "Database error"})
            return
        }
        if len(alt) == 0 {
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusNotFound)
            json.NewEncoder(w).Encode(explainResponse{Explanation: "No messages"})
            return
        }
        // sort by recency and take up to 10 nearest to end
        sort.Slice(alt, func(i, j int) bool {
            return alt[i].CreatedAt.After(alt[j].CreatedAt)
        })
        if len(alt) > 10 {
            alt = alt[:10]
        }
        raws = alt
    }

    // 4) Build a prompt from up to the first 20 messages
    var sb strings.Builder
    sb.WriteString(fmt.Sprintf(
        "Here are %d messages about coin %d between %s and %s:\n\n",
        len(raws), req.CoinID,
        start.Format(time.RFC3339),
        end.Format(time.RFC3339),
    ))
    for i, m := range raws {
        if i == 20 {
            sb.WriteString("\n… and more messages …\n")
            break
        }
        sb.WriteString("- ")
        sb.WriteString(m.Content)
        sb.WriteString("\n")
    }
    sb.WriteString("\nMention all the reasons why this sentiment occurred and please be direct, giving only the reasons.")

    // 5) Call OpenAI
    chatReq := gpt.ChatCompletionNewParams{
        Model: "gpt-4.1-nano", // or "gpt-4.1-nano" if available
        Messages: []gpt.ChatCompletionMessageParamUnion{
            gpt.SystemMessage("You are a helpful assistant that explains sentiment."),
            gpt.UserMessage(sb.String()),
        },
    }
    chatResp, err := oai.ChatClient.Chat.Completions.New(ctx, chatReq)
    if err != nil {
        log.Printf("[Explain] OpenAI error: %v", err)
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(explainResponse{Explanation: "AI error"})
        return
    }

    // 6) Send back the explanation
    explanation := chatResp.Choices[0].Message.Content
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(explainResponse{Explanation: explanation})
}