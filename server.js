            const express = require('express');
            const http = require('http');
            const socketIo = require('socket.io');
            const path = require('path');

                const app = express();
                const server = http.createServer(app);
                const io = socketIo(server);
                const PORT = 3000;

                app.use(express.static(path.join(__dirname, 'public')));

                io.on('connection', (socket) => {
                    console.log('A user connected');

                    socket.on('disconnect', () => {
                        console.log('User disconnected');
                    });

                    socket.on('send-3d-object', (data) => {
                        console.log('Sending 3D object path for model:', data.model);

                        let objectUrl;
                        if (data.model === 'model1') {
                            objectUrl = 'models/model1/model1.gltf';
                        } else if (data.model === 'model2') {
                            objectUrl = 'models/model2/model2.gltf';
                        } else {
                            console.error('Unknown model requested:', data.model);
                            return;
                        }

                        console.log('URL for model', data.model, ':', objectUrl);
                        socket.emit('receive-3d-object', { url: objectUrl, model: data.model });
                    });
                });

                server.listen(PORT, () => {
                    console.log(`Server is running on http://localhost:${PORT}`);
                });
