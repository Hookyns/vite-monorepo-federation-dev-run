import { ChildProcess } from "child_process";
import type { CLI } from "../cli";
import { CommandLineArguments } from "../declarations";
import { blue, cyan, magenta } from "chalk";
import { execCommand, firstBuildDetectionPromise, selectProjectsInOrder } from "../utils";
import * as path from "path";
import * as fs from "fs";

export async function serveCommand(cli: CLI) {
	const options = await cli.getCommandLineArguments();
	const processes: ChildProcess[] = [];

	const tsImport = await import("ts-import");

	// Clear on kill signals
	process.on("SIGINT", () => clear(processes));
	process.on("SIGTERM", () => clear(processes));

	// Create "virtual" modules directory
	try {
		fs.mkdirSync(path.resolve(options.hostProject.dir, "src", "@modules"), { recursive: true });
	} catch (e) {}

	// LIBS
	const libs = await startLibs(options);
	processes.push(...libs);

	// REMOTES
	const remotes = await startRemotes(options, tsImport);
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

async function startRemotes(
	options: CommandLineArguments,
	// @ts-ignore
	tsImport: typeof import("ts-import")
): Promise<ChildProcess[]> {
	const remotes = selectProjectsInOrder(options.remotes, options.projects);
	const processes = [];

	for (const remote of remotes) {
		const process = execCommand("pnpm exec vite dev", remote, magenta);
		processes.push(process);

		// const process = execCommand("pnpm exec vite build --watch", remote, magenta);
		// processes.push(process);
		// await firstBuildDetectionPromise(process);

		// const processPreview = execCommand("pnpm exec vite preview", remote, magenta);
		// processes.push(processPreview);

		// // console.log("DIR", remote.dir);
		// // const viteConfigPath = path.resolve(remote.dir, "vite.config.ts");
		// // console.log("file://" + viteConfigPath.replace("\\", "/"));
		// // const viteConfig = await tsImport.load("file://" + viteConfigPath.replace("\\", "/"), {});
		//
		// // try {
		// // 	const link = path.resolve(options.hostProject.dir, "src", "@modules", "icobis_module_laboratories");
		// // 	const target = path.resolve(remote.dir, "dist");
		// //
		// // 	fs.symlinkSync(target, link);
		// // } catch (e) {
		// // 	console.error(e);
		// // }
		//
		// // const viteConfig = eval(
		// // 	tsNode
		// // 		.create({
		// // 			esm: true,
		// // 		})
		// // 		.compile(fs.readFileSync(viteConfigPath, "utf-8"), viteConfigPath)
		// // );
		//
		// // const viteConfig = (await import("file://" + viteConfigPath)).default;
		// // console.log(viteConfig);
		//
		// // const processDev = execCommand("pnpm exec vite preview", remote, magenta);
		// // processes.push(processDev);
	}

	return Promise.resolve(processes);
}

async function startHost(options: CommandLineArguments): Promise<ChildProcess> {
	const hostProject = options.projects.find((proj) => proj.manifest.name === options.host)!;
	return execCommand("pnpm exec vite dev", hostProject, cyan);
}

function clear(processes: ChildProcess[]) {
	for (const process of processes) {
		process.kill("SIGINT");
	}
}
