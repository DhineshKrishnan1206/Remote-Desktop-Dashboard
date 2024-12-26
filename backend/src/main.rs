use warp::Filter;
use warp::ws::{Message, WebSocket};
use futures::{StreamExt, SinkExt};
use tokio::sync::mpsc;
use tokio_stream::wrappers::UnboundedReceiverStream;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

type Clients = Arc<Mutex<HashMap<String, mpsc::UnboundedSender<Message>>>>;

#[derive(Serialize, Deserialize, Debug)]
struct SignalMessage {
    r#type: String,
    data: String,
}

#[tokio::main]
async fn main() {
    let clients: Clients = Arc::new(Mutex::new(HashMap::new()));

    // Define WebSocket route
    let ws_route = warp::path("ws")
        .and(warp::ws())
        .and(with_clients(clients.clone()))
        .map(|ws: warp::ws::Ws, clients| {
            ws.on_upgrade(move |socket| handle_connection(socket, clients))
        });

    // Serve static files (e.g., React app)
    let static_files = warp::fs::dir("./frontend/build");

    // Combine routes
    let routes = ws_route.or(static_files);

    println!("Server running at http://127.0.0.1:8080/");
    warp::serve(routes).run(([127, 0, 0, 1], 8080)).await;
}

// Pass shared client map to routes
fn with_clients(clients: Clients) -> impl Filter<Extract = (Clients,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || clients.clone())
}

// Handle a WebSocket connection
async fn handle_connection(ws: WebSocket, clients: Clients) {
    let (mut user_ws_tx, mut user_ws_rx) = ws.split(); // Split WebSocket into sender and receiver
    let (tx, rx) = mpsc::unbounded_channel();
    let rx = UnboundedReceiverStream::new(rx);

    // Spawn a task to forward messages from the channel to the WebSocket
    tokio::task::spawn(async move {
        rx.map(Ok)  // Wrap each message into a Result<Message, warp::Error>
            .forward(user_ws_tx) // Forward messages from channel to WebSocket
            .await
            .unwrap_or_else(|e| {
                eprintln!("Error forwarding message to WebSocket: {}", e);
            });
    });

    let client_id = Uuid::new_v4().to_string();
    clients.lock().unwrap().insert(client_id.clone(), tx);

    println!("Client connected: {}", client_id);

    // Process incoming messages from the WebSocket
    while let Some(result) = user_ws_rx.next().await {
        match result {
            Ok(msg) => {
                if let Ok(text) = msg.to_str() {
                    handle_message(client_id.clone(), text, &clients).await;
                }
            }
            Err(e) => {
                eprintln!("Error receiving WebSocket message: {}", e);
                break;
            }
        }
    }

    println!("Client disconnected: {}", client_id);
    clients.lock().unwrap().remove(&client_id);
}

// Handle signaling messages
async fn handle_message(client_id: String, message: &str, clients: &Clients) {
    if let Ok(signal_message) = serde_json::from_str::<SignalMessage>(message) {
        println!("Received message from {}: {:?}", client_id, signal_message);

        let clients = clients.lock().unwrap();
        for (id, tx) in clients.iter() {
            if id != &client_id {
                if let Err(e) = tx.send(Message::text(message)) {
                    eprintln!("Error sending message to client {}: {}", id, e);
                }
            }
        }
    } else {
        eprintln!("Invalid message format: {}", message);
    }
}
