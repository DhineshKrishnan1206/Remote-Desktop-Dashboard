const rtcConfig = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }], // Public STUN server
  };

  let peerConnection = null;
  let isPeerConnectionInitialized = false;  // Flag to track initialization


  // Create a new PeerConnection
  export const createPeerConnection = (ws, onRemoteStream) => {
    if (peerConnection) {
        console.log("PeerConnection already initialized.");
        return peerConnection;  // Return existing peer connection if already created
      }
      else{
        console.log("PeerConnection not initialized.");
      }
    console.log("Inside create peer connection");

    peerConnection = new RTCPeerConnection(rtcConfig);
    isPeerConnectionInitialized = true;

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log("Remote stream received:", event.streams[0]);
      onRemoteStream(event.streams[0]);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(
          JSON.stringify({
            type: "ice-candidate",
            data: event.candidate,
          })
        );
      }
    };

    console.log("PeerConnection initialized.");
    return peerConnection;
  };

  // Get the existing PeerConnection (throws error if not initialized)
  export const getPeerConnection = () => {
    if (!peerConnection) {
      throw new Error("PeerConnection not initialized");
    }
    return peerConnection;
  };
