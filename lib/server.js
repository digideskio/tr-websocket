'use strict'

const ws = require('ws')
const debug = require('debug')('WebSocketServer')

const EventEmitter = require('events').EventEmitter
const WebSocketClient = require('./client')

class WebSocketServer extends EventEmitter {
	constructor(server) {
		super()
		const WebSocketServer = ws.Server
		const wss = new WebSocketServer({
			server: server,
			verifyClient: (data, next) => {
				this.emit('handshake', data.req, next)
			}
		})

		wss.on('connection', (socket) => {
			debug('conected')
			const client = new WebSocketClient({ socket: socket })
			this.emit('connect', client)
		})

		wss.on('error', (error) => {
			debug(error)
		})
	}


}

module.exports = WebSocketServer
