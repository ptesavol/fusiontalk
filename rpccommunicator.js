"use strict";

// Do this only in node.js, not in the browser

if (typeof exports !== "undefined")
	{
	global.CallbackBuffer = require("./callbackbuffer");
	}
		

/* 
* A class that implements the JSON-RPC 2.0 protocol.
* Communicates with the outside world with EngineIOConnection, WebSocketConnection or WebRTCConnection objects.
* on the layer below. This is a two-way class that implements both client and server functionality.
*/

function RpcCommunicator()
{
var self = this;

var callSequence = 1;
var exposedRpcMethods = new Object();

//var logger = new Logger();

var connectionListener = null;
var uri = "";
var callbackBuffer = new CallbackBuffer();
var connections = new Object();
var connectionSequence = 0;

//** Upwards interface towards business logic

self.exposeRpcMethod = function(name, object_, method_)
	{
	console.log("RpcCommunicator::exposeRpcMethod name: "+name+", object_: "+object_+", method_: "+ method_);	
	exposedRpcMethods[name] = {object: object_, method: method_};
	}

self.setConnectionListener = function(lis)
	{
	connectionListener = lis; 
	}


self.callRpc =  function(method, params, object, listener, connectionId)
	{
	if (typeof listener == "function")	// call: expects a response object
		{
		callbackBuffer.pushBack(callSequence, object, listener);
		
		console.log("RpcCommunicator::callRpc() pushed back callback");
		
		if (typeof connectionId != "undefined")						
			sendMessage({"jsonrpc": "2.0", "method": method, "params": params, "id": callSequence}, connectionId);	
		else
			sendMessage({"jsonrpc": "2.0", "method": method, "params": params, "id": callSequence}, 1);	//assume there is only one connection	
		
		console.log("RpcCommunicator::callRpc() sendMessage returned");
		callSequence++;			
		}
	else	
		{																	// notification: doesn't expect a response object
		if (typeof connectionId != "undefined")
			sendMessage({"jsonrpc": "2.0", "method": method, "params": params, "id": null}, connectionId);
		else
			sendMessage({"jsonrpc": "2.0", "method": method, "params": params, "id": null}, 1);
		}	
	};

//** Private methods

var sendMessage = function(message, connectionId)
	{
	console.log("RpcCommunicator::sendMessage(). " + JSON.stringify(message));
	
	connections[connectionId].send(JSON.stringify(message));	
	};

// Send the return value of the RPC call to the caller  
var sendResponse = function(err, result, id, connectionId)
	{
	if (err)
		{
		sendMessage({"jsonrpc": "2.0", "error": err, "id": id});	
		var code = (typeof err.code != "undefined" ? err.code : "");
		var path = (typeof err.path != "undefined" ? err.path : "");
		var msge = (typeof err.message != "undefined" ? err.message : "");
		logger.error("Exception in executing a RPC method: " + code + " EngineIoCommunicator::onMessage() >> " + path + " " + msge);		
		}
	else
		sendMessage({"jsonrpc": "2.0", "result": result, "id": id}, connectionId);
	};

//Handle incoming RPC call
var handleRPCCall = function(message, connectionId)
	{
	if ( !message.jsonrpc || message.jsonrpc != "2.0" || !message.method)		// Invalid JSON-RPC
		{
		sendMessage({"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid JSON-RPC."}, "id": null}, connectionId);
		return;
		}
	
	if (Object.prototype.toString.call(message.params) !== "[object Array]" )	
		{
		sendMessage({"jsonrpc": "2.0", "error": {"code": -32602, "message": "Parameters must be sent inside an array."}, "id": message.id}, connectionId);
		return;
		}
	
	if (!exposedRpcMethods.hasOwnProperty(message.method))				// Unknown method
		{
		if (message.id != null)
			{
			sendMessage({"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method " + message.method + " not found."}, "id": message.id}, connectionId);
			}
		else
			{
			sendMessage({"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method " + message.method + " not found."}, "id": null}, connectionId);
			return;
			}
		}
								// Method exists, call the method 
	var rpcMethod = exposedRpcMethods[message.method];
	console.log(message.params);
	
	if (typeof message.params === "undefined")
		message.params = new Array();

		
	message.params.unshift(connectionId);	//add connectionId as the first parameter

			
	if (message.id != null)		//It is a call		!!!!!!!!!!!!!!!! ToDO: fix this memory-hog! 
		{
		message.params.push(function(err,result){sendResponse(err,result,message.id, connectionId);});
		rpcMethod.method.apply(rpcMethod.object, message.params);
		}
	else											//It is a notification
		rpcMethod.method.apply(rpcMethod.object, message.params);
	};

// Handle an incoming return value for a RPC call that we have made previously
var handleReturnValue = function(message)
	{
	var error = null;
	var result = null;
	
	if (typeof message.error !== "undefined")
		error = message.error;

	if (typeof message.result !== "undefined")
		result = message.result;
	
	if (message.id)
		callbackBuffer.callMethodAndPop(message.id, error, result);
	else
		console.log("RpcCommunicator::handleReturnValue() error: "+JSON.stringify(error));
	};


var handleMessage = function(message, connectionId)
	{
	if (message.method) 			// Received an RPC Call from outside
		handleRPCCall(message, connectionId);
	else										// Received a return value to an RPC call made by us
		handleReturnValue(message);
	};


//** Downwards interface towards a connection

//** MessageListener interface implementation

self.onMessage = function(messageString, connection)
	{
	console.log("RpcCommunicator::onMessage() " + messageString);

	var parsedMessage;

	try 
		{
		parsedMessage = JSON.parse(messageString);
		}
	catch (err)
		{
		sendMessage({"jsonrpc": "2.0", "error": {"code": -32700, "message": "Invalid JSON."}, "id": null}, connection.getId());
		return;
		}
	handleMessage(parsedMessage, connection.getId());
	};

//** ConnectionListener interface implementation

self.addConnection = function(conn)
	{	
	console.log("RpcCommunicator::addConnection");	
	connectionSequence++; 	// Use this enumeration as the connection id
	conn.setId(connectionSequence);
	connections[connectionSequence] = conn;
	conn.setListener(self);	
	return connectionSequence;
	};
	
self.onDisconnected = function(connectionId)	
	{
	self.closeConnection(connectionId);
	
	if (connectionListener)
		connectionListener.onDisconnected(connectionId);
	};

//** ---------------------------------------

self.closeConnection = function(connectionId)
	{
	if (connectionId in connections)
		{
		connections[connectionId].close();
		delete connections[connectionId];

		//if(typeof options.connectionListener == "function")								// External connection listener
		//options.connectionListener("close", {remoteAddress: connection.remoteAddress, remotePort: connection.remotePort, origin: connection.origin, id: connection.id});
		}
	};

}

// Do this only in node.js, not in the browser

if (typeof exports !== "undefined")
	{
	module.exports = RpcCommunicator;
	}
