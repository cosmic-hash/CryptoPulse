import React, { useState } from "react";
import { Modal, Spin } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

interface LiveChartTooltipProps {
    /** Recharts passes these automatically */
    active?: boolean;
    payload?: any[];
    label?: string;
    /** Map symbol → human‑readable coin name */
    coinSymbolToName: Record<string, string>;
    /** Map symbol → numeric ID expected by the Explain API */
    coinSymbolToId: Record<string, number>;
}

/**
 * Custom tooltip that renders each coin row with a clickable “?” icon.
 * When the user clicks it we hit the Explain API for that coin & 5‑minute window
 * and show the result in an Ant Design Modal.
 */
const LiveChartTooltip: React.FC<LiveChartTooltipProps> = ({
                                                               active,
                                                               payload,
                                                               label,
                                                               coinSymbolToName,
                                                               coinSymbolToId,
                                                           }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null);

    if (!active || !payload || payload.length === 0) return null;

    /**
     * Fetch reason for sentiment change for a single coin & time‑window.
     */
    const fetchExplanation = async (coinSymbol: string) => {
        const coinId = coinSymbolToId[coinSymbol];
        if (!coinId) return;

        const end = dayjs(label as string, "YYYY-MM-DD HH:mm");
        const start = end.subtract(5, "minute");

        setLoading(true);
        setModalOpen(true);
        setExplanation(null);

        try {
            const res = await fetch(
                "https://crypto-pulse-1-546660857332.us-central1.run.app/explain",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        coin_id: coinId,
                        start_time: start.toISOString(),
                        end_time: end.toISOString(),
                    }),
                }
            );
            const data = await res.json();
            setExplanation(data.explanation ?? "No explanation returned by API.");
        } catch (err) {
            console.error("Explain API failed", err);
            setExplanation("Failed to fetch explanation. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ background: "#fff", padding: 8, border: "1px solid #ccc" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {dayjs(label as string, "YYYY-MM-DD HH:mm").format("HH:mm")}
            </div>

            {payload.map((p) => {
                const coinSymbol = p.dataKey as string;
                const coinName = coinSymbolToName[coinSymbol] ?? coinSymbol;
                const value = typeof p.value === "number" ? p.value.toFixed(3) : p.value;

                return (
                    <div
                        key={coinSymbol}
                        style={{ display: "flex", alignItems: "center", gap: 6, margin: "2px 0" }}
                    >
                        <span style={{ flex: 1, minWidth: 90 }}>{coinName}</span>
                        <span style={{ minWidth: 50 }}>{value}</span>
                        <QuestionCircleOutlined
                            style={{ cursor: "pointer" }}
                            onClick={() => fetchExplanation(coinSymbol)}
                        />
                    </div>
                );
            })}

            <Modal
                open={modalOpen}
                title="Sentiment Explanation"
                footer={null}
                onCancel={() => setModalOpen(false)}
                width={600}
            >
                {loading ? <Spin /> : <pre style={{ whiteSpace: "pre-wrap" }}>{explanation}</pre>}
            </Modal>
        </div>
    );
};

export default LiveChartTooltip;
