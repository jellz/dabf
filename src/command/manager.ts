import { Collection, Message } from 'discord.js';
import { Args, Lexer, longStrategy, Parser } from 'lexure';
import { DABFClient } from '../client/client';
import { Command, CommandMetadata, Context } from './command';

type PrefixProvider = (message: Message) => string | string[] | null;
type ArgumentResolver = ($: Context, input?: string) => Object | null;

export class CommandManager {
	readonly store: Collection<string, Command> = new Collection();
	private prefix: PrefixProvider = () => [];
	private argumentTypes: Collection<
		Object,
		ArgumentResolver
	> = new Collection();

	constructor(public readonly client: DABFClient) {
		this.addArgumentType(String, (_$: Context, input?: string):
			| string
			| null => {
			return input || null;
		});

		this.addArgumentType(
			Number,
			(_$: Context, input?: string): Number | null => {
				return Number(input) || null;
			}
		);

		this.addArgumentType(
			Boolean,
			(_$: Context, input?: string): Boolean | null => {
				if (!input) return null;
				const str = input.toLowerCase();
				if (['yes', 'true', 'y'].includes(str)) return true;
				else if (['no', 'false', 'n'].includes(str)) return false;
				else return null;
			}
		);
	}

	register(cmd: Command) {
		const metadata: CommandMetadata | undefined = Reflect.getMetadata(
			'dabf:commandMetadata',
			cmd
		);
		if (!metadata) {
			this.client.log.error(
				`Command '${cmd.id}' is missing metadata. Did you forget to use the @CommandRun() decorator?`
			);
			return;
		}

		if (this.store.has(cmd.id)) {
			this.client.log.error(
				`Command with ID '${cmd.id}' being registered more than once`
			);
			return;
		}

		this.store.set(cmd.id, cmd);
		this.client.log.info(
			`Registered command '${cmd.id}' (aliases: ${cmd.aliases.join(', ')})`
		);
	}

	findByLabel(label: string) {
		return this.store.find(cmd =>
			cmd.aliases
				.map(alias => alias.toLowerCase())
				.includes(label.toLowerCase())
		);
	}

	getMetadata(command: Command) {
		return Reflect.getMetadata('dabf:commandMetadata', command);
	}

	addArgumentType(type: Object, resolver: ArgumentResolver) {
		if (this.argumentTypes.has(type)) {
			this.client.log.error(
				`Argument type '${type.constructor.name}' already added`
			);
			return;
		}

		this.argumentTypes.set(type, resolver);
	}

	setPrefix(prefix: string | string[] | PrefixProvider) {
		if (Array.isArray(prefix) || typeof prefix === 'string')
			this.prefix = () => prefix;
		else this.prefix = prefix;
	}

	// Return an array of prefixes for the context
	getPrefixes(message: Message) {
		if (!this.prefix) return [];
		const prefix = this.prefix(message);
		if (!prefix) return [];
		return typeof prefix === 'string' ? [prefix] : prefix;
	}

	// This method is called after a message send/edit listener has concluded this is a command execution attempt
	async handleCommand(message: Message, prefix: string) {
		const lexer = new Lexer(message.content).setQuotes([
			['"', '"'],
			['“', '”'],
		]);

		const res = lexer.lexCommand(_s => prefix.length);
		if (!res) return;

		const label = res[0].value;
		const command = this.findByLabel(label);
		if (!command) return;

		const tokens = res[1]();

		const parser = new Parser(tokens).setUnorderedStrategy(longStrategy());
		const out = parser.parse();
		const args = new Args(out);

		const metadata: CommandMetadata | undefined = Reflect.getMetadata(
			'dabf:commandMetadata',
			command
		);
		if (!metadata) {
			this.client.log.error(
				`Command '${command.id}' is missing metadata during command handling. How did this happen?`
			);
			return;
		}

		const context = new Context({ message, command, prefix, label });

		const resolvedArguments: unknown[] = [];
		const expectedParameters = metadata.parameters.filter(
			param => param.type !== Context
		);
		for (let i = 0; i < expectedParameters.length; i++) {
			const param = expectedParameters[i];

			const expectedType = this.argumentTypes.get(param.type);
			if (!expectedType) {
				this.client.log.error(
					`Argument type resolver for type '${param.type.constructor.name}' could not be found. Did you forget to add it to the command manager?`
				);
				resolvedArguments.push(undefined);
				break;
			}

			const arg = args.single();

			const resolved = await expectedType(context, arg || undefined);
			if (!resolved) {
				if (!param.optional) {
					if (arg)
						return message.channel.send(
							`:warning: Invalid ${param.type.name.toLowerCase()}`
						);
					``;
					return message.channel.send(
						`:warning: Missing required argument \`${param.name}\` (\`${param.type.name}\`)`
					);
				}

				resolvedArguments.push(undefined);
				break;
			} else resolvedArguments.push(resolved);
		}

		await command.run(context, ...resolvedArguments);
	}
}
