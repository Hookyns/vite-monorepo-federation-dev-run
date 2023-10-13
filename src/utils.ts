import { isMatch } from "micromatch";
import { Project } from "./declarations";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { Chalk, red } from "chalk";

export const GLOB_OPTIONS = {
	cwd: process.cwd(),
	dot: false,
	onlyFiles: true,
	ignore: ["node_modules"],
	absolute: true,
	followSymbolicLinks: true,
};

export function selectProjectsInOrder(patterns: string[], projects: Project[]) {
	return [
		...new Set(
			patterns.flatMap((lib) => {
				const project = projects.filter((proj) => isMatch(proj.manifest.name ?? "_", lib));

				if (!(project?.length > 0)) {
					throw new Error(`No project '${lib}' found!`);
				}

				return project;
			})
		),
	].sort((a, b) => a.order - b.order);
}

export function execCommand(cmd: string, project: Project, color: Chalk) {
	const proc = spawn(cmd, { cwd: project.dir, shell: true });
	const logPrefix = color(project.manifest.name + ": ");

	proc.stdout.on("data", (data) => {
		if (data) {
			console.log((data + "").replace(/^/gm, logPrefix));
		}
	});

	proc.stderr.on("data", (data) => {
		console.error((data + "").replace(/^/gm, logPrefix));
	});

	proc.on("close", (code, signal) => {
		console.log(logPrefix, red(`exited with code ${code}, signal ${signal}`));
	});

	return proc;
}

export function promiseCS() {
	let resolve: () => void;

	const promise = new Promise<void>((res) => {
		resolve = res;
	});

	return { resolve: resolve!, promise };
}

export function firstBuildDetectionPromise(process: ChildProcessWithoutNullStreams): Promise<void> {
	const { resolve, promise } = promiseCS();
	let output = "";

	process.stdout.on("data", detectFirstBuild);

	function detectFirstBuild(data: string | null) {
		if (data) {
			output += data;

			if (/built in \d/.test(output)) {
				resolve();
				process.stdout.off("data", detectFirstBuild);
			}
		}
	}

	return promise;
}
