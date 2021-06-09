import 'reflect-metadata';
import { LoggerWithoutCallSite } from 'tslog';
import { Client, ClientOptions } from 'discord.js';

import { CommandManager } from '../command/manager';
import { ListenerManager } from '../listener/manager';
import { DispatcherMessageSendListener } from '../command/dispatch/messageSend';

export interface DABFClientOptions {}

export class DABFClient extends Client {
	commandManager: CommandManager;
	listenerManager: ListenerManager;
	log: LoggerWithoutCallSite;

	constructor(_opts?: DABFClientOptions, discordOpts?: ClientOptions) {
		super(discordOpts);

		this.log = new LoggerWithoutCallSite({
			displayFilePath: 'hidden',
		});

		this.commandManager = new CommandManager(this);
		this.listenerManager = new ListenerManager(this);

		this.listenerManager.register(new DispatcherMessageSendListener(this));
	}
}
