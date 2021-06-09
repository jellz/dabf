import { Message } from 'discord.js';
import { DABFClient } from '../../client/client';
import { Listener } from '../../listener/listener';

/*
	Message send listener for detecting commands
*/
export class DispatcherMessageSendListener extends Listener {
	id = 'dabf:dispatcher-message-send';
	event = 'message';

	constructor(public readonly client: DABFClient) {
		super();
	}

	run(message: Message) {
		if (message.author.bot) return;
		const usedPrefix = this.client.commandManager
			.getPrefixes(message)
			.find(prefix => message.content.startsWith(prefix));
		if (!usedPrefix) return; // This message does not start with any command prefix so we can just stop

		// Now that we know the message is an attempt at executing a command, we pass it to the command handling method
		this.client.commandManager.handleCommand(message, usedPrefix);
	}
}
