# vite-federation
Cmd tool to control pnpm monorepo with Vite and module federation.

To show help use:
```shell
vite-federation -h
```

When you run some command, you can stop it with `Ctrl+C`; all spawned processes will be killed.

Order of projects is determined from the order of patterns in the command then by the order of packages inside pnpm-workspace.yaml file.

## Example
```shell
vite-federation serve --host @myapp/host --remotes @myapp-modules/* --libs @myapp-libs/*
```

This cmd will use package with name `@myapp/host` as the host application, app packages with name matching `@myapp-modules/*` as remotes and packages with name matching `@myapp-libs/*` as libraries.
Libraries are build first, then remotes are build and started and then the host is started.

You can also specify multiple patterns.
```shell
vite-federation serve --host @myapp/host --remotes @myapp-modules/* @myapp-other-modules/* @third-module
```

## How Does it Work?
This tool spawn multiple processes so multiple vite commands can be executed.

**Libraries**
\
Libraries are executed as `vite build -w`. We expect you to use something like Storybook to develop your libraries, so we just build it; there will be no HMR. If you want HMR, you can treat libs like remotes.
Tool waits for libraries to be built, then it continues with remotes.

**Remotes**
\
Remotes are executed as `vite dev` so you can open only given remote, alone.
Host does/should not use this served modules. HMR will not work with this. You should rather configure your host to include source code of remotes (`include` in tsconfig), so it will handle the remotes as part of the host. It is the best way how to developer remotes if you want HMR while working from host app.

**Host**
\
The host is executed as `vite dev` after libraries and remotes.