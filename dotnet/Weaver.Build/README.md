# Weaver.Build (scaffold)

This folder contains a minimal scaffold for a Weaver MSBuild integration package.

Purpose

- Provide an MSBuild props/targets pair that lets .NET projects compile `.xsl`
  stylesheets during build/publish and stage the emitted artifacts in the app output.

Current scaffolded files

- `Weaver.Build.csproj` — packable local NuGet project for the scaffold
- build/Weaver.Build.props — default properties for the integration
- build/Weaver.Build.targets — simple targets to invoke the Weaver CLI for each stylesheet
- tools/weaver/\* — scaffold carrier shims used for local validation

How to use (sample)

1. Reference the eventual `Weaver.Build` NuGet package (or add this project to your repo).
2. Add stylesheets to your project:

```xml
<ItemGroup>
  <WeaverStylesheet Include="Stylesheets/**/*.xsl" />
</ItemGroup>
```

3. `dotnet build` will run the integration before build, stage emitted artifacts
   under `$(WeaverOutputDir)`, and optionally copy them into the app output if
   `WeaverCopyToOutput` and `WeaverPublishWithProject` are enabled.

Implemented scaffold behavior

- Per-item `Emit`, `Sample`, `OutputSubdir`, and `CopyToOutput` metadata are honored.
- Artifacts are staged under `$(WeaverOutputDir)` instead of being treated only as
  side effects next to the source stylesheet.
- Machine-readable diagnostics are written to `$(WeaverOutputDir)` and rendered
  into MSBuild-friendly error/warning lines by the scaffold helper script.
- Design-time builds are skipped by default.
- Source maps are staged, but not copied into the app output unless
  `WeaverCopySourceMapsToOutput=true`.
- The scaffold can be packed as a local `Weaver.Build` NuGet package and consumed
  through `PackageReference` in the repo's validation projects.
- The packed package now carries the built `dist/` CLI plus the minimal runtime
  npm dependency set needed for local PackageReference validation without a
  repo-local `WeaverToolCliPath` override.

Key properties

- `WeaverEmit` — default emit target set
- `WeaverOutputDir` — staging directory for generated artifacts
- `WeaverCopyToOutput` — default per-item output-copy behavior
- `WeaverPublishWithProject` — include staged artifacts in build/publish output
- `WeaverPublishSubdir` — relative folder under `$(OutputPath)` for copied artifacts
- `WeaverCopySourceMapsToOutput` — opt in to copying `.map` files into app output
- `WeaverNode` — Node executable path
- `WeaverDiagnosticsFormat` — diagnostics format requested from the CLI
- `WeaverFailOnDiagnostics` — fail build on warnings/errors emitted by the compiler
- `WeaverDesignTimeEnabled` — opt in to running during IDE design-time evaluation
- `WeaverUseBundledNode` — planned, but intentionally not yet implemented in the scaffold

Per-item metadata

```xml
<ItemGroup>
  <WeaverStylesheet Include="Stylesheets/**/*.xsl"
                    Emit="bundle"
                    OutputSubdir="compiled/"
                    CopyToOutput="true" />
  <WeaverStylesheet Include="Stylesheets/report.xsl"
                    Sample="Samples/report.xml" />
</ItemGroup>
```

Enable / Disable control

The integration provides multiple ways to enable or disable at different scopes:

- Per-project: set in your project file

```xml
<PropertyGroup>
  <WeaverEnabled>false</WeaverEnabled> <!-- disable for this project -->
</PropertyGroup>
```

- Design-time builds (IDE evaluation): the targets are skipped during design-time by default.
  To enable compilation during design-time (not recommended), set:

```xml
<PropertyGroup>
  <WeaverDesignTimeEnabled>true</WeaverDesignTimeEnabled>
</PropertyGroup>
```

- Repo-level toggle (CI or quick local override): create a top-level Directory.Build.Weaver.props
  at the repository root with the following contents to disable across the repo:

```xml
<Project>
  <PropertyGroup>
    <WeaverEnabled>false</WeaverEnabled>
  </PropertyGroup>
</Project>
```

Repository helper scripts (provided):

- `scripts/disable-weaver.sh` — create Directory.Build.Weaver.props to disable the Weaver targets for local development/CI.
- `scripts/enable-weaver.sh` — remove the auto-generated Directory.Build.Weaver.props to re-enable default behavior.

Notes & next steps

- Production packaging should allow opt-in bundled Node and a stable carrier. The current scaffold is for local validation only.
- The README here contains recommended toggles but a packaged Weaver.Build NuGet should document the same controls in its package README and docs/NUGET_INTEGRATION.md.
- The scaffold still relies on the current CLI emitting primary artifacts next to
  the source stylesheet before the targets stage them into `$(WeaverOutputDir)`.
- The packaged carrier still reflects the repo's current local runtime dependency
  graph. It is suitable for local validation, but it is not yet the final,
  reduced production carrier shape.

Refer to docs/NUGET_INTEGRATION.md for the full plan and acceptance criteria.
