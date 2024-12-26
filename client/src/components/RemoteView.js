import React, { useRef, useEffect } from "react";

const RemoteView = ({ remoteStream }) => {
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div>
      <h2>Remote Screen</h2>
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{ width: "400px", border: "1px solid black" }}
      ></video>
    </div>
  );
};

export default RemoteView;
