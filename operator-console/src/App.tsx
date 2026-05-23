import React, { useState, useEffect, useCallback, Suspense } from "react";
import { Shell } from "./components/layout/shell";
import { useSnapshot } from "./hooks/use-snapshot";

const OverviewRoute = React.lazy(() => import("./routes").then((m) => ({ default: m.OverviewRoute })));
const ExecutionPlansRoute = React.lazy(() => import("./routes/execution-plans").then((m) => ({ default: m.ExecutionPlansRoute })));
const ReceiptsRoute = React.lazy(() => import("./routes/receipts").then((m) => ({ default: m.ReceiptsRoute })));
const ReplayValidationRoute = React.lazy(() => import("./routes/replay-validation").then((m) => ({ default: m.ReplayValidationRoute })));
const DegradedStatesRoute = React.lazy(() => import("./routes/degraded-states").then((m) => ({ default: m.DegradedStatesRoute })));
const TrustAttestationRoute = React.lazy(() => import("./routes/trust-attestation").then((m) => ({ default: m.TrustAttestationRoute })));
const RoutingDecisionsRoute = React.lazy(() => import("./routes/routing-decisions").then((m) => ({ default: m.RoutingDecisionsRoute })));
const EventsRoute = React.lazy(() => import("./routes/events").then((m) => ({ default: m.EventsRoute })));
const DiagnosticsRoute = React.lazy(() => import("./routes/diagnostics").then((m) => ({ default: m.DiagnosticsRoute })));
const TelemetryRoute = React.lazy(() => import("./routes/telemetry").then((m) => ({ default: m.TelemetryRoute })));

export function App() {
  const [hash, setHash] = useState(() => window.location.hash.replace("#", ""));
  const snapshot = useSnapshot();

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash.replace("#", ""));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((newHash: string) => {
    window.location.hash = newHash;
    setHash(newHash);
  }, []);

  const renderRoute = () => {
    switch (hash) {
      case "execution-plans":
        return <ExecutionPlansRoute receipts={snapshot.receipts} />;
      case "receipts":
        return <ReceiptsRoute receipts={snapshot.receipts} />;
      case "replay-validation":
        return <ReplayValidationRoute valid={snapshot.validReplayEnvelope} empty={snapshot.emptyReplayEnvelope} invalid={snapshot.invalidReplayEnvelope} />;
      case "degraded-states":
        return <DegradedStatesRoute states={snapshot.degradedStates} />;
      case "trust-attestation":
        return <TrustAttestationRoute decisions={snapshot.workerTrustDecisions} attestations={snapshot.workerAttestations} identities={snapshot.workerIdentities} />;
      case "routing-decisions":
        return <RoutingDecisionsRoute result={snapshot.routingResult} />;
      case "events":
        return <EventsRoute events={snapshot.events} />;
      case "diagnostics":
        return <DiagnosticsRoute receipts={snapshot.receipts} nodes={snapshot.nodes} />;
      case "telemetry":
        return <TelemetryRoute probeSummary={snapshot.probeSummary} telemetryCounts={snapshot.telemetryCounts} />;
      default:
        return <OverviewRoute snapshot={snapshot} />;
    }
  };

  return (
    <Shell currentHash={hash} onNavigate={navigate}>
      <div aria-live="polite" className="visually-hidden">
        Navigated to {hash || "overview"} view.
      </div>
      <Suspense fallback={<div className="suspense-fallback">Loading view...</div>}>
        {renderRoute()}
      </Suspense>
    </Shell>
  );
}
