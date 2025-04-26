package alert

import (
    "context"
	"google.golang.org/api/iterator"
    "github.com/cosmic-hash/CryptoPulse/pkg/firebase"
	"cloud.google.com/go/firestore"
	"log"
	"github.com/google/uuid"
	
)

type Subscription struct {
    ID        string  `firestore:"ID"`
    UserID    string  `firestore:"userId"`
    CoinID    int     `firestore:"coinId"`
    Threshold float64 `firestore:"threshold"`
    Email     string  `firestore:"email"`
}

// FetchSubscriptionsForUser pulls all subs where userId == the given.
func FetchSubscriptionsForUser(ctx context.Context, userID string) ([]Subscription, error) {
    fs := firebase.Client()
    iter := fs.Collection("alert_subscriptions").
        Where("userId", "==", userID).
        Documents(ctx)

    var subs []Subscription
    for {
		doc, err := iter.Next()
		if err == iterator.Done {
				break
			}
        if err != nil {
            return nil, err
        }
        var s Subscription
        if err := doc.DataTo(&s); err != nil {
            return nil, err
        }
        s.ID = doc.Ref.ID
        subs = append(subs, s)
    }
    return subs, nil
}

// CreateSubscription writes a subscription with *your* UUID as the doc ID.
func CreateSubscription(ctx context.Context, s *Subscription) error {
    // 1) Generate a new UUID for this subscription
    s.ID = uuid.NewString()

    // 2) Prepare Firestore client and doc reference
    fs := firebase.Client()
    docRef := fs.Collection("alert_subscriptions").Doc(s.ID)

    // 3) Write data (excluding ID, since it's in the path)
    data := map[string]interface{}{
        "userId":    s.UserID,
        "coinId":    s.CoinID,
        "threshold": s.Threshold,
        "email":     s.Email,
    }
    if _, err := docRef.Set(ctx, data); err != nil {
        log.Printf("[CreateSubscription] Set(%s) failed: %v", s.ID, err)
        return err
    }
    log.Printf("[CreateSubscription] created doc %q for user=%q coin=%d", s.ID, s.UserID, s.CoinID)
    return nil
}

// DeleteSubscription now expects exactly the same UUID you generated above.
func DeleteSubscription(ctx context.Context, docID string) error {
    fs := firebase.Client()
    docRef := fs.Collection("alert_subscriptions").Doc(docID)

    log.Printf("[DeleteSubscription] deleting doc %q", docID)
    if _, err := docRef.Delete(ctx); err != nil {
        log.Printf("[DeleteSubscription] Delete(%s) failed: %v", docID, err)
        return err
    }
    log.Printf("[DeleteSubscription] successfully deleted %q", docID)
    return nil
}
// UpdateSubscription updates the coinId & threshold on an existing subscription doc.
func UpdateSubscription(ctx context.Context, docID string, coinID int, threshold float64) error {
    fs := firebase.Client()
    _, err := fs.Collection("alert_subscriptions").
        Doc(docID).
        Set(ctx, map[string]interface{}{
            "coinId":    coinID,
            "threshold": threshold,
        }, firestore.MergeAll)  // only merge these two fields
    if err != nil {
        log.Printf("[UpdateSubscription] failed to update doc %q: %v", docID, err)
    }
    return err
}
