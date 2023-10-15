import { program } from "commander";
import { globSync } from "fast-glob";
import { parse } from "yaml";
import * as path from "path";
import * as fs from "fs";
import { serveCommand } from "./cli-commands/serve-command";
import { CommandLineArguments, Project } from "./declarations";
import { GLOB_OPTIONS } from "./utils";
import { findWorkspacePackages } from "@pnpm/find-workspace-packages";
import { isMatch } from "micromatch";

export class CLI {
	private commandOptions: object = {};

	constructor() {
		program
			.name("vite-federation")
			.description("Cmd tool to control pnpm monorepo with Vite and module federation.")
			.addHelpCommand(false)
			.helpOption("-h, --help", "Display help for command.")
			.requiredOption("--host <host>", "Specify package.json name of the host.")
			.option("--remotes <remotes...>", "Specify glob patterns matching remote package names.", [])
			.option("--libs <libs...>", "Specify glob patterns matching library package names.", []);

		program.hook("preAction", (thisCommand, actionCommand) => {
			this.commandOptions = actionCommand.opts();
		});

		program
			.command("serve")
			.description("Create config file with recommended options and add reflection section to package.json.")
			.action(() => serveCommand(this));
	}

	execute() {
		program.parse();
	}

	async getCommandLineArguments(): Promise<CommandLineArguments> {
		const opts = Object.assign({}, program.opts(), this.commandOptions);

		// Detect workspace root
		const workspaceYmlPath = globSync("pnpm-workspace.yaml", GLOB_OPTIONS)?.[0];

		if (!workspaceYmlPath) {
			throw new Error("No pnpm-workspace.yaml file not found under CWD!");
		}

		console.log("Found pnpm-workspace.yaml:", workspaceYmlPath);

		const workspaceRootDir = path.dirname(workspaceYmlPath);
		const orderedProjects: string[] = parse(fs.readFileSync(workspaceYmlPath, "utf-8"))?.packages || [];
		const projects = (await findWorkspacePackages(workspaceRootDir)).map((proj) => {
			(proj as any).order = orderedProjects.findIndex((projPattern) =>
				isMatch(path.relative(workspaceRootDir, proj.dir), projPattern)
			);
			return proj;
		}) as Project[];

		const hostProject = projects.find((proj) => proj.manifest.name === opts.host);

		if (!hostProject) {
			throw new Error(`Host project '${opts.host}' not found in the workspace.`);
		}

		return {
			workspaceRootDir: path.dirname(workspaceYmlPath),
			orderedProjects: orderedProjects,
			projects: projects,
			host: opts.host,
			hostProject: hostProject,
			remotes: opts.remotes,
			libs: opts.libs,
		};
	}
}
