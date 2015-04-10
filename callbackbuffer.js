"use strict";

function CallbackNode()
{
this.id = -1;
this.object = null;
this.method = null;
this.previousNode = null;
this.nextNode = null;
}

// Optimized ring buffer of callback nodes, this is used in order 
// to avoid garbage collection delays 

function CallbackBuffer(initialListSize)
{
var self = this;
		
var listHead = null;
var listTail = null;

var listSize = 10;
var dataSize = 0;

var backupNode = null;



if (initialListSize && initialListSize > listSize)
	listSize = initialListSize;

//Create the doubly-linked list

listTail = new CallbackNode();
listHead = listTail;

var previous = listTail;
var current = null;

for (var i=0; i<listSize-1; i++)
	{
	current = new CallbackNode();	
	current.previousNode = previous;	
	previous.nextNode = current;

	
	if (i == (listSize-2))	
		{
		current.nextNode = listTail;	
		listTail.previousNode = current;		
		}
	previous = current;
	}


self.pushBack = function(id, object, method)
	{
	listHead.id = id;
	listHead.object = object;
	listHead.method = method;
	
	dataSize++;
	
	if (dataSize == listSize)
		resize();		

	listHead = listHead.nextNode;
	
	
	};


self.callMethodAndPop = function(id, error, result)
	{
	current = listTail;
	
	while (current.id != id)
		{
		current = current.nextNode;
		if (current == listTail)
			throw {error: "CallbackBuffer::callMethodAndPop(). Callback not found"};		
		}
	//current node now holds the right callback to call
	
	console.log("Calling callback with id "+id+" and result "+result);
	
	current.method.call(current.object, error, result, id);	

	//pop current node from the list 	

	if (current!=listTail)		//callback did not arrive in right order 
		{
		current.id = -1;	//clear the node
					//remove the empty node from its place
		current.previousNode.nextNode = current.nextNode;
		current.nextNode.previousNode = current.previousNode;		
			
		//attach the empty node in front of list head
		current.nextNode = listHead.nextNode		
		current.previousNode = listHead;
		listHead.nextNode = current;		
		}
	
	else	
		{			//calback arrived in right order
		listTail.id = -1;	//clear the node
		listTail = listTail.nextNode;
		}
	dataSize--;
	};

self.size = function()
	{
	return dataSize;
	};

// Double the list size

var resize = function()
	{
	backupNode = listHead.nextNode;

	previous = listHead;
	current = null;

	for (var i=0; i<listSize; i++)
		{
		current = new CallbackNode();	
		current.previousNode = previous;	
		previous.nextNode = current;

		if (i == (listSize-1))	
			{
			current.nextNode = backupNode;	
			backupNode.previousNode = current;		
			}
		previous = current;
		}

	listSize = listSize*2;
	};

self.toString = function()
	{
	var ret = "";
	
	current = listTail;
	ret += current.id+",";
	current = current.nextNode;		

	while (current != listTail)
		{
		ret += current.id+",";		
		current = current.nextNode;		
		}
	
	
	return ret;
	};
}

if (typeof exports !== "undefined")
	{
	module.exports = CallbackBuffer;
	}
