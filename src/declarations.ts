import { Project as PnpmProject } from "@pnpm/find-workspace-packages";

export type Project = PnpmProject & { order: number };

export type CommandLineArguments = {
	host?: string;
	remotes: string[];
	libs: string[];
	workspaceRootDir: string;
	orderedProjects: string[];
	projects: Project[];
};
