import { ChildProcess } from "child_process";
import type { CLI } from "../cli";
import { CommandLineArguments } from "../declarations";
import { blue, cyan, magenta } from "chalk";
import { execCommand, firstBuildDetectionPromise, selectProjectsInOrder } from "../utils";

export async function serveCommand(cli: CLI) {
	const options = await cli.getCommandLineArguments();
	const processes: ChildProcess[] = [];

	// Clear on kill signals
	process.on("SIGINT", () => clear(processes));
	process.on("SIGTERM", () => clear(processes));

	// LIBS
	const libs = await startLibs(options);
	processes.push(...libs);

	// REMOTES
	const remotes = await startRemotes(options);
	processes.push(...remotes);

	// HOST
	const host = await startHost(options);
	processes.push(host);
}

async function startLibs(options: CommandLineArguments): Promise<ChildProcess[]> {
	const libs = selectProjectsInOrder(options.libs, options.projects);
	const processes = [];

	for (const lib of libs) {
		const process = execCommand("pnpm exec vite build --watch", lib, blue);
		processes.push(process);
		await firstBuildDetectionPromise(process);
	}

	return Promise.resolve(processes);
}

async function startRemotes(options: CommandLineArguments): Promise<ChildProcess[]> {
	const remotes = selectProjectsInOrder(options.remotes, options.projects);
	const processes = [];

	for (const remote of remotes) {
		const process = execCommand("pnpm exec vite build --watch", remote, blue);
		processes.push(process);
		await firstBuildDetectionPromise(process);

		const process2 = execCommand("pnpm exec vite preview", remote, magenta);
		processes.push(process2);
	}

	return Promise.resolve(processes);
}

async function startHost(options: CommandLineArguments): Promise<ChildProcess> {
	const hostProject = options.projects.find((proj) => proj.manifest.name === options.host);

	if (!hostProject) {
		throw new Error(`Host project '${options.host}' not found in the workspace.`);
	}

	return execCommand("pnpm exec vite dev", hostProject, cyan);
}

function clear(processes: ChildProcess[]) {
	for (const process of processes) {
		process.kill("SIGINT");
	}
}
