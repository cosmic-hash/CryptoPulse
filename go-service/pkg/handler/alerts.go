package handlers

import (
    "context"
    "encoding/json"
    "net/http"
	"log"

    "github.com/cosmic-hash/CryptoPulse/pkg/alert"
	
)

// CreateAlertHandler handles POST /alerts
func CreateAlertHandler(w http.ResponseWriter, r *http.Request) {
    userID := r.Header.Get("X-User-ID")
    if userID == "" {
        http.Error(w, "X-User-ID header required", http.StatusBadRequest)
        return
    }

    var req struct {
        CoinID    int     `json:"coinId"`
        Threshold float64 `json:"threshold"`
        Email     string  `json:"email"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid payload", http.StatusBadRequest)
        return
    }

    sub := alert.Subscription{
        UserID:    userID,
        CoinID:    req.CoinID,
        Threshold: req.Threshold,
        Email:     req.Email,
    }
    if err := alert.CreateSubscription(context.Background(), &sub); err != nil {
        http.Error(w, "Could not create alert", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(sub)
}

// ListAlertsHandler handles GET /alerts
// Expects X-User-ID header
func ListAlertsHandler(w http.ResponseWriter, r *http.Request) {
    userID := r.Header.Get("X-User-ID")
    log.Printf("[ListAlerts] X-User-ID=%q", userID)
    if userID == "" {
        http.Error(w, "X-User-ID required", http.StatusBadRequest)
        return
    }

    subs, err := alert.FetchSubscriptionsForUser(context.Background(), userID)
    if err != nil {
        log.Printf("[ListAlerts] fetch error: %v", err)
        http.Error(w, "could not list alerts", http.StatusInternalServerError)
        return
    }
    log.Printf("[ListAlerts] returning %d subscriptions", len(subs))

    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(subs); err != nil {
        log.Printf("[ListAlerts] encode error: %v", err)
    }
}


// DeleteAlertHandler handles DELETE /alerts/{id}
func DeleteAlertHandler(w http.ResponseWriter, r *http.Request) {
    // 1) Read the user ID from the header
    userID := r.Header.Get("X-User-ID")
    log.Printf("[Delete] Step 1: X-User-ID header = %q", userID)
    if userID == "" {
        http.Error(w, "X-User-ID header required", http.StatusBadRequest)
        log.Println("[Delete] Error: missing X-User-ID header")
        return
    }

    // 2) Extract the {id} we injected into the query string in main.go
    id := r.URL.Query().Get("id")
    log.Printf("[Delete] Step 2: extracted id = %q", id)
    if id == "" {
        http.Error(w, "Missing alert ID", http.StatusBadRequest)
        log.Println("[Delete] Error: missing alert ID in query")
        return
    }

    // 3) Attempt to delete the subscription
    log.Printf("[Delete] Step 3: calling alert.DeleteSubscription for id %q", id)
    if err := alert.DeleteSubscription(context.Background(), id); err != nil {
        http.Error(w, "Delete failed", http.StatusInternalServerError)
        log.Printf("[Delete] Error: DeleteSubscription returned: %v", err)
        return
    }

    // 4) Success – return 204 No Content
    w.WriteHeader(http.StatusNoContent)
    log.Printf("[Delete] Step 4: successfully deleted subscription %q for user %q", id, userID)
}

// UpdateAlertHandler handles PUT /alerts/{id}
// Expects header: X-User-ID
// Body: { "coinId": 99, "threshold": 0.5 }
func UpdateAlertHandler(w http.ResponseWriter, r *http.Request) {
    userID := r.Header.Get("X-User-ID")
    if userID == "" {
        http.Error(w, "X-User-ID header required", http.StatusBadRequest)
        return
    }

    // grab the Firestore doc ID injected in main.go
    docID := r.URL.Query().Get("id")
    if docID == "" {
        http.Error(w, "Missing alert ID", http.StatusBadRequest)
        return
    }

    // parse update payload
    var req struct {
        CoinID    int     `json:"coinId"`
        Threshold float64 `json:"threshold"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid JSON body", http.StatusBadRequest)
        return
    }

    // perform the update
    if err := alert.UpdateSubscription(context.Background(), docID, req.CoinID, req.Threshold); err != nil {
        log.Printf("[UpdateAlert] error updating %q: %v", docID, err)
        http.Error(w, "Failed to update alert", http.StatusInternalServerError)
        return
    }

    // respond with the updated values
    w.Header().Set("Content-Type", "application/json")
    resp := map[string]interface{}{
        "id":        docID,
        "coinId":    req.CoinID,
        "threshold": req.Threshold,
    }
    json.NewEncoder(w).Encode(resp)
}


