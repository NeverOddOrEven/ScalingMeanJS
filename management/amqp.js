var amqplib = require('amqplib');

function AmqpManager() {
    var outboundMessages = [];
    var commObject = {
        serverPath: null,
        connection: null,
        channel: null,
        exchangeName: 'tutorial.exchange',
        exchangeType: 'fanout',
        routingPattern: '',
        outboundQueue: 'tutorial.outbound_' + process.pid,
        inboundQueue: 'tutorial.inbound_' + process.pid
    };
    
    function initialize(amqpServerPath) {
        commObject.serverPath = amqpServerPath;
    }
    
    function closeConnection() {
        console.info(commObject.channel);
        console.info(commObject.connection);
        if (commObject.connection !== null) {
            console.error('Gracefully terminating AMQP connection');
            commObject.connection.close();
        }
    }

    /*
        @function: asyncInitConnection
        @description: Called on the first attempt to create a channel
        @param cb: When the connection is created, invoke the callback in order to continue creating a channel
    */
    function asyncInitConnection(cb) {
        if (commObject.connection !== null) {
            cb();
        } else {
            console.log('Initializing Connection');
            amqplib.connect(commObject.serverPath)
                .then(function(conn) {
                    
                    commObject.connection = conn;
                    cb();
                })
                .then(null, console.error);
        }
    }

    /*
        @function: asyncInitChannel
        @description: Called on the first attempt to send a message.
        @param cb: When the channel is created, invoke the callback in order to continue to processing messages.
                   If no connection exists, it will proceed to initialize the connection.
    */
    function asyncInitChannel(cb) {
        function createChannelCb() {
            console.log('Creating Channel');
            commObject.connection.createChannel()
                .then(function(ch) {
                    commObject.channel = ch;
                    cb();
                }, console.error)
                .then(null, console.error);
        }

        if (commObject.connection !== null) {
            createChannelCb();
        } else {
            asyncInitConnection(createChannelCb);
        }
    }
    
    /*
        @function: successivelyProcessQueuedMessages
        @description: Uses a callback to clear out the queue of messages until empty.
                      Will init a comm channel if one does not exist.
        @param cb: A callback to check the message queue to determine if more messages need be sent.
    */
    function successivelyProcessQueuedMessages(cb) {
        var payload = outboundMessages.shift();
        function sendMessageCb() {
            commObject.channel.assertQueue(commObject.outboundQueue);
            commObject.channel.assertExchange(commObject.exchangeName, commObject.exchangeType, {})
                .then(null, console.error);
            commObject.channel.bindQueue(commObject.outboundQueue, commObject.exchangeName, commObject.routingPattern);
            commObject.channel.publish(commObject.exchangeName, 
                                       commObject.routingPattern, 
                                       new Buffer(JSON.stringify(payload.messageObject)));
            cb();
        }

        if (commObject.channel !== null) {
            sendMessageCb();
        } else {
            asyncInitChannel(sendMessageCb);
        }
    }
    
    /*
        @function: asyncSendMessage
        @description: Exposed by public method. Queues up messages as they are received. 
                      Messages dispatched in order received.
        @param payload: POJO
    */
    var sendingMessages = false;
    function asyncSendMessage(payload) {
        outboundMessages.push(payload);
        
        function sendQueuedMessage() {
            sendingMessages = true;
            if (outboundMessages.length > 0) {
                successivelyProcessQueuedMessages(sendQueuedMessage);
            } else {
                sendingMessages = false;
            }
        }
        
        if (!sendingMessages && outboundMessages.length > 0)
            sendQueuedMessage();
    } 

    /*
        @function: addConsumer
        @description: Exposed by public method. Set up a callback method to receive messages from a specified queue
        @param payload: An object with up to 3 properties: 
                        queue: <string:queue name>, 
                        exchange: <string:exchange name>, (optional)
                        consumerCallback: function(message) {}
    */
    function addConsumer(payload) {
        function parseMessage(msg) {
            if (msg !== null) {
                payload.consumerCallback(JSON.parse(msg.content.toString()));
            }
        }
        
        function addConsumerCb() {
            commObject.channel.assertQueue(commObject.inboundQueue);
            commObject.channel.assertExchange(commObject.exchangeName, commObject.exchangeType, {});
            commObject.channel.bindQueue(commObject.inboundQueue, commObject.exchangeName, commObject.routingPattern)
                .then(function(ok) {
                    commObject.channel.consume(commObject.inboundQueue, parseMessage);
                }, console.error)
                .then(null, console.error);
        }

        if (commObject.channel !== null) {
            addConsumerCb();
        } else {
            asyncInitChannel(addConsumerCb);
        }
    }

    return {
        sendMessage: asyncSendMessage,   /* Param @payload: { messageObject: '' } */
        addConsumer: addConsumer,   /* Param @payload: { consumerCallback: function() {} } */
        initialize: initialize
    };
}

module.exports = exports = new AmqpManager();
