// pkg/handler/api_test.go
package handlers

import (
    // "bytes"
    "encoding/json"
    "io"
    "net/http"
    "net/http/httptest"
    "testing"
    "time"

    "github.com/cosmic-hash/CryptoPulse/pkg/db"
    // "github.com/cosmic-hash/CryptoPulse/pkg/model"
)

// override the DB functions under test
func TestHelloHandler(t *testing.T) {
    req := httptest.NewRequest(http.MethodGet, "/", nil)
    rr  := httptest.NewRecorder()

    HelloHandler(rr, req)

    if rr.Code != http.StatusOK {
        t.Fatalf("expected 200 OK, got %d", rr.Code)
    }
    if body := rr.Body.String(); body != "Hello" {
        t.Errorf("expected body = %q, got %q", "Hello", body)
    }
}

func TestSentimentHandler_NoDB(t *testing.T) {
    // force an error path
    fetchMessageScores = func() ([]db.MessageScore, error) {
        return nil, io.ErrUnexpectedEOF
    }
    defer func() { fetchMessageScores = db.FetchMessageScoresFromDB }()

    req := httptest.NewRequest(http.MethodPost, "/sentiment", nil)
    rr  := httptest.NewRecorder()

    SentimentHandler(rr, req)

    if rr.Code != http.StatusInternalServerError {
        t.Fatalf("expected 500, got %d", rr.Code)
    }
}

func TestSentimentHandler_OK(t *testing.T) {
    now := time.Now()
    sample := db.MessageScore{
        CurrencyID:   42,
        SentimentScore: 1.5,
        CreatedAt:    now.Add(-2 * time.Minute),
    }

    fetchMessageScores = func() ([]db.MessageScore, error) {
        return []db.MessageScore{sample}, nil
    }
    defer func() { fetchMessageScores = db.FetchMessageScoresFromDB }()

    req := httptest.NewRequest(http.MethodPost, "/sentiment", nil)
    rr  := httptest.NewRecorder()

    SentimentHandler(rr, req)

    if rr.Code != http.StatusOK {
        t.Fatalf("expected 200, got %d", rr.Code)
    }

    var resp []map[string]interface{}
    if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
        t.Fatalf("unmarshal: %v", err)
    }
    // should produce three entries, second bucket should include our sample
    if len(resp) != 3 {
        t.Errorf("expected 3 buckets, got %d", len(resp))
    }
    // find the bucket covering now-5m → now
    found := false
    for _, entry := range resp {
        if entry["time"] != nil {
            // verify the 42 key exists and equals 1.5
            if v, ok := entry["42"]; ok && v.(float64) == sample.SentimentScore {
                found = true
            }
        }
    }
    if !found {
        t.Error("did not find our sample sentiment in any bucket")
    }
}
