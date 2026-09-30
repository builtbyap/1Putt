import React, { useEffect, useState, useSyncExternalStore } from 'react';
import DrivingRangeCanvas from './DrivingRangeCanvas';
import { getSession, subscribe } from './pitraxBridge';

export default function App() {
  const session = useSyncExternalStore(subscribe, getSession);
  const [pickedId, setPickedId] = useState(null);
  const [replayKey, setReplayKey] = useState(0);

  const latestId = session.selectedId ?? session.shots[0]?.id ?? null;
  useEffect(() => {
    setPickedId(latestId);
  }, [latestId, session.shots.length]);

  const shot = session.shots.find((s) => s.id === pickedId) ?? null;

  return (
    <DrivingRangeCanvas
      shots={session.shots}
      shot={shot}
      onSelectShot={setPickedId}
      replayKey={replayKey}
      onReplay={() => setReplayKey((k) => k + 1)}
    />
  );
}
