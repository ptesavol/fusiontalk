"use strict";

// INCLUDES

if (typeof exports !== "undefined")
	{
	global.RpcCommunicator = require("../rpccommunicator");
	global.WebSocketServer = require("./websocketserver");
	global.logger = require("winston");
	}


function WebRtcCoordinator()
{
var self = this;	

var LISTEN_ADDRESS = {host: "192.168.0.103", port: "9753"};

var communicator = null; 
var websocketServer = null; 

var announces = new Object();			//clientId = announces[hash]
var announcesPerClient = new Object();	// hash = announcesPerClient[clientId]

self.onDisconnected = function(connectionId)	
	{
	console.log("WebRtcCoordinator()::onDisconnected() "+connectionId);

	var hash = announcesPerClient[connectionId];
	
	announces[hash][connectionId] = null;
	delete announces[hash][connectionId];
	
	announcesPerClient[connectionId] = null;
	delete announcesPerClient[connectionId];
   	
   	var temp = "";
   	
   	for (var i in announces[hash])
   		temp +=i;
   	console.log("WebRtcCoordinator()::onDisconnected(), announces[hash] is now " +temp);
   	};
	

//ToDO: use random keys as parter id:s to prevent connection flooding

self.announce = function(connectionId, hash, callback)
	{
	
	if (typeof announcesPerClient[connectionId] === "undefined")
		{
		announcesPerClient[connectionId] = hash;
		}
	
	if (typeof announces[hash] === "undefined")
		{
		announces[hash] = new Object();
		}
		
	var ret = new Array();
	
	var i = 0;
	
	for (var id in announces[hash])
		{
		if (announces[hash].hasOwnProperty(id) && id !== connectionId)
			ret.push(id);
		i++;
		}

	var d = new Date();	
	announces[hash][connectionId] = d.getTime(); 
	
	callback(null, ret);
	}

self.offerConnection = function(connectionId, webRtcOffer, partnerId)
	{
	communicator.callRpc("handleRtcOffer",[webRtcOffer, connectionId], null, null, partnerId);
	}
	
self.acceptConnectionOffer = function(connectionId, webRtcAnswer, partnerId)
	{
	communicator.callRpc("handleRtcAnswer", [webRtcAnswer, connectionId], null, null, partnerId);
	}

self.offerIce = function(connectionId, iceCandidate, partnerId)
	{
	communicator.callRpc("handleIceCandidate", [iceCandidate, connectionId], null, null, partnerId);
	}

self.sayHello = function(connectionId)
	{
	console.log("Hello, Hello, Hello! connectionId was: " + connectionId);
	};



self.run = function()
	{
	communicator = new RpcCommunicator();
	websocketServer = new WebSocketServer();
	
	communicator.exposeRpcMethod("sayHello", self, self.sayHello);
	
	communicator.exposeRpcMethod("announce", self, self.announce);
	communicator.exposeRpcMethod("offerConnection", self, self.offerConnection);
	communicator.exposeRpcMethod("acceptConnectionOffer", self, self.acceptConnectionOffer);
	communicator.exposeRpcMethod("offerIce", self, self.offerIce);
	
	communicator.setConnectionListener(self);
	websocketServer.setConnectionListener(communicator);
	
	
	websocketServer.listen(LISTEN_ADDRESS, function(err, data)
													{
													if (!err)	
														{
														console.log("WebsocketServer Started");
														}	
													else
														{
														console.log("Error: "+err);	
														}
													});	
	}
}


var coordinator = new WebRtcCoordinator();
coordinator.run();
