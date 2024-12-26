import React, { useState, useEffect } from "react";
import { createPeerConnection } from "./utils/PeerConnection";
import ScreenShare from "./components/ScreenShare";
import RemoteView from "./components/RemoteView";

const App = () => {
  const [ws, setWs] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8080/ws');


    websocket.onopen = () => {
      console.log("WebSocket connected");
    };

    websocket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);

      const peerConnection = createPeerConnection(websocket, setRemoteStream);

      if (message.type === "offer") {
        await peerConnection.setRemoteDescription(message.data);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        websocket.send(
          JSON.stringify({
            type: "answer",
            data: answer,
          })
        );
      } else if (message.type === "answer") {
        await peerConnection.setRemoteDescription(message.data);
      } else if (message.type === "ice-candidate") {
        await peerConnection.addIceCandidate(message.data);
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    setWs(websocket);

    return () => websocket.close();
  }, []);

  return (
    <div>
      <h1>Remote Desktop Sharing</h1>
      {ws && <ScreenShare ws={ws} />}
      <RemoteView remoteStream={remoteStream} />
    </div>
  );
};

export default App;
