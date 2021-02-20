import { Message } from 'discord.js';
import { Result } from 'ts-results';

// Developer-facing
export abstract class Command {
	abstract id: string;
	aliases: string[] = [];
	abstract run($: Context, ...params: unknown[]): void;
}

export abstract class CommandMiddleware {
	abstract run: ($: Context) => Result<Context, string>;
}

interface ContextOptions {
	message: Message;
	label: string;
	command: Command;
	prefix: string;
}

export class Context {
	message: Message;
	label: string;
	command: Command;
	prefix: string;

	constructor({ message, label, command, prefix }: ContextOptions) {
		this.message = message;
		this.label = label;
		this.command = command;
		this.prefix = prefix;
	}
}

// Internal library use
export interface CommandMetadata {
	readonly className: string;
	readonly parameters: CommandParameter[];
	readonly function: ($: Context, ...args: unknown[]) => void;
}

export interface CommandParameter {
	readonly name: string;
	readonly type: Function;
	readonly optional: boolean;
	readonly rest: boolean;
}
