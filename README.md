<!-- [![npm](https://img.shields.io/npm/v/tr-websocket.svg)](https://www.npmjs.com/package/tr-websocket) -->
<!-- [![Travis](https://img.shields.io/travis/timreichen/tr-websocket.svg)](https://github.com/timreichen/tr-websocket) -->
<!-- [![David](https://img.shields.io/david/timreichen/tr-websocket.svg)](https://www.npmjs.com/package/tr-websocket) -->
<!-- [![David](https://img.shields.io/david/dev/timreichen/tr-websocket.svg)](https://www.npmjs.com/package/tr-websocket) -->

# tr-websocket

## Description
This is a websocket library
## Features
* promise returns

## Installation
```sh
npm install --save tr-websocket
```
## Import
```javascript
const Server = require('tr-websocket').Server
```
or
```javascript
const Client = require('tr-websocket').Client
```
## Server Class
Create an instance of the websocket server by passing the http object as server.

### Usage with expressjs
```javascript
const express = require('express')
const app = express()
const http = app.listen(3333)

const connection = new Server({
  server: http
})
```
Now you can listen to events like this:
```javascript
conenction.on('handshake', (req, next) => {
  // validate handshake data
  return next(true)
})
conenction.on('connect', (socket) => {

  // do something if socket is connected

  socket.on('disconnect', (data) => {
    // do something if socket is disconnected
  })

})
```

## Client Class
Thas it.
```javascript
const socket = new Client()
```
You can pass a query to send data for the handshake:
```javascript
const token = ... // for example jsonwebtoken
const socket = new Client({
  query: `token=${token}`
})
```
### Sending and receiving messages
Send messages via *socket.emit*. This returns a promise which will catch the return value (see below).
```javascript
socket.emit('message', 'hello')
.then((data) => {
  console.log(data)
})
```
Receive messages by adding a *socket.on* handler.

**NOTE** This has a next parameter which will return a value back to the sender if needed.
```javascript
socket.on('message', (data, next) => {
  next(`${data} back!`)
})
```
So this example will send *hello* to the server, which will send back *hello back!*.
