"use strict"

navigator.getUserMedia = (navigator.getUserMedia || 
                          navigator.webkitGetUserMedia || 
                          navigator.mozGetUserMedia || 
                          navigator.msGetUserMedia);

function WebRtcClient()
{
var self = this;

var COORDINATOR_ADDRESS = {host: "localhost", port: 9753};

var connection = new WebSocketConnection();
var communicator = new RpcCommunicator();

var rtcConnections = new Object();

var ownStream = null;

self.onIceCandidate = function(iceCandidate, partnerId)
	{
	console.log("iceCandidate got, sending it to the other client");
	communicator.callRpc("offerIce", [iceCandidate, partnerId]);
	};
	
var createConnection = function(partnerId)
	{
	rtcConnections[partnerId]= new WebRtcConnection();
	rtcConnections[partnerId].setPartnerId(partnerId);
	
	rtcConnections[partnerId].setIceListener(self);
	rtcConnections[partnerId].setStreamListener(self);
	rtcConnections[partnerId].setConnectionListener(self);
	
	rtcConnections[partnerId].addStream(ownStream);
	}

var addVideoElement = function(stream, partnerId)
	{
	var videosdiv = document.getElementById("videosdiv");
	var video  = document.createElement("video");
	video.width="320";
	video.height="240";
	video.autoplay="true";
	video.id = "video"+partnerId;
	video.src = URL.createObjectURL(stream);    	
	videosdiv.appendChild(video);
	//document.getElementById("title").innerHTML = "Video Added";
	}

var removeVideoElement = function(partnerId)	
	{
	console.log("WebRtcClient::removeVideoElement")
	//document.getElementById("title").innerHTML = "Removing Video";
	var element = document.getElementById("video"+partnerId);
    element.parentNode.removeChild(element);
	//element.parentNode.innerHTML = "Kivaa";
	}


self.shutdown = function(e)
	{
	console.log("WebRtcClient::onbeforeunload");
	for (var id in rtcConnections)
		{
		if (rtcConnections.hasOwnProperty(id))
			{
			rtcConnections[id].close();
			}
		}
	}



// RPC methods

self.handleRtcOffer = function(connectionId, descriptor, partnerId)
	{
	console.log("WebRtcClient::handleRtcOffer() descriptor: "+descriptor);
	
	if (!rtcConnections[partnerId])
		{
		createConnection(partnerId);
		}
		
	rtcConnections[partnerId].onConnectionOfferReceived(descriptor, function(answer)
		{
		console.log("WebRtcClient::handleRtcOffer() onConnectionOfferReceived returned");
		communicator.callRpc("acceptConnectionOffer",[answer, partnerId]);
		});
	
	};	

self.handleRtcAnswer = function(connectionId, descriptor, partnerId)
	{
	console.log("WebRtcClient::handleRtcAnswer()");			
	rtcConnections[partnerId].onConnectionAnswerReceived(descriptor);
	};	

self.handleIceCandidate = function(connectionId, iceCandidate, partnerId)
	{
	/*
	console.log("WebRtcClient::handleIceCandidate()");			
	
		
	
	if (!rtcConnections[partnerId])
		{
		rtcConnections[partnerId]= new WebRtcConnection();
		rtcConnections[partnerId].setPartnerId(partnerId);
		rtcConnections[partnerId].setIceListener(self);
		}
		
	rtcConnections[partnerId].onIceCandidateReceived(iceCandidate);
	*/
	};


	


	
// Private methods
	
var connectToCoordinator = function(callback)
	{
	console.log("WebRtcClient::connectToCoordinator()");
	console.log("Websocket connecting to the coordinator");

	connection.connect(COORDINATOR_ADDRESS, function()
			{
			console.log("Websocket Connected to the Coordinator");	
			console.log("Creating RPCCommunicator for the Websocket");
							
			communicator.addConnection(connection);
			callback(); 
			});
	};

self.onDisconnected = function(partnerId)
	{
	console.log("WebRtcClient::onDisconnected() "+partnerId);
	removeVideoElement(partnerId);
	}
							
self.onStream = function(stream, partnerId)
	{
	console.log("WebRtcClient::onStream()");
	addVideoElement(stream, partnerId);
	}
	
self.onRemoveStream = function(stream, partnerId)
	{
	console.log("WebRtcClient::onRemoveStream()");
	self.onDisconnected(partnerId);
	}
	
var connectToPeers = function(callback)
	{
	console.log("WebRtcClient::connectToPeers()");				
	console.log("Announcing to the Coordinator");		
					
	communicator.callRpc("announce",["omajuttu"], self, self.onPeerIdsArrived);									
	};	


//Callback of the connectToPeers RPC call

self.onPeerIdsArrived = function(err, data, id)
	{
	console.log("WebRtcClient::onPeerIdsArrived(), data.length: "+data.length);
	var partnerId = 0;
	
	for (var i=0; i<data.length; i++)	
		{
		partnerId = data[i];
		
		//Create a WebRTC connection and 
		
		createConnection(partnerId);
		
		console.log("Trying to create offer to client id " + partnerId);
		
		//Creating a connection offer 
		
		rtcConnections[partnerId].createConnectionOffer(function(offer, peerId)
			{
			console.log("Offer created, sending it to the other client "+peerId);
			communicator.callRpc("offerConnection", [offer, peerId]);	
			});					
		}
	if (data.length === 0)
		console.log("Announce returned 0 client ids, not connecting");	
	};
	
self.run = function()
	{
	console.log("WebRtcClient::run()");
	
	
	
	var omaruutu = document.getElementById("omaruutu");
	
	console.log("omaruutu oli "+omaruutu);
	window.onbeforeunload = self.shutdown;	
	
	communicator.exposeRpcMethod("handleRtcOffer", self, self.handleRtcOffer);
	communicator.exposeRpcMethod("handleRtcAnswer", self, self.handleRtcAnswer);
	communicator.exposeRpcMethod("handleIceCandidate", self, self.handleIceCandidate);
	
	navigator.getUserMedia({"video": true, "audio":true }, 
		function (stream) 
			{
			console.log("setting objecturl");
        	ownStream = stream; 
        	omaruutu.src = URL.createObjectURL(stream);
        	
        	connectToCoordinator(function() 
				{
				console.log("WebRtcClient::run() connected to the coordinator");		
				connectToPeers(function()
					{
					console.log("WebRtcClient::run() connectToPeers returned");
					});
				}); 
        	},
        	function(err)
        		{
        		console.log(err);
        		}
        	);
     
     console.log("get past getusermedia");
     
       
	
	};			
}