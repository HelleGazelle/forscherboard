import io from "socket.io-client";

let socketEndpoint;
let socket;

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    socketEndpoint = "http://" + window.location.hostname + ":8002"
} else {
    socketEndpoint = "https://" + window.location.hostname;
}
socket = io(socketEndpoint);

export default socket;
