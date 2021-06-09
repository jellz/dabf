import EventEmitter from 'events';

export type EmitterResolvable = string | EventEmitter;

export abstract class Listener {
	abstract id: string;
	abstract event: string;
	emitter: EmitterResolvable = 'client';
	once?: boolean = false;
	abstract run(...params: unknown[]): void;
}
