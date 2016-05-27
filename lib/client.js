'use strict'

const debug = require('debug')('WebSocketClient')
const EventEmitter = require('events').EventEmitter
const middleware = require('tr-middleware')
const ACK_NAME = '_ACK_'

class WebSocketClient extends EventEmitter {
	constructor(options) {
		super()
		options = options || {}
		
		this._setup()

		Object.defineProperty(this, 'callbacks', {
			value: {}
		})
		
		// intern emit
		this._emit = this.emit
		// extern emit
		this.emit = function() {
			let data = {
				name: arguments[0],
				data: arguments[1]
			}
			// const defaults = { callback: true 
			const callback = arguments[2]
			return new Promise((resolve, reject) => {
				if (arguments[0] === ACK_NAME) {
					reject(`name '${arguments[0]}' is not allowed`)
				}
				data = this._pack(data)
				const id = data.pkg.id
				this.callbacks[id] = (data) => {
					if (callback instanceof Function) {
						resolve(callback(data.error, data.data))
					}
					if (data.error) {
						reject(data.error)
					} else {
						resolve(data.data)
					}
					delete this.callbacks[id]
				}
				this._send(data)
			})
		}

		this._on = this.on
		this.on = function() {
			if (arguments[0] === ACK_NAME) {
				return debug(`name '${arguments[0]}' is not allowed`)
			}
			return this._on.apply(this, arguments)
		}.bind(this)
		this.connect(options)
	}

	connect(options) {
		let socket = options.socket
		if (!socket) {
			const url = options.url || window.location.hostname
			const port =  options.port || window.location.port
			const secure = options.secure ? 's' : ''
			const query = options.query ? `?${options.query}` : ''
			socket = new WebSocket(`ws${secure}://${url}:${port}${query}`)
		}
		this.socket = socket

		let openFired = false
		this.socket.addEventListener('open', (event) => {
			openFired = true
			debug('connected')
			this._emit('connect')
		})
		// if is already: opened fire open because it didnt before
		if (this.socket.readyState === this.socket.OPEN) {
			if (openFired) { return }
			this.socket.emit('open')
		}

		this.socket.addEventListener('close', (event) => {
			debug('disconnected')
			this._emit('disconnect', event)
		})

		this.socket.addEventListener('message', (event) => {
			this._unpack(this._deserialize(event.data), (data) => {
				this._emit(data.name, data)
			})
		})

		this.socket.addEventListener('error', (event) => {
			debug(event.type)
		})
		
	}
	disconnect() {
		return new Promise((resolve, reject) => {
			if (this.socket.readyState === this.socket.OPEN) {
				this.socket.close()
				resolve()
				return
			}
			setTimeout(() => {
				this.disconnect()
			})
		})
	}
	
	get connected() {
		return this.socket.readyState === this.socket.OPEN
	}

	_setup() {
		middleware(this, 'on', function(args) {
			const fn = args.pop()
			const callback = function() {
				const args = Array.prototype.slice.call(arguments)
				const data = args[0]
				args[0] = data ? data.data : undefined
				const pkg = data ? data.pkg : null
				args.push(function() {
					pkg.data = {
						data: arguments[1]
					}
					pkg.data.error = arguments[0] || null
					this._send({
						name: ACK_NAME,
						pkg: pkg
					})
				}.bind(this))
				fn.apply(this, args)
			}.bind(this)
			args.push(callback)
		})
	}

	_pack(data) {
		const createPkgID = () => {
			const indexes = Object.keys(this.callbacks).map(key => key)
			return (indexes.length > 0) ? Math.max.apply(this, indexes) + 1 : 0
		}
		const timestamp = new Date().getTime()
		if (data.name !== ACK_NAME) {
			const id = createPkgID()
			data.pkg = { id: id }
		}
		return data
	}
	_serialize(data) {
		try {
			return JSON.stringify(data)
		} catch(error) {
			debug(error)
			return data
		}
	}
	_unpack(data, next) {
		if (data.name !== ACK_NAME) {
			return next(data)
		}
		if (!data.pkg) { return }
		const id = data.pkg.id
		const pkg = this.callbacks[id]
		if (!pkg) { return }
		pkg.call(this, data.pkg.data)
	}
	_deserialize(message) {
		try {
			return JSON.parse(message)
		} catch(error) {
			debug(error)
			return message
		}
	}

	_send(data) {
		if (this.socket.readyState === this.socket.OPEN) {
			try {
				const message = this._serialize(data)
				this.socket.send(message, (error) => {
					if (error) {
						debug(error)
					}
				})
				return
			} catch(error) {
				debug(error)
			}
		}
		setTimeout(() => {
			this._send(data)
		})
	}
}

module.exports = WebSocketClient