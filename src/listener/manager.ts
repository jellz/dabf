import { Collection } from 'discord.js';
import EventEmitter from 'events';
import { DABFClient } from '../client/client';
import { EmitterResolvable, Listener } from './listener';

export class ListenerManager {
	readonly store: Collection<string, Listener> = new Collection();
	#emitters: Collection<string, EventEmitter> = new Collection();

	constructor(public readonly client: DABFClient) {
		this.addEmitter('client', this.client);
	}

	register(listener: Listener) {
		const emitter = this.resolveEmitter(listener.emitter);
		if (!emitter) {
			this.client.log.error(
				`Emitter '${listener.emitter}' not found. Did you forget to add it to the listener manager?`
			);
			return;
		}

		if (this.store.has(listener.id)) {
			this.client.log.error(
				`Listener with ID '${listener.id}' being registered more than once`
			);
			return;
		}

		listener.run = listener.run.bind(listener);
		if (listener.once) emitter.once(listener.event, listener.run);
		else emitter.on(listener.event, listener.run);

		this.store.set(listener.id, listener);
		this.client.log.info(
			`Registered listener '${listener.id}' (${emitter.constructor.name}#${listener.event})`
		);
		return listener;
	}

	deregister(listener: Listener) {
		if (!this.store.has(listener.id)) {
			this.client.log.error(
				`Cannot deregister listener '${listener.id}' because it was never registered`
			);
			return;
		}

		const emitter = this.resolveEmitter(listener.emitter);
		if (!emitter) {
			this.client.log.error(
				`Emitter '${listener.emitter}' not found while deregistering -- how did this happen?`
			);
			return;
		}

		emitter.removeListener(listener.event, listener.run);
		this.store.delete(listener.id);
		return listener;
	}

	addEmitter(key: string, emitter: EventEmitter) {
		this.#emitters.set(key, emitter);
		this.client.log.info(
			`Added emitter '${key}' (${emitter.constructor.name})`
		);
		return emitter;
	}

	addEmitters(emitters: { [key: string]: EventEmitter }) {
		for (const name of Object.keys(emitters))
			this.addEmitter(name, emitters[name]);

		return emitters;
	}

	private resolveEmitter(emitter: EmitterResolvable) {
		if (typeof emitter === 'string') {
			const found = this.#emitters.get(emitter);
			return found ?? null;
		} else return emitter;
	}
}
