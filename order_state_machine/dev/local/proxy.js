const net = require("node:net");

console.log(`Usage: ${process.argv[1]} <listen-port> [forward-host] [forward-port]`)

if (process.argv.length < 3) {
    throw new Error("Missing argument <listen-port>")
}

const LISTEN_PORT = Number(process.argv[2]);
const TARGET_HOST = process.argv[3] ?? "127.0.0.1";
const TARGET_PORT = process.argv[4] ? Number(process.argv[4]) : 8088;

console.log(`Proxy will listen at ${LISTEN_PORT} and forward to ${TARGET_HOST}:${TARGET_PORT}`);


const server = net.createServer((clientSocket) => {
    // console.log(`Received connection: ${clientSocket.remoteAddress}: ${clientSocket.remotePort}`);

    const forwardingSocket = new net.Socket();
    forwardingSocket.connect(TARGET_PORT, TARGET_HOST, () => {
        // console.log('Connected to target:', TARGET_HOST, TARGET_PORT);

        // forward data in both directions
        clientSocket.on("data", (data) => {
            forwardingSocket.write(data);
        });
        forwardingSocket.on("data", (data) => {
            clientSocket.write(data);
        });

        // handle closing
        clientSocket.on("close", () => {
            // console.debug("Client connection closed");
            forwardingSocket.end();
        });
        forwardingSocket.on("close", () => {
            // console.log("Forwarded connection closed");
            clientSocket.end();
        });

        // handle errors
        clientSocket.on("error", (err) => {
            console.error("Client socket error: " + err.message);
            forwardingSocket.end();
            clientSocket.end();
        });
        forwardingSocket.on("error", (err) => {
            console.error("Forwarding socket error: " + err.message);
            forwardingSocket.end();
            clientSocket.end();
        });
    });
});

server.listen(LISTEN_PORT, () => {
    console.log(`Proxy server is listening on port ${LISTEN_PORT}`);
});
