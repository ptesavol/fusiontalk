"use strict";

var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;

var rtcConfig = {"iceServers":[{url: "stun:spaceify.net"},{url: "turn:spaceify.net", username:"webrtcuser", credential:"jeejeejee"}]};
var rtcOptions = { optional: [{DtlsSrtpKeyAgreement: true}] };
    		
function WebRtcConnection()
{
var self = this;
var partnerId = null;
var iceListener = null;
var streamListener = null;
var connectionListener = null;
var ownStream = null;

var peerConnection = new RTCPeerConnection(rtcConfig, rtcOptions);

var dataChannel = null; 

// If we receive a data channel from somebody else, this gets called

peerConnection.ondatachannel = function (e) 
	{
    var temp = e.channel || e; // Chrome sends event, FF sends raw channel
    console.log("ondatachannel "+e);
    dataChannel = temp;
    dataChannel.onopen = self.onDataChannelOpen;
	dataChannel.onmessage = self.onMessage;
	};


var onsignalingstatechange = function(state) 
	{
    console.info('signaling state change:', state);
	//if ( connectionListener && peerConnection.signalingState == "closed")
	//	connectionListener.onDisconnected(partnerId);
	}

var oniceconnectionstatechange = function(state) 
	{
    console.info('ice connection state change:', state);
   	//if ( connectionListener && (peerConnection.iceConnectionState == "disconnected" || peerConnection.iceConnectionState == "closed"))
	//	connectionListener.onDisconnected(partnerId);
	};

var onicegatheringstatechange = function(state) {
    console.info('ice gathering state change:', state);
};

peerConnection.onsignalingstatechange = onsignalingstatechange;
peerConnection.oniceconnectionstatechange = oniceconnectionstatechange;
peerConnection.onicegatheringstatechange = onicegatheringstatechange;


self.close = function()
	{
	console.log("WebRtcConnection::close");	
	//peerConnection.removeStream(ownStream);
	dataChannel.close();
	peerConnection.close();
	}

self.onDataChannelClosed = function(e)
	{
	console.log("WebRtcConnection::onDataChannelClosed "+e);
	connectionListener.onDisconnected(partnerId);
	}
	
self.onDataChannelOpen = function(e)
	{
	console.log("WebRtcConnection::onDataChannelOpen "+e);
	dataChannel.onclose = self.onDataChannelClosed;
	}
	
self.onMessage = function(e)	
	{
	console.log("WebRtcConnection::onMessage "+e.data);
	};

self.onIceCandidate = function(e)	
	{
	console.log("WebRtcConnection::onIceCanditate"+ e);
	
	console.log("iceListener oli "+iceListener);
	
	//A null ice canditate means that all canditates have
    //been given
	
	if (e.candidate == null) 
    	{
        console.log("All Ice candidates listed");
    	//iceListener.onIceCandidate(peerConnection.localDescription, partnerId);
    	}
    else
    	{	
    	iceListener.onIceCandidate(e.candidate, partnerId);
		}
	}


				
self.setPartnerId = function(id)
	{
	partnerId = id;
	}

self.setIceListener = function(lis)
	{
	iceListener = lis;
	//peerConnection.onicecandidate = function(cand) {self.onIceCandidate(cand);};
	console.log("WebRtcConnection::setIceListener()"+ lis);
	}

self.setStreamListener = function(lis)
	{
	streamListener = lis;
	peerConnection.onaddstream = function(e) {self.onStream(e);};
	peerConnection.onremovestream = function(e) {self.onRemoveStream(e);};
	}
	
self.setConnectionListener = function(lis)
	{
	connectionListener = lis;
	//peerConnection.onaddstream = function(e) {self.onStream(e);};
	}	
	

self.onStream = function(e)
	{	
	console.log("WebRtcConnection::onStream"+ e);
	streamListener.onStream(e.stream, partnerId);
	}
	
self.onRemoveStream = function(e)
	{	
	console.log("WebRtcConnection::onStream"+ e);
	streamListener.onRemoveStream(e.stream, partnerId);
	}

self.addStream = function(stream)
	{
	ownStream = stream;
	peerConnection.addStream(stream);
	}

self.createConnectionOffer = function(callback)
	{
	var localDescription = null;
	
	dataChannel = peerConnection.createDataChannel("jsonrpcchannel", {reliable: false});
	dataChannel.onopen = self.onDataChannelOpen;
	dataChannel.onmessage = self.onMessage;
			
	peerConnection.createOffer(function (desc)
		{
		console.log("peerConnection::createOffer called its callback: "+ desc);
    	localDescription = desc;
    	
    	peerConnection.onicecandidate = function(e)
    		{
    		console.log(e.candidate);
    		if (e.candidate == null) 
    			{
        		console.log("All Ice candidates listed");
    			//iceListener.onIceCandidate(peerConnection.localDescription, partnerId);
    			callback(peerConnection.localDescription, partnerId);
    			}
    		};
    	
    	
    	peerConnection.setLocalDescription(desc, function() 
    								{
    								//callback(peerConnection.localDescription);
    								},
    								function(err)
    									{
    									console.log("WebRtcConnection::createConnectionOffer() setLocalDescription error");
    									},								
    								{});
    	},function(err) {console.log(err);} ); 
    };	

//Interface for messages coming from the partner ove websocket

self.onConnectionAnswerReceived = function(descriptor)
	{
	console.log("WebRtcConnection::onConnectionAnswerReceived(), descriptor: "+descriptor);
	
	peerConnection.setRemoteDescription(new RTCSessionDescription(descriptor),function()
		{
		console.log("WebRtcConnection::onConnectionAnswerReceived() setRemoteDescription returned OK");
		}, 
		function(err) 
			{console.log("WebRtcConnection::onConnectionAnswerReceived() setRemoteDescription returned error "+err);}  );
	
	};
	
	
self.onConnectionOfferReceived = function(descriptor, callback)
	{
	console.log("WebRtcConnection::onConnectionOfferReceived");
	
	console.log("WebRtcConnection::onConnectionOfferReceived trying to set remote description");	
	peerConnection.setRemoteDescription(new RTCSessionDescription(descriptor), function() 
		{
		console.log("WebRtcConnection::onConnectionOfferReceived remote description set");
		peerConnection.createAnswer(function (answer) 
				{
				peerConnection.onicecandidate = function(e)
    				{
    				if (e.candidate == null) 
    					{
        				console.log("All Ice candidates listed");
    					//iceListener.onIceCandidate(peerConnection.localDescription, partnerId);
    					callback(peerConnection.localDescription);
    					}
    				};
				peerConnection.setLocalDescription(answer, function () 
					{
					//callback(peerConnection.localDescription);
					//callback(answer);
					});
				},
				function (err) { console.log(err); }
				);	
		}, function(err) {console.log("WebRtcConnection::onConnectionOfferReceived setting remote description failed "+err);}
		
		);
	
	};
	
self.onIceCandidateReceived = function(iceCandidate)
	{	
	peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate),
            function () {console.log("WebRtcConnection::onIceCandidateReceived adding Ice candidate succeeded");},  
            function(err) {console.log("WebRtcConnection::onIceCandidateReceived adding Ice candidate failed "+err);});
	};         	
	
}