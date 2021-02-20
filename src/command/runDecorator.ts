import callsites from 'callsites';
import { Project } from 'ts-morph';

import { CommandMetadata, CommandParameter } from './command';
import { Command } from './command';

const project = new Project({
	tsConfigFilePath: 'tsconfig.json',
});

export function CommandRun() {
	return function (
		target: Command,
		propertyKey: string,
		descriptor: PropertyDescriptor
	) {
		const paramTypes: Function[] = Reflect.getMetadata(
			'design:paramtypes',
			target,
			propertyKey
		);

		let alreadyFound = false;

		const params: CommandParameter[] = [];
		for (const callsite of callsites()) {
			if (alreadyFound) break;

			try {
				const fileName = callsite.getFileName();
				if (!fileName) return;

				const sourceFile = project.getSourceFileOrThrow(fileName);
				const mainClass = sourceFile.getClassOrThrow(target.constructor.name);
				const method = mainClass.getInstanceMethodOrThrow(propertyKey);

				for (let i = 0; i < method.getParameters().length; i++) {
					const param = method.getParameters()[i];
					const paramType = paramTypes[i];
					params.push({
						name: param.getName(),
						type: paramType,
						optional: param.isOptional(),
						rest: param.isRestParameter(),
					});
				}

				alreadyFound = true;
			} catch (err) {
				continue;
			}
		}

		const metadata: CommandMetadata = {
			className: target.constructor.name,
			parameters: params,
			function: descriptor.value,
		};
		Reflect.defineMetadata('dabf:commandMetadata', metadata, target);
	};
}
