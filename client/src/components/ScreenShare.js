import React, { useRef } from "react";
import { getPeerConnection } from "../utils/PeerConnection";

const ScreenShare = ({ ws }) => {

  const localVideoRef = useRef(null);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      console.log("Local screen captured:", stream);

      // Display local screen
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add tracks to peer connection
      const peerConnection = getPeerConnection();
      console.log("peer Connection : ",peerConnection)
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      ws.send(
        JSON.stringify({
          type: "offer",
          data: offer,
        })
      );
    } catch (error) {
      console.error("Error sharing screen:", error);
    }
  };

  return (
    <div>
      <h2>Local Screen</h2>
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        style={{ width: "400px", border: "1px solid black" }}
      ></video>
      <button onClick={startScreenShare}>Start Screen Sharing</button>
    </div>
  );
};

export default ScreenShare;
