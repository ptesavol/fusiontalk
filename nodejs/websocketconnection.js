"use strict";

//Include only in node, not in browser

if (typeof exports !== "undefined")
	{
	global.WebSocket = require("./nodejs/node_modules/websocket").client;
	global.logger = require("./nodejs/node_modules/winston");
	}
	
function WebSocketConnection()
{
var self = this;

var socket = null;
var id = null;
var remoteAddress = null;
var remotePort = null;
var origin = null;
var listener = null;

//For client-side use, in both node and the browser

self.connect = function(options, callback)
	{
	options.protocol = (!options.isSsl ? "ws" : "wss");	
	
	
	if (typeof exports === "undefined")
		{
		//This is a browser
		socket = new WebSocket(options.protocol + "://" + options.host + ":" + options.port + "/", "json-rpc");
		socket.onopen = function() {callback(null); }; 
		socket.onmessage = onMessageEvent;
		socket.onclose = function(reasonCode, description) {onSocketClosed(reasonCode, description, self);};	
		}
	else
		{
			
		//This is node.js	
		socket = new WebSocket();
		socket.on("connect", function(connection)
													{
													connection.on("close", function(reasonCode, description) {onSocketClosed(reasonCode, description, self);});
													connection.on("message", onMessage);		
													}
		
							);
		socket.connect(options.protocol + "://" + options.host + ":" + options.port + "/", "json-rpc");	
		}
		
	
	};

//For server-side node.js use only

self.setSocket = function(val) 
	{
	console.log("WebSocketConnection::setSocket()");	
	socket = val;		
	socket.on("message", onMessage);
	socket.on("close", function(reasonCode, description) {onSocketClosed(reasonCode, description, self);});
	};
	
self.setId = function(val) 
	{
	id = val;	
	};
	
self.setRemoteAddress = function(val) 
	{
	remoteAddress	= val;
	};
	
self.setRemotePort = function(val) 
	{
	remotePort = val;	
	};
	
self.setOrigin = function(val) 
	{
	origin = val;	
	};
	
self.setListener = function(val) 
	{
	listener = val;	
	};

self.getId = function() 
	{
	return id;	
	};
	
self.getRemoteAddress = function() 
	{
	return remoteAddress;
	};
	
self.getRemotePort = function() 
	{
	return remotePort;	
	};
	
self.getOrigin = function() 
	{
	return origin;	
	};
	
var onMessage = function(message)
	{
	console.log("WebSocketConnection::onMessage() "+message);	
	if (listener)
			listener.onMessage(message.utf8Data, self);
	};

var onMessageEvent = function(event)
	{
	if (listener)
			listener.onMessage(event.data, self);
	};
	
var onSocketClosed = function(reasonCode, description, obj)
	{
	if (listener)
			listener.onDisconnected(obj.getId());
	};
	
self.send = function(message)
	{
	socket.send(message);
	};

self.close = function()
	{
	socket.close();
	};
}

if (typeof exports !== "undefined")
	{
	module.exports = WebSocketConnection;	
	}
