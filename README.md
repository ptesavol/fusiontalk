# Fusiontalk
Fusiontalk is a simple WebRTC many-to-many video chat with node.js-based websocket signalling server. 

Live demo is available at http://spaceify.net/talk

##Usage


###Running the server
********************

In the nodejs directory, open the file webrtccoordinator.js, and edit the line 
`var LISTEN_ADDRESS = {host: "localhost", port: "9753"};` to match your configuration.

Then give the commands:

```
npm install
node webrtccoordinator.js
```

###Setting up the client web page
*******************************

Go to root directory, open the file webrtcclient.js, and edit the line 
`var COORDINATOR_ADDRESS = {host: "localhost", port: 9753};` to point to your server. 
Now serve the web directory on your server with the web server of your linking, and
open the index.html with your favourite (modern) web browser. **Note: you need to use a
web server, as WebRTC cannot be used from file:// URLs.**  


